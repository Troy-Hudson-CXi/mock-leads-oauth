const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { buildData } = require("./seed");

// ----- ENV -----
const PORT = process.env.PORT || 10000;
const MOCKAPI_BASE = process.env.MOCKAPI_BASE; // e.g., https://...mockapi.io/api/v1
const MOCKAPI_KEY  = process.env.MOCKAPI_KEY || ""; // optional
const RESET_KEY    = process.env.RESET_KEY || "";
const CLIENT_ID    = process.env.CLIENT_ID || "class-client";
const CLIENT_SECRET= process.env.CLIENT_SECRET || "class-secret";
const TOKEN_SECRET = process.env.TOKEN_SECRET || "change-me";
const TOKEN_TTL    = parseInt(process.env.TOKEN_TTL || "3600", 10);

if (!MOCKAPI_BASE) {
  console.error("Missing MOCKAPI_BASE env var.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// ---- helpers ----
function bearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function forward(req, res, resourceBase) {
  // Build target URL: MOCKAPI_BASE + original path & query
  const url = new URL(req.originalUrl, MOCKAPI_BASE);
  // But ensure we only hit allowed resources:
  // resourceBase is "customers" or "Leads"; rebuild pathname accordingly.
  const parts = req.path.split("/").filter(Boolean); // ["customers"] or ["Leads"]
  if (!parts[0] || parts[0] !== resourceBase) return res.status(404).json({ error: "not found" });
  url.pathname = new URL(resourceBase, MOCKAPI_BASE).pathname;
  // Keep query string
  url.search = req.url.split("?")[1] ? "?" + req.url.split("?")[1] : "";

  // Prepare headers
  const headers = {
    "Content-Type": "application/json",
    ...(MOCKAPI_KEY ? { "X-API-KEY": MOCKAPI_KEY } : {})
  };
  // Drop incoming Authorization (student token), MockAPI doesn't need it.

  // Body
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? JSON.stringify(req.body || {}) : undefined;

  const r = await fetch(url.toString(), { method: req.method, headers, body });
  const text = await r.text();
  res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
}

// ---- auth middleware ----
function requireToken(req, res, next) {
  const tok = bearer(req);
  if (!tok) return res.status(401).json({ error: "missing bearer token" });
  try {
    jwt.verify(tok, TOKEN_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

// ---- routes ----
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// OAuth-style token endpoint (client_credentials)
app.post("/oauth/token", express.urlencoded({ extended: false }), (req, res) => {
  const id = req.body.client_id || "";
  const sec = req.body.client_secret || "";
  const grant = req.body.grant_type || "client_credentials";
  if (grant !== "client_credentials") return res.status(400).json({ error: "unsupported_grant_type" });
  if (id !== CLIENT_ID || sec !== CLIENT_SECRET) return res.status(401).json({ error: "invalid_client" });
  const token = jwt.sign({ sub: id, scope: "read write" }, TOKEN_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL });
});

// Protected reset that rebuilds MockAPI data from seed
app.get("/__reset", async (req, res) => {
  if (!RESET_KEY || req.query.key !== RESET_KEY) return res.status(403).json({ error: "forbidden" });
  try {
    const data = buildData(); // { customers, Leads }

    // helper functions to operate on MockAPI
    const headers = { "Content-Type": "application/json", ...(MOCKAPI_KEY ? { "X-API-KEY": MOCKAPI_KEY } : {}) };
    const listAll = async (resource) => {
      const r = await fetch(`${MOCKAPI_BASE}/${resource}?page=1&limit=1000`, { headers });
      if (!r.ok) throw new Error(`List ${resource}: ${r.status}`);
      return r.json();
    };
    const wipe = async (resource) => {
      const rows = await listAll(resource);
      for (const row of rows) {
        const del = await fetch(`${MOCKAPI_BASE}/${resource}/${row.id}`, { method: "DELETE", headers });
        if (!del.ok) throw new Error(`Delete ${resource}/${row.id}: ${del.status}`);
      }
    };
    const create = async (resource, obj) => {
      const r = await fetch(`${MOCKAPI_BASE}/${resource}`, { method: "POST", headers, body: JSON.stringify(obj) });
      if (!r.ok) throw new Error(`POST ${resource}: ${r.status}`);
      return r.json();
    };

    await wipe("customers");
    await wipe("Leads");
    for (const c of data.customers) await create("customers", c);
    for (const l of data.Leads) await create("Leads", l);

    res.json({ ok: true, counts: { customers: data.customers.length, Leads: data.Leads.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "reset_failed" });
  }
});

// Proxy the two resources (all verbs). Everything requires a token.
app.all("/customers", requireToken, (req, res) => forward(req, res, "customers"));
app.all("/Leads",     requireToken, (req, res) => forward(req, res, "Leads"));

// catch-all
app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.listen(PORT, () => console.log(`Proxy up on :${PORT}`));
