/**
 * EcoInfo local backend.
 *
 *   cd ecoinfo/server && npm install && npm run seed && npm start
 *
 * Serves the static pages from ../ and the API on http://localhost:4000.
 * Optional AI classification: set OPENAI_API_KEY or GEMINI_API_KEY in the
 * environment. Without a key the browser falls back to its local rules engine.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4002);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const MAIN_API_BASES = (process.env.MAIN_API_BASE || "http://localhost:4000,http://localhost:4001")
  .split(",")
  .map(base => base.trim().replace(/\/$/, ""))
  .filter(Boolean);

const db = new Database(path.join(__dirname, "ecoinfo.db"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  wasteType TEXT, severity TEXT, landmark TEXT, ward TEXT,
  description TEXT, reporterName TEXT, reporterPhone TEXT,
  anonymous INTEGER DEFAULT 0,
  lat REAL, lon REAL,
  occurredAt TEXT, createdAt TEXT NOT NULL, resolvedAt TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  assignee TEXT, officerNote TEXT,
  photos TEXT
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, body TEXT NOT NULL, level TEXT NOT NULL DEFAULT 'info',
  at TEXT NOT NULL
);
`);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..")));

/* ------------------------------ helpers ------------------------------ */

const nowIso = () => new Date().toISOString();

function makeCode() {
  return `YEC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function auth(req, res, next) {
  const token = req.cookies?.eco_token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      if (req.user.role !== "admin") return res.status(403).json({ error: "Administrator access required" });
      return next();
    } catch {
      // A stale EcoInfo token may still have a valid Yola admin session.
    }
  }

  const sessionCookie = req.headers.cookie?.split(/;\s*/).find(cookie => cookie.startsWith("connect.sid="));
  if (!sessionCookie) return res.status(401).json({ error: "Not signed in" });

  (async () => {
    for (const base of MAIN_API_BASES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${base}/api/me`, {
          headers: { Cookie: sessionCookie },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const user = await response.json();
        if (!user.loggedIn) continue;
        if (user.accountStatus !== "active" || !["admin", "content-admin"].includes(user.role)) {
          return res.status(403).json({ error: "Active administrator access required" });
        }
        req.user = { id: user.username, name: user.name, email: user.email, role: user.role };
        return next();
      } catch {
        // Try the next configured main API address.
      } finally {
        clearTimeout(timeout);
      }
    }
    return res.status(401).json({ error: "Sign in to the Yola administrator dashboard first" });
  })();
}

function publicReport(r) {
  return {
    code: r.code, status: r.status, wasteType: r.wasteType, landmark: r.landmark,
    ward: r.ward, createdAt: r.createdAt, resolvedAt: r.resolvedAt, officerNote: r.officerNote,
  };
}

function hydrate(r) {
  return { ...r, photos: r.photos ? JSON.parse(r.photos) : [] };
}

/* ------------------------------- auth -------------------------------- */

app.get("/api/health", (_req, res) => res.json({ ok: true, at: nowIso() }));

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: "8h",
  });
  res.cookie("eco_token", token, { httpOnly: true, sameSite: "lax", maxAge: 8 * 3600 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("eco_token");
  res.json({ ok: true });
});

app.get("/api/auth/me", auth, (req, res) => res.json(req.user));

/* ------------------------------ reports ------------------------------ */

app.post("/api/reports", (req, res) => {
  const b = req.body || {};
  if (!b.wasteType || !b.landmark || !b.description) {
    return res.status(400).json({ error: "wasteType, landmark and description are required" });
  }
  const photos = Object.keys(b)
    .filter((k) => k.startsWith("photo"))
    .map((k) => b[k])
    .filter((v) => typeof v === "string" && v.startsWith("data:image"))
    .slice(0, 4);

  const row = {
    code: makeCode(),
    wasteType: String(b.wasteType).slice(0, 120),
    severity: ["low", "medium", "high"].includes(b.severity) ? b.severity : "medium",
    landmark: String(b.landmark).slice(0, 240),
    ward: String(b.ward || "").slice(0, 120),
    description: String(b.description).slice(0, 4000),
    reporterName: b.anonymous === "true" || b.anonymous === true ? "" : String(b.reporterName || "").slice(0, 120),
    reporterPhone: String(b.reporterPhone || "").slice(0, 32),
    anonymous: b.anonymous === "true" || b.anonymous === true ? 1 : 0,
    lat: b.lat ? Number(b.lat) : null,
    lon: b.lon ? Number(b.lon) : null,
    occurredAt: String(b.occurredAt || "").slice(0, 40),
    createdAt: nowIso(),
    status: "submitted",
    photos: JSON.stringify(photos),
  };

  db.prepare(
    `INSERT INTO reports (code, wasteType, severity, landmark, ward, description, reporterName, reporterPhone,
      anonymous, lat, lon, occurredAt, createdAt, status, photos)
     VALUES (@code, @wasteType, @severity, @landmark, @ward, @description, @reporterName, @reporterPhone,
      @anonymous, @lat, @lon, @occurredAt, @createdAt, @status, @photos)`,
  ).run(row);

  res.status(201).json({ code: row.code, status: row.status, createdAt: row.createdAt });
});

app.get("/api/reports/:code", (req, res) => {
  const r = db.prepare("SELECT * FROM reports WHERE code = ?").get(req.params.code.toUpperCase());
  if (!r) return res.status(404).json({ error: "No report with that code" });
  res.json(publicReport(r));
});

/* Aggregated, non-identifying map data for the public dashboard. */
app.get("/api/reports", (_req, res) => {
  const rows = db
    .prepare("SELECT code, wasteType, severity, ward, status, lat, lon, createdAt FROM reports ORDER BY createdAt DESC LIMIT 200")
    .all();
  res.json(rows);
});

/* ------------------------------- admin ------------------------------- */

app.get("/api/admin/reports", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM reports ORDER BY createdAt DESC").all().map(hydrate);
  res.json(rows);
});

app.patch("/api/admin/reports/:id", auth, (req, res) => {
  const allowed = ["status", "assignee", "officerNote", "resolvedAt", "severity"];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Nothing to update" });
  if (patch.status === "resolved" && !patch.resolvedAt) patch.resolvedAt = nowIso();
  const sets = Object.keys(patch).map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE reports SET ${sets} WHERE id = @id`).run({ ...patch, id: Number(req.params.id) });
  res.json(hydrate(db.prepare("SELECT * FROM reports WHERE id = ?").get(Number(req.params.id))));
});

app.get("/api/admin/stats", auth, (_req, res) => {
  const total = db.prepare("SELECT COUNT(*) c FROM reports").get().c;
  const byStatus = db.prepare("SELECT status, COUNT(*) c FROM reports GROUP BY status").all();
  const byWard = db.prepare("SELECT ward, COUNT(*) c FROM reports GROUP BY ward ORDER BY c DESC").all();
  res.json({ total, byStatus, byWard });
});

app.post("/api/admin/alerts", auth, (req, res) => {
  const { title, body, level = "info" } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "title and body are required" });
  db.prepare("INSERT INTO alerts (title, body, level, at) VALUES (?, ?, ?, ?)").run(title, body, level, nowIso());
  res.status(201).json({ ok: true });
});

app.get("/api/alerts", (_req, res) => {
  res.json(db.prepare("SELECT title, body, level, at FROM alerts ORDER BY at DESC LIMIT 20").all());
});

/* ----------------------------- AI classify ---------------------------- */

const SYSTEM_PROMPT = `You are a waste-management expert advising residents of Yola, Adamawa State, Nigeria.
Classify the item described and/or shown. Available local facilities: plastic buy-back hub, e-waste point,
scrap metal yard, glass depot, community compost site, paper recycler, textile reuse point, hazardous waste intake.
Reply ONLY with JSON of this exact shape:
{"label":string,"material":string,"recyclable":boolean,"biodegradable":boolean,"hazardous":boolean,
"confidence":number,"steps":string[],"reuse":string[],"dropOffMaterial":string,"alternatives":string[]}
Steps must be 3-5 short, concrete, locally realistic actions. Never advise burning waste.`;

app.post("/api/classify", async (req, res) => {
  const { description = "", context = "", images = [] } = req.body || {};
  const openai = process.env.OPENAI_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  if (!openai && !gemini) return res.status(503).json({ error: "No AI key configured on the server" });

  try {
    const result = openai
      ? await classifyOpenAI({ openai, description, context, images })
      : await classifyGemini({ gemini, description, context, images });
    res.json({ ...result, engine: "ai" });
  } catch (err) {
    console.error("classify failed:", err.message);
    res.status(502).json({ error: `AI provider error: ${err.message}` });
  }
});

async function classifyOpenAI({ openai, description, context, images }) {
  const content = [{ type: "text", text: `Item: ${description || "(photo only)"}\nSource: ${context}` }];
  for (const img of images.slice(0, 3)) content.push({ type: "image_url", image_url: { url: img } });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openai}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = await r.json();
  return JSON.parse(json.choices[0].message.content);
}

async function classifyGemini({ gemini, description, context, images }) {
  const parts = [{ text: `${SYSTEM_PROMPT}\n\nItem: ${description || "(photo only)"}\nSource: ${context}` }];
  for (const img of images.slice(0, 3)) {
    const [meta, data] = img.split(",");
    parts.push({ inline_data: { mime_type: meta.slice(5).split(";")[0], data } });
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = await r.json();
  return JSON.parse(json.candidates[0].content.parts[0].text);
}

/* ------------------------------ startup ------------------------------ */

app.listen(PORT, () => {
  console.log(`EcoInfo running → http://localhost:${PORT}`);
  const users = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (!users) console.log("No admin user yet. Run: npm run seed");
});
