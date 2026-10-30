/**
 * Servicio principal de alertas y asignación de brigadieres
 * Toda la lógica de negocio del sistema AMAPA
 */
const db = require('../db/database');
const { haversineDistance, generateRoute, findNearestBrigadier, rankBrigadiersByDistance } = require('./geoService');

// Referencia al servidor Socket.IO (se inyecta desde index.js)
let _io = null;
function setIO(io) { _io = io; }

function emit(event, data) {
  if (_io) _io.emit(event, data);
}

// ─────────────────────────────────────────────
//  ZONAS
// ─────────────────────────────────────────────

function getAllZones()    { return db.getAllZones(); }
function getZoneById(id) { return db.getZoneById(id); }

// ─────────────────────────────────────────────
//  ALERTAS
// ─────────────────────────────────────────────

function getAllAlerts()   { return db.getAllAlerts(); }
function getAlertById(id){ return db.getAlertById(id); }
function getActiveAlerts(){ return db.getActiveAlerts(); }

function createAlert({ zone_id, risk_level, title, description, senamhi_data }) {
  const alert = db.insertAlert({ zone_id, risk_level, title, description, senamhi_data });
  emit('alert:created', alert);
  return alert;
}

function resolveAlert(alertId) {
  const alert = db.getAlertById(alertId);
  if (!alert) throw new Error('Alerta no encontrada');
  if (alert.status === 'resolved') throw new Error('La alerta ya está resuelta');

  // Liberar brigadieres
  const assignments = db.getAssignmentsByAlert(alertId).filter(a => !a.completed_at);
  db.completeAssignmentsByAlert(alertId);
  for (const { brigadier_id } of assignments) {
    db.updateBrigadier(brigadier_id, { status: 'available' });
  }

  const updated = db.updateAlert(alertId, { status: 'resolved', resolved_at: new Date().toISOString() });
  emit('alert:resolved', { alert: updated, released_brigadiers: assignments.length });
  return updated;
}

// ─────────────────────────────────────────────
//  BRIGADIERES
// ─────────────────────────────────────────────

function getAllBrigadiers()       { return db.getAllBrigadiers(); }
function getBrigadierById(id)     { return db.getBrigadierById(id); }
function getAvailableBrigadiers() { return db.getAvailableBrigadiers(); }

function updateBrigadierLocation(brigadierId, lat, lng) {
  const b = db.updateBrigadier(brigadierId, { lat, lng });
  if (!b) throw new Error('Brigadier no encontrado');
  emit('brigadier:location_updated', b);
  return b;
}

// ─────────────────────────────────────────────
//  ASIGNACIONES
// ─────────────────────────────────────────────

function getAssignmentsByAlert(alertId) {
  return db.getAssignmentsByAlert(alertId);
}

/**
 * Auto-asignación de un brigadier a una alerta.
 *
 * Lógica:
 * 1. Valida estado de la alerta (activa y no llena)
 * 2. Valida disponibilidad del brigadier
 * 3. Calcula distancia brigadier → zona (Haversine)
 * 4. Genera ruta GeoJSON
 * 5. Compara con disponibles → genera sugerencia si hay alguien 20%+ más cercano
 * 6. Registra asignación
 * 7. Si se alcanza max_brigadiers → bloquea la alerta (status = 'full')
 */
function selfAssign(alertId, brigadierId) {
  const alert = db.getAlertById(alertId);
  if (!alert) throw new Error('Alerta no encontrada');
  if (alert.status === 'full')     throw new Error('La alerta ya alcanzó el máximo de brigadieres asignados');
  if (alert.status === 'resolved') throw new Error('La alerta ya fue resuelta');

  const brigadier = db.getBrigadierById(brigadierId);
  if (!brigadier)                    throw new Error('Brigadier no encontrado');
  if (brigadier.status === 'assigned') throw new Error('El brigadier ya está asignado a otra alerta');
  if (brigadier.status === 'offline')  throw new Error('El brigadier está fuera de servicio');

  if (db.existsAssignment(alertId, brigadierId)) {
    throw new Error('El brigadier ya está asignado a esta alerta');
  }

  const zone = { lat: alert.zone_lat, lng: alert.zone_lng };
  const distanceKm = haversineDistance(zone.lat, zone.lng, brigadier.lat, brigadier.lng);
  const route = generateRoute(brigadier.lat, brigadier.lng, zone.lat, zone.lng);

  // Verificar si hay brigadier más cercano (sugerencia informativa)
  const availables = db.getAvailableBrigadiers().filter(b => b.id !== brigadierId);
  const ranked = rankBrigadiersByDistance(zone, availables);
  const nearest = ranked.length > 0 ? ranked[0] : null;

  // Insertar asignación
  const asn = db.insertAssignment({ alert_id: alertId, brigadier_id: brigadierId, distance_km: distanceKm, route_geojson: route });

  // Actualizar brigadier
  db.updateBrigadier(brigadierId, { status: 'assigned' });

  // Incrementar contador y verificar máximo
  const newCount = alert.assigned_count + 1;
  const newStatus = newCount >= alert.max_brigadiers ? 'full' : 'active';
  const updatedAlert = db.updateAlert(alertId, { assigned_count: newCount, status: newStatus });

  // Enriquecer asignación con nombre
  const enrichedAsn = { ...asn, brigadier_name: brigadier.name };

  // Emitir eventos
  emit('assignment:created', { assignment: enrichedAsn, alert: updatedAlert, brigadier: { ...brigadier, status: 'assigned' } });
  if (newStatus === 'full') emit('alert:full', { alert: updatedAlert });

  // Sugerencia informativa
  let nearest_suggestion = null;
  if (nearest && nearest.distance_km < distanceKm * 0.8) {
    nearest_suggestion = {
      brigadier_id:   nearest.brigadier.id,
      brigadier_name: nearest.brigadier.name,
      distance_km:    nearest.distance_km,
      message: `${nearest.brigadier.name} está más cerca (${nearest.distance_km.toFixed(2)} km vs ${distanceKm.toFixed(2)} km)`,
    };
  }

  return { assignment: enrichedAsn, alert: updatedAlert, nearest_suggestion };
}

/**
 * Asignación automática del brigadier más cercano disponible
 */
function autoAssignNearest(alertId) {
  const alert = db.getAlertById(alertId);
  if (!alert) throw new Error('Alerta no encontrada');
  if (alert.status !== 'active') throw new Error('La alerta no está activa');

  const availables = db.getAvailableBrigadiers();
  if (availables.length === 0) throw new Error('No hay brigadieres disponibles');

  const zone = { lat: alert.zone_lat, lng: alert.zone_lng };
  const { brigadier } = findNearestBrigadier(zone, availables);

  return selfAssign(alertId, brigadier.id);
}

module.exports = {
  setIO,
  getAllZones, getZoneById,
  getAllAlerts, getAlertById, getActiveAlerts, createAlert, resolveAlert,
  getAllBrigadiers, getBrigadierById, getAvailableBrigadiers, updateBrigadierLocation,
  getAssignmentsByAlert, selfAssign, autoAssignNearest,
};
