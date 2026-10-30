/**
 * hooks/useReportes.js — datos de reportes con polling automático.
 *
 * Expone:
 *   reportes     — array ordenado rojo → amarillo → verde
 *   cargando     — true solo en la primera carga
 *   error        — string o null
 *   refrescar()  — fuerza una recarga inmediata (sin marcar cargando)
 *
 * Polling: cada POLL_MS ms en segundo plano (silencioso, no activa cargando).
 * Se detiene al desmontar.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getReportes } from "../api.js";

const POLL_MS = 5_000;

export function useReportes() {
  const [reportes,  setReportes]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const intervalRef = useRef(null);

  // Mantener referencia al setter de reporteActivo para actualizarlo en polling
  // sin depender de estado externo — se pasa como callback opcional.
  const onActualizarActivoRef = useRef(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const data = await getReportes();
      setReportes(data);
      onActualizarActivoRef.current?.(data);
    } catch (err) {
      if (!silencioso) setError(err.message ?? "Error al cargar reportes.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    cargar(false);
  }, [cargar]);

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(() => cargar(true), POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  /**
   * Registra un callback que se invocará con la lista actualizada en cada poll.
   * Permite que App.jsx mantenga el reporteActivo sincronizado sin lifting extra.
   *
   * @param {(data: Array) => void} fn
   */
  function onActualizarActivo(fn) {
    onActualizarActivoRef.current = fn;
  }

  return {
    reportes,
    cargando,
    error,
    refrescar: () => cargar(false),
    onActualizarActivo,
  };
}
