const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Forward the request to your Render backend
    const response = await axios({
      method: 'POST',
      url: `${process.env.API_URL}${event.path}`,
      data: JSON.parse(event.body),
      headers: event.headers
    });

    return {
      statusCode: response.status,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
}
