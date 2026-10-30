/**
 * Tests de los contratos "API viva" (/health) y "Persistencia" (/items)
 * con una tabla falsa en memoria. Ejecutar: npm test (desde backend/)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Datos de AMAPA en una carpeta temporal (no tocar backend/data)
process.env.AMAPA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'amapa-test-'));

const { createApp } = require('../src/app');
const { createDynamoItemsStore } = require('../src/services/itemsStore');

/** Tabla falsa con la misma interfaz que el almacén DynamoDB */
function createFakeStore() {
  const rows = new Map();
  return {
    rows,
    async put(item) { rows.set(item.id, { ...item }); return item; },
    async get(id) { return rows.get(id) || null; },
    async list(limit = 100) { return [...rows.values()].slice(0, limit); },
  };
}

/** Tabla falsa de trabajos con la misma interfaz que createDynamoJobsStore */
function createFakeJobsStore() {
  const rows = new Map();
  return {
    rows,
    async put(job) { rows.set(job.jobId, { ...job }); return job; },
    async get(jobId) { const j = rows.get(jobId); return j ? { ...j } : null; },
    async complete(jobId, output) {
      const j = rows.get(jobId);
      if (j && j.status === 'queued') Object.assign(j, { status: 'done', output });
    },
  };
}

let server;
let baseUrl;
const store = createFakeStore();
const jobsStore = createFakeJobsStore();
const clock = { ms: Date.parse('2026-10-30T12:00:00Z') };

before(async () => {
  const app = createApp({ teamId: 'T067', itemsStore: store, jobsStore, now: () => clock.ms });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('test_health: GET /health → 200 {"status":"ok","team":"T067"}', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { status: 'ok', team: 'T067' });
});

test('POST /items crea, GET /items/:id lo devuelve y GET /items lo lista', async () => {
  const nonce = `nonce-${Math.random().toString(36).slice(2)}`;

  const created = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: nonce }),
  });
  assert.equal(created.status, 201);
  assert.match(created.headers.get('content-type'), /application\/json/);
  const item = await created.json();
  assert.equal(item.value, nonce);
  assert.equal(typeof item.id, 'string');
  assert.ok(store.rows.has(item.id), 'el ítem se guardó en la tabla');

  const byId = await fetch(`${baseUrl}/items/${item.id}`);
  assert.equal(byId.status, 200);
  assert.match(byId.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await byId.json(), { id: item.id, value: nonce });

  const list = await fetch(`${baseUrl}/items`);
  assert.equal(list.status, 200);
  assert.match(list.headers.get('content-type'), /application\/json/);
  const items = await list.json();
  assert.ok(Array.isArray(items));
  assert.ok(items.some((i) => i.id === item.id && i.value === nonce));
});

test('POST /items acepta cuerpo JSON sin Content-Type', async () => {
  const res = await fetch(`${baseUrl}/items`, { method: 'POST', body: JSON.stringify({ value: 'sin-header' }) });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).value, 'sin-header');
});

test('GET /items/:id inexistente → 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/items/no-existe`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
});

test('POST /items con value inválido o JSON roto → 400 JSON', async () => {
  for (const body of [JSON.stringify({}), JSON.stringify({ value: 42 }), '{roto']) {
    const res = await fetch(`${baseUrl}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(res.status, 400, `cuerpo: ${body}`);
    assert.match(res.headers.get('content-type'), /application\/json/);
  }
});

test('almacén DynamoDB: list() pagina el scan hasta 100 ítems', async () => {
  // Cliente DynamoDB falso: 250 ítems servidos en páginas de 30
  const all = Array.from({ length: 250 }, (_, i) => ({ id: `id-${i}`, value: `v-${i}` }));
  const calls = [];
  const fakeDocClient = {
    async send(cmd) {
      const { TableName, Limit, ExclusiveStartKey } = cmd.input;
      calls.push({ TableName, Limit });
      const start = ExclusiveStartKey ? Number(ExclusiveStartKey.id.slice(3)) + 1 : 0;
      const Items = all.slice(start, start + Math.min(30, Limit));
      const last = Items[Items.length - 1];
      return { Items, LastEvaluatedKey: start + Items.length < all.length ? { id: last.id } : undefined };
    },
  };
  const items = await createDynamoItemsStore('FakeTable', fakeDocClient).list();
  assert.equal(items.length, 100);
  assert.ok(calls.length > 1, 'leyó más de una página');
  assert.ok(calls.every((c) => c.TableName === 'FakeTable'));
  assert.deepEqual(items[99], { id: 'id-99', value: 'v-99' });
});

test('POST /jobs → 202 {jobId}; GET /jobs/:id pasa de queued a done con el input al revés', async () => {
  const created = await fetch(`${baseUrl}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: 'abc1' }),
  });
  assert.equal(created.status, 202);
  assert.match(created.headers.get('content-type'), /application\/json/);
  const { jobId, ...rest } = await created.json();
  assert.equal(typeof jobId, 'string');
  assert.deepEqual(rest, {});
  assert.equal(jobsStore.rows.get(jobId).status, 'queued', 'el trabajo se guardó en la tabla');

  const queued = await fetch(`${baseUrl}/jobs/${jobId}`);
  assert.equal(queued.status, 200);
  assert.match(queued.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await queued.json(), { jobId, status: 'queued', output: null });

  clock.ms += 2000; // readyAt = creación + 2 s
  const done = await fetch(`${baseUrl}/jobs/${jobId}`);
  assert.equal(done.status, 200);
  assert.deepEqual(await done.json(), { jobId, status: 'done', output: '1cba' });
  assert.equal(jobsStore.rows.get(jobId).output, '1cba', 'el resultado quedó guardado');
});

test('GET /jobs/:id inexistente → 404 JSON; POST /jobs inválido → 400 JSON', async () => {
  const missing = await fetch(`${baseUrl}/jobs/no-existe`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);

  for (const body of [JSON.stringify({}), JSON.stringify({ input: 7 }), '{roto']) {
    const res = await fetch(`${baseUrl}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(res.status, 400, `cuerpo: ${body}`);
  }
});

test('reverseText invierte carácter por carácter, incluidos acentos y emojis', () => {
  const { reverseText } = require('../src/routes/jobs');
  assert.equal(reverseText('abc1'), '1cba');
  assert.equal(reverseText('Piura-ñ😀'), '😀ñ-aruiP');
});

test('almacén DynamoDB de trabajos: guarda con prefijo job# y completa una sola vez', async () => {
  const { createDynamoJobsStore } = require('../src/services/itemsStore');
  const sent = [];
  const fakeDocClient = { async send(cmd) { sent.push(cmd); return {}; } };
  const jobs = createDynamoJobsStore('FakeTable', fakeDocClient);
  await jobs.put({ jobId: 'j1', input: 'x', status: 'queued' });
  await jobs.complete('j1', 'x');
  assert.deepEqual(sent[0].input.Item, { jobId: 'j1', input: 'x', status: 'queued', id: 'job#j1', kind: 'job' });
  assert.equal(sent[1].input.Key.id, 'job#j1');
  assert.equal(sent[1].input.ConditionExpression, '#s = :queued');
});
