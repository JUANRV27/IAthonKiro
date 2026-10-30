/**
 * Cliente API para el backend AMAPA
 */
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Error del servidor');
  return json.data;
}

// Zonas
export const getZones = () => request('/zones');

// Alertas
export const getAlerts = (activeOnly = false) =>
  request(`/alerts${activeOnly ? '?active=true' : ''}`);
export const getAlert = (id) => request(`/alerts/${id}`);
export const createAlert = (body) =>
  request('/alerts', { method: 'POST', body: JSON.stringify(body) });
export const resolveAlert = (id) =>
  request(`/alerts/${id}/resolve`, { method: 'PATCH' });
// IA generativa (Bedrock): boletín para brigadistas a partir de los datos de la alerta
export const draftBriefing = (body) =>
  request('/alerts/briefing', { method: 'POST', body: JSON.stringify(body) });
export const autoAssign = (alertId) =>
  request(`/alerts/${alertId}/auto-assign`, { method: 'POST' });

// Brigadieres
export const getBrigadiers = (availableOnly = false) =>
  request(`/brigadiers${availableOnly ? '?available=true' : ''}`);
export const selfAssign = (brigadierId, alertId) =>
  request(`/brigadiers/${brigadierId}/assign/${alertId}`, { method: 'POST' });
export const updateLocation = (brigadierId, lat, lng) =>
  request(`/brigadiers/${brigadierId}/location`, {
    method: 'PATCH',
    body: JSON.stringify({ lat, lng }),
  });
