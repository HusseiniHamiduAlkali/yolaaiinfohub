# Yola AI Info Hub

Yola AI Info Hub is a responsive multi-section web app for local information in Yola, Adamawa State, Nigeria. It combines public information directories, AI-assisted features, maps, authentication, and a database-backed ServiInfo professional directory.

## Current architecture

The project has two runtime surfaces:

- **Frontend:** static HTML, CSS, JavaScript, templates, and local data. It runs through Five Server or Netlify.
- **Backend:** Express and MongoDB in `server.js`. It provides authentication, sessions, AI/API proxies, content APIs, and ServiInfo administration.
- **DealzInfo:** Market prices, listings, and submissions are integrated into the same backend and served at `/dealzinfo/`. It uses the main app's MongoDB connection and signed-in administrator accounts.

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

### Backend port and API base

The backend listens only on the `PORT` environment variable (default `4000`). If that port is occupied, startup fails rather than silently switching ports. When the backend serves the frontend, browser API calls use the current origin. For a separately hosted frontend, configure/inject `API_BASE_URL` with the backend's public base URL and allow that frontend origin in `CORS_ORIGINS`.

DealzInfo's public API is under `/api/dealz/` and its admin API is under `/api/dealz/admin/`. Open `/dealzinfo/` after starting the main server; administer it from `/components/admin/admin-dealz.html`. It shares the main `.env`, MongoDB database (`MONGO_URI`), session, and admin sign-in. To load its sample market data, run `npm run seed:dealz` from the repository root.

## Local development

This project uses Node.js and npm. Node is managed with `nvm` in the current development setup.

```bash
nvm use 24.18.0
npm install
```

Start the backend in one terminal and open the app from that same backend origin:

```bash
npm start
```

The backend serves the frontend and API on the same port. The default is `http://127.0.0.1:4000`; if `PORT` is set to another value, use that port for the app URL as well. Do not start a separate static frontend server unless you also inject `API_BASE_URL` for that frontend.

Use one hostname consistently for browser testing so session cookies remain same-origin.

### Navi place seeding

The Navi importer catalogs 191 active cards and three Green Spaces examples that are currently commented out. Preview the base-record import first; it does not connect to MongoDB or write data:

```bash
npm run import-navigation-places
```

After reviewing the inventory and configuring `MONGO_URI` for the intended database, create missing base records with:

```bash
npm run import-navigation-places:write
```

The importer assigns both `subcategory` and `detailProfileType` from each card's linked detail-page template. Cards sharing a detail HTML page receive the same values; existing records are updated to match. On write, it also removes profile families that do not belong to that card's detail page. The current import preview covers 194 cards with no duplicate IDs.

The detail-page mapping and stored profile fields are:

| Detail page | Subcategory | Profile field |
| --- | --- | --- |
| `flight-agents-details.html` | Flights | `flightAgentProfile` |
| `filling-stations-details.html` | Filling Stations | `fillingStationProfile` |
| `parks-recreation-details.html` | Parks and Recreation | `parksRecreationProfile` |
| `commercial-center-details.html` | Commercial Centers | `commercialCenterProfile` |
| `hospitality-details.html` | Hospitality | `hospitalityProfile` |
| `restaurant-details.html` | Restaurants | Base `NavigationPlace` fields |
| `mosque-details.html` | Mosques | `mosqueProfile` |
| `church-details.html` | Churches | `churchProfile` |
| `event-centers.html` | Event Centers | `eventCenterProfile` |
| `banks-details.html` | Banks | `bankProfile` |
| `university-details.html` | Universities | `universityProfile` |
| `technical-institution-details.html` | Technical Institutions | `technicalProfile` |
| `primary-secondaryschool-details.html` | Primary and Secondary Schools | `schoolProfile` |
| `learning-hub-details.html` | Learning Hubs | `learningProfile` |
| `primary-healthcare-details.html` | Primary Healthcare | `healthcareProfile.primaryCare` |
| `secondary-healthcare-details.html` | Secondary Healthcare | `healthcareProfile.secondaryHospital` |
| `pharmacy-details.html` | Pharmacies | `healthcareProfile.pharmacy` |
| `judiciary-details.html` | Judiciary | `judiciaryProfile` |
| `sports-spa-details.html` | Sports and Wellness | `sportsSpaProfile` |
| `iconic-structures.html` | Iconic Structures | `iconicStructureProfile` |

Run the relevant profile initializers after importing records to populate the fields each details page consumes. Each initializer is restricted to its subcategory/profile family and removes unrelated profile families. Healthcare records contain only the active branch (`primaryCare`, `secondaryHospital`, or `pharmacy`). The nine venue-template initializer prunes extra top-level and nested keys to the linked page's supported profile shape while preserving matching administrator values and the profile review/demo flags. The flight, filling-station, and bank initializer and the nine venue-template initializer provide dry-run previews before `--write`:

```bash
npm run initialize-navigation-detail-profiles
npm run initialize-navigation-detail-profiles:write
npm run initialize-navigation-template-profiles
npm run initialize-navigation-template-profiles:write
```

School, university, technical-institution, learning-hub, and healthcare profiles are generated by `initialize-school-profiles`, `initialize-university-profiles`, `initialize-technical-profiles`, `initialize-learning-profiles`, and `initialize-healthcare-profiles`. These legacy commands write directly to the configured database, but skip published records by default and mark seeded data for review. Pass `--demote-published` to explicitly move published records to draft and mark them unverified before adding samples. The base importer removes unrelated profile families from existing published records but does not change their moderation status or overwrite the profile family matched to their detail page. In the Navi admin, review base fields and profile JSON, clear the seed-review checkbox, and deliberately publish only after confirming details.

The flight, filling-station, and bank initializer also skips published records by default and creates new records as drafts requiring review. To explicitly seed an existing published record, use `npm run initialize-navigation-detail-profiles:write -- --demote-published`; the record is moved to draft and marked unverified for review.

Transport-agent and motor-park cards use the base `NavigationPlace` fields. Restaurant cards also use the base record, including the existing gallery and menu fields; the removed restaurant media-seeding controls are not part of this import.

### Navi demo profile seeding

The all-card demo initializer adds a generic profile to every card and a specialized profile to cards with one of the nine detail templates. It is dry-run by default. Seeded content remains hidden from public detail APIs until the administrator uses **Publish demo profiles** in the Navi admin; publishing keeps `verificationStatus` as `unverified` and displays the demo notice.

```bash
npm run initialize-navigation-demo-profiles
npm run initialize-navigation-demo-profiles:write
```

The admin action publishes eligible draft, pending, or already-published demo records in one batch. Rejected and suspended records are not revived. Admin detail previews use authenticated data and include the demo label before public release.

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
- `MAPS_API_KEY` - Google Maps Platform browser key for map display, Places, satellite imagery, and Street View links

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
