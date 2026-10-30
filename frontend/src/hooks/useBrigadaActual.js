/**
 * hooks/useBrigadaActual.js — brigada seleccionada con persistencia en localStorage.
 *
 * Expone:
 *   brigadaId      — string | null
 *   setBrigada(id) — persiste en localStorage y actualiza el estado
 *   brigadaObj     — objeto { id, nombre, lat, lng, disponible } o null
 *
 * Clave de localStorage: "geonx:brigadaId"
 */

import { useState } from "react";

const LS_KEY = "geonx:brigadaId";

function leerLS() {
  try { return localStorage.getItem(LS_KEY) || null; }
  catch { return null; }
}

function escribirLS(id) {
  try {
    if (id) localStorage.setItem(LS_KEY, id);
    else    localStorage.removeItem(LS_KEY);
  } catch { /* localStorage no disponible (modo privado estricto) */ }
}

/**
 * @param {Array<{id:string, nombre:string, lat:number, lng:number, disponible:boolean}>} brigadas
 */
export function useBrigadaActual(brigadas = []) {
  const [brigadaId, setBrigadaId] = useState(leerLS);

  function setBrigada(id) {
    setBrigadaId(id ?? null);
    escribirLS(id ?? null);
  }

  const brigadaObj = brigadas.find((b) => b.id === brigadaId) ?? null;

  return { brigadaId, setBrigada, brigadaObj };
}
