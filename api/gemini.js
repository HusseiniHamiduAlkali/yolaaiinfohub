const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const router = express.Router();

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
    'https://yolaaiinfohub.netlify.app',
    'http://0.0.0.0:0000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
};

router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

router.post('/', async (req, res) => {
  try {
    const { model, contents } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Error processing Gemini API request' });
  }
});

module.exports = router;
