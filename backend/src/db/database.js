/**
 * Store de datos JSON en memoria con persistencia en archivo
 * Alternativa sin compilación nativa para el MVP de hackathon
 * Soporta Node.js v25+ sin dependencias de código nativo
 */
const fs = require('fs');
const path = require('path');

// En Lambda el código es de solo lectura: AMAPA_DATA_DIR apunta a /tmp
const DATA_DIR = process.env.AMAPA_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

// Asegurar directorio
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Estado inicial vacío
 */
const INITIAL = {
  zones:       [],
  alerts:      [],
  brigadiers:  [],
  assignments: [],
  _seq: { zones: 0, alerts: 0, brigadiers: 0, assignments: 0 },
};

/** Lee el estado desde disco */
function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch { /* archivo corrupto → resetear */ }
  return structuredClone(INITIAL);
}

/** Escribe el estado completo en disco (síncrono, simple para MVP) */
let _writes = 0;
function save(state) {
  _writes += 1;
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

let _state = load();

/** Genera un nuevo ID autoincremental para la tabla indicada */
function nextId(table) {
  _state._seq[table] = (_state._seq[table] || 0) + 1;
  return _state._seq[table];
}

const now = () => new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
//  API tipo "ORM" para las cuatro tablas
// ─────────────────────────────────────────────────────────────────────────────

const db = {
  /** Retorna el estado completo (para depuración) */
  getState: () => _state,

  /** Reemplaza el estado en memoria (Lambda: lo carga desde DynamoDB en cada petición) */
  replaceState(state) {
    _state = { ...structuredClone(INITIAL), ...structuredClone(state) };
  },

  /** Cuántas escrituras hubo desde que arrancó el proceso (para saber si hay que guardar) */
  getWriteCount: () => _writes,

  /** Resetea todo (usado por el seed) */
  reset() {
    _state = structuredClone(INITIAL);
    save(_state);
  },

  // ── Zonas ─────────────────────────────────────────────────────────────────

  insertZone({ name, district, lat, lng, risk_level, max_brigadiers, description }) {
    const zone = {
      id: nextId('zones'), name, district,
      lat, lng, risk_level,
      max_brigadiers: max_brigadiers || 3,
      description: description || null,
      created_at: now(),
    };
    _state.zones.push(zone);
    save(_state);
    return zone;
  },

  getAllZones() {
    const order = { red: 0, orange: 1, yellow: 2, green: 3 };
    return [..._state.zones].sort((a, b) => order[a.risk_level] - order[b.risk_level]);
  },

  getZoneById(id) {
    return _state.zones.find(z => z.id === id) || null;
  },

  // ── Alertas ───────────────────────────────────────────────────────────────

  insertAlert({ zone_id, risk_level, title, description, senamhi_data }) {
    const zone = db.getZoneById(zone_id);
    if (!zone) throw new Error(`Zona ${zone_id} no encontrada`);
    const alert = {
      id: nextId('alerts'), zone_id, status: 'active', risk_level,
      title, description: description || null,
      senamhi_data: typeof senamhi_data === 'string' ? senamhi_data : JSON.stringify(senamhi_data || {}),
      assigned_count: 0,
      created_at: now(), resolved_at: null,
      // joins desnormalizados (convenientes para el frontend)
      zone_name: zone.name, district: zone.district,
      zone_lat: zone.lat, zone_lng: zone.lng,
      max_brigadiers: zone.max_brigadiers,
    };
    _state.alerts.push(alert);
    save(_state);
    return alert;
  },

  getAllAlerts() {
    return [..._state.alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getActiveAlerts() {
    return db.getAllAlerts().filter(a => a.status === 'active' || a.status === 'full');
  },

  getAlertById(id) {
    return _state.alerts.find(a => a.id === id) || null;
  },

  updateAlert(id, patch) {
    const idx = _state.alerts.findIndex(a => a.id === id);
    if (idx < 0) return null;
    Object.assign(_state.alerts[idx], patch);
    save(_state);
    return _state.alerts[idx];
  },

  // ── Brigadieres ───────────────────────────────────────────────────────────

  insertBrigadier({ name, phone, lat, lng, status }) {
    const b = {
      id: nextId('brigadiers'), name, phone: phone || null,
      lat, lng, status: status || 'available',
      created_at: now(),
    };
    _state.brigadiers.push(b);
    save(_state);
    return b;
  },

  getAllBrigadiers() {
    return [..._state.brigadiers].sort((a, b) => a.name.localeCompare(b.name));
  },

  getAvailableBrigadiers() {
    return _state.brigadiers.filter(b => b.status === 'available');
  },

  getBrigadierById(id) {
    return _state.brigadiers.find(b => b.id === id) || null;
  },

  updateBrigadier(id, patch) {
    const idx = _state.brigadiers.findIndex(b => b.id === id);
    if (idx < 0) return null;
    Object.assign(_state.brigadiers[idx], patch);
    save(_state);
    return _state.brigadiers[idx];
  },

  // ── Asignaciones ──────────────────────────────────────────────────────────

  insertAssignment({ alert_id, brigadier_id, distance_km, route_geojson }) {
    // Verificar unicidad
    const exists = _state.assignments.find(a => a.alert_id === alert_id && a.brigadier_id === brigadier_id);
    if (exists) throw new Error('El brigadier ya está asignado a esta alerta');
    const asn = {
      id: nextId('assignments'), alert_id, brigadier_id,
      distance_km,
      route_geojson: typeof route_geojson === 'string' ? route_geojson : JSON.stringify(route_geojson),
      assigned_at: now(), completed_at: null,
    };
    _state.assignments.push(asn);
    save(_state);
    return asn;
  },

  getAssignmentsByAlert(alert_id) {
    return _state.assignments
      .filter(a => a.alert_id === alert_id)
      .map(asn => {
        const b = db.getBrigadierById(asn.brigadier_id);
        return {
          ...asn,
          brigadier_name: b?.name || 'Desconocido',
          phone: b?.phone || null,
          brigadier_lat: b?.lat, brigadier_lng: b?.lng,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);
  },

  completeAssignmentsByAlert(alert_id) {
    _state.assignments
      .filter(a => a.alert_id === alert_id && !a.completed_at)
      .forEach(a => { a.completed_at = now(); });
    save(_state);
  },

  existsAssignment(alert_id, brigadier_id) {
    return !!_state.assignments.find(a => a.alert_id === alert_id && a.brigadier_id === brigadier_id);
  },
};

console.log('✅ Store de datos JSON inicializado');
module.exports = db;
