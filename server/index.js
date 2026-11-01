import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, purgeOld } from './db.js';
import { analyze } from './analysis.js';
import { briefMarkdown, briefPdf } from './brief.js';
import { SAMPLE } from './sample.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const RETENTION_DAYS = 60;
const MAX_NOTES = 20000;
const MAX_INTERVIEWS = 30;
const MAX_PROJECTS = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

export function createApp({ dataDir, distDir } = {}) {
  dataDir = dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'data');
  distDir = distDir || path.join(here, '..', 'dist');
  const db = openDb(dataDir);
  purgeOld(db, RETENTION_DAYS);
  const purgeTimer = setInterval(() => purgeOld(db, RETENTION_DAYS), 3600000);
  purgeTimer.unref();

  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
  });
  app.use(express.json({ limit: '60kb' }));

  const hits = new Map();
  const limit = (name, max, windowMs) => (req, res, next) => {
    const key = name + ':' + req.ip; const t = Date.now(); const rec = hits.get(key);
    if (!rec || t > rec.reset) { hits.set(key, { n: 1, reset: t + windowMs }); return next(); }
    if (++rec.n > max) { res.set('Retry-After', String(Math.ceil((rec.reset - t) / 1000))); return res.status(429).json({ error: 'Too many requests. Try again in a minute.' }); }
    next();
  };
  setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (t > v.reset) hits.delete(k); }, 60000).unref();
  app.use('/api', limit('api', 240, 60000));

  const cid = (req) => {
    const id = req.get('x-client-id');
    if (!id || !UUID.test(id)) throw new HttpError(400, 'Missing or invalid x-client-id header');
    return id;
  };
  const project = (req) => {
    const p = db.prepare('SELECT * FROM projects WHERE id = ? AND client_id = ?').get(req.params.id, cid(req));
    if (!p) throw new HttpError(404, 'Project not found');
    return p;
  };
  const shape = (p) => ({ id: p.id, name: p.name, audience: p.audience, product: p.product, idea: p.idea, roi: JSON.parse(p.roi || '{}'), isSample: !!p.is_sample, createdAt: p.created_at, updatedAt: p.updated_at });
  const interviewsOf = (id) => db.prepare('SELECT id, label, notes, created_at AS createdAt, updated_at AS updatedAt FROM interviews WHERE project_id = ? ORDER BY created_at, rowid').all(id);
  const full = (p) => { const pr = shape(p); const iv = interviewsOf(p.id); return { project: pr, interviews: iv, analysis: analyze(pr, iv) }; };
  const touch = (id) => db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), id);

  const cleanRoi = (r = {}) => ({
    users: num(r.users, 1, 100000, 1), hourlyRate: num(r.hourlyRate, 0, 100000, 0), buildCost: num(r.buildCost, 0, 1e9, 0),
    reductionPct: num(r.reductionPct, 0, 100, 50), minutesOverride: r.minutesOverride === null || r.minutesOverride === '' || r.minutesOverride === undefined ? null : num(r.minutesOverride, 0, 100000, 0),
    currency: /^[A-Za-z]{3}$/.test(r.currency || '') ? r.currency.toUpperCase() : 'USD',
  });

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  app.get('/api/projects', (req, res) => {
    const rows = db.prepare('SELECT p.*, (SELECT COUNT(*) FROM interviews i WHERE i.project_id = p.id) AS n FROM projects p WHERE client_id = ? ORDER BY updated_at DESC').all(cid(req));
    res.json(rows.map((p) => ({ ...shape(p), interviewCount: p.n })));
  });

  app.post('/api/projects', (req, res) => {
    const client = cid(req);
    if (db.prepare('SELECT COUNT(*) AS n FROM projects WHERE client_id = ?').get(client).n >= MAX_PROJECTS) throw new HttpError(400, 'Project limit reached. Delete one to add another.');
    const name = str(req.body.name, 80);
    if (!name) throw new HttpError(400, 'Give the project a name.');
    const id = crypto.randomUUID(); const t = Date.now();
    db.prepare('INSERT INTO projects (id, client_id, name, audience, product, idea, roi, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, client, name, str(req.body.audience, 200), str(req.body.product, 60), str(req.body.idea, 600), JSON.stringify(cleanRoi(req.body.roi)), t, t);
    res.status(201).json({ id });
  });

  app.post('/api/projects/sample', (req, res) => {
    const client = cid(req);
    if (db.prepare('SELECT COUNT(*) AS n FROM projects WHERE client_id = ?').get(client).n >= MAX_PROJECTS) throw new HttpError(400, 'Project limit reached. Delete one to add another.');
    const id = crypto.randomUUID(); const t = Date.now();
    db.prepare('INSERT INTO projects (id, client_id, name, audience, product, idea, roi, is_sample, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)')
      .run(id, client, SAMPLE.name, SAMPLE.audience, '', SAMPLE.idea, JSON.stringify(cleanRoi({ users: 10, hourlyRate: 25, buildCost: 8000, reductionPct: 50 })), t, t);
    SAMPLE.interviews.forEach((iv, i) => db.prepare('INSERT INTO interviews (id, project_id, label, notes, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), id, iv.label, iv.notes, t + i, t + i));
    res.status(201).json({ id });
  });

  app.get('/api/projects/:id', (req, res) => res.json(full(project(req))));

  app.patch('/api/projects/:id', (req, res) => {
    const p = project(req); const b = req.body || {};
    const next = {
      name: b.name !== undefined ? str(b.name, 80) || p.name : p.name,
      audience: b.audience !== undefined ? str(b.audience, 200) : p.audience,
      product: b.product !== undefined ? str(b.product, 60) : p.product,
      idea: b.idea !== undefined ? str(b.idea, 600) : p.idea,
      roi: b.roi !== undefined ? JSON.stringify(cleanRoi(b.roi)) : p.roi,
    };
    db.prepare('UPDATE projects SET name=?, audience=?, product=?, idea=?, roi=?, updated_at=? WHERE id=?').run(next.name, next.audience, next.product, next.idea, next.roi, Date.now(), p.id);
    res.json(full(project(req)));
  });

  app.delete('/api/projects/:id', (req, res) => { const p = project(req); db.prepare('DELETE FROM projects WHERE id = ?').run(p.id); res.json({ ok: true }); });

  app.post('/api/projects/:id/interviews', (req, res) => {
    const p = project(req);
    if (db.prepare('SELECT COUNT(*) AS n FROM interviews WHERE project_id = ?').get(p.id).n >= MAX_INTERVIEWS) throw new HttpError(400, 'Interview limit reached for this project.');
    const t = Date.now();
    db.prepare('INSERT INTO interviews (id, project_id, label, notes, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(crypto.randomUUID(), p.id, str(req.body.label, 80), typeof req.body.notes === 'string' ? req.body.notes.slice(0, MAX_NOTES) : '', t, t);
    touch(p.id);
    res.status(201).json(full(project(req)));
  });

  const interviewOf = (req) => {
    const p = project(req);
    const iv = db.prepare('SELECT * FROM interviews WHERE id = ? AND project_id = ?').get(req.params.iid, p.id);
    if (!iv) throw new HttpError(404, 'Interview not found');
    return { p, iv };
  };
  app.patch('/api/projects/:id/interviews/:iid', (req, res) => {
    const { p, iv } = interviewOf(req); const b = req.body || {};
    db.prepare('UPDATE interviews SET label=?, notes=?, updated_at=? WHERE id=?')
      .run(b.label !== undefined ? str(b.label, 80) : iv.label, typeof b.notes === 'string' ? b.notes.slice(0, MAX_NOTES) : iv.notes, Date.now(), iv.id);
    touch(p.id);
    res.json(full(project(req)));
  });
  app.delete('/api/projects/:id/interviews/:iid', (req, res) => {
    const { p, iv } = interviewOf(req);
    db.prepare('DELETE FROM interviews WHERE id = ?').run(iv.id); touch(p.id);
    res.json(full(project(req)));
  });

  app.get('/api/projects/:id/brief.md', (req, res) => {
    const { project: pr, analysis } = full(project(req));
    res.set({ 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="valueforge-brief.md"' }).send(briefMarkdown(pr, analysis));
  });
  app.get('/api/projects/:id/brief.pdf', (req, res) => {
    const { project: pr, analysis } = full(project(req));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="valueforge-brief.pdf"' });
    briefPdf(pr, analysis, res);
  });

  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use('/assets', express.static(path.join(distDir, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(distDir, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/', (req, res) => res.type('text').send('API is running. Build the frontend with: npm run build'));
  }
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
  });
  app.locals.close = () => { clearInterval(purgeTimer); db.close(); };
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => console.log('ValueForge listening on :' + port));
  const stop = () => server.close(() => { app.locals.close(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
