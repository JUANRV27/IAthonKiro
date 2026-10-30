/**
 * BarraSuperior — header glassmorphism con título, selector de brigada,
 * contadores y botón "Nuevo reporte".
 */

export default function BarraSuperior({
  brigadas,
  brigadaActual,
  onCambiarBrigada,
  onNuevoReporte,
  reportes,
}) {
  const rojoPendiente = reportes.filter(
    (r) => r.nivel === "rojo" && r.estado !== "asegurado"
  ).length;
  const asegurados = reportes.filter((r) => r.estado === "asegurado").length;

  return (
    <header className="glass-dark border-b border-borde px-5 py-3 flex flex-wrap items-center gap-3 z-20 shrink-0">

      {/* Logo + título */}
      <div className="flex items-center gap-2.5 mr-auto">
        <span className="text-menta" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <div>
          <h1 className="text-primario font-bold text-sm leading-none tracking-tight">
            Mapa de riesgo FEN
            <span className="text-menta ml-1.5">· Piura</span>
          </h1>
          <p className="text-gris text-[10px] mt-0.5 leading-none">EDAN PERÚ · SENAMHI</p>
        </div>
      </div>

      {/* Contadores */}
      <div className="flex items-center gap-1 text-xs">
        <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-rojo pulse-rojo" aria-hidden="true"/>
          <span className="font-bold text-rojo">{rojoPendiente}</span>
          <span className="text-secundario hidden sm:inline">rojos pendientes</span>
        </div>
        <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-verde" aria-hidden="true"/>
          <span className="font-bold text-verde">{asegurados}</span>
          <span className="text-secundario hidden sm:inline">asegurados</span>
        </div>
      </div>

      {/* Selector de brigada */}
      <div className="flex items-center gap-2">
        <label htmlFor="selector-brigada" className="text-secundario text-xs whitespace-nowrap hidden md:block">
          ¿Qué brigada eres?
        </label>
        <select
          id="selector-brigada"
          value={brigadaActual ?? ""}
          onChange={(e) => onCambiarBrigada(e.target.value || null)}
          className="glass rounded-lg px-3 py-1.5 text-xs text-primario
                     focus:outline-none focus:border-menta/50 transition-colors
                     min-w-[160px] cursor-pointer"
          aria-label="Seleccionar brigada activa"
        >
          <option value="">— Sin brigada —</option>
          {brigadas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}{b.disponible ? "" : " ·"}
            </option>
          ))}
        </select>
      </div>

      {/* Botón nuevo reporte */}
      <button
        onClick={onNuevoReporte}
        className="btn-menta text-xs flex items-center gap-1.5 whitespace-nowrap"
        aria-label="Registrar nuevo reporte de riesgo"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo reporte
      </button>
    </header>
  );
}
