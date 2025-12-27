# Gemini API Debugging Guide

If you're getting "Invalid response format" errors, follow these steps:

## 1. Check Server Logs
When you see the error, look at your terminal where `npm start` or `npm run dev` is running. You should now see detailed logs like:

```
Calling Gemini API with model: gemini-1.5-flash
Gemini API error response: { ... }
```

Copy the entire error response and read what Gemini is returning.

## 2. Common Issues & Solutions

### Issue: "API key not configured"
**Cause**: `GEMINI_API_KEY` environment variable is not set
**Solution**: 
- Create `.env` file in root directory
- Add: `GEMINI_API_KEY=AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U`
- Restart server: `npm start`

### Issue: "Invalid API key" or "403 Forbidden"
**Cause**: API key is wrong or expired
**Solution**:
- Get a fresh API key from: https://aistudio.google.com/app/apikey
- Update in `.env` file
- Restart server

### Issue: "No candidates in response" 
**Cause**: Content blocked by safety filters OR invalid request structure
**Solution**:
- Check the console error details in browser (F12)
- Simplify your prompt - try just asking "Hello"
- Check if the question triggers safety filters
- If prompt too long, it may be rejected

### Issue: "Invalid response format"
**Cause**: Response structure doesn't match expected format
**Solution**:
- Check server logs for the actual response
- Verify model name is correct (gemini-1.5-flash, gemini-2.5-flash, etc)
- Try a different model

## 3. Manual Testing

### Test with curl (from your terminal):
```bash
curl -X POST http://localhost:4000/api/gemini \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-1.5-flash",
    "contents": [{
      "parts": [{
        "text": "Say hello"
      }]
    }]
  }'
```

Expected response should look like:
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "Hello! How can I help?"
      }]
    }
  }]
}
```

## 4. Browser Console Debugging

In your browser (F12 → Console):
1. Open the Network tab
2. Try sending a message in chat
3. Look for the `/api/gemini` request
4. Click on it and check the Response tab
5. See what the actual response is

## 5. Enable Detailed Logging

Add this to your browser console to see every step:
```javascript
// Enable detailed logging
window.DEBUG_GEMINI = true;
```

Then check the console when you send a message.

## 6. Verify API Key Works

Test your API key directly:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello"
      }]
    }]
  }'
```

## Still Having Issues?

Check:
1. ✅ Server is running (`npm start` output shows "Server running on http://localhost:4000")
2. ✅ Frontend is running (`npm run dev` or Live Server)
3. ✅ `.env` file has correct API key
4. ✅ Internet connection is working
5. ✅ API key is valid (test at https://aistudio.google.com/app/apikey)
6. ✅ Check server console for detailed error messages

---

The improvements made:
- Better error logging in `server.js`
- Detailed error messages in `home.js`
- User-friendly error display with specific guidance
