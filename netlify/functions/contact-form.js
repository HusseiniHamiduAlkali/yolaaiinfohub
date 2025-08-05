exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, message } = JSON.parse(event.body);

    // Validate inputs
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'All fields are required' })
      };
    }

    // Send to your email using the send-email function
    const emailResponse = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: process.env.GMAIL_USER,
        subject: `Contact Form: ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Contact form submitted successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
