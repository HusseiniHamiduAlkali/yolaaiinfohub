// Main function index for Netlify/Express functions
const express = require('express');
const geminiProxy = require('./gemini-proxy');

const app = express();
app.use(express.json());

// Mount Gemini proxy at /api/gemini
app.use('/api/gemini', geminiProxy);

// Export for Netlify or custom server
module.exports = app;

// If running standalone (e.g. node functions/index.js), start server
if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Functions server running on http://localhost:${port}`);
  });
}
