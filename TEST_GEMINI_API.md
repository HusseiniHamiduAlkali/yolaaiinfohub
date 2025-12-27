# Testing Gemini API Fix

The backend has been updated to use the correct Gemini API endpoint and model names.

## What Changed

1. **Backend (server.js)**:
   - Changed from `v1beta` to `v1` API endpoint (more stable)
   - Added model name normalization/mapping
   - Better error handling

2. **Frontend (home.js & eduinfo.js)**:
   - Updated deprecated model names
   - Changed `gemini-pro-vision` → `gemini-1.5-flash`
   - Changed `gemini-2.5-flash` → `gemini-2.0-flash`

## How to Test

1. **Restart your backend**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

2. **Test in the browser**:
   - Go to `http://localhost:5500`
   - Try sending a message in the Home chat
   - Check the server terminal for logs

3. **Check logs**:
   You should see something like:
   ```
   Calling Gemini API with model: gemini-1.5-flash (requested: gemini-1.5-flash)
   Gemini API success: 1 candidates
   ```

## If Still Getting 404

The API key might be invalid or expired. Try:

1. **Get a fresh API key**:
   - Go to: https://aistudio.google.com/app/apikey
   - Create a new API key
   - Update in `.env`:
     ```
     GEMINI_API_KEY=your-new-api-key
     ```

2. **Test the API directly**:
   ```bash
   curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents": [{"parts": [{"text": "Hello"}]}]}'
   ```

## Expected Success Response

In browser Network tab, the `/api/gemini` request should return:
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "Hello! How can I help you today?"
      }]
    }
  }]
}
```
