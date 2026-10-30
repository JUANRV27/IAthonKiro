/** EstadoCarga — estados reutilizables: cargando, error, vacío. */

export function Cargando({ texto = "Cargando…" }) {
  return (
    <div className="flex items-center justify-center py-10 text-secundario gap-3">
      <svg className="animate-spin h-4 w-4 text-menta shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <span className="text-sm">{texto}</span>
    </div>
  );
}

export function Error({ mensaje, onReintentar }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <span className="text-rojo text-sm font-medium text-center px-4">{mensaje}</span>
      {onReintentar && (
        <button onClick={onReintentar} className="px-4 py-1.5 rounded-lg glass text-primario text-sm hover:border-menta/40 transition-colors">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Vacio({ texto = "Sin datos" }) {
  return (
    <div className="flex items-center justify-center py-10 text-secundario text-sm">
      {texto}
    </div>
  );
}
