const fetch = require('node-fetch');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Rate limiting helper: Simple in-memory rate limit tracking
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60; // Increased for Netlify with multiple users

function checkRateLimit(ip) {
  const now = Date.now();
  if (!requestCounts[ip]) {
    requestCounts[ip] = [];
  }
  
  // Clean old requests outside the window
  requestCounts[ip] = requestCounts[ip].filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (requestCounts[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limited
  }
  
  requestCounts[ip].push(now);
  return true; // OK
}

exports.handler = async function(event, context) {
  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Get client IP for rate limiting
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before making another request.',
          retryAfter: 60
        })
      };
    }

    // Parse request body
    let model, contents;
    try {
      const body = JSON.parse(event.body || '{}');
      model = body.model;
      contents = body.contents;
    } catch (e) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid request body. Must be valid JSON.' })
      };
    }
    
    if (!model || !contents) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required fields: model, contents' })
      };
    }

    // Validate model name
    if (!model.startsWith('gemini-')) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid model name' })
      };
    }

    // Use environment variable for API key
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key not configured');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Server configuration error. API key not set.' })
      };
    }

    // Make request to Gemini API
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      timeout: 30000
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = {
        error: `API returned non-JSON response (${response.status}): ${text.substring(0, 100)}`
      };
    }

    // Handle API errors
    if (!response.ok) {
      console.error(`Gemini API error (${response.status}):`, data);
      
      // Map specific error codes to user-friendly messages
      let errorMessage = data.error?.message || 'Unknown API error';
      if (response.status === 429) {
        errorMessage = 'API rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request to API. Please check your input.';
      } else if (response.status >= 500) {
        errorMessage = 'Gemini API service temporarily unavailable. Please try again.';
      }

      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: errorMessage })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Gemini proxy error:', error.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message
      })
    };
  }
};
