// Simple Express backend for login/signup/logout with MongoDB (Mongoose)


const { OAuth2Client } = require('google-auth-library');

function getGoogleOAuthConfig() {
  return {
    clientId: process.env.SSO_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.SSO_GOOGLE_CLIENT_SECRET || ''
  };
}

const googleClient = new OAuth2Client(getGoogleOAuthConfig().clientId);


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const validator = require('express-validator');
const helmet = require('helmet');
const fetch = require('node-fetch');
const fileUpload = require('express-fileupload');
const { getEmailVerificationError } = require('./server/authVerification');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});


const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5502',
  'http://localhost:5502',
  'http://127.0.0.1:5503',
  'http://localhost:5503',
  'http://127.0.0.1:4000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://000.0.0.0:0000',
  'https://yolaaiinfohub.netlify.app'
];
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);

app.set('trust proxy', true);
const isProduction = process.env.NODE_ENV === 'production';

function buildGoogleUsername(email) {
  const base = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  const safeBase = base || 'googleuser';
  return `${safeBase}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGoogleUserData(googleUser) {
  const email = String(googleUser?.email || '').trim().toLowerCase();
  const username = buildGoogleUsername(email);
  const displayName = String(googleUser?.name || googleUser?.given_name || googleUser?.family_name || username).trim();
  return {
    username,
    email,
    name: displayName || username,
    nin: `GOOGLE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    phone: googleUser?.phone_number || 'Not provided',
    address: 'Not provided',
    state: 'Not provided',
    lga: 'Not provided',
    password: crypto.randomBytes(24).toString('hex'),
    termsAccepted: true,
    termsAcceptedDate: new Date(),
    emailVerified: googleUser?.email_verified !== false,
    googleId: googleUser?.sub,
    authProvider: 'google',
    profilePicture: googleUser?.picture || '',
    lastLogin: new Date()
  };
}

// Increase payload size limit for large AI requests (default is 100KB, increasing to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration (must be declared before use)
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.has(origin) ||
      origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?$/) ||
      origin.includes('netlify') ||
      origin.includes('yolaaiinfohub') ||
      process.env.CORS_ALLOW_ALL === 'true';

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS BLOCKED - Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Set-Cookie', 'x-auth-token'],
  optionsSuccessStatus: 200
};

// Apply CORS first
app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET || 'yola-info-hub-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: isProduction ? 'none' : false,
    path: '/',
    domain: undefined
  }
}));

// Enable gzip compression for responses
app.use(require('compression')());

// Cache control middleware for static assets
app.use((req, res, next) => {
  // Images: cache for 7 days
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(req.path)) {
    res.set('Cache-Control', 'public, max-age=604800'); // 7 days
  }
  // CSS and JS: NO CACHE - always fetch fresh
  else if (/\.(css|js)$/i.test(req.path)) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
  }
  // HTML: NO CACHE - always fetch fresh
  else if (/\.html$/i.test(req.path)) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
  }
  // API responses: no cache
  else if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// Then other middleware (json parser already configured above with 50mb limit)
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

function buildSilentWavBuffer(durationMs = 600) {
  const sampleRate = 22050;
  const channelCount = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const dataSize = Math.max(1, Math.floor((sampleRate * channelCount * bytesPerSample * durationMs) / 1000));
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

// Serve the map API key securely for frontend
app.get('/api/maps-key', (req, res) => {
  const apiKey = process.env.MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not set' });
  }
  res.status(200).json({ apiKey });
});

// Serve the TomTom API key for navigation
app.get('/api/tomtom-key', (req, res) => {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TomTom API key not set' });
  }
  res.status(200).json({ apiKey });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = {
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      state: mongoose.connection.readyState,
      stateNames: ['disconnected', 'connected', 'connecting', 'disconnecting']
    }
  };
  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(status);
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const uploadedFile = req.files && req.files.file ? req.files.file : null;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const mimeType = uploadedFile.mimetype || 'audio/webm';
    const audioBase64 = uploadedFile.data.toString('base64');
    const modelCandidates = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

    for (const model of modelCandidates) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: 'Transcribe the speech in this audio clip. Return only the spoken text with no extra commentary.' },
              { inline_data: { mime_type: mimeType, data: audioBase64 } }
            ]
          }]
        })
      });

      const rawText = await response.text();
      let data = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch (error) { data = { raw: rawText }; }

      if (response.ok) {
        const transcription = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        return res.json({ text: transcription || 'Audio received. Please speak more clearly.' });
      }

      if (data?.error?.code === 404) continue;
      return res.status(response.status).json({ error: 'Transcription failed', details: data });
    }

    return res.status(502).json({ error: 'Transcription failed' });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

app.get('/api/auth/google-config', (req, res) => {
  const { clientId } = getGoogleOAuthConfig();
  res.json({ clientId });
});

app.options('/api/auth/google', cors(corsOptions));
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential is required' });
    }

    const { clientId } = getGoogleOAuthConfig();
    if (!clientId) {
      return res.status(500).json({ success: false, error: 'Google OAuth client ID is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ success: false, error: 'Google account email is required' });
    }

    const normalizedEmail = String(payload.email).trim().toLowerCase();
    let user = await User.findOne({ $or: [{ email: normalizedEmail }, { googleId: payload.sub }] });

    if (!user) {
      let username = buildGoogleUsername(normalizedEmail);
      let existingUsername = await User.findOne({ username });
      while (existingUsername) {
        username = buildGoogleUsername(normalizedEmail);
        existingUsername = await User.findOne({ username });
      }

      const userData = buildGoogleUserData({
        ...payload,
        email: normalizedEmail,
        name: payload.name || payload.given_name || payload.family_name || username
      });
      userData.username = username;
      userData.email = normalizedEmail;
      user = await User.create(userData);
    } else {
      const updates = {};
      if (!user.googleId) updates.googleId = payload.sub;
      if (!user.authProvider) updates.authProvider = 'google';
      if (!user.emailVerified) updates.emailVerified = payload.email_verified !== false;
      if (!user.name && payload.name) updates.name = payload.name;
      if (!user.profilePicture && payload.picture) updates.profilePicture = payload.picture;
      if (!user.lastLogin) updates.lastLogin = new Date();
      if (Object.keys(updates).length) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        user = await User.findById(user._id);
      }
    }

    req.session.userId = user._id;
    req.session.save((err) => {
      if (err) {
        console.error('Google SSO session save error:', err);
        return res.status(500).json({ success: false, error: 'Unable to start a session' });
      }

      const avatar = user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=3182ce&color=fff`;
      res.json({
        success: true,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        state: user.state || '',
        lga: user.lga || '',
        address: user.address || '',
        profilePicture: user.profilePicture || '',
        avatar,
        authProvider: 'google'
      });
    });
  } catch (error) {
    console.error('Google SSO error:', error);
    return res.status(401).json({ success: false, error: 'Google sign-in failed' });
  }
});

app.post('/api/tts', (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const audioBuffer = buildSilentWavBuffer(700);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: error.message || 'TTS failed' });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLanguage = 'en', targetLanguage = 'ar' } = req.body || {};
    const inputText = String(text || '').trim();

    if (!inputText) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'Translation API key not configured' });
    }

    const targetLabel = targetLanguage === 'ar' ? 'Arabic' :
      targetLanguage === 'fr' ? 'French' :
      targetLanguage === 'ha' ? 'Hausa' :
      targetLanguage === 'ff' ? 'Fulfulde' :
      targetLanguage === 'yo' ? 'Yoruba' :
      targetLanguage === 'ig' ? 'Igbo' :
      targetLanguage === 'pcm' ? 'Nigerian Pidgin' : 'English';

    const prompt = `Translate the following text from ${sourceLanguage || 'English'} to ${targetLabel}. Return only the translated text and preserve the meaning. Do not add any explanation or notes.\n\n${inputText}`;
    const translationModel = process.env.GEMINI_DEFAULT_MODEL || process.env.DEFAULT_CHAT_MODEL || 'gemini-3.6-flash';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${translationModel}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    const rawText = await response.text();
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; } catch (error) { data = { raw: rawText }; }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Translation failed', details: data });
    }

    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return res.json({ translatedText: translatedText || inputText });
  } catch (error) {
    console.error('Translation route error:', error);
    return res.status(500).json({ error: error.message || 'Translation failed' });
  }
});

// Security middleware with appropriate settings for CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

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
    
    // Normalize model names for the Gemini API and support the new UI-friendly names.
    let normalizedModel = String(model || '').trim();
    const modelMap = {
      'google/gemini-3.6-flash': 'gemini-3.6-flash',
      'google/gemini-3.5-flash': 'gemini-3.5-flash',
      'google/gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
      'google/gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
      'gemini-3.6-flash': 'gemini-3.6-flash',
      'gemini-3.5-flash': 'gemini-3.5-flash',
      'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
      'gemini-pro-vision': 'gemini-3.6-flash',
      'gemini-pro': 'gemini-3.6-flash',
      'google/gemini-2.0-flash': 'gemini-3.6-flash',
      'google/gemini-1.5-flash': 'gemini-3.6-flash',
      'google/gemini-2.5-flash': 'gemini-3.6-flash',
    };

    if (modelMap[normalizedModel]) {
      normalizedModel = modelMap[normalizedModel];
      console.log(`Mapped ${model} to ${normalizedModel}`);
    } else if (normalizedModel.startsWith('google/')) {
      normalizedModel = normalizedModel.replace(/^google\//, '');
    }
    
    // Use v1beta endpoint which accepts `contents: [{ text: '...' }]` payloads
    let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${API_KEY}`;

    console.log(`Calling Gemini API with model: ${normalizedModel} (requested: ${model})`);

    // Normalize incoming `contents` into v1beta-friendly shape: [{ text: '...' }]
    const normalizedContents = Array.isArray(contents)
      ? contents.map(item => (typeof item === 'string' ? { text: item } : (item && item.text ? { text: item.text } : item)))
      : [{ text: String(contents) }];

    // First, try to use an installed official SDK (if available). This makes requests
    // using the provider's client library which constructs the correct request schema.
    let sdkTried = false;
    try {
      let sdk = null;
      try { sdk = require('@google-cloud/generative-ai'); } catch (e) { /* try other names */ }
      if (!sdk) {
        try { sdk = require('@google-ai/generative-ai'); } catch (e) { /* no sdk installed */ }
      }

      if (sdk) {
        sdkTried = true;
        console.log('Generative AI SDK detected - attempting SDK-based call');

        // Try a couple of common client class names/entry points used by community SDKs.
        let sdkClient = null;
        try {
          // Newer Google SDKs expose a client we can instantiate without extra auth when using API key
          if (sdk.GenerativeServiceClient) sdkClient = new sdk.GenerativeServiceClient({ apiKey: API_KEY });
          else if (sdk.TextServiceClient) sdkClient = new sdk.TextServiceClient({ apiKey: API_KEY });
          else if (sdk.GenerativeLanguageServiceClient) sdkClient = new sdk.GenerativeLanguageServiceClient({ apiKey: API_KEY });
          else if (typeof sdk === 'function') sdkClient = new sdk({ apiKey: API_KEY });
        } catch (err) {
          console.warn('Could not instantiate SDK client:', err && err.message ? err.message : err);
          sdkClient = null;
        }

        if (sdkClient) {
          try {
            // Try common method names. If one fails we'll fall back to HTTP attempts below.
            const promptText = normalizedContents.map(c => (c && c.text) ? c.text : String(c)).join('\n\n');

            if (typeof sdkClient.generateText === 'function') {
              const sdkResp = await sdkClient.generateText({ model: normalizedModel, input: promptText });
              console.log('SDK response received via generateText');
              return res.json(sdkResp);
            } else if (typeof sdkClient.generate === 'function') {
              const sdkResp = await sdkClient.generate({ model: normalizedModel, prompt: promptText });
              console.log('SDK response received via generate');
              return res.json(sdkResp);
            } else if (typeof sdkClient.predict === 'function') {
              const sdkResp = await sdkClient.predict({ model: normalizedModel, input: promptText });
              console.log('SDK response received via predict');
              return res.json(sdkResp);
            } else {
              console.log('SDK client found but no known method names - skipping SDK attempt');
            }
          } catch (sdkErr) {
            console.warn('SDK call failed, falling back to HTTP requests:', sdkErr && sdkErr.message ? sdkErr.message : sdkErr);
          }
        }
      }
    } catch (sdkDetectErr) {
      console.warn('Error while attempting to load Generative AI SDK:', sdkDetectErr && sdkDetectErr.message ? sdkDetectErr.message : sdkDetectErr);
    }

    // If SDK not installed or SDK call failed, continue with HTTP attempts below.
    if (!sdkTried) console.log('No Generative AI SDK detected locally; using HTTP fallback attempts');

    // Try a sequence of candidate request shapes/endpoints until one succeeds.
    const candidateAttempts = [];

    // Primary: v1beta generateContent with contents array (common modern shape)
    candidateAttempts.push({ url: `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${API_KEY}`, body: { contents: normalizedContents } });

    // Try v1 generateContent as some deployments accept slightly different schemas
    candidateAttempts.push({ url: `https://generativelanguage.googleapis.com/v1/models/${normalizedModel}:generateContent?key=${API_KEY}`, body: { contents: normalizedContents } });

    // Try wrapping contents into an `input` field
    candidateAttempts.push({ url: `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${API_KEY}`, body: { input: normalizedContents.map(c => (c && c.text) ? c.text : String(c)) } });

    // Try a single concatenated prompt under `prompt` (some endpoints expect a prompt object)
    candidateAttempts.push({ url: `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${API_KEY}`, body: { prompt: { text: normalizedContents.map(c => (c && c.text) ? c.text : String(c)).join('\n\n') } } });

    let response = null;
    let data = null;
    let lastError = null;

    for (let i = 0; i < candidateAttempts.length; i++) {
      const attempt = candidateAttempts[i];
      try {
        console.log(`Gemini attempt ${i+1}/${candidateAttempts.length} -> URL:`, attempt.url);
        try { console.log('Outgoing body (truncated):', JSON.stringify(attempt.body).slice(0, 2000)); } catch (e) { console.log('Could not stringify attempt body', e); }

        response = await fetch(attempt.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.body)
        });

        const rawText = await response.text();
        try { data = rawText ? JSON.parse(rawText) : null; } catch (parseErr) { data = { raw: rawText }; }

        console.log('Attempt response status:', response.status);
        if (rawText && rawText.length < 2000) console.log('Attempt raw response (truncated):', rawText);

        if (response.ok) {
          break; // success
        } else {
          lastError = data || rawText;
          console.warn('Attempt failed, status:', response.status, 'body:', lastError);
        }
      } catch (err) {
        lastError = err;
        console.error('Attempt fetch error:', err && err.message ? err.message : err);
      }
    }
    
    // If the primary model fails with 404, log the issue so the caller can retry with a supported model.
    if (!response.ok && data?.error?.code === 404) {
      console.warn(`Gemini model ${normalizedModel} returned 404; verify the model ID is supported by the configured API key.`);
    }
    
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

// ============ CHAT HELPERS ============
const OPENAI_MODEL_MAP = {
  'openai/gpt-4o': 'gpt-4o',
  'openai/gpt-4o-mini': 'gpt-4o-mini',
  'openai/gpt-4.1': 'gpt-4.1',
  'openai/gpt-4.1-mini': 'gpt-4.1-mini',
  'openai/gpt-5.5': 'gpt-4o',
  'openai/gpt-5-mini': 'gpt-4o-mini',
};

const GEMINI_MODEL_MAP = {
  'google/gemini-3.6-flash': 'gemini-3.6-flash',
  'google/gemini-3.5-flash': 'gemini-3.5-flash',
  'google/gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'google/gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
  'google/gemini-2.0-flash': 'gemini-3.6-flash',
  'google/gemini-1.5-flash': 'gemini-3.6-flash',
  'google/gemini-1.5-pro': 'gemini-3.6-flash',
  'google/gemini-2.5-flash': 'gemini-3.6-flash',
};

const GEMINI_FALLBACK_MODELS = {
  'gemini-3.6-flash': 'gemini-3.5-flash',
  'gemini-3.5-flash': 'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite': 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite': 'gemini-3.6-flash',
};

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function geminiPartsFromMessageParts(parts) {
  if (!Array.isArray(parts) || !parts.length) return [{ text: '' }];
  return parts.map((part) => {
    if (part.type === 'text') return { text: part.text || '' };
    if (part.type === 'file') {
      const parsed = parseDataUrl(part.url);
      const mimeType = part.mediaType || parsed?.mimeType || '';
      if (parsed && mimeType.startsWith('image/')) {
        return { inline_data: { mime_type: mimeType, data: parsed.data } };
      }
      return { text: `[File: ${part.filename || 'attachment'}]` };
    }
    return { text: '' };
  }).filter((part) => part.text || part.inline_data);
}

function openaiContentFromParts(parts) {
  if (!Array.isArray(parts) || !parts.length) return '';
  const hasImage = parts.some(
    (part) => part.type === 'file' && (part.mediaType || '').startsWith('image/')
  );
  if (!hasImage) {
    return parts
      .map((part) => {
        if (part.type === 'text') return part.text || '';
        if (part.type === 'file') return `[File: ${part.filename || 'attachment'}]`;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return parts
    .map((part) => {
      if (part.type === 'text') return { type: 'text', text: part.text || '' };
      if (part.type === 'file' && (part.mediaType || '').startsWith('image/')) {
        return { type: 'image_url', image_url: { url: part.url } };
      }
      if (part.type === 'file') {
        return { type: 'text', text: `[File: ${part.filename || 'attachment'}]` };
      }
      return null;
    })
    .filter(Boolean);
}

const LOCAL_KNOWLEDGE_ROOT = path.resolve(__dirname, 'details', 'En');
const LOCAL_KNOWLEDGE_CACHE = { data: null, loadedAt: 0 };
const MAX_LOCAL_KNOWLEDGE_CHARS = 18000;

function stripHtmlToText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function readLocalKnowledgeBase() {
  const now = Date.now();
  if (LOCAL_KNOWLEDGE_CACHE.data && now - LOCAL_KNOWLEDGE_CACHE.loadedAt < 60000) {
    return LOCAL_KNOWLEDGE_CACHE.data;
  }

  const documents = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.html', '.htm', '.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml'].includes(ext)) {
        continue;
      }
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        let text = raw;
        if (ext === '.html' || ext === '.htm') {
          text = stripHtmlToText(raw);
        } else if (ext === '.json') {
          text = JSON.stringify(JSON.parse(raw), null, 2);
        }
        text = text.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        documents.push({
          path: path.relative(__dirname, fullPath).replace(/\\/g, '/'),
          content: text.slice(0, 5000),
        });
      } catch (error) {
        console.warn('Skipping local knowledge file:', fullPath, error.message);
      }
    }
  }

  walk(LOCAL_KNOWLEDGE_ROOT);

  const sortedDocs = documents.sort((a, b) => a.path.localeCompare(b.path));
  let combinedText = sortedDocs.map((doc) => `[File: ${doc.path}] ${doc.content}`).join('\n\n');
  if (combinedText.length > MAX_LOCAL_KNOWLEDGE_CHARS) {
    combinedText = combinedText.slice(0, MAX_LOCAL_KNOWLEDGE_CHARS) + '\n...';
  }

  const result = { docs: sortedDocs, text: combinedText };
  LOCAL_KNOWLEDGE_CACHE.data = result;
  LOCAL_KNOWLEDGE_CACHE.loadedAt = now;
  return result;
}

function extractUserQuery(messages) {
  if (!Array.isArray(messages)) return '';
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'user') continue;
    const text = (message.parts || [])
      .filter((part) => part?.type === 'text')
      .map((part) => part.text || '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  return '';
}

function getRelevantKnowledgeSnippet(query, knowledge) {
  const normalizedQuery = String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedQuery) return '';

  const terms = normalizedQuery.split(' ').filter((term) => term.length > 2);
  if (!terms.length) return '';

  const exactTerms = Array.from(new Set([normalizedQuery, ...terms]));
  const scoredDocs = knowledge.docs
    .map((doc) => {
      const haystack = `${doc.path} ${doc.content}`.toLowerCase();
      const exactMatches = exactTerms.filter((term) => haystack.includes(term));
      const tokenMatches = terms.filter((term) => haystack.includes(term));
      const pathMatches = exactTerms.filter((term) => doc.path.toLowerCase().includes(term));
      const score = exactMatches.length * 4 + tokenMatches.length * 2 + pathMatches.length * 3;
      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 2);

  if (!scoredDocs.length) return '';

  return scoredDocs
    .map((doc) => doc.content.slice(0, 1600).trim())
    .join('\n\n---\n\n');
}

function shouldUseWebGrounding(query) {
  const normalized = String(query || '').toLowerCase();
  if (!normalized) return false;

  const patterns = [
    /\b(latest|recent|today|current|now|news|update|updated|what happened|who is|when did|where is|weather|price|cost|salary|schedule|event|upcoming|travel|traffic|election|exchange rate|phone number|contact|near me|best|top|review|rating)\b/,
    /\b(news|latest|current|today|yesterday|this week|this month)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

async function fetchGoogleSearchGrounding(query) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

  if (!apiKey || !engineId) {
    return null;
  }

  try {
    const endpoint = 'https://www.googleapis.com/customsearch/v1';
    const url = `${endpoint}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(engineId)}&q=${encodeURIComponent(query)}&num=5`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('Google search grounding failed:', response.status, text);
      return null;
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items.slice(0, 5) : [];
    if (!items.length) return null;

    return items.map((item) => ({
      title: item.title || 'Untitled result',
      link: item.link || '',
      snippet: item.snippet || '',
    }));
  } catch (error) {
    console.warn('Google search grounding error:', error.message || error);
    return null;
  }
}

async function buildLocalKnowledgePrompt(messages) {
  const knowledge = readLocalKnowledgeBase();
  if (!knowledge.text) return messages;

  const userQuery = extractUserQuery(messages);
  const relevantKnowledge = getRelevantKnowledgeSnippet(userQuery, knowledge);
  const needsClinicHint = /clinic|clinic yola|meddy|specialist|healthcare/i.test(userQuery || '');
  const clinicHint = needsClinicHint
    ? '\n\nIMPORTANT: If the user asks about a clinic, healthcare facility, pharmacy, hospital, specialist, or medical service, search the local knowledge base for that exact or similar name before answering.'
    : '';

  const knowledgeSection = relevantKnowledge
    ? `LOCAL KNOWLEDGE BASE (relevant excerpt):\n${relevantKnowledge}`
    : 'LOCAL KNOWLEDGE BASE: No directly relevant local excerpt was found for this request. Answer using your general knowledge and leverage local data only when clearly useful.';

  let webGroundingSection = '';
  if (shouldUseWebGrounding(userQuery)) {
    const webResults = await fetchGoogleSearchGrounding(userQuery);
    if (webResults && webResults.length) {
      const formattedResults = webResults
        .map((item) => `- ${item.title}\n  ${item.snippet}\n  Source: ${item.link}`)
        .join('\n\n');
      webGroundingSection = `\n\nWEB GROUNDING RESULTS (use these as supporting evidence when relevant):\n${formattedResults}`;
    } else {
      webGroundingSection = '\n\nWEB GROUNDING: No live web results were available for this request. Do not invent facts beyond the available context.';
    }
  }

  const promptText = `You are Yola AI assistant. Use the local English knowledge base from the project as a helpful reference, but do not let it override your general reasoning ability. Combine both sources:
  1. For named places, businesses, people, clinics, services, and events, first search the local knowledge base for that exact or similar name.
  2. If the local files contain relevant information, answer from those files first and say that the answer is based on the local project data.
  3. If the local files do not contain enough information, use your general knowledge and say that you are supplementing with general knowledge.
  4. If web grounding results are available, use them to support current or factual answers and mention the relevant source briefly when helpful.
  5. Do not claim that the local data is empty unless you have checked it and found no relevant match.
  6. If you see a relevant local excerpt, use it directly rather than listing file names or file paths.${clinicHint}

USER QUESTION:
${userQuery || 'No specific question provided.'}

${knowledgeSection}${webGroundingSection}`;

  return [{ role: 'user', parts: [{ type: 'text', text: promptText }] }].concat(messages || []);
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part.text || '').join('').trim();
}

function sendPlainTextChatResponse(res, content) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(content || '_(no response)_');
  res.end();
}

function buildLocalFallbackReply(messages) {
  const userMessage = Array.isArray(messages)
    ? messages
        .slice()
        .reverse()
        .find((message) => message?.role === 'user')
    : null;
  const query = (userMessage?.parts || [])
    .filter((part) => part?.type === 'text')
    .map((part) => part.text || '')
    .join(' ')
    .trim();

  const knowledge = readLocalKnowledgeBase();
  const relevantKnowledge = getRelevantKnowledgeSnippet(query, knowledge);

  if (!query) {
    return 'I am currently unable to reach the external AI service. I am using the local project files as the backup knowledge source and will provide a concise answer based on what is available.';
  }

  if (!relevantKnowledge) {
    return `I could not reach the external AI service. I found no directly relevant local project excerpt for "${query}". Please see below for a concise answer from available local context and general knowledge.`;
  }

  return `I was unable to reach the external AI service, so I am answering using the local project data for your request: "${query}". Here is the most relevant local excerpt:\n\n${relevantKnowledge}`;
}

async function callGeminiGenerate(apiKey, model, geminiMessages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    }),
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { raw: rawText };
  }

  return { response, data };
}

// ============ UNIFIED CHAT ENDPOINT ============
// Routes to different AI providers based on model selection
// Supports: OpenAI (GPT-5.5, GPT-5-mini) and Google (Gemini 2.5 Flash, Gemini 2.5 Pro)
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: 'Missing model or messages' });
    }

    const contextualMessages = await buildLocalKnowledgePrompt(messages);

    if (model.startsWith('openai/')) {
      return handleOpenAIChat(req, res, model, contextualMessages);
    }
    if (model.startsWith('google/')) {
      return handleGeminiChat(req, res, model, contextualMessages);
    }

    return res.status(400).json({ error: `Unknown model provider: ${model}` });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: error.message || 'Error processing chat request' });
  }
});

app.get('/api/local-knowledge-files', (req, res) => {
  try {
    const files = [];
    const ignored = [];
    const allowedExt = ['.html', '.htm', '.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml'];

    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExt.includes(ext)) {
          files.push(path.relative(__dirname, fullPath).replace(/\\/g, '/'));
        } else {
          ignored.push(path.relative(__dirname, fullPath).replace(/\\/g, '/'));
        }
      }
    }

    walk(LOCAL_KNOWLEDGE_ROOT);
    files.sort();
    ignored.sort();

    const localKnowledge = readLocalKnowledgeBase();
    const includedFiles = Array.isArray(localKnowledge.docs)
      ? localKnowledge.docs.map((doc) => doc.path)
      : [];

    res.json({
      root: LOCAL_KNOWLEDGE_ROOT,
      allowedExtensions: allowedExt,
      maxCharsIncluded: MAX_LOCAL_KNOWLEDGE_CHARS,
      discoveredFilesCount: files.length,
      discoveredFiles: files,
      includedFilesCount: includedFiles.length,
      includedFiles,
      ignoredFilesCount: ignored.length,
      ignoredFiles: ignored,
    });
  } catch (error) {
    console.error('Local knowledge files check error:', error);
    res.status(500).json({ error: error.message || 'Error listing local knowledge files' });
  }
});

// ============ OPENAI HANDLER ============
async function handleOpenAIChat(req, res, model, messages) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in environment');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const actualModel = OPENAI_MODEL_MAP[model] || 'gpt-4o';
    const openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    console.log(`Calling OpenAI API with model: ${actualModel} (requested: ${model})`);

    const openaiMessages = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: openaiContentFromParts(msg.parts),
    }));

    const response = await fetch(`${openaiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      }),
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      const fallback = buildLocalFallbackReply(messages);
      return sendPlainTextChatResponse(res, fallback);
    }

    const content = data?.choices?.[0]?.message?.content || '';
    sendPlainTextChatResponse(res, typeof content === 'string' ? content : JSON.stringify(content));
  } catch (error) {
    console.error('OpenAI handler error:', error);
    const fallback = buildLocalFallbackReply(messages);
    return sendPlainTextChatResponse(res, fallback);
  }
}

// ============ GEMINI HANDLER ============
async function handleGeminiChat(req, res, model, messages) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set in environment');
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const configuredGeminiDefault = process.env.GEMINI_DEFAULT_MODEL || process.env.DEFAULT_CHAT_MODEL || 'gemini-3.6-flash';
    let actualModel = GEMINI_MODEL_MAP[model] || GEMINI_MODEL_MAP[process.env.DEFAULT_CHAT_MODEL] || GEMINI_MODEL_MAP['google/' + configuredGeminiDefault] || configuredGeminiDefault;
    console.log(`Calling Gemini API with model: ${actualModel} (requested: ${model})`);

    const geminiMessages = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: geminiPartsFromMessageParts(msg.parts),
    }));

    const { response, data } = await callGeminiGenerate(GEMINI_API_KEY, actualModel, geminiMessages);

    if (!response.ok) {
      console.error('Gemini API error:', data);
      const fallback = buildLocalFallbackReply(messages);
      return sendPlainTextChatResponse(res, fallback);
    }

    sendPlainTextChatResponse(res, extractGeminiText(data));
  } catch (error) {
    console.error('Gemini handler error:', error);
    const fallback = buildLocalFallbackReply(messages);
    return sendPlainTextChatResponse(res, fallback);
  }
}

const resetPasswordPageUrl = isProduction
  ? 'https://yolaaiinfohub.netlify.app/pages/reset-password.html'
  : 'http://localhost:5500/pages/reset-password.html';

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 20, // allow up to 20 attempts within the window
  message: { error: 'Too many login attempts, please try again later' }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 3 attempts
  message: { error: 'Too many signup attempts, please try again later' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many password reset attempts, please try again later' }
});

// Input validation middleware
const { body, validationResult } = validator;

const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include uppercase, lowercase, a number, and a special character'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim(),
  body('nin')
    .trim()
    .matches(/^\d{11}$/)
    .withMessage('NIN must be exactly 11 digits'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('lga')
    .trim()
    .notEmpty()
    .withMessage('Local government area is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('termsAccepted')
    .custom((value) => value === true || value === 'true')
    .withMessage('You must accept the terms of use')
];
function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlaceholderValue(value) {
  const normalized = normalizeEnvValue(value).toLowerCase();
  if (!normalized) return true;
  return [
    'your_',
    'replace_with',
    'example.com',
    'your_email@gmail.com',
    'your_app_password_here',
    'apikey',
    'changeme',
    'placeholder'
  ].some((token) => normalized.includes(token));
}

// Email transport configuration
// Configure email transporter only if SMTP credentials are present
let transporter = null;
const emailHost = normalizeEnvValue(process.env.EMAIL_HOST);
const emailPort = process.env.EMAIL_PORT ? Number(normalizeEnvValue(process.env.EMAIL_PORT)) : undefined;
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

if (emailConfigured) {
  transporter = nodemailer.createTransport({
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
  });

  // Verify transporter configuration early so issues surface on startup
  transporter.verify().then(() => {
    console.log('Email transporter verified');
  }).catch(err => {
    console.error('Email transporter verification failed. Email may not be sent:', err && err.message ? err.message : err);
  });
} else {
  console.warn('Email not configured: set valid EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in the active environment to enable email sending.');
}
// For development/testing: store last generated reset link in memory so it can be inspected
let lastResetLink = null;
// Control whether reset links are returned in API responses (dev-only)
const includeResetInResponse = !isProduction && process.env.DEBUG_RESET === 'true';

function generateOtpCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += String(Math.floor(Math.random() * 10));
  }
  return code;
}

async function sendEmailNotification(to, subject, htmlContent) {
  if (!transporter || !emailConfigured) {
    console.warn('Email not configured, skipping notification');
    return;
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      html: htmlContent
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

async function sendOtpEmail(to, code, purpose = 'verify your account') {
  if (!transporter || !emailConfigured) {
    console.warn('Email not configured, skipping OTP email');
    return { sent: false };
  }

  const subject = purpose === 'reset' ? 'Your password reset code' : 'Your email verification code';
  const html = `
    <h2>${subject}</h2>
    <p>Your one-time code is <strong>${code}</strong>.</p>
    <p>This code expires in 10 minutes.</p>
    <p>If you did not request this, you can safely ignore this message.</p>
  `;

  try {
    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      html
    });
    return { sent: true };
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return { sent: false, error };
  }
}

async function sendSmsOtp(user, code) {
  const provider = (process.env.SMS_PROVIDER || 'twilio').toLowerCase();
  if (provider !== 'twilio') {
    return { sent: false, reason: 'sms provider not configured' };
  }

  const accountSid = process.env.SMS_ACCOUNT_SID;
  const authToken = process.env.SMS_AUTH_TOKEN;
  const from = process.env.SMS_FROM;
  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: 'sms credentials missing' };
  }

  try {
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: user.phone,
        From: from,
        Body: `Your Yola AI Info Hub verification code is ${code}`
      })
    });

    const payload = await response.text();
    if (!response.ok) {
      console.error('Twilio SMS failed', payload);
      return { sent: false, reason: payload };
    }

    return { sent: true };
  } catch (error) {
    console.error('Failed to send SMS OTP:', error);
    return { sent: false, error };
  }
}

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB.');
  console.log('   MONGO_URI:', process.env.MONGO_URI?.substring(0, 50) + '...' || 'NOT SET');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('   MONGO_URI configured:', !!process.env.MONGO_URI);
  console.error('   Make sure MongoDB is running. For local development, run: mongod');
  console.error('   For MongoDB Atlas, verify the connection string in .env file');
});

// Prevent unhandled promise rejections from crashing the process during dev
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // note: not calling process.exit to keep server alive
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
  googleId: { type: String, default: null },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  resetToken: String,
  resetTokenExpires: Date,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailOtpCode: String,
  emailOtpExpires: Date,
  phoneOtpCode: String,
  phoneOtpExpires: Date,
  phoneVerified: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  accountStatus: { type: String, enum: ['active', 'suspended', 'pending'], default: 'pending' },
  profilePicture: String,
  dateOfBirth: String,
  bio: String,
  termsAccepted: { type: Boolean, required: true },
  termsAcceptedDate: { type: Date },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  // User settings
  settings: {
    language: { type: String, default: 'en' },
    darkMode: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  }
});
const User = mongoose.model('User', userSchema);

// Chat History Schema - stores per-user, per-section chat histories
const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }, // For quick lookup
  section: { type: String, required: true }, // home, edu, agro, medi, navi, eco, servi, community, about
  messages: [{
    id: String,
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: String,
    timestamp: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
chatHistorySchema.index({ userId: 1, section: 1 }, { unique: true });
const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

// Signup
app.options('/api/signup', cors(corsOptions)); // Handle preflight
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

    const verificationUrl = `${(process.env.FRONTEND_URL || process.env.FRONT_END_URL || 'https://yolaaiinfohub.netlify.app').replace(/\/$/, '')}/pages/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    const emailOtpCode = generateOtpCode();
    const phoneOtpCode = generateOtpCode();

    await User.updateOne({ _id: user._id }, {
      $set: {
        emailOtpCode,
        emailOtpExpires: Date.now() + 10 * 60 * 1000,
        phoneOtpCode,
        phoneOtpExpires: Date.now() + 10 * 60 * 1000
      }
    });

    await sendEmailNotification(email, 'Welcome to Yola AI Info Hub', `
      <h2>Welcome to Yola AI Info Hub!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for signing up for Yola AI Info Hub. Your account has been created successfully.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>You can now access all features of our platform including AI chat, maps, and community resources.</p>
      <p>Please verify your email by visiting <a href="${verificationUrl}">this secure verification link</a>.</p>
      <p>If you prefer to verify with a code, use <strong>${emailOtpCode}</strong> on the verification page.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <br>
      <p>Best regards,<br>Yola AI Info Hub Team</p>
      <p>For more information, contact the developer: <br> Husseini Hamidu Alkali <br> +234 7012244240 / +234 9069530196 <br> husseinihamidualkali@gmail.com</p>
    `);

    if (phone && process.env.SMS_VERIFY_REQUIRED === 'true') {
      await sendSmsOtp({ phone }, phoneOtpCode);
    }

    // Send welcome email notification
    const welcomeHtml = `
      <h2>Welcome to Yola AI Info Hub!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for signing up for Yola AI Info Hub. Your account has been created successfully.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>You can now access all features of our platform including AI chat, maps, and community resources.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <br>
      <p>Best regards,<br>Yola AI Info Hub Team</p>
      <p>For more information, contact the developer: <br> Husseini Hamidu Alkali <br> +234 7012244240 / +234 9069530196 <br> husseinihamidualkali@gmail.com</p>
    `;
    sendEmailNotification(email, 'Welcome to Yola AI Info Hub', welcomeHtml);

    req.session.userId = user._id;
    req.session.save((err) => {
      if (err) console.error('Session save error on signup:', err);
      res.json({
        success: true,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        requiresEmailVerification: true,
        verificationCode: emailOtpCode,
        message: 'Account created successfully. Check your inbox for verification instructions.'
      });
    });
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
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

    const user = await User.findOne(email ? { email } : { phone });
    if (!user) {
      return res.status(404).json({ error: 'No account with that email exists' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(resetToken, 10);
    
  // Use a targeted update to avoid triggering full-document validators
  await User.updateOne({ _id: user._id }, { $set: { resetToken: hash, resetTokenExpires: Date.now() + 3600000 } });

    // Build a safe reset URL: ALWAYS use production domain for email links
    // Never use request origin for email links - it may be localhost/127.0.0.1
    // Extract production URL from environment (ignore localhost entries)
    let frontendUrl = process.env.FRONTEND_URL || process.env.FRONT_END_URL || 'https://yolaaiinfohub.netlify.app';
    // Handle case where multiple URLs are in the env variable (comma-separated)
    frontendUrl = frontendUrl.split(',')[0].trim(); // Get first URL
    // If it's localhost, fall back to production URL
    if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
      frontendUrl = 'https://yolaaiinfohub.netlify.app';
    }
    const origin = frontendUrl.replace(/\/$/, '');
    const resetEmail = email || user.email;
    // User's site uses pages/reset-password.html as the reset page; build link accordingly
  const resetUrl = `${origin}/pages/reset-password.html?token=${resetToken}&email=${encodeURIComponent(resetEmail)}`;
  // store for debugging
  lastResetLink = resetUrl;

    // Prepare mail options with proper HTML formatting
    const destination = email || user.email;
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: destination,
      subject: 'Password Reset - Yola AI Info Hub',
      html: `<html>
              <body style="font-family:Arial,sans-serif;">
                <div style="max-width:600px;margin:30px auto;">
                  <h2>Password Reset</h2>
                    <p>Hi User,</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align:center;margin:30px 0;">
                      <a href="${resetUrl}" style="background:#3498db;color:white;padding:12px 30px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">Reset Password</a>
                    </div>
                    <p>This link expires in 1 hour.</p>
                    <p style="margin:25px 0;">If the button doesn't work, copy this link to your browser:</p>
                    <p style="background:#f0f0f0;padding:12px;word-break:break-all;">${resetUrl}</p>
                    <hr style="margin:25px 0;">
                    <p style="color:#666;font-size:13px;">If you didn't request this reset, you can ignore this email.</p>
                    <p style="color:#666;font-size:13px;">Best regards,<br>Yola AI Info Hub Team</p> 
                    <p>For more information, contact the developer: <br> Husseini Hamidu Alkali <br> +234 7012244240 / +234 9069530196 <br> husseinihamidualkali@gmail.com</p>
                </div> 
              </body>
            </html>`,
      text: `Password Reset Request\n\nHi User,\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nBest regards,\nYola AI Info Hub Team`
    };

    // Send email if transporter is configured; otherwise log the reset URL for manual testing
    if (transporter && emailConfigured) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${destination}`);
      } catch (sendErr) {
        console.error('Failed to send password reset email:', sendErr && sendErr.message ? sendErr.message : sendErr);
        if (process.env.SUPPRESS_RESET_LOG !== 'true') {
          console.log('Fallback - reset URL (copy this to browser to test):', resetUrl);
        }
        const respFail = { success: true, message: 'Password reset link generated. If you do not receive an email, contact support or check server logs.' };
        if (includeResetInResponse && lastResetLink) respFail.resetLink = lastResetLink;
        return res.json(respFail);
      }
    } else {
      if (isProduction) {
        console.error('Password reset email failed: SMTP is not configured in production.');
        return res.status(503).json({
          success: false,
          error: 'Password reset email is not configured on this server. Please contact support.'
        });
      }

      if (process.env.SUPPRESS_RESET_LOG !== 'true') {
        console.log('Email not configured; reset link:', resetUrl);
      }
      const respNoEmail = { success: true, message: 'Password reset link generated. Email sending is not configured on the server; check server logs for the reset link.' };
      if (includeResetInResponse && lastResetLink) respNoEmail.resetLink = lastResetLink;
      return res.json(respNoEmail);
    }

    const respOk = { success: true, message: email ? 'Password reset email sent' : 'Password reset request recorded' };
    if (includeResetInResponse && lastResetLink) respOk.resetLink = lastResetLink;
    res.json(respOk);
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

    // Verify token. Support both newly hashed tokens and legacy raw tokens
    // so older reset links still continue to work until a new reset is requested.
    const storedToken = user.resetToken;
    const isValid = !!storedToken && (
      storedToken === token ||
      (typeof storedToken === 'string' && storedToken.startsWith('$2') && await bcrypt.compare(token, storedToken))
    );
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
    const { token, email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification request' });
    }

    const isValidToken = !!token && user.emailVerificationToken === token;
    const isValidCode = !!code && user.emailOtpCode && user.emailOtpExpires && Date.now() < user.emailOtpExpires && user.emailOtpCode === code;

    if (!isValidToken && !isValidCode) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailOtpCode = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

app.post('/api/verify-email-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.emailOtpCode || !user.emailOtpExpires || Date.now() > user.emailOtpExpires) {
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    if (user.emailOtpCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.emailOtpCode = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email OTP verification error:', error);
    res.status(500).json({ error: 'Error verifying email code' });
  }
});

app.post('/api/verify-phone-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required' });
    }

    const user = await User.findOne({ phone });
    if (!user || !user.phoneOtpCode || !user.phoneOtpExpires || Date.now() > user.phoneOtpExpires) {
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    if (user.phoneOtpCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.phoneVerified = true;
    user.phoneOtpCode = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error) {
    console.error('Phone OTP verification error:', error);
    res.status(500).json({ error: 'Error verifying phone code' });
  }
});

// Login (by username or email)
app.options('/api/login', cors(corsOptions)); // Handle preflight
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Login attempt with disconnected database. State:', mongoose.connection.readyState);
      console.error('   MONGO_URI:', process.env.MONGO_URI ? '***set***' : 'NOT SET');
      console.error('   Error details: Database is not connected. Make sure MongoDB is running and MONGO_URI is configured.');
      return res.status(503).json({ error: 'Database connection unavailable. Please check your internet or try again later.' });
    }
    
    // Dev logging: record the login identifier (not the password) and timestamp
    if (!isProduction) {
      try {
        console.log('✓ Login attempt:', { identifier: email || username, ts: new Date().toISOString() });
      } catch (e) { /* ignore logging errors */ }
    }
    let user;
    
    // Find user by email or username
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ username });
    }

    if (!user) {
      if (!isProduction) console.log('Login result: user not found for', email || username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const verificationError = getEmailVerificationError(user);
    if (verificationError) {
      return res.status(verificationError.status).json({
        success: false,
        error: verificationError.message,
        requiresEmailVerification: true
      });
    }

    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      if (!isProduction) console.log('Login result: password mismatch for', user.username);
      return res.status(400).json({ error: 'Wrong password' });
      
      // Increment login attempts
      await User.updateOne({ _id: user._id }, { $inc: { loginAttempts: 1 } });
      
      // Send failed login alert if attempts exceed threshold and email notifications enabled
      if (user.loginAttempts >= 2 && user.settings && user.settings.emailNotifications) {
        const failedLoginHtml = `
          <h2>Failed Login Attempt Alert</h2>
          <p>Dear ${user.name},</p>
          <p>We detected multiple failed login attempts on your Yola AI Info Hub account.</p>
          <p><strong>Username:</strong> ${user.username}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${req.ip}</p>
          <p>If this wasn't you, please secure your account by changing your password immediately.</p>
          <p>If you forgot your password, use the reset password feature.</p>
          <br>
          <p>Best regards,<br>Yola AI Info Hub Team</p>
          <p>For more information, contact the developer: <br> Husseini Hamidu Alkali <br> +234 7012244240 / +234 9069530196 <br> husseinihamidualkali@gmail.com</p>
        `;
        sendEmailNotification(user.email, 'Yola AI Info Hub - Security Alert', failedLoginHtml);
      }
      
      return res.status(400).json({ error: 'Invalid credentials' });
    }

  // Update login info with targeted update (avoids full-document validation)
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), loginAttempts: 0 } });

    // Send login notification email if enabled
    if (user.settings && user.settings.emailNotifications) {
      const loginHtml = `
        <h2>Login Notification</h2>
        <p>Dear ${user.name},</p>
        <p>Your account was successfully logged in to Yola AI Info Hub.</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${req.ip}</p>
        <p>If this wasn't you, please contact support immediately for help on changing your password and securing your account.</p>
        <br>
        <p>Best regards,<br>Yola AI Info Hub Team</p>
        <p>For more information, contact the developer: <br> Husseini Hamidu Alkali <br> +234 7012244240 / +234 9069530196 <br> husseinihamidualkali@gmail.com</p>
      `;
      sendEmailNotification(user.email, 'Yola AI Info Hub - Login Notification', loginHtml);
    }

    // Set session
    req.session.userId = user._id;
    // Include avatar/profilePicture (or generated UI avatar) so frontend can display it immediately
    const avatar = user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=3182ce&color=fff`;
    
    // Server-side login logging
    console.log(`\n✅ [LOGIN SUCCESS] ${new Date().toISOString()}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   IP: ${req.ip}`);
    console.log(`   User Agent: ${req.get('user-agent')}\n`);
    
    console.log('💾 Saving session for user:', user.username, 'sessionID:', req.sessionID);
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error on login:', err);
        return res.status(500).json({ error: 'Failed to establish session' });
      }
      console.log('✅ Session saved successfully. Setting Set-Cookie header');
      res.json({ success: true, username: user.username, name: user.name, email: user.email, phone: user.phone, state: user.state, lga: user.lga, address: user.address, profilePicture: user.profilePicture, avatar });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('   Error message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   MongoDB state:', mongoose.connection.readyState);
    
    // Provide specific error messages
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection failed. Please ensure MongoDB is running.' });
    }
    
    res.status(500).json({ error: 'Error processing login. Please try again.' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const username = req.session.userId ? 'unknown' : 'no-session';
  console.log(`\n🚪 [LOGOUT] ${new Date().toISOString()}`);
  console.log(`   IP: ${req.ip}\n`);
  
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check auth
app.get('/api/me', async (req, res) => {
  // Prevent caching of auth status - must always check fresh from session
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  console.log('🔍 /api/me called - Session info:', { 
    hasSession: !!req.session,
    userId: req.session?.userId,
    sessionId: req.sessionID,
    cookies: req.headers.cookie 
  });
  
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await User.findById(req.session.userId);
  if (!user) return res.json({ loggedIn: false });
  const avatar = user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=3182ce&color=fff`;
  res.json({ loggedIn: true, username: user.username, name: user.name, email: user.email, phone: user.phone, state: user.state, lga: user.lga, address: user.address, profilePicture: user.profilePicture, avatar });
});

// Get public profile by username (limited fields)
app.get('/api/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if the requesting user is viewing their own profile
    const isOwnProfile = req.session.userId && req.session.userId === user._id.toString();
    
    const avatar = user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=3182ce&color=fff`;
    res.json({ 
      loggedIn: isOwnProfile,  // Return true only if viewing own profile while authenticated
      username: user.username, 
      name: user.name, 
      email: user.email, 
      phone: user.phone, 
      state: user.state, 
      lga: user.lga, 
      address: user.address, 
      profilePicture: user.profilePicture, 
      avatar 
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Update profile endpoint
app.post('/api/update-profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { username, name, email, phone, state, lga, address, dateOfBirth, bio } = req.body;
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate username if changed
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already in use' });
      }
    }

    // Validate email if changed
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (state !== undefined) updateData.state = state;
    if (lga !== undefined) updateData.lga = lga;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (bio !== undefined) updateData.bio = bio;

    // Handle profile picture upload
    if (req.files && req.files.profilePicture) {
      const profilePic = req.files.profilePicture;
      // Convert to base64 for simplicity; in production, use cloud storage
      updateData.profilePicture = `data:${profilePic.mimetype};base64,${profilePic.data.toString('base64')}`;
    }

    // Use updateOne to avoid full document validation
    await User.updateOne({ _id: req.session.userId }, { $set: updateData }, { runValidators: false });

    // Fetch updated user data
    const updatedUser = await User.findById(req.session.userId);

    // Return updated user data
    const avatar = updatedUser.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUser.name || updatedUser.username)}&background=3182ce&color=fff`;
    res.json({ 
      success: true,
      username: updatedUser.username, 
      name: updatedUser.name, 
      email: updatedUser.email, 
      phone: updatedUser.phone, 
      state: updatedUser.state, 
      lga: updatedUser.lga, 
      address: updatedUser.address,
      dateOfBirth: updatedUser.dateOfBirth,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture,
      avatar 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Chat History Endpoints
// Save/Update chat history for a section
app.post('/api/chat-history/:section', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { section } = req.params;
    const { messages } = req.body;

    if (!section || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid section or messages' });
    }

    // Get user
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Keep only the last 20 messages
    const trimmedMessages = messages.slice(-20);

    // Update or create chat history
    let chatHistory = await ChatHistory.findOne({
      userId: req.session.userId,
      section: section
    });

    if (chatHistory) {
      chatHistory.messages = trimmedMessages;
      chatHistory.updatedAt = new Date();
    } else {
      chatHistory = new ChatHistory({
        userId: req.session.userId,
        username: user.username,
        section: section,
        messages: trimmedMessages
      });
    }

    await chatHistory.save();
    res.json({ success: true, count: trimmedMessages.length });
  } catch (error) {
    console.error('Chat history save error:', error);
    res.status(500).json({ error: 'Error saving chat history' });
  }
});

// Get chat history for a section
app.get('/api/chat-history/:section', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { section } = req.params;

    if (!section) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const chatHistory = await ChatHistory.findOne({
      userId: req.session.userId,
      section: section
    });

    if (!chatHistory) {
      // Return empty history if none exists
      return res.json({ messages: [] });
    }

    // Filter out deleted messages
    const activeMessages = chatHistory.messages.filter(m => !m.deleted);
    res.json({ messages: activeMessages });
  } catch (error) {
    console.error('Chat history fetch error:', error);
    res.status(500).json({ error: 'Error fetching chat history' });
  }
});

// Delete a specific message from chat history
app.post('/api/chat-history/:section/delete/:messageId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { section, messageId } = req.params;

    const chatHistory = await ChatHistory.findOne({
      userId: req.session.userId,
      section: section
    });

    if (!chatHistory) {
      return res.status(404).json({ error: 'Chat history not found' });
    }

    // Mark message as deleted
    const message = chatHistory.messages.find(m => m.id === messageId);
    if (message) {
      message.deleted = true;
      await chatHistory.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Message delete error:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
});

// Clear entire chat history for a section
app.post('/api/chat-history/:section/clear', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { section } = req.params;

    await ChatHistory.findOneAndUpdate(
      { userId: req.session.userId, section: section },
      { messages: [] }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Chat history clear error:', error);
    res.status(500).json({ error: 'Error clearing chat history' });
  }
});

// User Settings Endpoints
// Get user settings
app.get('/api/settings', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId).select('settings');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ settings: user.settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Error retrieving settings' });
  }
});

// Update user settings
app.post('/api/settings', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { language, darkMode, emailNotifications, pushNotifications } = req.body;

    const updateData = {};
    if (language !== undefined) updateData['settings.language'] = language;
    if (darkMode !== undefined) updateData['settings.darkMode'] = darkMode;
    if (emailNotifications !== undefined) updateData['settings.emailNotifications'] = emailNotifications;
    if (pushNotifications !== undefined) updateData['settings.pushNotifications'] = pushNotifications;

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      updateData,
      { new: true, select: 'settings' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ settings: user.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// User feedback endpoint
app.post('/api/send-feedback', async (req, res) => {
  try {
    const { name, email, message, timestamp, userAgent } = req.body;

    // Validate required fields
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    // If email transporter is not configured, return error
    if (!transporter) {
      console.warn('Email transporter not configured. Feedback cannot be sent.');
      return res.status(500).json({ error: 'Email service not available. Please try again later.' });
    }

    // Prepare email content
    const emailContent = `
      <h2>New User Feedback</h2>
      <p><strong>From:</strong> ${name || 'Anonymous'}</p>
      <p><strong>Email:</strong> ${email || 'Not provided'}</p>
      <p><strong>Timestamp:</strong> ${timestamp || new Date().toISOString()}</p>
      <p><strong>User Agent:</strong> ${userAgent || 'Not provided'}</p>
      <hr/>
      <h3>Feedback Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

    // Send email to both specified email addresses
    const feedbackEmails = ['husseinihamidualkali@gmail.com', 'yolaaiinfohub.auth@gmail.com'];
    
    for (const recipientEmail of feedbackEmails) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `[Yola AI Info Hub] New User Feedback from ${name || 'Anonymous'}`,
        html: emailContent
      });
    }

    console.log(`Feedback sent to ${feedbackEmails.join(', ')}`);
    res.json({ success: true, message: 'Thank you! Your feedback has been sent successfully.' });
  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).json({ error: 'Failed to send feedback. Please try again later.' });
  }
});

// Mount the Gemini API router
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Serve local TomTom SDK from node_modules if available to avoid external CDN issues
const tomtomDist = path.join(__dirname, 'node_modules', '@tomtom-international', 'web-sdk-maps', 'dist');
if (fs.existsSync(tomtomDist)) {
  app.use('/vendor/tomtom', express.static(tomtomDist));
  console.log('Serving TomTom SDK from local node_modules at /vendor/tomtom');
} else {
  console.warn('TomTom SDK not found in node_modules. To enable a local copy, run: npm install @tomtom-international/web-sdk-maps');
}

function startServer(portToUse = PORT) {
  const server = app.listen(portToUse, HOST, () => {
    console.log(`Server running on http://${HOST}:${portToUse}`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      const nextPort = portToUse + 1;
      console.warn(`Port ${portToUse} is already in use. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('Server startup error:', error);
    process.exit(1);
  });
}

startServer(PORT);

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
