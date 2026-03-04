# Responsive Multi-Section AI Web App

This project is a responsive web application built with HTML, CSS, and JavaScript. It features multiple sections (Home, EduInfo, AgroInfo, MediInfo, MapsInfo, CommunityInfo, AboutInfo), each with its own data and styles. The app includes AI chat areas, a responsive navbar/hamburger menu, and support for camera, microphone, and file uploads on the Home page.

## Structure
- `components/`: HTML for each section
- `styles/`: CSS for each section
- `Data/`: Local data for each section (to be populated by you)
- `.github/copilot-instructions.md`: Copilot custom instructions
- `.vscode/tasks.json`: VS Code tasks

## Setup
1. Populate the `Data` folders with your local data and images.
2. Add your Gemini API key and Google Maps API key in the placeholders in the code.
3. Open `index.html` to start the app.

Tip: To avoid external CDN/CORS/MIME issues with TomTom's Web SDK, install it locally so the backend can serve it:

   npm install @tomtom-international/web-sdk-maps

If the package is present, the server will serve the SDK at `/vendor/tomtom` and the app will prefer that local copy before trying CDN sources.


### Navigation & Maps API Key (TomTom)
The navigation section uses TomTom services for route drawing and distance/time metrics. The API key is read from environment variables (`.env` / `.env.production`) on the backend and exposed to the front‑end via a small endpoint.

*Put your TomTom API key in the `.env` file as `TOMTOM_API_KEY` (or `MAPS_API_KEY` for fallback).*  When running locally a lightweight Node server (`server.js`) must be started so the front‑end can fetch the key at `http://localhost:4000/api/tomtom-key`.

The client code automatically determines where to fetch the key:

1. When `window.API_BASE` is set or the hostname is `localhost`/`127.0.0.1`, it prefixes the request with `http://localhost:4000`.
2. Otherwise it uses the same‑origin path (`/api/tomtom-key` or `/api/maps-key`), which works with Netlify functions in production.
3. If the fetch fails (for example because the backend isn't running), the code will log a warning and fall back to any value already assigned to `window.TOMTOM_API_KEY` or `window.NAVI_MAP_API_KEY`—you can set this manually in the browser console for quick testing.

**Local testing tips:**

- Run `node server.js` in a separate terminal; the server will serve the maps key and other API routes.
- If the server does not stay running (due to database connection issues), you can still test navigation by manually assigning `window.TOMTOM_API_KEY = '<your-key>'` before loading the page, or by editing `index.html` to include a `<script>` that sets it.

This mirrors how the Gemini key is handled: the front‑end never embeds it directly but relies on a backend proxy for security.

## Features
- Responsive design for PC, tablet, and mobile
- Navbar/hamburger menu
- AI chat in every section
- Home page: camera, microphone, and file upload
- MapsInfo: Google Maps directions
- FAQ lists in info sections

## Deploy to Render
This project is automatically deployed to Render when changes are pushed to the main branch.

---
Replace placeholder API keys and data as needed.
