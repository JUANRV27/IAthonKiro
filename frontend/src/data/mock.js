/**
 * Datos simulados para desarrollo local (VITE_USE_MOCK=true).
 * Respetan exactamente el contrato definido en docs/contrato-api.md.
 *
 * 8 reportes: 3 rojos · 3 amarillos · 2 verdes
 * 2 con estado "asegurado" y brigada asignada.
 * 5 brigadas distribuidas en los distritos principales.
 * 2 estaciones hidrológicas con umbrales SENAMHI.
 */

// ─── REPORTES ────────────────────────────────────────────────────────────────

export const reportes = [
  // ── ROJOS (nivel alto) ───────────────────────────────────────────────────

  {
    id: "rep-001",
    tipoPeligro: "Inundación",
    distrito: "Castilla",
    lat: -5.196,
    lng: -80.622,
    personasEnRiesgo: 340,
    viviendas: 85,
    viaAcceso: "Av. Guardia Civil — transitable con dificultad",
    lugaresCriticos: "Mercado central de Castilla, AA.HH. Las Brisas",
    necesidad: "Evacuación inmediata, carpas y agua potable",
    descripcion:
      "Desbordamiento del canal de drenaje norte afecta manzanas A-D del AA.HH. Las Brisas. Agua llega a 0,8 m en calles principales.",
    fotoUrl: "https://picsum.photos/seed/rep001/400/300",
    nivel: "rojo",
    porque:
      "Más de 300 personas en zona inundable con agua sobre nivel de piso habitable y sin vía de escape despejada.",
    accionSugerida:
      "Activar protocolo de evacuación. Coordinar con Defensa Civil el traslado a albergue municipal.",
    estado: "asegurado",
    brigadaId: "brig-01",
    brigadaNombre: "Brigada Castilla Norte",
    fecha: "2025-02-14T08:22:00Z",
  },
  {
    id: "rep-002",
    tipoPeligro: "Colapso de vivienda",
    distrito: "Sullana",
    lat: -4.903,
    lng: -80.685,
    personasEnRiesgo: 210,
    viviendas: 52,
    viaAcceso: "Jr. Ayacucho — acceso libre",
    lugaresCriticos: "Urbanización El Bosque, colegio Fe y Alegría",
    necesidad: "Apuntalamiento de estructuras, alojamiento temporal",
    descripcion:
      "Lluvias sostenidas durante 18 h debilitaron cimentaciones de adobe. Se reportan 6 viviendas colapsadas y 14 con daño estructural severo.",
    fotoUrl: "https://picsum.photos/seed/rep002/400/300",
    nivel: "rojo",
    porque:
      "Colapso activo con riesgo de efecto dominó en bloque de 52 viviendas de adobe. Alta densidad poblacional.",
    accionSugerida:
      "Cordón de seguridad de 50 m. Ingenieros de Defensa Civil evalúen antes de reingreso.",
    estado: "en atención",
    brigadaId: "brig-02",
    brigadaNombre: "Brigada Sullana Centro",
    fecha: "2025-02-15T11:05:00Z",
  },
  {
    id: "rep-003",
    tipoPeligro: "Deslizamiento",
    distrito: "Chulucanas",
    lat: -5.093,
    lng: -80.162,
    personasEnRiesgo: 180,
    viviendas: 41,
    viaAcceso: "Carretera Chulucanas-Morropón — cortada km 3",
    lugaresCriticos: "Barrio El Porvenir, trocha a reservorio",
    necesidad: "Maquinaria para desobstrucción, víveres de emergencia",
    descripcion:
      "Deslizamiento de ladera este cortó acceso vehicular y sepultó parcialmente 5 viviendas. Comunidad aislada.",
    fotoUrl: "https://picsum.photos/seed/rep003/400/300",
    nivel: "rojo",
    porque:
      "Comunidad sin vía de acceso, 180 personas sin posibilidad de evacuación ni recepción de suministros.",
    accionSugerida:
      "Desplegar helicóptero para evaluación. Coordinar apertura de vía con Gobierno Regional.",
    estado: "pendiente",
    brigadaId: null,
    brigadaNombre: null,
    fecha: "2025-02-16T06:47:00Z",
  },

  // ── AMARILLOS (nivel medio) ───────────────────────────────────────────────

  {
    id: "rep-004",
    tipoPeligro: "Inundación",
    distrito: "Piura",
    lat: -5.194,
    lng: -80.632,
    personasEnRiesgo: 95,
    viviendas: 28,
    viaAcceso: "Av. Sánchez Cerro — habilitada",
    lugaresCriticos: "Parque Industrial, Jr. Loreto cuadra 4",
    necesidad: "Bombas de achique, limpieza de cunetas",
    descripcion:
      "Acumulación de agua en zona baja del Parque Industrial por colapso de cuneta. Sin víctimas, daños materiales en almacenes.",
    fotoUrl: "https://picsum.photos/seed/rep004/400/300",
    nivel: "amarillo",
    porque:
      "Riesgo contenido pero cuneta bloqueada puede agravarse si llueve más de 20 mm en las próximas 6 h.",
    accionSugerida:
      "Instalar bomba de achique. Cuadrilla municipal limpie cuneta en menos de 4 h.",
    estado: "en atención",
    brigadaId: "brig-03",
    brigadaNombre: "Brigada Piura Urbano",
    fecha: "2025-02-13T15:30:00Z",
  },
  {
    id: "rep-005",
    tipoPeligro: "Erosión de ribera",
    distrito: "Tambogrande",
    lat: -4.927,
    lng: -80.344,
    personasEnRiesgo: 130,
    viviendas: 33,
    viaAcceso: "Av. Agraria — transitable",
    lugaresCriticos: "Ribera norte del río Piura, sector Km 12",
    necesidad: "Sacos de arena, monitoreo del nivel del río",
    descripcion:
      "Erosión progresiva de 40 m de ribera norte. Tres viviendas a menos de 8 m del borde. Nivel del río en 820 m³/s (umbral amarillo: 760).",
    fotoUrl: "https://picsum.photos/seed/rep005/400/300",
    nivel: "amarillo",
    porque:
      "Caudal sobre umbral amarillo SENAMHI Tambogrande y erosión activa con viviendas en riesgo inmediato.",
    accionSugerida:
      "Colocar 500 sacos de arena en borde expuesto. Alertar a familias ribereñas para evacuación preventiva.",
    estado: "pendiente",
    brigadaId: null,
    brigadaNombre: null,
    fecha: "2025-02-17T09:15:00Z",
  },
  {
    id: "rep-006",
    tipoPeligro: "Anegamiento",
    distrito: "Catacaos",
    lat: -5.267,
    lng: -80.675,
    personasEnRiesgo: 75,
    viviendas: 19,
    viaAcceso: "Calle Comercio — parcialmente anegada",
    lugaresCriticos: "Plaza de Armas de Catacaos, Jr. Tacna",
    necesidad: "Drenaje de agua, kits de limpieza",
    descripcion:
      "Zona artesanal anegada 0,3 m por saturación del suelo. Talleres artesanales con material dañado. Sin riesgo a vidas.",
    fotoUrl: "https://picsum.photos/seed/rep006/400/300",
    nivel: "amarillo",
    porque:
      "Daños económicos significativos en zona productiva. Riesgo de aumento si persiste lluvia.",
    accionSugerida:
      "Activar drenaje municipal. Coordinar con Municipio Catacaos kits de limpieza para artesanos.",
    estado: "pendiente",
    brigadaId: null,
    brigadaNombre: null,
    fecha: "2025-02-17T13:00:00Z",
  },

  // ── VERDES (nivel bajo) ───────────────────────────────────────────────────

  {
    id: "rep-007",
    tipoPeligro: "Humedecimiento de vía",
    distrito: "Veintiséis de Octubre",
    lat: -5.18,
    lng: -80.66,
    personasEnRiesgo: 30,
    viviendas: 8,
    viaAcceso: "Av. Don Bosco — transitable",
    lugaresCriticos: "Colegio San Lucas, parque sectorial",
    necesidad: "Señalización preventiva",
    descripcion:
      "Baches llenos de agua y barro en Av. Don Bosco. Riesgo menor de accidentes de tránsito. Sin daños estructurales.",
    fotoUrl: "https://picsum.photos/seed/rep007/400/300",
    nivel: "verde",
    porque:
      "Riesgo bajo: afectación superficial de vía pública sin compromiso de viviendas ni personas en peligro inmediato.",
    accionSugerida:
      "Colocar señalización. Programar reparación de baches en próximos 5 días hábiles.",
    estado: "asegurado",
    brigadaId: "brig-04",
    brigadaNombre: "Brigada 26 de Octubre",
    fecha: "2025-01-28T10:40:00Z",
  },
  {
    id: "rep-008",
    tipoPeligro: "Acumulación de residuos en dren",
    distrito: "Sechura",
    lat: -5.557,
    lng: -80.822,
    personasEnRiesgo: 20,
    viviendas: 5,
    viaAcceso: "Pista Sechura-Parachique — libre",
    lugaresCriticos: "Dren 1308, sector norte",
    necesidad: "Limpieza de dren",
    descripcion:
      "Acumulación de basura y sedimentos en dren 1308 reduce capacidad de drenaje al 40 %. Sin inundación activa.",
    fotoUrl: "https://picsum.photos/seed/rep008/400/300",
    nivel: "verde",
    porque:
      "Sin inundación activa. Riesgo potencial si no se limpia antes de próxima lluvia, pero margen de tiempo suficiente.",
    accionSugerida:
      "Programar cuadrilla de limpieza de dren en los próximos 3 días.",
    estado: "pendiente",
    brigadaId: null,
    brigadaNombre: null,
    fecha: "2025-01-30T07:55:00Z",
  },
];

// ─── BRIGADAS ────────────────────────────────────────────────────────────────

export const brigadas = [
  {
    id: "brig-01",
    nombre: "Brigada Castilla Norte",
    lat: -5.192,
    lng: -80.618,
    disponible: false, // está atendiendo rep-001
  },
  {
    id: "brig-02",
    nombre: "Brigada Sullana Centro",
    lat: -4.906,
    lng: -80.681,
    disponible: false, // está atendiendo rep-002
  },
  {
    id: "brig-03",
    nombre: "Brigada Piura Urbano",
    lat: -5.191,
    lng: -80.628,
    disponible: false, // está atendiendo rep-004
  },
  {
    id: "brig-04",
    nombre: "Brigada 26 de Octubre",
    lat: -5.178,
    lng: -80.657,
    disponible: true,
  },
  {
    id: "brig-05",
    nombre: "Brigada Chulucanas",
    lat: -5.096,
    lng: -80.165,
    disponible: true,
  },
];

// ─── ALERTAS HIDROLÓGICAS ────────────────────────────────────────────────────

export const alertas = {
  estaciones: [
    {
      estacion: "Puente Sánchez Cerro",
      caudal: 1340,      // m³/s — sobre umbral naranja
      amarilla: 900,
      naranja: 1290,
      roja: 1900,
      nivel: "naranja",
      hora: "2025-02-17T08:00:00Z",
    },
    {
      estacion: "Tambogrande",
      caudal: 820,       // m³/s — sobre umbral amarillo
      amarilla: 760,
      naranja: 1100,
      roja: 1600,
      nivel: "amarilla",
      hora: "2025-02-17T08:00:00Z",
    },
  ],
  avisos: [
    {
      nivel: "naranja",
      zona: "Río Piura — tramo Piura / Castilla",
      texto:
        "Caudal en aumento. Se prevé superar umbral naranja en las próximas 12 h. Evitar zonas ribereñas bajas.",
      vigencia: "2025-02-17T20:00:00Z",
    },
    {
      nivel: "amarilla",
      zona: "Río Piura — tramo Tambogrande",
      texto:
        "Nivel sobre umbral amarillo. Agricultores y pobladores ribereños deben estar en alerta.",
      vigencia: "2025-02-17T20:00:00Z",
    },
  ],
};
