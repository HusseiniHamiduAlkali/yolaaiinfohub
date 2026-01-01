const fetch = require('node-fetch');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Simple request deduplication cache
// Cache responses for identical requests for 30 seconds to avoid duplicate API calls
const responseCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(model, contents) {
  // Create a simple hash of the request
  const str = JSON.stringify({ model, contents });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // Clean up expired cache
  if (cached) {
    responseCache.delete(key);
  }
  return null;
}

function setCacheResponse(key, data) {
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
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

    // Check cache first - avoid duplicate API calls
    const cacheKey = getCacheKey(model, contents);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('Returning cached Gemini response for key:', cacheKey);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(cachedResponse)
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

    // Cache successful response to avoid duplicate API calls
    setCacheResponse(cacheKey, data);

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
