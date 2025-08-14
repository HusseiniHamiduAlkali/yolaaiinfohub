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
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const app = express();

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';
const RESET_URL_BASE = isProduction 
  ? 'https://yolainfohub.netlify.app/reset-password'
  : 'http://localhost:4000/reset-password';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: [
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
    'https://yolainfohub.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

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
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Email transport configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
    
    user.resetToken = hash;
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below to reset your password.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// Reset password with token
app.post('/api/reset-password', async (req, res) => {
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

    // Update password
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

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

    // Update login info
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    await user.save();

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

app.listen(4000, () => console.log('Auth server running on http://localhost:4000'));

// Client-side fetch example (to be used in your frontend code)
// fetch('http://localhost:4000/api/login', {
//   method: 'POST',
//   credentials: 'include', // <--- important for cookies/session
//   // ...other options
// });
