// Test SMTP connectivity using .env values
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });
const nodemailer = require('nodemailer');

const emailHost = process.env.EMAIL_HOST;
const emailPort = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const testTo = process.env.TEST_EMAIL || emailUser;

if (!emailHost || !emailPort || !emailUser || !emailPass) {
  console.error('Missing EMAIL_* env vars. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in your .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465,
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

(async () => {
  try {
    console.log(`Verifying transporter to ${emailHost}:${emailPort} as ${emailUser} ...`);
    await transporter.verify();
    console.log('Transporter verified OK.');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to: testTo,
      subject: 'SMTP test from Yola AI Info Hub',
      text: 'This is a test email from your local test-smtp.js script.'
    });
    console.log('Test email sent. MessageId:', info.messageId);
    console.log('Preview URL (if available):', info.previewUrl || 'n/a');
  } catch (err) {
    console.error('SMTP test failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
})();
