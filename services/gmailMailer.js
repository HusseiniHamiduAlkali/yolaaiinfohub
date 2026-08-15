const nodemailer = require('nodemailer');

function normalizeEnvValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function isPlaceholderValue(value) {
  const normalized = normalizeEnvValue(value).toLowerCase();
  return !normalized || normalized === 'your_email@gmail.com' || normalized === 'your_app_password_here' || normalized.includes('example.com') || normalized.includes('your_');
}

const emailHost = normalizeEnvValue(process.env.EMAIL_HOST);
const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
const emailPass = normalizeEnvValue(process.env.EMAIL_PASS).replace(/\s+/g, '');
const emailFrom = normalizeEnvValue(process.env.EMAIL_FROM) || `"Yola AI Info Hub" <${emailUser}>`;

const emailConfigured = Boolean(
  emailHost &&
  Number.isFinite(emailPort) &&
  emailUser &&
  emailPass &&
  !isPlaceholderValue(emailHost) &&
  !isPlaceholderValue(emailUser) &&
  !isPlaceholderValue(emailPass)
);

const transporter = emailConfigured ? nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465,
  auth: {
    user: emailUser,
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false
  }
}) : null;

if (transporter) {
  transporter.verify().then(() => {
    console.log('Gmail SMTP transporter verified');
  }).catch((err) => {
    console.error('Gmail SMTP verification failed:', err && err.message ? err.message : err);
  });
} else {
  console.warn('Gmail SMTP not configured: set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in the active environment to enable mail sending.');
}

async function sendEmailWithGmailSmtp({ to, subject, html, text }) {
  if (!to || !subject) {
    throw new Error('Recipient email and subject are required.');
  }

  if (!transporter || !emailConfigured) {
    console.warn('Gmail SMTP email skipped because SMTP credentials are not configured.');
    return {
      success: false,
      skipped: true,
      reason: 'smtp not configured'
    };
  }

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject,
    html: html || `<p>${text || 'No message body provided.'}</p>`,
    text: text || (typeof html === 'string' ? html.replace(/<[^>]*>/g, ' ') : 'No message body provided.')
  });

  return { success: true };
}

module.exports = {
  emailConfigured,
  transporter,
  sendEmailWithGmailSmtp
};
