/**
 * PanelDetalle — panel lateral con todos los datos de un reporte.
 *
 * Datos de nivel desde constants/niveles.js.
 * Distancias desde utils/distancia.js.
 *
 * Incluye:
 *  - Datos completos del contrato
 *  - Análisis IA + validación humana (confirmar / corregir nivel)
 *  - Estación SENAMHI más cercana
 *  - 3 brigadas disponibles más cercanas
 *  - Botones de acción con lógica corregida:
 *      "Tomar este punto" → pendiente, cualquier brigada
 *      "Marcar asegurado" → en atención, solo brigada asignada
 */

import { useState } from "react";
import { tomarPunto, marcarAsegurado, validarNivel } from "../api.js";
import {
  NIVEL_META,
  NIVEL_ESTACION_TEXT,
  NIVELES_CORRECCION,
  nivelEfectivo,
  metaDeReporte,
} from "../constants/niveles.js";
import { nMasCercanos, haversineKm } from "../utils/distancia.js";

// Coordenadas de las estaciones (se usan mientras no vengan del contrato)
const COORDS_ESTACIONES = {
  "Puente Sánchez Cerro": { lat: -5.194, lng: -80.628 },
  "Tambogrande":          { lat: -4.927, lng: -80.344 },
};

function Fila({ etiqueta, valor }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-xs py-1.5 border-b border-borde/30">
      <dt className="text-secundario leading-relaxed">{etiqueta}</dt>
      <dd className="text-primario leading-relaxed">{valor}</dd>
    </div>
  );
}

export default function PanelDetalle({
  reporte,
  brigadas,
  brigadaActual,   // id
  alertas,
  onCerrar,
  onActualizar,
}) {
  const [accionando,    setAccionando]    = useState(false);
  const [validando,     setValidando]     = useState(false);
  const [msgAccion,     setMsgAccion]     = useState(null);
  const [msgValidacion, setMsgValidacion] = useState(null);

  if (!reporte) return null;

  const nm        = metaDeReporte(reporte);
  const asegurado = reporte.estado === "asegurado";
  const enAtencion = reporte.estado === "en atención";
  const pendiente  = reporte.estado === "pendiente";

  const brigadaObj = brigadas.find((b) => b.id === brigadaActual) ?? null;

  // 3 brigadas disponibles más cercanas
  const brigadasCercanas = nMasCercanos(
    reporte.lat, reporte.lng,
    brigadas.filter((b) => b.disponible),
    3
  );

  // Estación SENAMHI más cercana — añadimos lat/lng para el cálculo
  const estacionCercana = alertas?.estaciones
    ? nMasCercanos(
        reporte.lat, reporte.lng,
        alertas.estaciones.map((e) => ({
          ...e,
          ...(COORDS_ESTACIONES[e.estacion] ?? { lat: e.lat ?? reporte.lat, lng: e.lng ?? reporte.lng }),
        })),
        1
      )[0]
    : null;

  const fecha = new Date(reporte.fecha).toLocaleString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function handleTomar() {
    if (!brigadaActual) {
      setMsgAccion({ tipo: "error", texto: "Selecciona tu brigada para poder tomar este punto." });
      return;
    }
    setAccionando(true); setMsgAccion(null);
    try {
      await tomarPunto(reporte.id, brigadaActual);
      setMsgAccion({ tipo: "ok", texto: "Punto tomado. Queda asignado a tu brigada." });
      onActualizar();
    } catch (err) {
      if (err.status === 409) {
        const b = brigadas.find((b) => b.id === reporte.brigadaId);
        setMsgAccion({ tipo: "error", texto: `Ya lo tomó ${b?.nombre ?? "otra brigada"}.` });
      } else {
        setMsgAccion({ tipo: "error", texto: err.message });
      }
    } finally { setAccionando(false); }
  }

  async function handleAsegurar() {
    if (!brigadaActual) {
      setMsgAccion({ tipo: "error", texto: "Selecciona tu brigada para poder actuar." });
      return;
    }
    setAccionando(true); setMsgAccion(null);
    try {
      await marcarAsegurado(reporte.id, brigadaActual);
      setMsgAccion({ tipo: "ok", texto: "¡Punto asegurado correctamente!" });
      onActualizar();
    } catch (err) {
      if (err.status === 403) {
        setMsgAccion({ tipo: "error", texto: "Solo la brigada asignada puede asegurarlo." });
      } else {
        setMsgAccion({ tipo: "error", texto: err.message });
      }
    } finally { setAccionando(false); }
  }

  async function handleValidar(nivel) {
    if (!brigadaActual) {
      setMsgValidacion({ tipo: "error", texto: "Selecciona tu brigada para validar." });
      return;
    }
    setValidando(true); setMsgValidacion(null);
    try {
      await validarNivel(reporte.id, nivel, brigadaActual, brigadaObj?.nombre);
      setMsgValidacion({
        tipo: "ok",
        texto: `Nivel ${NIVEL_META[nivel]?.label ?? nivel} confirmado por ${brigadaObj?.nombre ?? brigadaActual}.`,
      });
      onActualizar();
    } catch (err) {
      setMsgValidacion({ tipo: "error", texto: err.message });
    } finally { setValidando(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <aside
      className={`flex flex-col h-full glass border-l border-borde overflow-hidden animate-fade-in
                  ${asegurado ? "opacity-90" : ""}`}
      aria-label={`Detalle: ${reporte.tipoPeligro} en ${reporte.distrito}`}
    >
      {/* Cabecera */}
      <div className={`flex items-start justify-between p-4 border-b shrink-0
                       ${asegurado ? "border-dashed border-borde/50" : "border-borde"}`}>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${nm.badgeClass}`}>
              {nm.label}
            </span>
            {reporte.nivelValidado && (
              <span className="text-[10px] text-menta font-semibold">✓ validado</span>
            )}
          </div>
          <h2 className="text-sm font-bold text-primario leading-tight">{reporte.tipoPeligro}</h2>
          <p className="text-secundario text-xs mt-0.5">{reporte.distrito}</p>
        </div>
        <button
          onClick={onCerrar}
          className="p-1.5 rounded-lg text-secundario hover:text-primario hover:bg-borde/60 transition-colors shrink-0"
          aria-label="Cerrar panel de detalle"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Foto */}
      {reporte.fotoUrl && (
        <div className="relative shrink-0">
          <img
            src={reporte.fotoUrl}
            alt={`Foto: ${reporte.tipoPeligro} en ${reporte.distrito}`}
            className={`w-full h-36 object-cover ${asegurado ? "grayscale opacity-50" : ""}`}
          />
          {asegurado && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="badge-verde text-xs font-bold px-4 py-1.5 rounded-full">✓ ASEGURADO</span>
            </div>
          )}
        </div>
      )}

      {/* Cuerpo scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* Datos básicos */}
        <div className="px-4 pt-3 pb-1">
          <dl>
            <Fila etiqueta="Estado"           valor={reporte.estado} />
            <Fila etiqueta="Fecha"            valor={fecha} />
            <Fila etiqueta="Personas"         valor={`${reporte.personasEnRiesgo} en riesgo`} />
            <Fila etiqueta="Viviendas"        valor={reporte.viviendas} />
            <Fila etiqueta="Vía de acceso"    valor={reporte.viaAcceso} />
            <Fila etiqueta="Lugares críticos" valor={reporte.lugaresCriticos} />
            <Fila etiqueta="Necesidad"        valor={reporte.necesidad} />
            <Fila etiqueta="Brigada asignada" valor={reporte.brigadaNombre} />
          </dl>
        </div>

        {/* Descripción */}
        {reporte.descripcion && (
          <div className="px-4 py-3 border-t border-borde/30">
            <p className="text-[10px] font-semibold text-secundario uppercase tracking-wider mb-1.5">Descripción</p>
            <p className="text-xs text-primario leading-relaxed">{reporte.descripcion}</p>
          </div>
        )}

        {/* Análisis IA + Validación humana */}
        <div className="px-4 py-3 border-t border-borde/30 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-semibold text-menta uppercase tracking-wider">
              Análisis IA · EDAN PERÚ
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
              reporte.nivel === "clasificando"
                ? "text-gris bg-gris/10 border-gris/30"
                : "text-secundario bg-borde/60 border-borde"
            }`}>
              {reporte.nivel === "clasificando" ? "clasificando…" : "clasificado por IA"}
            </span>
          </div>

          {reporte.nivel && reporte.nivel !== "clasificando" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-secundario">Nivel sugerido:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${NIVEL_META[reporte.nivel]?.badgeClass ?? "badge-gris"}`}>
                {NIVEL_META[reporte.nivel]?.label ?? reporte.nivel}
              </span>
              {reporte.nivelValidado && reporte.nivelValidado !== reporte.nivel && (
                <span className="text-[10px] text-orange-400 font-semibold">
                  → corregido a {NIVEL_META[reporte.nivelValidado]?.label}
                </span>
              )}
            </div>
          )}

          {reporte.porque && (
            <div>
              <p className="text-[10px] font-semibold text-secundario mb-0.5">¿Por qué este nivel?</p>
              <p className="text-xs text-primario leading-relaxed">{reporte.porque}</p>
            </div>
          )}

          {reporte.accionSugerida && (
            <div>
              <p className="text-[10px] font-semibold text-secundario mb-0.5">Acción sugerida</p>
              <p className="text-xs text-primario leading-relaxed">{reporte.accionSugerida}</p>
            </div>
          )}

          {reporte.nivelValidado && reporte.validadoPor && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-menta shrink-0" aria-hidden="true"/>
              <span className="text-[10px] text-menta font-semibold">Validado por {reporte.validadoPor}</span>
            </div>
          )}

          {/* Botones de validación */}
          {reporte.nivel && reporte.nivel !== "clasificando" && !asegurado && (
            <div className="pt-1 space-y-2">
              <p className="text-[10px] text-secundario font-semibold">
                {reporte.nivelValidado ? "Cambiar validación:" : "Validar nivel sugerido:"}
              </p>
              <div className="flex gap-2 flex-wrap">
                {!reporte.nivelValidado && (
                  <button
                    onClick={() => handleValidar(reporte.nivel)}
                    disabled={validando || !brigadaActual}
                    className="flex-1 min-w-[80px] py-2 rounded-xl border border-menta/40 text-menta
                               text-[10px] font-bold hover:bg-menta/10 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                  >
                    {validando ? "…" : "Confirmar nivel"}
                  </button>
                )}
                {NIVELES_CORRECCION
                  .filter((n) => n.valor !== reporte.nivelValidado)
                  .map((n) => (
                    <button
                      key={n.valor}
                      onClick={() => handleValidar(n.valor)}
                      disabled={validando || !brigadaActual}
                      className={`flex-1 min-w-[60px] py-2 rounded-xl border text-[10px] font-bold
                                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                                  ${n.textClass} ${n.borderClass} ${n.hoverClass}`}
                    >
                      {validando ? "…" : `A ${n.label}`}
                    </button>
                  ))
                }
              </div>
              {msgValidacion && (
                <p className={`text-[10px] px-2 py-1.5 rounded-lg border ${
                  msgValidacion.tipo === "ok"
                    ? "text-menta border-menta/30 bg-menta/10"
                    : "text-rojo border-rojo/30 bg-rojo/10"
                }`}>
                  {msgValidacion.texto}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Estación SENAMHI más cercana */}
        {estacionCercana && (
          <div className="px-4 py-3 border-t border-borde/30">
            <p className="text-[10px] font-semibold text-secundario uppercase tracking-wider mb-2">
              Estación SENAMHI más cercana
            </p>
            <div className="glass-dark rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-primario">{estacionCercana.estacion}</p>
                <p className="text-[10px] text-secundario mt-0.5">
                  {estacionCercana.distanciaKm.toFixed(1)} km · Caudal{" "}
                  <span className="text-primario font-bold">
                    {estacionCercana.caudal.toLocaleString("es-PE")}
                  </span>{" "}m³/s
                </p>
              </div>
              <span className={`text-xs font-bold capitalize shrink-0 ${NIVEL_ESTACION_TEXT[estacionCercana.nivel] ?? "text-gris"}`}>
                Nivel {estacionCercana.nivel}
              </span>
            </div>
          </div>
        )}

        {/* Brigadas disponibles más cercanas */}
        <div className="px-4 py-3 border-t border-borde/30">
          <p className="text-[10px] font-semibold text-secundario uppercase tracking-wider mb-2">
            Brigadas disponibles más cercanas
          </p>
          {brigadasCercanas.length === 0 ? (
            <p className="text-xs text-secundario">Ninguna brigada disponible ahora.</p>
          ) : (
            <ul className="space-y-1.5">
              {brigadasCercanas.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-xs">
                  <span className="text-primario">{b.nombre}</span>
                  <span className="text-[10px] text-secundario tabular-nums ml-2">
                    {b.distanciaKm.toFixed(1)} km
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>{/* fin cuerpo scrollable */}

      {/* Footer: mensajes + botones */}
      <div className="px-4 py-4 border-t border-borde shrink-0 space-y-2">
        {msgAccion && (
          <p className={`text-xs px-3 py-2 rounded-lg border ${
            msgAccion.tipo === "ok"
              ? "text-verde border-verde/30 bg-verde/10"
              : "text-rojo border-rojo/30 bg-rojo/10"
          }`}>
            {msgAccion.texto}
          </p>
        )}

        {/* Tomar → estado pendiente, cualquier brigada */}
        {pendiente && (
          <button
            onClick={handleTomar}
            disabled={accionando || !brigadaActual}
            className="btn-menta w-full text-sm py-3"
          >
            {accionando ? "Procesando…" : "Tomar este punto"}
          </button>
        )}

        {/* Asegurar → en atención Y brigada asignada */}
        {enAtencion && brigadaActual === reporte.brigadaId && (
          <button
            onClick={handleAsegurar}
            disabled={accionando}
            className="btn-verde w-full text-sm py-3"
          >
            {accionando ? "Procesando…" : "Marcar asegurado"}
          </button>
        )}

        {enAtencion && brigadaActual !== reporte.brigadaId && reporte.brigadaNombre && (
          <p className="text-[10px] text-center text-secundario">
            En atención por{" "}
            <span className="text-primario font-semibold">{reporte.brigadaNombre}</span>
          </p>
        )}

        {!brigadaActual && !asegurado && (
          <p className="text-center text-[10px] text-secundario">
            Selecciona tu brigada arriba para actuar.
          </p>
        )}
      </div>
    </aside>
  );
}
