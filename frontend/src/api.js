/**
 * api.js — única puerta de acceso a datos del backend.
 *
 * Si VITE_USE_MOCK="true", opera sobre los datos en memoria de mock.js.
 * Si no, llama a VITE_API_URL respetando el contrato en docs/contrato-api.md.
 *
 * Todas las funciones son async y retornan Promises.
 * En mock, tomarPunto y marcarAsegurado simulan los errores 409 / 403.
 */

import {
  reportes as mockReportes,
  brigadas as mockBrigadas,
  alertas as mockAlertas,
} from "./data/mock.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const API_URL  = import.meta.env.VITE_API_URL ?? "";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Genera ids incrementales para nuevos reportes en modo mock */
let _nextId = mockReportes.length + 1;
const nextId = () => `rep-${String(_nextId++).padStart(3, "0")}`;

/**
 * Fetch genérico que lanza un Error con { status, body } en caso de 4xx / 5xx.
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = null; }
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body   = body;
    throw err;
  }

  return res.json();
}

// ── REPORTES ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de reportes ordenada rojo → amarillo → verde
 * (igual que el backend según el contrato).
 */
export async function getReportes() {
  if (USE_MOCK) {
    const orden = { rojo: 0, amarillo: 1, verde: 2, clasificando: 3 };
    return [...mockReportes].sort(
      (a, b) => (orden[a.nivel] ?? 3) - (orden[b.nivel] ?? 3)
    );
  }
  return apiFetch("/reportes");
}

/**
 * Crea un nuevo reporte.
 * El backend (y el mock) asignan nivel "clasificando" hasta que la IA lo evalúe.
 * @param {object} datos — campos del formulario (sin id, nivel, estado, fecha)
 * @returns {object} reporte creado con id asignado
 */
export async function crearReporte(datos) {
  if (USE_MOCK) {
    const nuevo = {
      ...datos,
      id: nextId(),
      nivel: "clasificando",
      porque: null,
      accionSugerida: null,
      estado: "pendiente",
      brigadaId: null,
      brigadaNombre: null,
      fecha: new Date().toISOString(),
    };
    mockReportes.push(nuevo);
    return nuevo;
  }

  return apiFetch("/reportes", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

// ── ACCIONES DE BRIGADA ───────────────────────────────────────────────────────

/**
 * Una brigada "toma" un punto: el reporte pasa a "en atención" y queda bloqueado.
 * Lanza error con status 409 si otra brigada ya lo tomó.
 *
 * @param {string} id        — id del reporte
 * @param {string} brigadaId — id de la brigada que lo toma
 */
export async function tomarPunto(id, brigadaId) {
  if (USE_MOCK) {
    const rep = mockReportes.find((r) => r.id === id);
    if (!rep) throw Object.assign(new Error("Reporte no encontrado"), { status: 404 });

    if (rep.brigadaId && rep.brigadaId !== brigadaId) {
      // 409 — ya tomado por otra brigada
      throw Object.assign(
        new Error("Este punto ya fue tomado por otra brigada"),
        { status: 409 }
      );
    }

    rep.estado     = "en atención";
    rep.brigadaId  = brigadaId;
    rep.brigadaNombre =
      mockBrigadas.find((b) => b.id === brigadaId)?.nombre ?? brigadaId;

    // Marcar brigada como no disponible
    const brigada = mockBrigadas.find((b) => b.id === brigadaId);
    if (brigada) brigada.disponible = false;

    return { ...rep };
  }

  return apiFetch(`/reportes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "en atención", brigadaId }),
  });
}

/**
 * La brigada asignada marca el punto como "asegurado".
 * Lanza error con status 403 si el brigadaId no coincide con el asignado.
 *
 * @param {string} id        — id del reporte
 * @param {string} brigadaId — id de la brigada que lo marca
 */
export async function marcarAsegurado(id, brigadaId) {
  if (USE_MOCK) {
    const rep = mockReportes.find((r) => r.id === id);
    if (!rep) throw Object.assign(new Error("Reporte no encontrado"), { status: 404 });

    if (rep.brigadaId !== brigadaId) {
      // 403 — no es la brigada asignada
      throw Object.assign(
        new Error("Solo la brigada asignada puede marcar este punto como asegurado"),
        { status: 403 }
      );
    }

    rep.estado = "asegurado";

    // Liberar brigada
    const brigada = mockBrigadas.find((b) => b.id === brigadaId);
    if (brigada) brigada.disponible = true;

    return { ...rep };
  }

  return apiFetch(`/reportes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "asegurado", brigadaId }),
  });
}

// ── VALIDACIÓN HUMANA DE NIVEL ────────────────────────────────────────────────

/**
 * Confirma el nivel sugerido por la IA o lo corrige a otro.
 * Agrega nivelValidado, validadoPor y validadoEn al reporte.
 *
 * @param {string} id          — id del reporte
 * @param {string} nivel       — "rojo"|"amarillo"|"verde" (puede ser el mismo que nivelIA)
 * @param {string} brigadaId   — brigada que valida
 * @param {string} brigadaNombreVal — nombre de la brigada
 */
export async function validarNivel(id, nivel, brigadaId, brigadaNombreVal) {
  if (USE_MOCK) {
    const rep = mockReportes.find((r) => r.id === id);
    if (!rep) throw Object.assign(new Error("Reporte no encontrado"), { status: 404 });
    rep.nivelValidado  = nivel;
    rep.validadoPor    = brigadaNombreVal ?? brigadaId;
    rep.validadoEn     = new Date().toISOString();
    return { ...rep };
  }
  return apiFetch(`/reportes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ nivelValidado: nivel, brigadaId }),
  });
}

// ── BRIGADAS ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de brigadas con su posición y disponibilidad.
 */
export async function getBrigadas() {
  if (USE_MOCK) return [...mockBrigadas];
  return apiFetch("/brigadas");
}

// ── ALERTAS ───────────────────────────────────────────────────────────────────

/**
 * Devuelve el panel de alertas hidrológicas SENAMHI.
 * Incluye estaciones con caudal y umbrales, y avisos vigentes.
 */
export async function getAlertas() {
  if (USE_MOCK) return { ...mockAlertas };
  return apiFetch("/alertas");
}
