/**
 * Tests de la historia principal: POST/GET/PATCH /reportes, clasificación EDAN con
 * Bedrock simulado, respaldo por reglas, cola SQS falsa y handler SQS.
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.AMAPA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'amapa-reportes-'));

const { createApp } = require('../src/app');
const { createMemoryReportesStore, createDynamoReportesStore } = require('../src/services/reportesStore');
const { createReportesService, ordenarReportes, STALE_MS } = require('../src/services/reportesService');
const { reglasEdan, parseSalida, SYSTEM_PROMPT, clasificar } = require('../src/services/clasificador');
const { REPORTES_DEMO } = require('../src/db/seedReportes');

const silentLog = { info() {}, warn() {}, error() {} };
const awsError = (name) => Object.assign(new Error(name), { name });
const reply = (text) => ({ output: { message: { content: [{ text }] } }, usage: { inputTokens: 1, outputTokens: 1 } });

const fakeBedrock = {
  script: [], calls: [],
  async send(cmd) {
    this.calls.push(cmd.input);
    const next = this.script.shift();
    if (next instanceof Error) throw next;
    return next;
  },
};
const fakeQueue = { sent: [], async send(id) { this.sent.push(id); } };

// Reporte simulado del contrato (sin datos personales)
const reporteValido = () => ({
  tipoPeligro: 'desborde de quebrada', distrito: 'Castilla', lat: -5.196, lng: -80.622,
  personasEnRiesgo: 40, viviendas: 'inhabitables', viaAcceso: 'bloqueada',
  lugaresCriticos: ['colegio'], necesidad: 'evacuación', descripcion: 'El agua entra a 12 casas', fotoUrl: null,
});

let server; let baseUrl; let store; let service;
const clock = { ms: Date.parse('2026-10-30T12:00:00Z') };

before(async () => {
  store = createMemoryReportesStore();
  service = createReportesService({
    store, queue: fakeQueue, now: () => clock.ms, log: silentLog,
    ia: { client: fakeBedrock, modelId: 'us.fake-model-v1:0', sleep: async () => {} },
  });
  const app = createApp({ teamId: 'T067', reportes: service });
  await new Promise((r) => { server = app.listen(0, r); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));
beforeEach(() => { fakeBedrock.script = []; fakeBedrock.calls = []; fakeQueue.sent = []; });

const post = (body) => fetch(`${baseUrl}/reportes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const patch = (id, body) => fetch(`${baseUrl}/reportes/${id}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('POST /reportes → 201 con nivel "clasificando", estado "pendiente" y encola el id', async () => {
  const res = await post(reporteValido());
  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const r = await res.json();
  assert.match(r.id, /^r-/);
  assert.equal(r.nivel, 'clasificando');
  assert.equal(r.porque, null);
  assert.equal(r.accionSugerida, null);
  assert.equal(r.estado, 'pendiente');
  assert.equal(r.fecha, '2026-10-30T12:00:00.000Z');
  assert.equal(r.tipoPeligro, 'desborde de quebrada');
  assert.deepEqual(fakeQueue.sent, [r.id]);
  assert.equal(fakeBedrock.calls.length, 0, 'el POST no espera a la IA');
});

test('POST /reportes inválido → 400 JSON sin llamar al modelo', async () => {
  const casos = [
    {}, '{roto',
    { ...reporteValido(), tipoPeligro: 'tsunami' },
    { ...reporteValido(), distrito: '' },
    { ...reporteValido(), lat: undefined },
    { ...reporteValido(), lat: -12.05, lng: -77.04 }, // Lima: fuera de Piura
    { ...reporteValido(), viviendas: 'muchas' },
    { ...reporteValido(), viaAcceso: 'cerrada' },
    { ...reporteValido(), necesidad: 'comida' },
    { ...reporteValido(), lugaresCriticos: 'colegio' },
    { ...reporteValido(), lugaresCriticos: ['estadio'] },
    { ...reporteValido(), personasEnRiesgo: -1 },
    { ...reporteValido(), descripcion: 'x'.repeat(501) },
    { ...reporteValido(), fotoUrl: 'https://externo.example/foto.jpg' },
  ];
  for (const body of casos) {
    const res = await post(body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    assert.equal((await res.json()).success, false);
  }
  assert.equal(fakeQueue.sent.length, 0);
  assert.equal(fakeBedrock.calls.length, 0);
});

test('handler SQS: Bedrock clasifica y el reporte toma color con porqué y acción', async () => {
  const { id } = await (await post(reporteValido())).json();
  fakeBedrock.script = [reply('{"nivel":"rojo","porque":"Vía bloqueada con 40 personas y colegio expuesto","accionSugerida":"Evacuar a las 40 personas hacia el colegio más alto y cerrar la vía."}')];

  const out = await service.procesarMensajes([{ messageId: 'm1', body: JSON.stringify({ id }) }]);
  assert.deepEqual(out, { batchItemFailures: [] });

  const r = await store.get(id);
  assert.equal(r.nivel, 'rojo');
  assert.equal(r.fuente, 'bedrock');
  assert.ok(r.porque.split(/\s+/).length <= 15);
  assert.match(r.accionSugerida, /Evacuar/);

  // Prompt: criterios EDAN, datos delimitados y maxTokens explícito
  const [req] = fakeBedrock.calls;
  assert.equal(req.system[0].text, SYSTEM_PROMPT);
  assert.ok(req.inferenceConfig.maxTokens <= 300);
  assert.match(req.messages[0].content[0].text, /<reporte>[\s\S]*viaAcceso: bloqueada[\s\S]*<\/reporte>/);

  // Reintento de SQS: idempotente, no vuelve a llamar al modelo
  await service.procesarMensajes([{ messageId: 'm2', body: JSON.stringify({ id }) }]);
  assert.equal(fakeBedrock.calls.length, 1);
});

test('Bedrock falla o responde mal → clasifica con reglas EDAN, el flujo no se rompe', async () => {
  const salidas = [
    reply('No puedo ayudar con eso.'),
    reply('{"nivel":"morado","porque":"x","accionSugerida":"y"}'),
    awsError('TimeoutError'),
    awsError('AccessDeniedException'),
    [awsError('ThrottlingException'), awsError('ThrottlingException'), awsError('ThrottlingException')],
  ];
  for (const s of salidas) {
    const { id } = await (await post(reporteValido())).json();
    fakeBedrock.script = [].concat(s);
    await service.procesarMensajes([{ messageId: 'x', body: JSON.stringify({ id }) }]);
    const r = await store.get(id);
    assert.equal(r.fuente, 'reglas');
    assert.equal(r.nivel, 'rojo');
    assert.ok(r.porque && r.accionSugerida);
  }
});

test('ThrottlingException puntual: reintenta y usa Bedrock', async () => {
  const { id } = await (await post(reporteValido())).json();
  fakeBedrock.script = [awsError('ThrottlingException'), reply('{"nivel":"rojo","porque":"Vía bloqueada","accionSugerida":"Evacuar."}')];
  await service.procesarMensajes([{ messageId: 'm', body: JSON.stringify({ id }) }]);
  assert.equal((await store.get(id)).fuente, 'bedrock');
  assert.equal(fakeBedrock.calls.length, 2);
});

test('mensaje SQS mal formado → batchItemFailures', async () => {
  const out = await service.procesarMensajes([{ messageId: 'bad', body: 'no-json' }]);
  assert.deepEqual(out, { batchItemFailures: [{ itemIdentifier: 'bad' }] });
});

test('GET /reportes: siembra la demo y ordena rojo → amarillo → verde → clasificando, recientes primero', async () => {
  const res = await fetch(`${baseUrl}/reportes`);
  assert.equal(res.status, 200);
  const lista = await res.json();
  assert.ok(Array.isArray(lista));
  const orden = { rojo: 0, amarillo: 1, verde: 2, clasificando: 3 };
  for (let i = 1; i < lista.length; i++) {
    const a = lista[i - 1]; const b = lista[i];
    assert.ok(orden[a.nivel] < orden[b.nivel] || (orden[a.nivel] === orden[b.nivel] && a.fecha >= b.fecha), `orden en ${i}`);
  }
});

test('GET /reportes: un reporte atascado en "clasificando" (cola caída) se clasifica al leer', async () => {
  const { id } = await (await post(reporteValido())).json();
  fakeBedrock.script = [reply('{"nivel":"rojo","porque":"Vía bloqueada","accionSugerida":"Evacuar."}')];
  clock.ms += STALE_MS + 1000;
  const lista = await (await fetch(`${baseUrl}/reportes`)).json();
  assert.equal(lista.find((r) => r.id === id).nivel, 'rojo');
});

test('PATCH /reportes/:id cambia estado; 400 si es inválido y 404 si no existe', async () => {
  const { id } = await (await post(reporteValido())).json();
  let res = await patch(id, { estado: 'en atención' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).estado, 'en atención');
  res = await patch(id, { estado: 'asegurado' });
  assert.equal((await res.json()).estado, 'asegurado');
  assert.equal((await patch(id, { estado: 'cerrado' })).status, 400);
  assert.equal((await patch('r-no-existe', { estado: 'asegurado' })).status, 404);
});

test('reglasEdan aplica cada criterio rojo / amarillo / verde', () => {
  const b = { personasEnRiesgo: 0, viviendas: 'ninguna', viaAcceso: 'libre', lugaresCriticos: [], necesidad: 'ninguna' };
  assert.equal(reglasEdan({ ...b, viaAcceso: 'bloqueada', personasEnRiesgo: 5 }).nivel, 'rojo');
  assert.equal(reglasEdan({ ...b, viaAcceso: 'bloqueada' }).nivel, 'verde', 'vía bloqueada sin personas no es rojo');
  assert.equal(reglasEdan({ ...b, viviendas: 'colapsadas' }).nivel, 'rojo');
  assert.equal(reglasEdan({ ...b, necesidad: 'evacuación' }).nivel, 'rojo');
  assert.equal(reglasEdan({ ...b, lugaresCriticos: ['posta'] }).nivel, 'rojo');
  assert.equal(reglasEdan({ ...b, viviendas: 'afectadas' }).nivel, 'amarillo');
  assert.equal(reglasEdan({ ...b, viaAcceso: 'restringida' }).nivel, 'amarillo');
  assert.equal(reglasEdan({ ...b, personasEnRiesgo: 3 }).nivel, 'amarillo');
  assert.equal(reglasEdan({ ...b, lugaresCriticos: ['puente'] }).nivel, 'verde');
  for (const r of [reglasEdan({ ...b, viviendas: 'colapsadas', necesidad: 'evacuación', lugaresCriticos: ['colegio', 'posta'] })]) {
    assert.ok(r.porque.split(/\s+/).length <= 15);
  }
});

test('los 8 reportes demo: 3 rojos, 3 amarillos, 2 verdes, 2 asegurados, coherentes con reglasEdan', () => {
  assert.equal(REPORTES_DEMO.length, 8);
  const cuenta = (n) => REPORTES_DEMO.filter((r) => r.nivel === n).length;
  assert.deepEqual([cuenta('rojo'), cuenta('amarillo'), cuenta('verde')], [3, 3, 2]);
  assert.equal(REPORTES_DEMO.filter((r) => r.estado === 'asegurado').length, 2);
  for (const r of REPORTES_DEMO) assert.equal(reglasEdan(r).nivel, r.nivel, r.id);
});

test('parseSalida valida y recorta la salida del modelo', () => {
  assert.equal(parseSalida('```json\n{"nivel":"Verde","porque":"ok","accionSugerida":"monitorear"}\n```').nivel, 'verde');
  assert.equal(parseSalida('{"nivel":"rojo"}'), null);
  assert.equal(parseSalida('nada'), null);
  const largo = parseSalida(JSON.stringify({ nivel: 'rojo', porque: 'a '.repeat(40), accionSugerida: 'b'.repeat(300) }));
  assert.ok(largo.porque.split(/\s+/).length <= 15);
  assert.ok(largo.accionSugerida.length <= 120);
});

test('sin MODEL_ID: clasificar usa reglas', async () => {
  const r = await clasificar(reporteValido(), { log: silentLog });
  assert.equal(r.fuente, 'reglas');
  assert.equal(r.nivel, 'rojo');
});

test('almacén DynamoDB: prefijo reporte#, kind y actualización condicionada', async () => {
  const sent = [];
  const doc = { async send(cmd) { sent.push(cmd); return { Attributes: { id: 'reporte#r-1', kind: 'reporte', nivel: 'rojo' } }; } };
  const s = createDynamoReportesStore('FakeTable', doc);
  await s.put({ id: 'r-1', nivel: 'clasificando' });
  const upd = await s.update('r-1', { nivel: 'rojo' }, { onlyIfClasificando: true });
  assert.deepEqual(sent[0].input.Item, { id: 'reporte#r-1', nivel: 'clasificando', kind: 'reporte' });
  assert.match(sent[1].input.ConditionExpression, /#nivel = :clasificando/);
  assert.deepEqual(upd, { id: 'r-1', nivel: 'rojo' });
});

test('ordenarReportes desempata por fecha más reciente', () => {
  const o = ordenarReportes([
    { id: 'a', nivel: 'verde', fecha: '2026-01-02' },
    { id: 'b', nivel: 'rojo', fecha: '2026-01-01' },
    { id: 'c', nivel: 'rojo', fecha: '2026-01-03' },
    { id: 'd', nivel: 'clasificando', fecha: '2026-01-04' },
  ]);
  assert.deepEqual(o.map((r) => r.id), ['c', 'b', 'a', 'd']);
});

test('handler Lambda distingue eventos SQS de HTTP', () => {
  const { isSqsEvent } = require('../src/lambda');
  assert.equal(isSqsEvent({ Records: [{ eventSource: 'aws:sqs', body: '{}' }] }), true);
  assert.equal(isSqsEvent({ version: '2.0', rawPath: '/health' }), false);
});
