/**
 * utils/distancia.js — cálculo de distancia geodésica.
 *
 * Usado en: PanelDetalle (brigadas cercanas + estación SENAMHI más cercana).
 */

/**
 * Calcula la distancia en kilómetros entre dos puntos usando la fórmula
 * de Haversine. Precisión suficiente para distancias < 500 km.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distancia en km
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371; // radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Dada una lista de elementos con { lat, lng, ...resto }, devuelve los N
 * más cercanos al punto (lat0, lng0), ordenados de menor a mayor distancia.
 * Cada elemento devuelto incluye la propiedad `distanciaKm`.
 *
 * @param {number} lat0
 * @param {number} lng0
 * @param {Array<{lat:number, lng:number}>} elementos
 * @param {number} [n=3]
 * @returns {Array<{distanciaKm:number}>}
 */
export function nMasCercanos(lat0, lng0, elementos, n = 3) {
  return [...elementos]
    .map((el) => ({ ...el, distanciaKm: haversineKm(lat0, lng0, el.lat, el.lng) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, n);
}
