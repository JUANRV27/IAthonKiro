/**
 * 8 reportes de demostración para que el mapa nunca esté vacío.
 * Datos SIMULADOS (sin nombres, teléfonos ni correos); coordenadas aproximadas
 * de distritos de Piura. 3 rojos, 3 amarillos, 2 verdes; 2 asegurados.
 * El nivel coincide con reglasEdan() (verificado en los tests).
 */
const base = (id, minutos) => ({ id, fecha: new Date(Date.UTC(2026, 9, 30, 11, 0) - minutos * 60000).toISOString(), fuente: 'reglas', fotoUrl: null });

const REPORTES_DEMO = [
  { ...base('r-demo-01', 5), tipoPeligro: 'desborde de quebrada', distrito: 'Castilla', lat: -5.196, lng: -80.622,
    personasEnRiesgo: 40, viviendas: 'inhabitables', viaAcceso: 'bloqueada', lugaresCriticos: ['colegio'], necesidad: 'evacuación',
    descripcion: 'El agua entra a 12 casas (simulado).', nivel: 'rojo',
    porque: 'Vía bloqueada con 40 personas en riesgo y viviendas inhabitables.',
    accionSugerida: 'Despachar brigada de inmediato y preparar evacuación de las personas en riesgo.', estado: 'pendiente' },
  { ...base('r-demo-02', 20), tipoPeligro: 'desborde de río', distrito: 'Catacaos', lat: -5.266, lng: -80.675,
    personasEnRiesgo: 120, viviendas: 'afectadas', viaAcceso: 'bloqueada', lugaresCriticos: [], necesidad: 'evacuación',
    descripcion: 'Río sobre la berma en zona baja (simulado).', nivel: 'rojo',
    porque: 'Vía bloqueada con 120 personas en riesgo y requiere evacuación.',
    accionSugerida: 'Despachar brigada de inmediato y preparar evacuación de las personas en riesgo.', estado: 'en atención' },
  { ...base('r-demo-03', 45), tipoPeligro: 'inundación', distrito: 'Veintiséis de Octubre', lat: -5.180, lng: -80.665,
    personasEnRiesgo: 60, viviendas: 'colapsadas', viaAcceso: 'restringida', lugaresCriticos: ['posta'], necesidad: 'albergue',
    descripcion: 'Dos viviendas de adobe colapsadas (simulado).', nivel: 'rojo',
    porque: 'Viviendas colapsadas y posta expuesta.',
    accionSugerida: 'Despachar brigada de inmediato y preparar evacuación de las personas en riesgo.', estado: 'asegurado' },
  { ...base('r-demo-04', 10), tipoPeligro: 'colapso de dren', distrito: 'Piura', lat: -5.1945, lng: -80.6328,
    personasEnRiesgo: 25, viviendas: 'afectadas', viaAcceso: 'restringida', lugaresCriticos: [], necesidad: 'agua',
    descripcion: 'Dren desbordado en avenida principal (simulado).', nivel: 'amarillo',
    porque: 'Viviendas afectadas y vía restringida.',
    accionSugerida: 'Programar visita de la brigada y monitorear cada 2 horas por si escala.', estado: 'pendiente' },
  { ...base('r-demo-05', 30), tipoPeligro: 'inundación', distrito: 'Sullana', lat: -4.900, lng: -80.685,
    personasEnRiesgo: 15, viviendas: 'afectadas', viaAcceso: 'libre', lugaresCriticos: [], necesidad: 'agua',
    descripcion: 'Agua estancada en cuatro manzanas (simulado).', nivel: 'amarillo',
    porque: 'Viviendas afectadas y necesita agua.',
    accionSugerida: 'Programar visita de la brigada y monitorear cada 2 horas por si escala.', estado: 'pendiente' },
  { ...base('r-demo-06', 60), tipoPeligro: 'huaico', distrito: 'Chulucanas', lat: -5.093, lng: -80.162,
    personasEnRiesgo: 8, viviendas: 'ninguna', viaAcceso: 'restringida', lugaresCriticos: ['puente'], necesidad: 'ninguna',
    descripcion: 'Material de huaico junto al puente (simulado).', nivel: 'amarillo',
    porque: 'Vía restringida y riesgo que puede escalar (8 personas).',
    accionSugerida: 'Programar visita de la brigada y monitorear cada 2 horas por si escala.', estado: 'asegurado' },
  { ...base('r-demo-07', 15), tipoPeligro: 'inundación', distrito: 'Tambogrande', lat: -4.927, lng: -80.344,
    personasEnRiesgo: 0, viviendas: 'ninguna', viaAcceso: 'libre', lugaresCriticos: [], necesidad: 'ninguna',
    descripcion: 'Charcos en chacras, sin viviendas afectadas (simulado).', nivel: 'verde',
    porque: 'Daño menor sin personas en riesgo inmediato.',
    accionSugerida: 'Registrar y monitorear; sin despacho inmediato.', estado: 'pendiente' },
  { ...base('r-demo-08', 50), tipoPeligro: 'colapso de dren', distrito: 'Sechura', lat: -5.557, lng: -80.822,
    personasEnRiesgo: 0, viviendas: 'ninguna', viaAcceso: 'libre', lugaresCriticos: [], necesidad: 'ninguna',
    descripcion: 'Dren con poco caudal, sin desborde (simulado).', nivel: 'verde',
    porque: 'Daño menor sin personas en riesgo inmediato.',
    accionSugerida: 'Registrar y monitorear; sin despacho inmediato.', estado: 'pendiente' },
];

module.exports = { REPORTES_DEMO };
