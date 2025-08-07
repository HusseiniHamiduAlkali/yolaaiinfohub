// Express route for password reset (backend)
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Adjust path as needed
require('dotenv').config();

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found for this email.' });
    // Generate a reset token (simple random string for demo)
    const token = Math.random().toString(36).substr(2);
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();
    // Build reset link
    const resetUrl = process.env.RESET_URL_BASE.replace(/\${.*?}/g, '') + `?token=${token}&email=${encodeURIComponent(email)}`;
    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: `Yola AI Info Hub <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Hello,<br>You requested a password reset.<br><a href='${resetUrl}'>Click here to reset your password</a>.<br>If you did not request this, ignore this email.</p>`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
