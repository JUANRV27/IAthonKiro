/**
 * Tests del boletín IA (POST /api/alerts/briefing) con el cliente de Bedrock simulado.
 * Ejecutar: npm test (desde backend/)
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.AMAPA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'amapa-briefing-'));

const { seed } = require('../src/db/seed');
const { createApp } = require('../src/app');
const { SYSTEM_PROMPT, MAX_BRIEFING_CHARS } = require('../src/services/briefingService');

// Silenciar los logs del seed
const quiet = console.log; console.log = () => {}; seed(); console.log = quiet;

const MODEL_ID = 'us.fake-model-v1:0';
const awsError = (name) => Object.assign(new Error(name), { name });

/** Cliente Bedrock simulado: cada llamada consume la siguiente respuesta del guion */
const fakeBedrock = {
  script: [],
  calls: [],
  async send(command, options) {
    this.calls.push({ input: command.input, options });
    const next = this.script.shift();
    if (next instanceof Error) throw next;
    return next;
  },
};
const reply = (text) => ({
  output: { message: { role: 'assistant', content: [{ text }] } },
  usage: { inputTokens: 300, outputTokens: 120 },
});

// Datos simulados de una alerta (zona 1 del seed: Bajo Piura)
const validBody = () => ({
  zone_id: 1,
  risk_level: 'red',
  title: 'Alerta Roja - Inundación Bajo Piura',
  senamhi_data: { precipitacion_mm: 112.5, nivel_rio_m: 8.3, umbral_critico_m: 7.5, pronostico_24h: 'lluvias intensas', estacion: 'La Esperanza' },
});

let server;
let baseUrl;
const sleeps = [];

before(async () => {
  const app = createApp({
    teamId: 'T067',
    briefing: { client: fakeBedrock, modelId: MODEL_ID, sleep: async (ms) => { sleeps.push(ms); } },
  });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => { fakeBedrock.script = []; fakeBedrock.calls = []; sleeps.length = 0; });

const postBriefing = (body) => fetch(`${baseUrl}/api/alerts/briefing`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('genera el boletín con Bedrock Converse a partir de los datos de la alerta', async () => {
  const text = 'Situación: alerta ROJA en Bajo Piura, río a 8.3 m sobre umbral 7.5 m.\n- Evacuar zonas bajas.\n- Apoyar albergue.\n- Reportar cada 2 h.\nSeguridad: no cruzar cauces.';
  fakeBedrock.script = [reply(text)];

  const res = await postBriefing(validBody());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, data: { text, source: 'bedrock', model: MODEL_ID } });

  const [{ input, options }] = fakeBedrock.calls;
  assert.equal(input.modelId, MODEL_ID);
  assert.equal(input.system[0].text, SYSTEM_PROMPT);
  assert.ok(input.inferenceConfig.maxTokens <= 400, 'maxTokens explícito y acotado');
  const prompt = input.messages[0].content[0].text;
  for (const dato of ['Bajo Piura', 'ROJA', '112.5', '8.3', '7.5', 'lluvias intensas', 'La Esperanza']) {
    assert.ok(prompt.includes(dato), `el prompt incluye ${dato}`);
  }
  assert.ok(options.abortSignal, 'cada llamada tiene timeout');
});

test('el prompt fija contexto del COE Piura, límite de longitud, tono y defensa ante inyección', () => {
  assert.match(SYSTEM_PROMPT, /COE/);
  assert.match(SYSTEM_PROMPT, /brigadistas/);
  assert.match(SYSTEM_PROMPT, /Máximo \d+ caracteres/);
  assert.match(SYSTEM_PROMPT, /tono claro, directo y calmado/);
  assert.match(SYSTEM_PROMPT, /no instrucciones/);
});

test('limpia Markdown de la respuesta (la tarjeta muestra texto plano)', async () => {
  fakeBedrock.script = [reply('**Situación:** río alto\n## Acciones\n- evacuar')];
  const { data } = await (await postBriefing(validBody())).json();
  assert.equal(data.text, 'Situación: río alto\nAcciones\n- evacuar');
});

test('recorta la respuesta del modelo al máximo de caracteres', async () => {
  fakeBedrock.script = [reply('x'.repeat(MAX_BRIEFING_CHARS + 500))];
  const { data } = await (await postBriefing(validBody())).json();
  assert.equal(data.source, 'bedrock');
  assert.ok(data.text.length <= MAX_BRIEFING_CHARS);
});

test('ThrottlingException: reintenta con espera creciente y luego responde', async () => {
  fakeBedrock.script = [awsError('ThrottlingException'), awsError('ThrottlingException'), reply('Situación: ok')];
  const res = await postBriefing(validBody());
  assert.equal(res.status, 200);
  const { data } = await res.json();
  assert.equal(data.source, 'bedrock');
  assert.equal(fakeBedrock.calls.length, 3);
  assert.equal(sleeps.length, 2);
  assert.ok(sleeps[1] > sleeps[0], 'backoff exponencial');
});

test('throttling persistente: respuesta de respaldo, el flujo no se rompe', async () => {
  fakeBedrock.script = [awsError('ThrottlingException'), awsError('ThrottlingException'), awsError('ThrottlingException')];
  const res = await postBriefing(validBody());
  assert.equal(res.status, 200);
  const { data } = await res.json();
  assert.equal(data.source, 'fallback');
  assert.match(data.text, /^Situación: alerta ROJA en Bajo Piura/);
  assert.match(data.text, /río a 8.3 m \(umbral 7.5 m\)/);
});

test('modelo sin respuesta (timeout / servicio no disponible / vacío): respaldo', async () => {
  for (const outcome of [awsError('TimeoutError'), awsError('ServiceUnavailableException'), awsError('ModelTimeoutException'), reply('   ')]) {
    fakeBedrock.script = [outcome];
    const res = await postBriefing(validBody());
    assert.equal(res.status, 200);
    assert.equal((await res.json()).data.source, 'fallback');
  }
});

test('otros errores del modelo → 502 JSON sin reintentar', async () => {
  for (const name of ['AccessDeniedException', 'ValidationException', 'ResourceNotFoundException']) {
    fakeBedrock.calls = [];
    fakeBedrock.script = [awsError(name)];
    const res = await postBriefing(validBody());
    assert.equal(res.status, 502, name);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.message.includes(name));
    assert.equal(fakeBedrock.calls.length, 1, `${name} no se reintenta`);
  }
});

test('entrada faltante o demasiado larga → 400 sin llamar al modelo', async () => {
  const cases = [
    {},
    { ...validBody(), zone_id: undefined },
    { ...validBody(), zone_id: 999 },
    { ...validBody(), risk_level: 'morado' },
    { ...validBody(), title: '' },
    { ...validBody(), title: 'a'.repeat(121) },
    { ...validBody(), description: 'a'.repeat(801) },
    { ...validBody(), senamhi_data: { estacion: 'e'.repeat(61) } },
    { ...validBody(), senamhi_data: { nivel_rio_m: -3 } },
    '{roto',
  ];
  for (const body of cases) {
    const res = await postBriefing(body);
    assert.equal(res.status, 400, `cuerpo: ${JSON.stringify(body).slice(0, 80)}`);
    assert.equal((await res.json()).success, false);
  }
  assert.equal(fakeBedrock.calls.length, 0);
});

test('sin MODEL_ID configurado: respaldo (útil en local con npm start)', async () => {
  const app = createApp({ teamId: 'T067' });
  const srv = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${srv.address().port}/api/alerts/briefing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody()),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).data.source, 'fallback');
  } finally { srv.close(); }
});
