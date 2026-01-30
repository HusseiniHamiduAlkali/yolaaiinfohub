// /api/maps-key.js
// Serves the map API key securely from environment variables

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Choose which key to serve (Google or TomTom)
  // Set your environment variable as MAPS_API_KEY
  const apiKey = process.env.MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not set' });
  }
  // Never expose the key to non-authenticated users in production!
  res.status(200).json({ apiKey });
}
