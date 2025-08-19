const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { model, contents } = JSON.parse(event.body);
    
    if (!model || !contents) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing model or contents' })
      };
    }

    // Use environment variable for API key
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to contact Gemini API' })
    };
  }
};
