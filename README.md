# Yola AI Info Hub

Yola AI Info Hub is a responsive multi-section web app for local information in Yola, Adamawa State, Nigeria. It combines public information directories, AI-assisted features, maps, authentication, and a database-backed ServiInfo professional directory.

## Current architecture

The project has two runtime surfaces:

- **Frontend:** static HTML, CSS, JavaScript, templates, and local data. It runs through Five Server or Netlify.
- **Backend:** Express and MongoDB in `server.js`. It provides authentication, sessions, AI/API proxies, content APIs, and ServiInfo administration.

### Main directories

```text
index.html                 SPA entry point
app.js                     Frontend section loading and application behavior
components/                Section components and admin interfaces
  admin/                    School and ServiInfo admin pages/controllers
  AI/                       Chat and voice integrations
  serviinfo/                ServiInfo pages, scripts, profile, and join surfaces
Data/                      Section data, taxonomies, and images
pages/                     Public standalone pages and authentication flows
scripts/                   Shared frontend utilities and API configuration
server/                    Mongoose models, auth helpers, and backend utilities
templates/                 HTML templates injected into the SPA
styles/                    Shared and section-specific styles
api/                       Serverless/API support files
netlify/                   Netlify functions
test/                      Automated tests
server.js                  Express backend entry point
sw.js                      Service worker/offline support
manifest.json              PWA metadata
netlify.toml               Netlify build, headers, and redirects
render.yaml                Render backend deployment configuration
```

### Main public sections

The SPA uses hash routes loaded from the section components:

- `#/home` - home, AI chat, camera, microphone, and file tools
- `#/eduinfo` - education information
- `#/agroinfo` - agriculture information
- `#/mediinfo` - medical information
- `#/naviinfo` - maps and directions
- `#/communityinfo` - community information
- `#/ecoinfo` - economy and environmental information
- `#/serviinfo` - ServiInfo professional directory

Standalone public pages are under `pages/`, including authentication, help, privacy, terms, reports, profiles, and verification.

## Local development

This project uses Node.js and npm. Node is managed with `nvm` in the current development setup.

```bash
nvm use 24.18.0
npm install
```

Start the backend in one terminal and leave it running:

```bash
npm start
```

The backend listens on `http://127.0.0.1:4000` by default. Start Five Server from the project root for the frontend, normally at:

```text
http://127.0.0.1:5500/
```

Use the same hostname consistently for browser testing so session cookies work:

- Frontend: `http://127.0.0.1:5500`
- Backend: `http://127.0.0.1:4000`

The frontend API base is configured by `scripts/apiConfig.js`. Production requests use the configured Render backend URL.

## Authentication and administrators

Open the normal account page at:

```text
http://127.0.0.1:5500/pages/auth.html
```

The backend stores users and sessions in MongoDB. The first content administrator can be created, or an existing account can be promoted, from the mobile setup page:

```text
http://127.0.0.1:5500/admin/setup.html
```

The setup page requires the backend-only `CONTENT_ADMIN_BOOTSTRAP_SECRET`. It is never placed in frontend JavaScript. After creating or promoting the account, verify the email if required, sign out, and sign in again.

Production setup page:

```text
https://yolaaiinfohub.netlify.app/admin/setup
```

## ServiInfo directory

ServiInfo records are stored in MongoDB in the `professionals` collection.

Public routes:

- `#/serviinfo` - directory and filters
- `/servi/<slug>` - published professional profile
- `/components/serviinfo/servi-join.html` - public listing submission form
- `/components/serviinfo/servi-profile.html` - canonical profile component/template

Admin route:

```text
http://127.0.0.1:5500/admin/servi.html
https://yolaaiinfohub.netlify.app/admin/servi
```

Admins can create, edit, publish, reject, suspend, verify, and delete listings. The **Approve pending** action publishes pending and draft records in bulk. Review imported placeholder records before approving them.

### Import existing cards

Preview the legacy static cards without writing to MongoDB:

```bash
npm run import-professionals
```

Import or update them by slug:

```bash
npm run import-professionals:write
```

The importer is idempotent. Records with placeholder phone numbers or incomplete experience data are imported as drafts for review.

## Other content administration

The existing school content manager is available at:

```text
http://127.0.0.1:4000/components/admin/admin-schools.html
```

School imports use:

```bash
npm run import-schools
npm run import-schools:write
```

## Configuration

Copy the required development values into `.env`. Important backend settings include:

- `MONGO_URI` - MongoDB connection string
- `SESSION_SECRET` - session signing secret
- `JWT_SECRET` - token signing secret
- `CONTENT_ADMIN_BOOTSTRAP_SECRET` - admin setup secret
- `FRONTEND_URL` and `CORS_ORIGINS` - allowed frontend origins
- `GEMINI_API_KEY` or `AI_API_KEY` - AI backend configuration
- `BREVO_API_KEY` and sender settings - email verification and notifications
- `TOMTOM_API_KEY` or map configuration - navigation features

Never commit `.env` or expose secrets in frontend files. Production secrets belong in Render environment variables and Netlify environment configuration where applicable.

## Deployment

### Frontend

Netlify publishes the repository root using `netlify.toml`:

- Build command: `npm install && npm run build`
- Publish directory: repository root
- Production frontend: `https://yolaaiinfohub.netlify.app`

The Netlify redirects provide clean routes for `/admin/setup`, `/admin/servi`, and `/servi/*`.

### Backend

Render runs `server.js` using `render.yaml`:

```bash
npm install
npm start
```

The backend requires MongoDB and production environment variables. CORS must include the deployed Netlify origin, and credentialed requests must remain enabled for login and admin sessions.

## API overview

Public API routes include:

- `GET /api/content/professionals`
- `GET /api/content/professionals/:slug`
- `POST /api/content/professionals/submissions`
- `POST /api/login`
- `GET /api/me`

Admin ServiInfo routes require an authenticated `admin` or `content-admin` session:

- `GET /api/admin/content/professionals`
- `POST /api/admin/content/professionals`
- `PUT /api/admin/content/professionals/:id`
- `PATCH /api/admin/content/professionals/:id/moderation`
- `DELETE /api/admin/content/professionals/:id`

## Tests and checks

Useful checks include:

```bash
node --check server.js
node --check components/admin/admin-servi.js
npm run import-professionals
```

Before publishing ServiInfo records, verify public filtering, profile URLs, admin authorization, pending submissions, and mobile layout behavior.

## SEO and sitemap

`sitemap.xml` contains public frontend routes only. Authentication, API, admin, setup, server, and implementation paths are excluded from crawling. Published dynamic `/servi/<slug>` URLs should be added to the sitemap as the directory grows.

`robots.txt` points crawlers to the deployed sitemap at `https://yolaaiinfohub.netlify.app/sitemap.xml`.
