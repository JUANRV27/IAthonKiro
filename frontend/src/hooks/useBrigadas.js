/**
 * hooks/useBrigadas.js — lista de brigadas (carga única, sin polling).
 *
 * Las brigadas no cambian con frecuencia. Se recargan solo al llamar refrescar().
 *
 * Expone:
 *   brigadas     — array de { id, nombre, lat, lng, disponible }
 *   cargando     — boolean
 *   refrescar()  — recarga manual (ej: tras tomarPunto / marcarAsegurado)
 */

import { useCallback, useEffect, useState } from "react";
import { getBrigadas } from "../api.js";

export function useBrigadas() {
  const [brigadas,  setBrigadas]  = useState([]);
  const [cargando,  setCargando]  = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getBrigadas();
      setBrigadas(data);
    } catch { /* silencioso — la app funciona sin brigadas */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { brigadas, cargando, refrescar: cargar };
}
