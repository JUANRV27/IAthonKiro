/**
 * Servicio geoespacial: cálculo de distancias y rutas
 * Usa la fórmula de Haversine para distancias entre coordenadas
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calcula la distancia entre dos puntos geográficos (Haversine)
 * @param {number} lat1 Latitud punto A
 * @param {number} lng1 Longitud punto A
 * @param {number} lat2 Latitud punto B
 * @param {number} lng2 Longitud punto B
 * @returns {number} Distancia en kilómetros
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Genera una ruta GeoJSON simplificada entre dos puntos.
 * En producción esto se conectaría a OSRM o GraphHopper.
 * Por ahora genera una línea directa con punto intermedio.
 * @param {number} lat1 Latitud origen
 * @param {number} lng1 Longitud origen
 * @param {number} lat2 Latitud destino
 * @param {number} lng2 Longitud destino
 * @returns {Object} GeoJSON LineString
 */
function generateRoute(lat1, lng1, lat2, lng2) {
  // Puntos intermedios para simular una ruta por vías (no línea recta)
  const midLat = (lat1 + lat2) / 2 + (Math.random() - 0.5) * 0.01;
  const midLng = (lng1 + lng2) / 2 + (Math.random() - 0.5) * 0.01;

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng1, lat1],
        [midLng, midLat],
        [lng2, lat2],
      ],
    },
    properties: {
      distance_km: haversineDistance(lat1, lng1, lat2, lng2),
    },
  };
}

/**
 * Encuentra el brigadier más cercano a una zona de entre los disponibles
 * @param {{lat: number, lng: number}} zone Coordenadas de la zona
 * @param {Array<{id: number, lat: number, lng: number}>} brigadiers Lista de brigadieres disponibles
 * @returns {{brigadier: Object, distance_km: number} | null}
 */
function findNearestBrigadier(zone, brigadiers) {
  if (!brigadiers || brigadiers.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const b of brigadiers) {
    const dist = haversineDistance(zone.lat, zone.lng, b.lat, b.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = b;
    }
  }

  return { brigadier: nearest, distance_km: minDist };
}

/**
 * Ordena brigadieres por distancia a una zona (de más cercano a más lejano)
 * @param {{lat: number, lng: number}} zone
 * @param {Array} brigadiers
 * @returns {Array<{brigadier: Object, distance_km: number}>}
 */
function rankBrigadiersByDistance(zone, brigadiers) {
  return brigadiers
    .map((b) => ({
      brigadier: b,
      distance_km: haversineDistance(zone.lat, zone.lng, b.lat, b.lng),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}

module.exports = {
  haversineDistance,
  generateRoute,
  findNearestBrigadier,
  rankBrigadiersByDistance,
};
