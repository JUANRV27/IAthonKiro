/**
 * constants/niveles.js — fuente única de verdad para colores, textos y
 * clases de cada nivel de riesgo y estado de reporte.
 *
 * Usado en: MapaReportes, TablaReportes, PanelDetalle.
 * Nunca duplicar estas definiciones en los componentes.
 */

// ── Niveles de riesgo ─────────────────────────────────────────────────────────

/** Hex de relleno para Google Maps Circles y SVG */
export const NIVEL_HEX = {
  rojo:        "#EF4444",
  amarillo:    "#FACC15",
  verde:       "#22C55E",
  clasificando:"#6B7280",
};

/** Metadatos visuales para badges, tabla y panel de detalle */
export const NIVEL_META = {
  rojo:        { label: "Alto",         badgeClass: "badge-rojo",     dotClass: "bg-rojo",     textClass: "text-rojo"     },
  amarillo:    { label: "Medio",        badgeClass: "badge-amarillo", dotClass: "bg-amarillo", textClass: "text-amarillo" },
  verde:       { label: "Bajo",         badgeClass: "badge-verde",    dotClass: "bg-verde",    textClass: "text-verde"    },
  clasificando:{ label: "Clasificando", badgeClass: "badge-gris",     dotClass: "bg-gris",     textClass: "text-gris"     },
};

/** Opciones para los botones de corrección de nivel */
export const NIVELES_CORRECCION = [
  { valor: "rojo",     label: "Alto",  textClass: "text-rojo",     borderClass: "border-rojo/50",     hoverClass: "hover:bg-rojo/10"     },
  { valor: "amarillo", label: "Medio", textClass: "text-amarillo", borderClass: "border-amarillo/50", hoverClass: "hover:bg-amarillo/10" },
  { valor: "verde",    label: "Bajo",  textClass: "text-verde",    borderClass: "border-verde/50",    hoverClass: "hover:bg-verde/10"    },
];

/** Devuelve el nivel efectivo a mostrar: nivelValidado > nivel > "clasificando" */
export function nivelEfectivo(reporte) {
  return reporte?.nivelValidado ?? reporte?.nivel ?? "clasificando";
}

/** Devuelve NIVEL_META para un reporte, siempre con fallback a "clasificando" */
export function metaDeReporte(reporte) {
  return NIVEL_META[nivelEfectivo(reporte)] ?? NIVEL_META.clasificando;
}

// ── Colores de nivel para estaciones SENAMHI (escala hidrológica) ─────────────
export const NIVEL_ESTACION_TEXT = {
  roja:    "text-rojo",
  naranja: "text-orange-400",
  amarilla:"text-amarillo",
  verde:   "text-verde",
};

// ── Estado del reporte ────────────────────────────────────────────────────────
export const ESTADO_META = {
  "pendiente":   { label: "Pendiente",   textClass: "text-secundario" },
  "en atención": { label: "En atención", textClass: "text-amarillo"   },
  "asegurado":   { label: "Asegurado",   textClass: "text-verde"      },
};

/** Devuelve ESTADO_META para un reporte, siempre con fallback */
export function metaDeEstado(reporte) {
  return ESTADO_META[reporte?.estado] ?? ESTADO_META["pendiente"];
}
