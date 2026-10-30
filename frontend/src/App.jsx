/**
 * App.jsx — orquestador delgado de GeoNexa.
 *
 * Solo gestiona:
 *  - Estado de UI: reporte activo, modal, modo captura de coordenada
 *  - Composición del layout
 *
 * Toda la lógica de datos vive en hooks/:
 *   useReportes    → polling 5 s, cargando, error
 *   useBrigadas    → carga única + refrescar
 *   useAlertas     → polling 5 s, cargando, error
 *   useBrigadaActual → localStorage
 */

import { useState } from "react";

import { useReportes }      from "./hooks/useReportes.js";
import { useBrigadas }      from "./hooks/useBrigadas.js";
import { useAlertas }       from "./hooks/useAlertas.js";
import { useBrigadaActual } from "./hooks/useBrigadaActual.js";

import BarraSuperior     from "./components/BarraSuperior.jsx";
import MapaReportes      from "./components/MapaReportes.jsx";
import TablaReportes     from "./components/TablaReportes.jsx";
import PanelDetalle      from "./components/PanelDetalle.jsx";
import PanelAlertas      from "./components/PanelAlertas.jsx";
import ModalNuevoReporte from "./components/ModalNuevoReporte.jsx";

import "./index.css";

export default function App() {
  // ── Datos ─────────────────────────────────────────────────────────────────
  const { reportes, cargando: cargandoR, error: errorR, refrescar: refrescarR, onActualizarActivo } = useReportes();
  const { brigadas, refrescar: refrescarB } = useBrigadas();
  const { alertas,  cargando: cargandoA, error: errorA, refrescar: refrescarA } = useAlertas();
  const { brigadaId, setBrigada, brigadaObj } = useBrigadaActual(brigadas);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [reporteActivo,  setReporteActivo]  = useState(null);
  const [modalAbierto,   setModalAbierto]   = useState(false);
  const [modoCaptura,    setModoCaptura]    = useState(false);
  const [coordCapturada, setCoordCapturada] = useState(null);

  // Mantener el reporte activo actualizado durante el polling
  onActualizarActivo((data) => {
    setReporteActivo((prev) =>
      prev ? (data.find((r) => r.id === prev.id) ?? prev) : null
    );
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSeleccionar(r) {
    setReporteActivo((prev) => (prev?.id === r.id ? null : r));
  }

  function handleActualizar() {
    refrescarR();
    refrescarB();
  }

  function handleNuevoReporte() {
    setModoCaptura(false);
    setCoordCapturada(null);
    setModalAbierto(true);
  }

  function handleCreado(nuevo) {
    setModalAbierto(false);
    setModoCaptura(false);
    setCoordCapturada(null);
    refrescarR();
    setReporteActivo(nuevo);
  }

  function handleIniciarCaptura() {
    setModalAbierto(false);
    setModoCaptura(true);
  }

  function handleClickMapa(lat, lng) {
    if (!modoCaptura) return;
    setCoordCapturada({ lat, lng });
    setModoCaptura(false);
    setModalAbierto(true);
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const hayDetalle = !!reporteActivo;

  return (
    <div className="bg-app flex flex-col h-full overflow-hidden">

      <BarraSuperior
        brigadas={brigadas}
        brigadaActual={brigadaId}
        onCambiarBrigada={setBrigada}
        onNuevoReporte={handleNuevoReporte}
        reportes={reportes}
      />

      <main className="flex flex-1 overflow-hidden min-h-0 gap-2 p-2">

        {/* Columna izquierda: mapa + alertas */}
        <div className={`flex flex-col gap-2 min-w-0 transition-all duration-300
                         ${hayDetalle ? "w-full md:w-[50%]" : "w-full md:w-[60%]"}`}>
          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
            <MapaReportes
              reportes={reportes}
              reporteActivo={reporteActivo}
              onSeleccionar={handleSeleccionar}
              onClickMapa={handleClickMapa}
              modoSeleccionCoord={modoCaptura}
            />
          </div>
          <div className="shrink-0">
            <PanelAlertas
              alertas={alertas}
              cargando={cargandoA}
              error={errorA}
              onReintentar={refrescarA}
            />
          </div>
        </div>

        {/* Columna derecha desktop: tabla o detalle */}
        <div className={`hidden md:flex flex-col min-w-0
                         ${hayDetalle ? "md:w-[50%]" : "md:w-[40%]"}`}>
          {hayDetalle ? (
            <PanelDetalle
              reporte={reporteActivo}
              brigadas={brigadas}
              brigadaActual={brigadaId}
              alertas={alertas}
              onCerrar={() => setReporteActivo(null)}
              onActualizar={handleActualizar}
            />
          ) : (
            <TablaReportes
              reportes={reportes}
              cargando={cargandoR}
              error={errorR}
              reporteActivo={reporteActivo}
              onSeleccionar={handleSeleccionar}
              onReintentar={refrescarR}
            />
          )}
        </div>

      </main>

      {/* Tabla mobile */}
      {!hayDetalle && (
        <div className="md:hidden shrink-0 px-2 pb-2 flex flex-col" style={{ maxHeight: "40vh" }}>
          <TablaReportes
            reportes={reportes}
            cargando={cargandoR}
            error={errorR}
            reporteActivo={reporteActivo}
            onSeleccionar={handleSeleccionar}
            onReintentar={refrescarR}
          />
        </div>
      )}

      {/* Detalle mobile (overlay) */}
      {hayDetalle && (
        <div className="md:hidden fixed inset-0 z-40 bg-fondo/95 overflow-y-auto flex flex-col">
          <PanelDetalle
            reporte={reporteActivo}
            brigadas={brigadas}
            brigadaActual={brigadaId}
            alertas={alertas}
            onCerrar={() => setReporteActivo(null)}
            onActualizar={handleActualizar}
          />
        </div>
      )}

      {/* Modal nuevo reporte */}
      {modalAbierto && (
        <ModalNuevoReporte
          onCerrar={() => { setModalAbierto(false); setModoCaptura(false); }}
          onCreado={handleCreado}
          coordCapturada={coordCapturada}
          onIniciarCaptura={handleIniciarCaptura}
        />
      )}

      {/* Aviso modo captura (mobile) */}
      {modoCaptura && (
        <div className="fixed bottom-4 inset-x-4 z-50 md:hidden">
          <div className="glass-dark rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-menta font-semibold">
              Toca el mapa para colocar el punto
            </span>
            <button
              onClick={() => { setModoCaptura(false); setModalAbierto(true); }}
              className="text-xs text-secundario hover:text-primario ml-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
