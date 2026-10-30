/**
 * Lógica de reportes de puntos críticos (historia de usuario principal).
 *
 * Flujo: POST guarda el reporte con nivel "clasificando" → encola el id (SQS)
 * → la Lambda lee la cola → clasificar() con Bedrock → actualiza nivel, porque
 * y accionSugerida. Red de seguridad: si un reporte sigue "clasificando" más de
 * STALE_MS (cola caída), GET /reportes lo clasifica en línea.
 */
const crypto = require('crypto');
const { clasificar } = require('./clasificador');
const { REPORTES_DEMO } = require('../db/seedReportes');

const TIPOS_PELIGRO = ['inundación', 'desborde de río', 'desborde de quebrada', 'colapso de dren', 'huaico', 'vivienda colapsada'];
const VIVIENDAS = ['ninguna', 'afectadas', 'inhabitables', 'colapsadas'];
const VIAS = ['libre', 'restringida', 'bloqueada'];
const LUGARES = ['colegio', 'posta', 'puente', 'ninguno'];
const NECESIDADES = ['evacuación', 'agua', 'albergue', 'atención médica', 'ninguna'];
const ESTADOS = ['pendiente', 'en atención', 'asegurado'];
const ORDEN_NIVEL = { rojo: 0, amarillo: 1, verde: 2, clasificando: 3 };

// Región Piura (aprox.): evita puntos fuera del ámbito del COE
const PIURA_BOUNDS = { latMin: -6.5, latMax: -4.0, lngMin: -81.5, lngMax: -79.0 };
const MAX_DESCRIPCION = 500;
const MAX_DISTRITO = 60;
const MAX_PERSONAS = 100000;
const STALE_MS = 15000;
const MAX_INLINE_POR_LECTURA = 3;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Validación ────────────────────────────────────────────────────────────
function validarReporte(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { errors: ['Cuerpo JSON requerido'] };

  const enumerado = (campo, lista, def) => {
    const v = body[campo] ?? def;
    if (!lista.includes(v)) errors.push(`${campo} debe ser uno de: ${lista.join(', ')}`);
    return v;
  };

  const tipoPeligro = enumerado('tipoPeligro', TIPOS_PELIGRO);
  const distrito = typeof body.distrito === 'string' ? body.distrito.trim() : '';
  if (!distrito) errors.push('distrito es requerido');
  else if (distrito.length > MAX_DISTRITO) errors.push(`distrito admite como máximo ${MAX_DISTRITO} caracteres`);

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (body.lat === undefined || body.lat === null || body.lat === '' || !Number.isFinite(lat)
      || body.lng === undefined || body.lng === null || body.lng === '' || !Number.isFinite(lng)) {
    errors.push('lat y lng son requeridos y numéricos');
  } else if (lat < PIURA_BOUNDS.latMin || lat > PIURA_BOUNDS.latMax || lng < PIURA_BOUNDS.lngMin || lng > PIURA_BOUNDS.lngMax) {
    errors.push('lat/lng deben estar dentro de la región Piura');
  }

  const personas = body.personasEnRiesgo ?? 0;
  if (!Number.isInteger(Number(personas)) || Number(personas) < 0 || Number(personas) > MAX_PERSONAS || personas === '') {
    errors.push(`personasEnRiesgo debe ser un entero entre 0 y ${MAX_PERSONAS}`);
  }

  const viviendas = enumerado('viviendas', VIVIENDAS, 'ninguna');
  const viaAcceso = enumerado('viaAcceso', VIAS, 'libre');
  const necesidad = enumerado('necesidad', NECESIDADES, 'ninguna');

  let lugaresCriticos = body.lugaresCriticos ?? [];
  if (!Array.isArray(lugaresCriticos) || lugaresCriticos.some((l) => !LUGARES.includes(l)) || lugaresCriticos.length > LUGARES.length) {
    errors.push(`lugaresCriticos debe ser una lista con: ${LUGARES.join(', ')}`);
  } else {
    lugaresCriticos = [...new Set(lugaresCriticos.filter((l) => l !== 'ninguno'))];
  }

  let descripcion = body.descripcion ?? '';
  if (typeof descripcion !== 'string') errors.push('descripcion debe ser texto');
  else if (descripcion.trim().length > MAX_DESCRIPCION) errors.push(`descripcion admite como máximo ${MAX_DESCRIPCION} caracteres`);
  else descripcion = descripcion.trim();

  // Foto: opcional y solo recursos propios (/app/...), sin enlazar sistemas externos
  const fotoUrl = body.fotoUrl ?? null;
  if (fotoUrl !== null && (typeof fotoUrl !== 'string' || !/^\/app\/[\w./-]{1,200}$/.test(fotoUrl) || fotoUrl.includes('..'))) {
    errors.push('fotoUrl debe ser null o una ruta propia /app/...');
  }

  if (errors.length) return { errors };
  return {
    errors,
    datos: {
      tipoPeligro, distrito, lat, lng, personasEnRiesgo: Number(personas),
      viviendas, viaAcceso, lugaresCriticos, necesidad, descripcion, fotoUrl,
    },
  };
}

function ordenarReportes(reportes) {
  return [...reportes].sort((a, b) =>
    (ORDEN_NIVEL[a.nivel] ?? 9) - (ORDEN_NIVEL[b.nivel] ?? 9) || String(b.fecha).localeCompare(String(a.fecha)));
}

// ── Servicio ──────────────────────────────────────────────────────────────
function createReportesService({ store, queue = null, ia = {}, now = Date.now, log = console } = {}) {
  let seeded = null;
  const ensureSeed = () => {
    seeded ??= (async () => {
      if ((await store.list()).length > 0) return;
      for (const r of REPORTES_DEMO) await store.put(r, { onlyIfNew: true });
    })().catch((err) => { seeded = null; throw err; });
    return seeded;
  };

  /** Clasifica (Bedrock o reglas) y guarda; idempotente si ya no está "clasificando". */
  async function clasificarPendiente(id) {
    const reporte = await store.get(id);
    if (!reporte || reporte.nivel !== 'clasificando') return reporte;
    const r = await clasificar(reporte, { ...ia, log });
    return store.update(id, {
      nivel: r.nivel, porque: r.porque, accionSugerida: r.accionSugerida,
      fuente: r.fuente, clasificadoEn: new Date(now()).toISOString(),
    }, { onlyIfClasificando: true });
  }

  async function crear(body) {
    const { errors, datos } = validarReporte(body);
    if (errors.length) throw new HttpError(400, errors.join('; '));
    const reporte = {
      id: `r-${crypto.randomUUID()}`,
      ...datos,
      nivel: 'clasificando', porque: null, accionSugerida: null, fuente: null,
      estado: 'pendiente',
      fecha: new Date(now()).toISOString(),
    };
    await store.put(reporte);

    if (queue) {
      try { await queue.send(reporte.id); } catch (err) {
        // La red de seguridad de GET /reportes lo clasificará
        log.error?.(JSON.stringify({ evt: 'reportes.encolar.error', id: reporte.id, name: err.name }));
      }
    } else {
      // Local (npm start / tests): clasificación en segundo plano en el mismo proceso
      setImmediate(() => clasificarPendiente(reporte.id).catch((err) => log.error?.(err)));
    }
    return reporte;
  }

  async function listar() {
    await ensureSeed();
    let reportes = await store.list();
    const atascados = reportes
      .filter((r) => r.nivel === 'clasificando' && now() - Date.parse(r.fecha) > STALE_MS)
      .slice(0, MAX_INLINE_POR_LECTURA);
    if (atascados.length) {
      await Promise.all(atascados.map((r) => clasificarPendiente(r.id)));
      reportes = await store.list();
    }
    return ordenarReportes(reportes);
  }

  async function cambiarEstado(id, body) {
    const estado = body && body.estado;
    if (!ESTADOS.includes(estado)) throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(', ')}`);
    const actualizado = await store.update(id, { estado, actualizadoEn: new Date(now()).toISOString() });
    if (!actualizado) throw new HttpError(404, 'Reporte no encontrado');
    return actualizado;
  }

  /** Handler de mensajes SQS: { Records: [{ body: '{"id":"r-..."}' }] } */
  async function procesarMensajes(records = []) {
    const batchItemFailures = [];
    for (const rec of records) {
      try {
        const { id } = JSON.parse(rec.body);
        await clasificarPendiente(id);
      } catch (err) {
        log.error?.(JSON.stringify({ evt: 'reportes.sqs.error', messageId: rec.messageId, name: err.name }));
        batchItemFailures.push({ itemIdentifier: rec.messageId });
      }
    }
    return { batchItemFailures };
  }

  return { crear, listar, cambiarEstado, clasificarPendiente, procesarMensajes };
}

module.exports = {
  createReportesService, validarReporte, ordenarReportes, HttpError,
  TIPOS_PELIGRO, VIVIENDAS, VIAS, LUGARES, NECESIDADES, ESTADOS, STALE_MS,
};
