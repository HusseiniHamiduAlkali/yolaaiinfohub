// Simple Express backend for login/signup/logout with MongoDB (Mongoose)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const validator = require('express-validator');
const helmet = require('helmet');
const fetch = require('node-fetch');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});


const app = express();

// CORS configuration (must be declared before use)
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:5502',
      'http://localhost:5502',
      'http://127.0.0.1:4000',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://000.0.0.0:0000',
      'https://yolaaiinfohub.netlify.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

// Apply CORS first
app.use(cors(corsOptions));

// Then other middleware
app.use(express.json());

// Security middleware with appropriate settings for CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';

// Mount /api/gemini endpoint
app.post('/api/gemini', async (req, res) => {
  try {
    let { model, contents } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY not set in environment');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing model or contents' });
    }
    
    // Normalize model names for v1 API compatibility
    // Don't convert between models - use what the client requests
    // The backend just passes through the model name the frontend requests
    let normalizedModel = model;
    
    // Only map obviously invalid names (like old legacy names)
    const modelMap = {
      'gemini-pro-vision': 'gemini-1.5-flash',
      'gemini-pro': 'gemini-1.5-flash'
    };
    
    if (modelMap[model]) {
      normalizedModel = modelMap[model];
      console.log(`Mapped ${model} to ${normalizedModel}`);
    }
    
    // Try v1 endpoint first (more stable), fall back to v1beta
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${normalizedModel}:generateContent?key=${API_KEY}`;
    
    console.log(`Calling Gemini API with model: ${normalizedModel} (requested: ${model})`);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error response:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API error',
        details: data
      });
    }
    
    console.log('Gemini API success:', data.candidates?.length || 0, 'candidates');
    res.json(data);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: error.message || 'Error processing Gemini API request' });
  }
});


const RESET_URL_BASE = isProduction 
  ? 'https://yolaaiinfohub.netlify.app/forgot-password'
  : 'http://localhost:4000/forgot-password';

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts, please try again later' }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: { error: 'Too many signup attempts, please try again later' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many password reset attempts, please try again later' }
});

// Input validation middleware
const { body, validationResult } = validator;

const validateSignup = [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  body('phone').matches(/^[0-9]+$/),
  body('nin').matches(/^\d{11}$/),
  body('state').notEmpty(),
  body('lga').notEmpty(),
  body('address').trim().notEmpty(),
  body('termsAccepted').equals('true')
];
app.use(session({
  secret: process.env.SESSION_SECRET || 'yola-info-hub-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required for secure cookies behind a proxy/load balancer
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  }
}));

// Email transport configuration
// Configure email transporter only if SMTP credentials are present
let transporter = null;
const emailHost = process.env.EMAIL_HOST;
const emailPort = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const emailConfigured = emailHost && emailPort && emailUser && emailPass;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  // Verify transporter configuration early so issues surface on startup
  transporter.verify().then(() => {
    console.log('Email transporter verified');
  }).catch(err => {
    console.error('Email transporter verification failed. Email may not be sent:', err && err.message ? err.message : err);
  });
} else {
  console.warn('Email not configured: set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env to enable email sending.');
}
// For development/testing: store last generated reset link in memory so it can be inspected
let lastResetLink = null;
// Control whether reset links are returned in API responses (dev-only)
const includeResetInResponse = !isProduction && process.env.DEBUG_RESET === 'true';

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nin: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  state: { type: String, required: true },
  lga: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  resetToken: String,
  resetTokenExpires: Date,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  accountStatus: { type: String, enum: ['active', 'suspended', 'pending'], default: 'pending' },
  profilePicture: String,
  termsAccepted: { type: Boolean, required: true },
  termsAcceptedDate: { type: Date },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' }
});
const User = mongoose.model('User', userSchema);

// Signup
app.post('/api/signup', signupLimiter, validateSignup, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { 
    username, email, name, nin, password,
    phone, address, state, lga, termsAccepted
  } = req.body;

  try {
    // Check if username, email or NIN already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email },
        { nin: nin }
      ]
    });

    if (existingUser) {
      if (existingUser.username === username) return res.status(400).json({ error: 'Username already exists' });
      if (existingUser.email === email) return res.status(400).json({ error: 'Email already exists' });
      if (existingUser.nin === nin) return res.status(400).json({ error: 'NIN already registered' });
    }

    // Generate verification token and hash password
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ 
      username, 
      email, 
      name, 
      nin, 
      phone,
      address,
      state,
      lga,
      password: hash,
      emailVerificationToken: verificationToken,
      termsAccepted: true,
      termsAcceptedDate: new Date()
    });

    req.session.userId = user._id;
    res.json({ success: true, username: user.username, name: user.name });
  } catch (error) {
    console.error('Signup error:', error);
    let msg = 'Error creating account';
    if (error.code === 11000) {
      if (error.keyPattern.username) msg = 'Username already exists';
      else if (error.keyPattern.email) msg = 'Email already exists';
      else if (error.keyPattern.nin) msg = 'NIN already registered';
    }
    res.status(400).json({ success: false, error: msg });
  }
});

// Password reset request
app.post('/api/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account with that email exists' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(resetToken, 10);
    
  // Use a targeted update to avoid triggering full-document validators
  await User.updateOne({ _id: user._id }, { $set: { resetToken: hash, resetTokenExpires: Date.now() + 3600000 } });

    // Build a safe reset URL: prefer the request origin, then FRONTEND_URL, then reasonable defaults
    const requestOrigin = req.get('origin');
    const fallbackFront = process.env.FRONTEND_URL || (isProduction ? 'https://yolaaiinfohub.netlify.app' : 'http://localhost:5500');
    const origin = (requestOrigin || fallbackFront).replace(/\/$/, '');
    // User's site uses pages/forgot-password.html as the reset page; build link accordingly
  const resetUrl = `${origin}/pages/forgot-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
  // store for debugging
  lastResetLink = resetUrl;

    // Prepare mail options
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Yola AI Info Hub - Password Reset',
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below to reset your password.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    };

    // Send email if transporter is configured; otherwise log the reset URL for manual testing
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
      } catch (sendErr) {
        console.error('Failed to send password reset email:', sendErr && sendErr.message ? sendErr.message : sendErr);
        if (process.env.SUPPRESS_RESET_LOG !== 'true') {
          console.log('Fallback - reset URL (copy this to browser to test):', resetUrl);
        }
  // Do not expose reset link to clients in production; only include in response when explicitly enabled for dev
  const respFail = { success: true, message: 'Password reset link generated. If you do not receive an email, contact support or check server logs.' };
  if (includeResetInResponse && lastResetLink) respFail.resetLink = lastResetLink;
  return res.json(respFail);
      }
    } else {
      if (process.env.SUPPRESS_RESET_LOG !== 'true') {
        console.log('Email not configured; reset link:', resetUrl);
      }
      // Still return success to the client to avoid exposing internal errors
  const respNoEmail = { success: true, message: 'Password reset link generated. Email sending is not configured on the server; check server logs for the reset link.' };
  if (includeResetInResponse && lastResetLink) respNoEmail.resetLink = lastResetLink;
  return res.json(respNoEmail);
    }

    const respOk = { success: true, message: 'Password reset email sent' };
    if (includeResetInResponse && lastResetLink) respOk.resetLink = lastResetLink;
    res.json(respOk);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// Reset password with token
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    const user = await User.findOne({
      email,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Verify token
    const isValid = await bcrypt.compare(token, user.resetToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

  // Update password using an atomic update so validation for unrelated missing fields is not triggered
  const hash = await bcrypt.hash(password, 10);
  await User.updateOne({ _id: user._id }, { $set: { password: hash }, $unset: { resetToken: 1, resetTokenExpires: 1 } });

    res.json({ success: true, message: 'Password has been reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

// Email verification on signup
app.post('/api/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.emailVerificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});


// Login (by username or email)
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user;
    
    // Find user by email or username
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

  // Update login info with targeted update (avoids full-document validation)
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), loginAttempts: 0 } });

    // Set session
    req.session.userId = user._id;
    res.json({ success: true, username: user.username, name: user.name });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error processing login' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check auth
app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await User.findById(req.session.userId);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: user.username, name: user.name, email: user.email });
});

// Mount the Gemini API router

app.listen(4000, () => console.log('Server running on http://localhost:4000'));

// Expose debug endpoint only in non-production to retrieve last generated reset link
if (!isProduction) {
  app.get('/debug/last-reset', (req, res) => {
    if (!lastResetLink) return res.status(404).json({ error: 'No reset link generated yet' });
    res.json({ lastResetLink });
  });
}

// Client-side fetch example (to be used in your frontend code)
// fetch('http://localhost:4000/api/login', {
//   method: 'POST',
//   credentials: 'include', // <--- important for cookies/session
//   // ...other options
// });
