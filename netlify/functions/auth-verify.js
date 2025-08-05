const jwt = require('jsonwebtoken');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token } = JSON.parse(event.body);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        user: decoded
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        valid: false,
        error: 'Invalid token'
      })
    };
  }
}
