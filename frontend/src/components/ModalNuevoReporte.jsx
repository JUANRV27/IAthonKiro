/**
 * ModalNuevoReporte — formulario glassmorphism para registrar un nuevo punto.
 *
 * Campos del contrato: tipoPeligro, distrito, lat, lng, personasEnRiesgo,
 * viviendas, viaAcceso, lugaresCriticos, necesidad, descripcion, fotoUrl.
 *
 * Funcionalidades:
 *  - "Ubicar en mapa" activa el modo crosshair en MapaReportes para capturar lat/lng
 *  - "Usar foto de ejemplo" rellena fotoUrl con una imagen de Picsum
 *  - Validación mínima antes de enviar
 *  - Estado de guardando / error
 */

import { useState } from "react";
import { crearReporte } from "../api.js";

const TIPOS_PELIGRO = [
  "Inundación",
  "Deslizamiento",
  "Colapso de vivienda",
  "Erosión de ribera",
  "Anegamiento",
  "Humedecimiento de vía",
  "Acumulación de residuos en dren",
  "Desbordamiento de canal",
  "Otro",
];

const DISTRITOS = [
  "Castilla",
  "Piura",
  "Veintiséis de Octubre",
  "Catacaos",
  "Sullana",
  "Chulucanas",
  "Tambogrande",
  "Sechura",
  "La Unión",
  "Paita",
  "Otro",
];

const NECESIDADES = [
  "Evacuación inmediata",
  "Carpas y agua potable",
  "Bombas de achique",
  "Sacos de arena",
  "Maquinaria para desobstrucción",
  "Apuntalamiento de estructuras",
  "Alojamiento temporal",
  "Señalización preventiva",
  "Limpieza de dren",
  "Kits de limpieza",
  "Víveres de emergencia",
  "Otro",
];

const VIAS_ACCESO = [
  "Acceso libre",
  "Transitable con dificultad",
  "Parcialmente cortada",
  "Cortada — solo a pie",
  "Sin acceso vehicular",
];

const FOTO_EJEMPLO_SEEDS = [
  "flood01","slide02","house03","river04","mud05","rain06","rescue07","alert08",
];

function campoId(seed) {
  return `reporte-${seed}`;
}

const VACIO = {
  tipoPeligro:    "",
  distrito:       "",
  lat:            "",
  lng:            "",
  personasEnRiesgo: "",
  viviendas:      "",
  viaAcceso:      "",
  lugaresCriticos:"",
  necesidad:      "",
  descripcion:    "",
  fotoUrl:        "",
};

export default function ModalNuevoReporte({
  onCerrar,
  onCreado,
  coordCapturada,     // { lat, lng } inyectado desde App cuando usuario clicó el mapa
  onIniciarCaptura,   // () → activa modo crosshair en el mapa
}) {
  const [form, setForm]         = useState(VACIO);
  const [errores, setErrores]   = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi]   = useState(null);

  // Sincronizar coordenada capturada desde el mapa
  const coordsLlenadas = coordCapturada?.lat && coordCapturada?.lng;
  const latMostrada = coordsLlenadas ? coordCapturada.lat.toFixed(5) : form.lat;
  const lngMostrada = coordsLlenadas ? coordCapturada.lng.toFixed(5) : form.lng;

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function usarFotoEjemplo() {
    const seed = FOTO_EJEMPLO_SEEDS[Math.floor(Math.random() * FOTO_EJEMPLO_SEEDS.length)];
    set("fotoUrl", `https://picsum.photos/seed/${seed}/400/300`);
  }

  function validar() {
    const e = {};
    if (!form.tipoPeligro)    e.tipoPeligro    = "Selecciona un tipo de peligro";
    if (!form.distrito)       e.distrito       = "Selecciona el distrito";
    const lat = coordsLlenadas ? coordCapturada.lat : parseFloat(form.lat);
    const lng = coordsLlenadas ? coordCapturada.lng : parseFloat(form.lng);
    if (isNaN(lat) || lat < -90  || lat > 90)  e.lat = "Latitud inválida";
    if (isNaN(lng) || lng < -180 || lng > 180) e.lng = "Longitud inválida";
    if (!form.descripcion.trim()) e.descripcion = "Agrega una descripción breve";
    const personas = parseInt(form.personasEnRiesgo, 10);
    if (isNaN(personas) || personas < 1) e.personasEnRiesgo = "Número de personas requerido";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) { setErrores(errs); return; }

    setGuardando(true);
    setErrorApi(null);
    try {
      const lat = coordsLlenadas ? coordCapturada.lat : parseFloat(form.lat);
      const lng = coordsLlenadas ? coordCapturada.lng : parseFloat(form.lng);
      const nuevo = await crearReporte({
        ...form,
        lat,
        lng,
        personasEnRiesgo: parseInt(form.personasEnRiesgo, 10),
        viviendas: parseInt(form.viviendas, 10) || 0,
        fotoUrl: form.fotoUrl || `https://picsum.photos/seed/nuevo${Date.now()}/400/300`,
      });
      onCreado(nuevo);
    } catch (err) {
      setErrorApi(err.message ?? "Error al guardar el reporte.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Nuevo reporte de riesgo">
      <div className="glass w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] animate-fade-in">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-borde shrink-0">
          <h2 className="text-sm font-bold text-primario uppercase tracking-wider">
            Nuevo reporte de riesgo
          </h2>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-secundario hover:text-primario hover:bg-borde/60 transition-colors"
            aria-label="Cerrar formulario"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4" noValidate>

          {/* Tipo de peligro + Distrito */}
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id={campoId("tipo")}
              label="Tipo de peligro *"
              error={errores.tipoPeligro}
            >
              <select
                id={campoId("tipo")}
                value={form.tipoPeligro}
                onChange={(e) => set("tipoPeligro", e.target.value)}
                className="campo-select"
                required
              >
                <option value="">Seleccionar…</option>
                {TIPOS_PELIGRO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>

            <Campo id={campoId("dist")} label="Distrito *" error={errores.distrito}>
              <select
                id={campoId("dist")}
                value={form.distrito}
                onChange={(e) => set("distrito", e.target.value)}
                className="campo-select"
                required
              >
                <option value="">Seleccionar…</option>
                {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Campo>
          </div>

          {/* Ubicación */}
          <div>
            <p className="text-xs font-semibold text-secundario mb-1.5">Ubicación *</p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Campo id={campoId("lat")} label="Latitud" error={errores.lat}>
                <input
                  id={campoId("lat")}
                  type="number"
                  step="any"
                  placeholder="-5.194"
                  value={latMostrada}
                  onChange={(e) => set("lat", e.target.value)}
                  className="campo-input"
                  readOnly={coordsLlenadas}
                  aria-describedby={errores.lat ? campoId("lat-err") : undefined}
                />
              </Campo>
              <Campo id={campoId("lng")} label="Longitud" error={errores.lng}>
                <input
                  id={campoId("lng")}
                  type="number"
                  step="any"
                  placeholder="-80.632"
                  value={lngMostrada}
                  onChange={(e) => set("lng", e.target.value)}
                  className="campo-input"
                  readOnly={coordsLlenadas}
                  aria-describedby={errores.lng ? campoId("lng-err") : undefined}
                />
              </Campo>
            </div>
            <button
              type="button"
              onClick={onIniciarCaptura}
              className="w-full py-2 rounded-xl border border-menta/40 text-menta text-xs font-semibold
                         hover:bg-menta/10 transition-colors flex items-center justify-center gap-2"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              </svg>
              {coordsLlenadas ? "✓ Ubicación capturada del mapa" : "Ubicar en mapa"}
            </button>
          </div>

          {/* Personas y viviendas */}
          <div className="grid grid-cols-2 gap-3">
            <Campo id={campoId("pers")} label="Personas en riesgo *" error={errores.personasEnRiesgo}>
              <input
                id={campoId("pers")}
                type="number"
                min="1"
                placeholder="0"
                value={form.personasEnRiesgo}
                onChange={(e) => set("personasEnRiesgo", e.target.value)}
                className="campo-input"
              />
            </Campo>
            <Campo id={campoId("viv")} label="Viviendas afectadas">
              <input
                id={campoId("viv")}
                type="number"
                min="0"
                placeholder="0"
                value={form.viviendas}
                onChange={(e) => set("viviendas", e.target.value)}
                className="campo-input"
              />
            </Campo>
          </div>

          {/* Vía de acceso */}
          <Campo id={campoId("via")} label="Vía de acceso">
            <select
              id={campoId("via")}
              value={form.viaAcceso}
              onChange={(e) => set("viaAcceso", e.target.value)}
              className="campo-select"
            >
              <option value="">Seleccionar…</option>
              {VIAS_ACCESO.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Campo>

          {/* Necesidad */}
          <Campo id={campoId("nec")} label="Necesidad principal">
            <select
              id={campoId("nec")}
              value={form.necesidad}
              onChange={(e) => set("necesidad", e.target.value)}
              className="campo-select"
            >
              <option value="">Seleccionar…</option>
              {NECESIDADES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Campo>

          {/* Lugares críticos */}
          <Campo id={campoId("lugares")} label="Lugares críticos">
            <input
              id={campoId("lugares")}
              type="text"
              placeholder="Ej: Mercado central, colegio…"
              value={form.lugaresCriticos}
              onChange={(e) => set("lugaresCriticos", e.target.value)}
              className="campo-input"
            />
          </Campo>

          {/* Descripción */}
          <Campo id={campoId("desc")} label="Descripción *" error={errores.descripcion}>
            <textarea
              id={campoId("desc")}
              rows={3}
              placeholder="Describe la situación brevemente…"
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              className="campo-input resize-none"
            />
          </Campo>

          {/* Foto */}
          <div>
            <p className="text-xs font-semibold text-secundario mb-1.5">Foto de referencia</p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://…"
                value={form.fotoUrl}
                onChange={(e) => set("fotoUrl", e.target.value)}
                className="campo-input flex-1 text-xs"
                aria-label="URL de foto"
              />
              <button
                type="button"
                onClick={usarFotoEjemplo}
                className="shrink-0 px-3 py-2 glass rounded-xl text-xs text-menta font-semibold
                           border border-menta/30 hover:bg-menta/10 transition-colors whitespace-nowrap"
              >
                Foto de ejemplo
              </button>
            </div>
            {form.fotoUrl && (
              <img
                src={form.fotoUrl}
                alt="Vista previa"
                className="mt-2 w-full h-24 object-cover rounded-xl opacity-70"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </div>

          {/* Error de API */}
          {errorApi && (
            <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
              {errorApi}
            </p>
          )}
        </form>

        {/* Footer con botones */}
        <div className="px-5 py-4 border-t border-borde flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 py-3 rounded-xl glass text-secundario text-sm font-semibold
                       hover:text-primario hover:border-borde/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-nuevo-reporte"
            onClick={handleSubmit}
            disabled={guardando}
            className="btn-menta flex-1 text-sm py-3"
          >
            {guardando ? "Guardando…" : "Registrar punto"}
          </button>
        </div>
      </div>

      {/* Estilos inline para campos del formulario */}
      <style>{`
        .campo-input, .campo-select {
          width: 100%;
          background: rgba(11,18,21,0.6);
          border: 1px solid #1F2A30;
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #E5E7EB;
          outline: none;
          transition: border-color 0.15s;
        }
        .campo-input:focus, .campo-select:focus {
          border-color: rgba(45,212,191,0.5);
        }
        .campo-input::placeholder { color: #6B7280; }
        .campo-select option { background: #111A1F; color: #E5E7EB; }
      `}</style>
    </div>
  );
}

// ── Sub-componente Campo ──────────────────────────────────────────────────────
function Campo({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-secundario mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-[10px] text-rojo mt-0.5">{error}</p>
      )}
    </div>
  );
}
