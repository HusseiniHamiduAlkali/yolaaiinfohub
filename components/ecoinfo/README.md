# Yola EcoInfo

A standalone set of HTML/CSS/JS pages in the golden **Emerald Prestige** style, built for
Yola, Adamawa State. Everything works offline-first in the browser; an optional local
Node backend adds persistence, officer accounts and real AI classification.

## Pages

| File | What it does |
|---|---|
| `index.html` | Dashboard: live weather snapshot, alerts, recent activity, quick links |
| `atmosphere.html` | Current temperature, 24-hour hourly forecast chart, wind, humidity, UV, air quality, driving-clarity index |
| `classify.html` | AI waste classifier — upload photos and/or describe the object; get recyclable / disposable verdict plus safe disposal steps |
| `report.html` | Illegal dumping report with photo evidence, map pin + GPS, severity, plus a tracking-code lookup |
| `recycling.html` | Directory and map of buy-back hubs, e-waste points, scrap yards, compost sites |
| `schedule.html` | Ward collection schedule, calendar (.ics) export, personal waste log |
| `learn.html` | Eco tip library, carbon footprint calculator with Nigerian emission factors, quiz |
| `community.html` | Alerts, clean-up events, ward leaderboard, eco points and pledges |
| `admin.html` | Officer console: triage reports, assign crews, record actions, export CSV, publish alerts |

## Running

The pages use ES modules and `fetch` for the JSON data files, so open them through a
server rather than `file://`:

```bash
cd ecoinfo
python3 -m http.server 8000     # then visit http://localhost:8000
```

In this mode weather is live (Open-Meteo, no key needed), reports are queued in
`localStorage`, and the classifier uses its built-in rules engine.

## With the backend (persistence + AI + real admin login)

```bash
cd ecoinfo/server
cp .env.example .env            # set JWT_SECRET, optionally an AI key
npm install
npm run seed                    # creates officer@adsepa.ng / ecoinfo123 + samples
npm start                       # serves the pages AND the API on :4000
```

Visit <http://localhost:4000>. Reports now persist to SQLite (`server/ecoinfo.db`),
tracking codes resolve for real, and `admin.html` accepts the seeded login.
Change the seeded password before using this anywhere real.

### API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/reports` | public | Submit a dumping report; returns a tracking code |
| GET | `/api/reports/:code` | public | Public status of one report |
| GET | `/api/reports` | public | Non-identifying rows for the map |
| POST | `/api/classify` | public | AI waste classification (needs an AI key) |
| GET | `/api/alerts` | public | Community alerts |
| POST | `/api/auth/login` / `logout` / GET `me` | — | Officer session (httpOnly cookie) |
| GET | `/api/admin/reports`, PATCH `/api/admin/reports/:id`, GET `/api/admin/stats`, POST `/api/admin/alerts` | officer | Console |

## Data sources

- **Weather & air quality** — Open-Meteo forecast and air-quality APIs (free, keyless).
- **Maps** — Leaflet with OpenStreetMap tiles.
- **Local content** — editable JSON in `data/`: recycling centres, waste categories,
  collection schedule, tips and emission factors.

## Notes

- Never advise or perform waste burning — the classifier prompt and tips enforce this.
- Reports store photos as compressed data URLs; for production move them to object storage.
- The admin console has a demo mode so the UI can be reviewed without the backend.
