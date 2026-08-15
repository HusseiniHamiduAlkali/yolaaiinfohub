const fetch = require('node-fetch');

function normalizeEnvValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function isPlaceholderValue(value) {
  const normalized = normalizeEnvValue(value).toLowerCase();
  return !normalized || normalized === 'your_email@gmail.com' || normalized === 'your_app_password_here' || normalized.includes('example.com') || normalized.includes('your_');
}

const brevoApiKey = normalizeEnvValue(process.env.BREVO_API_KEY);
const brevoSenderEmail = normalizeEnvValue(process.env.BREVO_SENDER_EMAIL);
const brevoSenderName = normalizeEnvValue(process.env.BREVO_SENDER_NAME) || 'Yola AI Info Hub';

const emailConfigured = Boolean(
  brevoApiKey &&
  brevoSenderEmail &&
  !isPlaceholderValue(brevoApiKey) &&
  !isPlaceholderValue(brevoSenderEmail)
);

if (emailConfigured) {
  console.log('Brevo email service configured');
} else {
  console.warn('Brevo email not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL in the active environment to enable mail sending.');
}

async function sendEmailWithBrevo({ to, subject, html, text }) {
  if (!to || !subject) {
    throw new Error('Recipient email and subject are required.');
  }

  if (!emailConfigured) {
    console.warn('Brevo email skipped because API key is not configured.');
    return {
      success: false,
      skipped: true,
      reason: 'brevo not configured'
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: brevoSenderName,
          email: brevoSenderEmail
        },
        to: [{ email: to }],
        subject,
        htmlContent: html || `<p>${text || 'No message body provided.'}</p>`,
        textContent: text || (typeof html === 'string' ? html.replace(/<[^>]*>/g, ' ') : 'No message body provided.')
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    console.log(`Email sent via Brevo to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email via Brevo:', error && error.message ? error.message : error);
    throw error;
  }
}

// Backward compatibility: alias for smooth transition
const sendEmailWithGmailSmtp = sendEmailWithBrevo;

module.exports = {
  emailConfigured,
  sendEmailWithBrevo,
  sendEmailWithGmailSmtp
};
