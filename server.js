// Express auth proxy for MockAPI (keeps your data in MockAPI, adds mock OAuth)
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// ---- CONFIG ----
// Set this to your MockAPI base URL, e.g. https://<project-id>.mockapi.io/api/v1
const MOCKAPI_BASE = process.env.MOCKAPI_BASE;

// Optional: if you configured any header-based auth on MockAPI, set it here:
const MOCKAPI_API_KEY = process.env.MOCKAPI_API_KEY; // optional

if (!MOCKAPI_BASE) {
  console.error('ERROR: Missing MOCKAPI_BASE env var (e.g. https://<proj>.mockapi.io/api/v1)');
  process.exit(1);
}

const mock = axios.create({
  baseURL: MOCKAPI_BASE,
  timeout: 10000,
  headers: MOCKAPI_API_KEY ? { 'X-API-Key': MOCKAPI_API_KEY } : {}
});

// ---- Mock OAuth ----
const TOKENS = new Map(); // token -> {exp, scope[]}
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

app.post('/oauth/token', (req, res) => {
  const { grant_type, scope = 'api' } = { ...req.body, ...req.query };
  if (!grant_type) return res.status(400).json({ error: 'invalid_request', error_description: 'grant_type required' });
  const scopes = scope.split(/\s+/);
  // We "approve" common grants for teaching; all return a token
  if (['client_credentials','authorization_code','password','refresh_token'].includes(grant_type)) {
    return res.json(issueToken(scopes));
  }
  return res.status(400).json({ error: 'unsupported_grant_type' });
});

// ---- Public info & health ----
app.get('/', (_req, res) => {
  res.json({
    service: 'Mock Leads API (Auth Proxy)',
    backend: MOCKAPI_BASE,
    oauth: { token_endpoint: '/oauth/token', grant_types: ['client_credentials','authorization_code','password','refresh_token'] },
    routes: ['GET /campaigns', 'GET /leads', 'PATCH /leads/:id']
  });
});
app.get('/health', (_req, res) => res.send('ok'));

// ---- Protected routes that proxy to MockAPI ----
app.get('/campaigns', authRequired, async (req, res) => {
  try {
    const r = await mock.get('/campaigns', { params: req.query });
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: 'proxy_error' });
  }
});

app.get('/leads', authRequired, async (req, res) => {
  try {
    // MockAPI uses page & limit, plus your filters (campaignId, status, etc.)
    const r = await mock.get('/Leads', { params: req.query });
    // If MockAPI returns a total header, forward it; otherwise just send data
    const total = r.headers['x-total-count'];
    if (total) {
      res.set('X-Total-Count', total);
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: 'proxy_error' });
  }
});

app.patch('/Leads/:id', authRequired, async (req, res) => {
  try {
    const r = await mock.patch(`/leads/${encodeURIComponent(req.params.id)}`, req.body);
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: 'proxy_error' });
  }
});

const port = process.env.PORT || 3000;
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', method: req.method, path: req.path });
});

app.listen(port, () => console.log(`Auth proxy listening on :${port}`));

