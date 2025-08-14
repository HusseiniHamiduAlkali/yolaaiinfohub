// Gemini API Proxy Route for Yola Info Hub
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// POST /api/gemini
router.post('/', async (req, res) => {
  try {
    const { model, contents } = req.body;
    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing model or contents' });
    }
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not set in .env' });
    }
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Failed to contact Gemini API' });
  }
});

module.exports = router;
