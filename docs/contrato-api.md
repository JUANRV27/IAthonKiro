GET /reportes → lista ordenada rojo → amarillo → verde. Cada reporte:

{ id, tipoPeligro, distrito, lat, lng, personasEnRiesgo, viviendas, viaAcceso,
  lugaresCriticos, necesidad, descripcion, fotoUrl,
  nivel ("clasificando"|"rojo"|"amarillo"|"verde"), porque, accionSugerida,
  estado ("pendiente"|"en atención"|"asegurado"), brigadaId, brigadaNombre, fecha }

POST /reportes → crea con nivel "clasificando"; responde 201 con el objeto.

PATCH /reportes/{id} { estado, brigadaId } → 200; 409 si otra brigada ya lo tomó;
  403 si quien marca "asegurado" no es la brigada asignada.

GET /brigadas → [ { id, nombre, lat, lng, disponible } ]

GET /alertas → { estaciones: [ { estacion, caudal, amarilla, naranja, roja,
  nivel, hora } ], avisos: [ { nivel, zona, texto, vigencia } ] }
