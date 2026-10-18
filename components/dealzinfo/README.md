# DealzInfo — Yola Market Pulse

DealzInfo is a module of the Yola AI Info Hub; it does not run its own server or have a separate environment file, database connection, or administrator login.

## Run it

From the repository root, configure the main app's `.env` with `MONGO_URI` and start the existing server:

```bash
npm start
```

Open `http://localhost:4000/dealzinfo/`. The app uses the main server's session and existing administrator accounts. Sign in through the Yola AI Info Hub sign-in page before opening `/components/admin/admin-dealz.html`.

To load the sample market data into the database configured by the main app, run this once from the repository root:

```bash
npm run seed:dealz
```

To replace the DealzInfo collections with the sample data, run `npm run seed:dealz -- --fresh`. This clears DealzInfo market, price, business, submission, announcement, and settings collections only; it does not change Yola AI Info Hub accounts.

## API

Public endpoints use `/api/dealz/*`; administrator endpoints use `/api/dealz/admin/*`. Admin endpoints authorize through the main app's signed-in session and administrator roles.

DealzInfo collections retain their existing names. Its frontend and API are served by the main application process.
