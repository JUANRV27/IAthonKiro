/**
 * PanelAlertas — estaciones hidrológicas SENAMHI y avisos vigentes.
 * Muestra caudal actual vs umbrales con barra de progreso.
 */

import { Cargando, Error as ErrorEstado, Vacio } from "./EstadoCarga.jsx";

const NIVEL_COLOR = {
  roja:     { text: "text-rojo",     bg: "bg-rojo",     label: "Roja"     },
  naranja:  { text: "text-orange-400", bg: "bg-orange-400", label: "Naranja" },
  amarilla: { text: "text-amarillo", bg: "bg-amarillo", label: "Amarilla" },
  verde:    { text: "text-verde",    bg: "bg-verde",    label: "Verde"    },
};

function BarraUmbral({ caudal, amarilla, naranja, roja }) {
  const max = roja * 1.15;
  const pct = (v) => Math.min(100, (v / max) * 100).toFixed(1);

  return (
    <div className="relative w-full h-3 bg-borde rounded-full overflow-hidden mt-2" role="img" aria-label="Barra de nivel del río">
      {/* zonas de color */}
      <div className="absolute inset-y-0 left-0 bg-verde/40" style={{ width: `${pct(amarilla)}%` }} />
      <div className="absolute inset-y-0 bg-amarillo/40"
           style={{ left: `${pct(amarilla)}%`, width: `${pct(naranja) - pct(amarilla)}%` }} />
      <div className="absolute inset-y-0 bg-orange-400/40"
           style={{ left: `${pct(naranja)}%`, width: `${pct(roja) - pct(naranja)}%` }} />
      <div className="absolute inset-y-0 bg-rojo/40"
           style={{ left: `${pct(roja)}%`, right: 0 }} />
      {/* marcador actual */}
      <div
        className="absolute inset-y-0 w-1 bg-white rounded-full"
        style={{ left: `calc(${pct(caudal)}% - 2px)` }}
        aria-hidden="true"
      />
    </div>
  );
}

function TarjetaEstacion({ e }) {
  const nc = NIVEL_COLOR[e.nivel] ?? NIVEL_COLOR.verde;
  const hora = new Date(e.hora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-fondo border border-borde rounded-xl p-4">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-primario">{e.estacion}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${nc.text} bg-opacity-10 ${nc.bg}/10`}>
          Nivel {nc.label}
        </span>
      </div>

      <p className="text-2xl font-bold text-primario">
        {e.caudal.toLocaleString("es-PE")}
        <span className="text-sm font-normal text-secundario ml-1">m³/s</span>
      </p>

      <BarraUmbral caudal={e.caudal} amarilla={e.amarilla} naranja={e.naranja} roja={e.roja} />

      <div className="flex justify-between text-xs text-secundario mt-2">
        <span>Amarilla: {e.amarilla}</span>
        <span>Naranja: {e.naranja}</span>
        <span>Roja: {e.roja}</span>
        <span className="text-gris">{hora}</span>
      </div>
    </div>
  );
}

export default function PanelAlertas({ alertas, cargando, error, onReintentar }) {
  return (
    <section
      className="glass rounded-2xl p-4"
      aria-label="Alertas hidrológicas SENAMHI"
    >
      <h2 className="text-sm font-semibold text-primario mb-3 flex items-center gap-2">
        <span className="text-menta" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </span>
        Alertas SENAMHI — Río Piura
      </h2>

      {cargando && <Cargando texto="Cargando alertas…" />}
      {error && <ErrorEstado mensaje={error} onReintentar={onReintentar} />}

      {!cargando && !error && alertas && (
        <div className="space-y-4">
          {/* Estaciones */}
          {alertas.estaciones?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alertas.estaciones.map((e) => (
                <TarjetaEstacion key={e.estacion} e={e} />
              ))}
            </div>
          ) : (
            <Vacio texto="Sin datos de estaciones" />
          )}

          {/* Avisos */}
          {alertas.avisos?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-secundario uppercase tracking-wider">
                Avisos vigentes
              </p>
              {alertas.avisos.map((av, i) => {
                const nc = NIVEL_COLOR[av.nivel] ?? NIVEL_COLOR.verde;
                const vigencia = new Date(av.vigencia).toLocaleString("es-PE", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                });
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-lg border border-borde glass-dark">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${nc.bg}`} aria-hidden="true" />
                    <div>
                      <p className="text-xs text-primario leading-snug">{av.texto}</p>
                      <p className="text-xs text-secundario mt-1">
                        {av.zona} · vigente hasta {vigencia}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!cargando && !error && !alertas && (
        <Vacio texto="Sin alertas disponibles" />
      )}
    </section>
  );
}
