# Tareas — Reporte de puntos críticos priorizado con IA

Las tareas están en orden. Cada una es pequeña y tiene una comprobación concreta. Las tareas 1 a 6 entregan la historia de usuario de punta a punta. Las demás la completan y la pulen.

- [ ] 1. Crear el contrato y el almacén de reportes
  - `backend/src/services/reportesStore.js`: `put`, `get`, `list` y `updateEstado` sobre `ItemsTable`, con `id = "reporte#<uuid>"` y `kind = "reporte"`.
  - **Comprobar:** un test con un cliente DynamoDB falso verifica el prefijo y el `kind`, y que `GET /items` sigue sin mostrar reportes.
  - _Requisitos: CA 1, CA 6_

- [ ] 2. Crear `POST /reportes` con validación
  - Validar los enumerados, `lat`/`lng` dentro de Piura y `descripcion` de 500 caracteres como máximo. Responder 201 con `nivel:"clasificando"` y `estado:"pendiente"`, o 400 en JSON.
  - **Comprobar:** `npm test` cubre el caso 201 y al menos 6 casos de 400.
  - _Requisitos: CA 1, CA 2_

- [ ] 3. Escribir `reglasEdan()` y el clasificador con Bedrock
  - Una función pura de reglas y `clasificar(reporte)` con Converse, salida JSON validada, reintentos ante throttling y respaldo con las reglas.
  - **Comprobar:** tests con Bedrock simulado: JSON válido → `fuente:"bedrock"`; JSON inválido, timeout o throttling persistente → `fuente:"reglas"`. Además, un caso por criterio rojo, amarillo y verde.
  - _Requisitos: CA 4, CA 5_

- [ ] 4. Hacer la clasificación asíncrona con SQS
  - En `template.yaml`, añadir `ClasificarQueue`, la DLQ, el evento SQS, `QUEUE_URL` y `sqs:SendMessage`. En `lambda.js`, despachar los eventos SQS.
  - **Comprobar:** `sam validate --lint`. Un test con una cola falsa verifica que el POST encola el id y que el handler SQS actualiza nivel, porqué y acción.
  - _Requisitos: CA 1, CA 4_

- [ ] 5. Crear `GET /reportes` ordenado y la pantalla con mapa y tabla
  - API: orden rojo → amarillo → verde → clasificando y, dentro de cada nivel, del más reciente al más antiguo. Frontend: `MapView` con círculos por nivel (gris si está clasificando), `ReportesTable` y consulta cada 5 s.
  - **Comprobar:** un test del orden. En el navegador, un punto nuevo aparece en gris y cambia de color sin recargar.
  - _Requisitos: CA 3, CA 6_

- [ ] 6. Crear el formulario "Nuevo reporte" y desplegar la historia completa
  - `NuevoReporteModal.jsx` con los campos EDAN, clic en el mapa para fijar lat/lng y el botón "Usar foto de ejemplo". Luego, `sam build` y `sam deploy` con `TeamId=T067`.
  - **Comprobar en AWS:** POST con un reporte simulado (vía bloqueada, colegio, 40 personas) → 201, y en menos de 12 s `GET /reportes` lo muestra en `rojo` con porqué y acción.
  - _Requisitos: CA 1–6_

- [ ] 7. Crear `PATCH /reportes/{id}` y los botones de estado
  - 200, 400 o 404. Botones "En atención" y "Asegurado". Los asegurados se dibujan con borde punteado y aparece el contador de rojos pendientes y asegurados.
  - **Comprobar:** tests del PATCH. En el navegador, marcar "Asegurado" cambia la fila y el círculo.
  - _Requisitos: CA 7_

- [ ] 8. Sembrar los datos de demo y los estados de la UI
  - 8 reportes simulados (3 rojos, 3 amarillos y 2 verdes, dos de ellos asegurados) en Castilla, Piura centro, Veintiséis de Octubre, Catacaos, Sullana, Chulucanas, Tambogrande y Sechura. Estados de cargando, vacío y error.
  - **Comprobar:** con una tabla vacía, el seed carga 8 reportes. Sin API, la pantalla muestra el error.
  - _Requisitos: CA 8_

- [ ] 9. Verificar la regresión de las insignias y registrar el frontend
  - `curl` a `/health`, `/items` y `/jobs`. En el portal, campo "Funcionalidad GenAI": "La IA (Bedrock) clasifica cada punto crítico en rojo, amarillo o verde con criterios EDAN, explica el porqué y sugiere la acción".
  - **Comprobar:** las tres respuestas coinciden con su contrato y el texto tiene menos de 240 caracteres.
