import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../server/index.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-'));
const app = createApp({ dataDir: dir, distDir: path.join(dir, 'none') });
const server = app.listen(0);
const base = 'http://127.0.0.1:' + server.address().port;
const A = { 'content-type': 'application/json', 'x-client-id': '123e4567-e89b-42d3-a456-426614174000' };
const B = { 'content-type': 'application/json', 'x-client-id': '223e4567-e89b-42d3-a456-426614174000' };
test.after(() => { server.close(); app.locals.close(); });
const call = async (m, p, h = A, body) => { const r = await fetch(base + p, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, r, json: r.headers.get('content-type')?.includes('json') ? await r.json() : null }; };

test('project lifecycle with live analysis', async () => {
  const c = await call('POST', '/api/projects', A, { name: 'Test project', audience: 'site engineers', idea: 'drafts the report from photos' });
  assert.equal(c.status, 201);
  const id = c.json.id;
  let g = await call('GET', '/api/projects/' + id);
  assert.equal(g.json.analysis.interviewCount, 0);

  let r = await call('POST', `/api/projects/${id}/interviews`, A, { label: 'Engineer', notes: 'I spend 3 hours a week copying readings into a spreadsheet. It is tedious and I hate it.' });
  assert.equal(r.status, 201);
  assert.equal(r.json.analysis.interviewCount, 1);
  assert.ok(r.json.analysis.themes.some((t) => t.id === 'manual'));
  const iid = r.json.interviews[0].id;

  r = await call('PATCH', `/api/projects/${id}/interviews/${iid}`, A, { notes: 'Reports go back to me every week because of typos. I redo them and it takes 2 hours a week.' });
  assert.ok(r.json.analysis.themes.some((t) => t.id === 'errors'));

  r = await call('PATCH', `/api/projects/${id}`, A, { roi: { users: 20, hourlyRate: 30, buildCost: 4000, reductionPct: 60, currency: 'inr' } });
  assert.equal(r.json.project.roi.currency, 'INR');
  assert.ok(r.json.analysis.roi.savings > 0);
  assert.ok(r.json.analysis.roi.payback > 0);

  const md = await fetch(base + `/api/projects/${id}/brief.md`, { headers: A });
  assert.match(await md.text(), /Ranked problems/);
  const pdf = await fetch(base + `/api/projects/${id}/brief.pdf`, { headers: A });
  const buf = Buffer.from(await pdf.arrayBuffer());
  assert.equal(buf.subarray(0, 4).toString(), '%PDF');
  assert.ok(buf.length > 1500);

  r = await call('DELETE', `/api/projects/${id}/interviews/${iid}`, A);
  assert.equal(r.json.analysis.interviewCount, 0);
  r = await call('DELETE', '/api/projects/' + id, A);
  assert.equal(r.status, 200);
  assert.equal((await call('GET', '/api/projects/' + id)).status, 404);
});

test('projects are private to their client id', async () => {
  const { json } = await call('POST', '/api/projects', A, { name: 'Private' });
  assert.equal((await call('GET', '/api/projects/' + json.id, B)).status, 404);
  assert.equal((await call('GET', '/api/projects', B)).json.length, 0);
  assert.equal((await call('GET', '/api/projects/' + json.id, { 'content-type': 'application/json' })).status, 400);
});

test('sample project loads with real analysis', async () => {
  const { json } = await call('POST', '/api/projects/sample', A);
  const g = await call('GET', '/api/projects/' + json.id);
  assert.equal(g.json.project.isSample, true);
  assert.equal(g.json.interviews.length, 4);
  assert.ok(g.json.analysis.themes.length >= 5);
});

test('validation', async () => {
  assert.equal((await call('POST', '/api/projects', A, { name: '' })).status, 400);
  const big = await call('POST', '/api/projects', A, { name: 'x'.repeat(500) });
  assert.equal(big.status, 201);
  const g = await call('GET', '/api/projects/' + big.json.id);
  assert.equal(g.json.project.name.length, 80);
});
