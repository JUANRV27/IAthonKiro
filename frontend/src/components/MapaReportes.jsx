/**
 * MapaReportes — Google Maps estilo oscuro centrado en Piura.
 *
 * Círculo por reporte:
 *   - Color según nivelEfectivo (nivelValidado ?? nivel) desde constants/niveles.js
 *   - Radio proporcional a personasEnRiesgo
 *   - "asegurado": círculo atenuado (fillOpacity/strokeOpacity bajos)
 *   - "clasificando": gris
 *
 * Si VITE_GOOGLE_MAPS_KEY está vacía → aviso + lista alternativa sin romper el resto.
 */

import { useEffect, useRef, useState } from "react";
import { NIVEL_HEX, NIVEL_META, nivelEfectivo } from "../constants/niveles.js";

// ── Radio en metros (visible a zoom ~11) ──────────────────────────────────────
function radioMetros(personasEnRiesgo) {
  return Math.min(800 + Math.sqrt(personasEnRiesgo ?? 1) * 60, 4500);
}

// ── Estilo oscuro de Google Maps ──────────────────────────────────────────────
const MAPA_ESTILO_OSCURO = [
  { elementType: "geometry",         stylers: [{ color: "#0d1b21" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke",stylers:[{ color: "#0B1215" }] },
  { featureType: "road",              elementType: "geometry",        stylers: [{ color: "#1f2a30" }] },
  { featureType: "road",              elementType: "geometry.stroke", stylers: [{ color: "#0d1b21" }] },
  { featureType: "road.highway",      elementType: "geometry",        stylers: [{ color: "#243840" }] },
  { featureType: "water",             elementType: "geometry",        stylers: [{ color: "#0a1c23" }] },
  { featureType: "water",             elementType: "labels.text.fill",stylers:[{ color: "#2DD4BF" }] },
  { featureType: "poi",               stylers: [{ visibility: "off" }] },
  { featureType: "transit",           stylers: [{ visibility: "off" }] },
  { featureType: "administrative",    elementType: "geometry",        stylers: [{ color: "#1f2a30" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "administrative.locality",elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "landscape",         elementType: "geometry",        stylers: [{ color: "#111a1f" }] },
];

// ── Carga asíncrona del SDK (singleton) ───────────────────────────────────────
let _mapsPromise = null;
function cargarGoogleMaps(apiKey) {
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }
    const script = document.createElement("script");
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async   = true;
    script.defer   = true;
    script.onload  = () => resolve(window.google.maps);
    script.onerror = () => { _mapsPromise = null; reject(new Error("No se pudo cargar Google Maps.")); };
    document.head.appendChild(script);
  });
  return _mapsPromise;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function MapaReportes({
  reportes,
  reporteActivo,
  onSeleccionar,
  onClickMapa,        // (lat, lng) — captura de coordenada para nuevo reporte
  modoSeleccionCoord, // true = cursor crosshair
}) {
  const contenedorRef  = useRef(null);
  const mapaRef        = useRef(null);
  const circulosRef    = useRef({});   // id → google.maps.Circle
  const clickListenRef = useRef(null);

  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);

  const API_KEY  = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";
  const sinClave = !API_KEY.trim();

  // ── Init mapa ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sinClave || !contenedorRef.current) return;
    cargarGoogleMaps(API_KEY)
      .then((maps) => {
        if (mapaRef.current) return;
        mapaRef.current = new maps.Map(contenedorRef.current, {
          center: { lat: -5.194, lng: -80.632 },
          zoom: 11,
          styles: MAPA_ESTILO_OSCURO,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          backgroundColor: "#0B1215",
        });
        setListo(true);
      })
      .catch((err) => setError(err.message));
  }, [sinClave, API_KEY]);

  // ── Círculos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!listo || !window.google) return;
    const maps = window.google.maps;
    const mapa = mapaRef.current;
    const idsActuales = new Set(reportes.map((r) => r.id));

    // Limpiar los que ya no existen
    Object.keys(circulosRef.current).forEach((id) => {
      if (!idsActuales.has(id)) {
        circulosRef.current[id].setMap(null);
        delete circulosRef.current[id];
      }
    });

    reportes.forEach((r) => {
      const nivel    = nivelEfectivo(r);
      const color    = NIVEL_HEX[nivel]  ?? NIVEL_HEX.clasificando;
      const asegurado = r.estado === "asegurado";
      const activo   = reporteActivo?.id === r.id;

      const opts = {
        map:           mapa,
        center:        { lat: r.lat, lng: r.lng },
        radius:        radioMetros(r.personasEnRiesgo),
        fillColor:     color,
        fillOpacity:   asegurado ? 0.12 : 0.32,
        strokeColor:   activo ? "#2DD4BF" : color,
        strokeOpacity: asegurado ? 0.35 : 0.85,
        strokeWeight:  activo ? 3 : asegurado ? 1 : 2,
        zIndex:        nivel === "rojo" ? 3 : nivel === "amarillo" ? 2 : 1,
      };

      if (circulosRef.current[r.id]) {
        circulosRef.current[r.id].setOptions(opts);
      } else {
        const circulo = new maps.Circle(opts);
        circulo.addListener("click", () => onSeleccionar(r));
        circulosRef.current[r.id] = circulo;
      }
    });
  }, [listo, reportes, reporteActivo, onSeleccionar]);

  // ── Listener de captura de coordenada ────────────────────────────────────
  useEffect(() => {
    if (!listo || !window.google) return;
    const maps = window.google.maps;
    const mapa = mapaRef.current;

    if (clickListenRef.current) {
      maps.event.removeListener(clickListenRef.current);
      clickListenRef.current = null;
    }

    if (modoSeleccionCoord && onClickMapa) {
      mapa.setOptions({ draggableCursor: "crosshair" });
      clickListenRef.current = mapa.addListener("click", (e) => {
        onClickMapa(e.latLng.lat(), e.latLng.lng());
      });
    } else {
      mapa.setOptions({ draggableCursor: null });
    }
  }, [listo, modoSeleccionCoord, onClickMapa]);

  // ── Sin clave: aviso + lista de puntos ───────────────────────────────────
  if (sinClave) {
    return (
      <div className="w-full h-full glass rounded-2xl flex flex-col items-center justify-center gap-3 p-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p className="text-primario font-semibold text-sm">Mapa no disponible</p>
        <p className="text-secundario text-xs text-center max-w-xs leading-relaxed">
          Agrega tu clave en <code className="text-menta">.env</code> como{" "}
          <code className="text-menta">VITE_GOOGLE_MAPS_KEY</code> y reinicia el servidor.
        </p>
        {reportes.length > 0 && (
          <div className="mt-3 w-full max-w-sm space-y-1.5">
            <p className="text-xs text-secundario uppercase tracking-wider mb-2">
              Puntos registrados ({reportes.length})
            </p>
            {reportes.map((r) => {
              const nivel = nivelEfectivo(r);
              const meta  = NIVEL_META[nivel] ?? NIVEL_META.clasificando;
              return (
                <button
                  key={r.id}
                  onClick={() => onSeleccionar(r)}
                  className="w-full flex items-center gap-2 px-3 py-2 glass rounded-lg
                             hover:bg-borde/40 transition-colors text-left"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} aria-hidden="true" />
                  <span className="text-xs text-primario font-medium truncate">{r.tipoPeligro}</span>
                  <span className="text-[10px] text-secundario ml-auto shrink-0">{r.distrito}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Error de carga ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full h-full glass rounded-2xl flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-rojo font-semibold text-sm">Error al cargar el mapa</p>
        <p className="text-secundario text-xs text-center">{error}</p>
      </div>
    );
  }

  // ── Mapa ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div
        ref={contenedorRef}
        className="w-full h-full"
        aria-label="Mapa de puntos de riesgo en Piura"
      />

      {/* Spinner de carga inicial */}
      {!listo && (
        <div className="absolute inset-0 glass flex items-center justify-center gap-3 rounded-2xl">
          <svg className="animate-spin h-5 w-5 text-menta" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="text-secundario text-sm">Cargando mapa…</span>
        </div>
      )}

      {/* Leyenda */}
      {listo && (
        <div className="absolute bottom-3 left-3 glass rounded-xl px-3 py-2 flex items-center gap-3">
          {Object.entries(NIVEL_META).map(([nivel, meta]) => (
            <span key={nivel} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/20"
                style={{ background: NIVEL_HEX[nivel] }}
                aria-hidden="true"
              />
              <span className="text-secundario">{meta.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Indicador modo captura */}
      {modoSeleccionCoord && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-1.5 text-xs text-menta font-semibold pointer-events-none">
          Haz clic en el mapa para colocar el punto
        </div>
      )}
    </div>
  );
}
