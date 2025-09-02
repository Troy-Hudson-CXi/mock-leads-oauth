// Mock OAuth + Leads API (Express)
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const crypto = require('crypto');
const db = require('./db.json'); // <-- we’ll add this file next

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// --- mock token store ---
const TOKENS = new Map(); // token -> { exp, scope[] }
const TTL = 3600; // seconds

function issueToken(scope = ['api']) {
  const token = crypto.randomBytes(24).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + TTL;
  TOKENS.set(token, { exp, scope });
  return { access_token: token, token_type: 'Bearer', expires_in: TTL, scope: scope.join(' ') };
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'invalid_token', error_description: 'Missing Bearer token' });
  const token = m[1];
  const entry = TOKENS.get(token);
  if (!entry) return res.status(401).json({ error: 'invalid_token', error_description: 'Unknown token' });
  if (entry.exp < Math.floor(Date.now() / 1000)) {
    TOKENS.delete(token);
    return res.status(401).json({ error: 'invalid_token', error_description: 'Expired token' });
  }
  next();
}

// ---- OAuth token endpoint (mock) ----
app.post('/oauth/token', (req, res) => {
  const { grant_type, scope = 'api' } = { ...req.body, ...req.query };
  if (!grant_type) return res.status(400).json({ error: 'invalid_request', error_description: 'grant_type required' });
  switch (grant_type) {
    case 'client_credentials':
    case 'authorization_code':
    case 'password':
    case 'refresh_token':
      return res.json(issueToken(scope.split(/\s+/)));
    default:
      return res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

// ---- helpers ----
function paginate(arr, page = 1, limit = 50) {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, Math.min(1000, parseInt(limit, 10)));
  return arr.slice((p - 1) * l, (p - 1) * l + l);
}
function sortBy(arr, field, order = 'asc') {
  if (!field) return arr;
  const dir = order.toLowerCase() === 'desc' ? -1 : 1;
  return [...arr].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * dir);
}

// ---- public info ----
app.get('/', (_req, res) => {
  res.json({
    service: 'Mock Leads API',
    version: '1.0.0',
    oauth: { token_endpoint: '/oauth/token', grant_types: ['client_credentials','authorization_code','password','refresh_token'] },
    routes: ['GET /campaigns', 'GET /leads', 'PATCH /leads/:id'],
    note: 'Data loads from db.json; restarts reset edits if your host rebuilds.'
  });
});
app.get('/health', (_req, res) => res.send('ok'));

// ---- protected routes ----
app.get('/campaigns', authRequired, (req, res) => res.json(db.campaigns));

app.get('/leads', authRequired, (req, res) => {
  const { campaignId, status, firstName, lastName, page = 1, limit = 25, sortBy: s, order = 'asc' } = req.query;
  let leads = db.leads;
  if (campaignId) leads = leads.filter(l => l.campaignId === campaignId);
  if (status) leads = leads.filter(l => l.status === status);
  if (firstName) leads = leads.filter(l => String(l.firstName).toLowerCase() === String(firstName).toLowerCase());
  if (lastName) leads = leads.filter(l => String(l.lastName).toLowerCase() === String(lastName).toLowerCase());
  leads = sortBy(leads, s, order);
  res.set('X-Total-Count', String(leads.length));
  res.set('Access-Control-Expose-Headers', 'X-Total-Count');
  res.json(paginate(leads, page, limit));
});

app.patch('/leads/:id', authRequired, (req, res) => {
  const i = db.leads.findIndex(l => String(l.id) === String(req.params.id));
  if (i < 0) return res.status(404).json({ error: 'not_found' });
  db.leads[i] = { ...db.leads[i], ...req.body };
  res.json(db.leads[i]);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mock API listening on :${port}`));
