/**
 * Creates the first officer account and a few sample reports so the admin
 * console has something to triage.  Run once:  npm run seed
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "ecoinfo.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT,
  role TEXT NOT NULL DEFAULT 'admin', passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL,
  wasteType TEXT, severity TEXT, landmark TEXT, ward TEXT, description TEXT,
  reporterName TEXT, reporterPhone TEXT, anonymous INTEGER DEFAULT 0,
  lat REAL, lon REAL, occurredAt TEXT, createdAt TEXT NOT NULL, resolvedAt TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', assignee TEXT, officerNote TEXT, photos TEXT);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info', at TEXT NOT NULL);
`);

const email = (process.env.ADMIN_EMAIL || "officer@adsepa.ng").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "ecoinfo123";

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  console.log(`Admin ${email} already exists.`);
} else {
  db.prepare("INSERT INTO users (email, name, role, passwordHash, createdAt) VALUES (?,?,?,?,?)").run(
    email,
    process.env.ADMIN_NAME || "Duty Officer",
    "admin",
    bcrypt.hashSync(password, 10),
    new Date().toISOString(),
  );
  console.log(`Created admin ${email} / ${password}  — change this password.`);
}

const samples = [
  {
    code: "YEC-2026-A19KD", wasteType: "Mixed household waste", severity: "high",
    landmark: "Behind Jimeta Modern Market, off Atiku Abubakar Road", ward: "Jimeta",
    description: "Waste piling into the drain channel, blocking flow ahead of the rains.",
    lat: 9.2789, lon: 12.4534, status: "assigned", assignee: "Crew 2 — Jimeta",
  },
  {
    code: "YEC-2026-B72MP", wasteType: "Construction rubble", severity: "medium",
    landmark: "Empty plot beside Yola Bypass junction", ward: "Yola South",
    description: "Truck dumping sand and blocks at night on a residential plot.",
    lat: 9.2091, lon: 12.4801, status: "reviewing",
  },
  {
    code: "YEC-2026-C08QT", wasteType: "Burning waste", severity: "high",
    landmark: "Near Girei roadside settlement", ward: "Girei",
    description: "Nylon and tyres burned every evening, heavy smoke over the houses.",
    lat: 9.3428, lon: 12.5533, status: "resolved", assignee: "Enforcement unit",
    officerNote: "Site cleared, occupants warned and a skip placed 200m away.",
    resolvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    code: "YEC-2026-D55LZ", wasteType: "E-waste", severity: "low",
    landmark: "Roadside opposite Federal University campus gate", ward: "Yola North",
    description: "Old monitors and batteries dropped by the fence.",
    lat: 9.3502, lon: 12.4972, status: "submitted",
  },
];

const insert = db.prepare(
  `INSERT OR IGNORE INTO reports (code, wasteType, severity, landmark, ward, description, lat, lon,
   createdAt, status, assignee, officerNote, resolvedAt, photos)
   VALUES (@code, @wasteType, @severity, @landmark, @ward, @description, @lat, @lon,
   @createdAt, @status, @assignee, @officerNote, @resolvedAt, '[]')`,
);
samples.forEach((s, i) =>
  insert.run({
    assignee: null, officerNote: null, resolvedAt: null,
    createdAt: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
    ...s,
  }),
);

db.prepare("INSERT INTO alerts (title, body, level, at) VALUES (?,?,?,?)").run(
  "Harmattan dust advisory",
  "Dust levels are elevated across Yola this week. Keep windows shut in the early morning and mask up if you ride.",
  "warn",
  new Date().toISOString(),
);

console.log("Seed complete.");
