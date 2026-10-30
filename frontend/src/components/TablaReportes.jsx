/**
 * TablaReportes — lista scrollable de reportes ordenada rojo → amarillo → verde.
 * Estilo glassmorphism con badges de nivel con glow.
 * Colores y textos desde constants/niveles.js.
 */

import { Cargando, Error as ErrorEstado, Vacio } from "./EstadoCarga.jsx";
import { metaDeReporte, metaDeEstado, nivelEfectivo } from "../constants/niveles.js";

export default function TablaReportes({
  reportes,
  cargando,
  error,
  reporteActivo,
  onSeleccionar,
  onReintentar,
}) {
  return (
    <section
      className="flex flex-col h-full glass rounded-2xl overflow-hidden"
      aria-label="Lista de reportes de riesgo"
    >
      {/* Cabecera del panel */}
      <div className="px-4 py-3 border-b border-borde flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-primario uppercase tracking-wider">Reportes</h2>
        {!cargando && !error && (
          <span className="text-[10px] text-gris glass px-2 py-0.5 rounded-full">
            {reportes.length} puntos
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1">
        {cargando && <Cargando texto="Cargando reportes…" />}
        {error && <ErrorEstado mensaje={error} onReintentar={onReintentar} />}
        {!cargando && !error && reportes.length === 0 && (
          <Vacio texto="No hay reportes registrados" />
        )}

        {!cargando && !error && reportes.map((r) => {
          const nm       = metaDeReporte(r);
          const em       = metaDeEstado(r);
          const activo   = reporteActivo?.id === r.id;
          const asegurado = r.estado === "asegurado";
          // usa nivelValidado si existe, para el badge
          const nivel    = nivelEfectivo(r);

          return (
            <button
              key={r.id}
              onClick={() => onSeleccionar(r)}
              className={`w-full text-left px-4 py-3 border-b border-borde/60
                          transition-colors hover:bg-white/[0.04] focus:outline-none
                          ${activo   ? "bg-menta/[0.08] border-l-2 border-l-menta" : ""}
                          ${asegurado ? "opacity-50" : ""}
                          animate-fade-in`}
              aria-pressed={activo}
              aria-label={`${r.tipoPeligro} en ${r.distrito}, nivel ${nm.label}`}
            >
              <div className="flex items-start gap-2.5">
                {/* Badge nivel (muestra nivelValidado si existe) */}
                <span className={`mt-0.5 inline-flex items-center shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${nm.badgeClass}`}>
                  {nm.label}
                  {r.nivelValidado && r.nivelValidado !== r.nivel && (
                    <span className="ml-1 opacity-70" aria-label="nivel corregido">✓</span>
                  )}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primario truncate leading-tight">{r.tipoPeligro}</p>
                  <p className="text-[10px] text-secundario mt-0.5">{r.distrito}</p>
                </div>

                {/* Estado */}
                <div className="text-right shrink-0">
                  <p className={`text-[10px] font-semibold ${em.textClass}`}>{em.label}</p>
                  {r.brigadaNombre && (
                    <p className="text-[10px] text-gris mt-0.5 max-w-[90px] truncate">{r.brigadaNombre}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gris">
                <span>
                  <span className="text-secundario font-medium">{r.personasEnRiesgo}</span> personas
                </span>
                <span>
                  <span className="text-secundario font-medium">{r.viviendas}</span> viviendas
                </span>
                {asegurado && (
                  <span className="ml-auto text-verde font-semibold">✓ asegurado</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
