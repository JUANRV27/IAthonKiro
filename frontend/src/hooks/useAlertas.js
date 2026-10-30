/**
 * hooks/useAlertas.js — alertas SENAMHI con polling automático.
 *
 * Expone:
 *   alertas      — objeto { estaciones, avisos } o null
 *   cargando     — true solo en la primera carga
 *   error        — string o null
 *   refrescar()  — fuerza recarga
 *
 * Comparte el mismo POLL_MS que useReportes para sincronizarse.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getAlertas } from "../api.js";

const POLL_MS = 5_000;

export function useAlertas() {
  const [alertas,  setAlertas]  = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const intervalRef = useRef(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const data = await getAlertas();
      setAlertas(data);
    } catch (err) {
      if (!silencioso) setError(err.message ?? "Error al cargar alertas.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(false); }, [cargar]);

  useEffect(() => {
    intervalRef.current = setInterval(() => cargar(true), POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  return { alertas, cargando, error, refrescar: () => cargar(false) };
}
