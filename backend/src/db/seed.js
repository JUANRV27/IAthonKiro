/**
 * Datos iniciales para el sistema AMAPA
 * Zonas de riesgo reales de la región Piura basadas en CENEPRED/SENAMHI FEN 2026
 */
const db = require('./database');

function seed() {
  console.log('🌱 Iniciando seed de datos...');
  db.reset();

  // ----- ZONAS DE RIESGO -----
  const zonesData = [
    { name: 'Bajo Piura',  district: 'Piura',       lat: -5.1945, lng: -80.6328, risk_level: 'red',    max_brigadiers: 5, description: 'Zona de inundación crítica - cauce del río Piura' },
    { name: 'Catacaos',    district: 'Catacaos',    lat: -5.2658, lng: -80.6745, risk_level: 'red',    max_brigadiers: 4, description: 'Zona baja susceptible a inundaciones por FEN' },
    { name: 'La Unión',    district: 'La Unión',    lat: -5.3012, lng: -80.6421, risk_level: 'orange', max_brigadiers: 3, description: 'Riesgo medio-alto por desbordamiento de quebradas' },
    { name: 'Sechura',     district: 'Sechura',     lat: -5.5567, lng: -80.8222, risk_level: 'orange', max_brigadiers: 3, description: 'Inundaciones por laguna La Niña' },
    { name: 'Tambogrande', district: 'Tambogrande', lat: -4.9341, lng: -80.3376, risk_level: 'yellow', max_brigadiers: 3, description: 'Riesgo moderado de deslizamientos y lluvias' },
    { name: 'Piura Centro',district: 'Piura',       lat: -5.1945, lng: -80.6328, risk_level: 'yellow', max_brigadiers: 2, description: 'Zona urbana con riesgo por lluvias intensas' },
    { name: 'Chulucanas',  district: 'Chulucanas',  lat: -5.1036, lng: -80.1678, risk_level: 'orange', max_brigadiers: 3, description: 'Quebradas activas por lluvias' },
    { name: 'Paita',       district: 'Paita',       lat: -5.0893, lng: -81.1143, risk_level: 'green',  max_brigadiers: 2, description: 'Riesgo bajo, monitoreo preventivo' },
    { name: 'Sullana',     district: 'Sullana',     lat: -4.8996, lng: -80.6851, risk_level: 'yellow', max_brigadiers: 3, description: 'Zonas bajas con riesgo moderado' },
    { name: 'Morropón',    district: 'Morropón',    lat: -5.1851, lng: -79.9756, risk_level: 'orange', max_brigadiers: 3, description: 'Área serrana con riesgo de huaycos' },
  ];
  const zones = zonesData.map(z => db.insertZone(z));
  console.log(`✅ ${zones.length} zonas insertadas`);

  // ----- BRIGADIERES -----
  const brigadiersData = [
    { name: 'Brigada simulada 01', phone: null, lat: -5.1950, lng: -80.6330, status: 'available' },
    { name: 'Brigada simulada 02', phone: null, lat: -5.2700, lng: -80.6800, status: 'available' },
    { name: 'Brigada simulada 03', phone: null, lat: -5.3000, lng: -80.6400, status: 'available' },
    { name: 'Brigada simulada 04', phone: null, lat: -5.5500, lng: -80.8200, status: 'available' },
    { name: 'Brigada simulada 05', phone: null, lat: -4.9400, lng: -80.3400, status: 'available' },
    { name: 'Brigada simulada 06', phone: null, lat: -5.1900, lng: -80.6300, status: 'available' },
    { name: 'Brigada simulada 07', phone: null, lat: -5.1050, lng: -80.1700, status: 'available' },
    { name: 'Brigada simulada 08', phone: null, lat: -5.0900, lng: -81.1100, status: 'available' },
    { name: 'Brigada simulada 09', phone: null, lat: -4.9000, lng: -80.6900, status: 'available' },
    { name: 'Brigada simulada 10', phone: null, lat: -5.1800, lng: -79.9800, status: 'available' },
    { name: 'Brigada simulada 11', phone: null, lat: -5.2000, lng: -80.6500, status: 'available' },
    { name: 'Brigada simulada 12', phone: null, lat: -5.2600, lng: -80.6700, status: 'available' },
  ];
  const brig = brigadiersData.map(b => db.insertBrigadier(b));
  console.log(`✅ ${brig.length} brigadieres insertados`);

  // ----- ALERTAS -----
  const alertsData = [
    {
      zone_id: zones[0].id, risk_level: 'red',
      title: 'Alerta Roja - Inundación Bajo Piura',
      description: 'El SENAMHI reporta precipitaciones >100mm/24h. Desbordamiento inminente del río Piura.',
      senamhi_data: { precipitacion_mm: 112.5, nivel_rio_m: 8.3, umbral_critico_m: 7.5, pronostico_24h: 'lluvias intensas', estacion: 'La Esperanza', fecha_reporte: '2026-10-30T06:00:00Z' },
    },
    {
      zone_id: zones[1].id, risk_level: 'red',
      title: 'Alerta Roja - Inundación Catacaos',
      description: 'Zonas bajas de Catacaos bajo amenaza de inundación. SENAMHI advierte nivel de alerta rojo.',
      senamhi_data: { precipitacion_mm: 98.0, nivel_rio_m: 7.8, umbral_critico_m: 7.0, pronostico_24h: 'lluvias muy intensas', estacion: 'Miraflores', fecha_reporte: '2026-10-30T06:00:00Z' },
    },
    {
      zone_id: zones[2].id, risk_level: 'orange',
      title: 'Alerta Naranja - La Unión',
      description: 'Quebradas activadas. SENAMHI reporta precipitaciones de moderadas a fuertes.',
      senamhi_data: { precipitacion_mm: 65.0, pronostico_24h: 'lluvias moderadas', estacion: 'Chato Chico', fecha_reporte: '2026-10-30T06:00:00Z' },
    },
    {
      zone_id: zones[4].id, risk_level: 'yellow',
      title: 'Alerta Amarilla - Tambogrande',
      description: 'Deslizamientos posibles en laderas. Monitoreo activo por SENAMHI.',
      senamhi_data: { precipitacion_mm: 40.0, pronostico_24h: 'lluvias moderadas', estacion: 'Tambogrande', fecha_reporte: '2026-10-30T06:00:00Z' },
    },
  ];
  const alerts = alertsData.map(a => db.insertAlert(a));
  console.log(`✅ ${alerts.length} alertas insertadas`);

  console.log('\n🎉 Seed completado exitosamente');
  console.log(`📁 Base de datos guardada en: data/db.json`);
}

// Ejecutar solo con `node src/db/seed.js`; la Lambda lo importa y lo llama
if (require.main === module) seed();

module.exports = { seed };

