# GeoNexa — Tareas pendientes y estado del proyecto

> Estado al día de la última actualización de arquitectura.
> Formato: `[x]` completado · `[ ]` pendiente · `[~]` parcial o en revisión

---

## ✅ Completado

### Infraestructura base
- [x] Scaffolding Vite + React + Tailwind en `frontend/`
- [x] `tailwind.config.js` con tokens de color del steering
- [x] `index.css` con glassmorphism, glow buttons, badges, animaciones
- [x] `.env.example` con `VITE_API_URL`, `VITE_USE_MOCK`, `VITE_GOOGLE_MAPS_KEY`
- [x] `.env` en `.gitignore`

### Steering y documentación
- [x] `.kiro/steering/product.md` — producto GeoNexa
- [x] `.kiro/steering/tech.md` — stack, polling, reglas
- [x] `.kiro/steering/structure.md` — convención de carpetas
- [x] `.kiro/steering/estilo-componentes.md` — sistema de diseño (fileMatch)
- [x] `docs/contrato-api.md` — contrato completo
- [x] `docs/design.md` — arquitectura frontend
- [x] `docs/tasks.md` — este archivo

### Capa de datos
- [x] `src/data/mock.js` — 8 reportes (3🔴3🟡2🟢), 5 brigadas, 2 estaciones SENAMHI
- [x] `src/api.js` — `getReportes`, `crearReporte`, `tomarPunto`, `marcarAsegurado`, `getBrigadas`, `getAlertas`, `validarNivel`
- [x] Simulación de errores 409 y 403 en mock

### Arquitectura refactorizada
- [x] `src/hooks/useReportes.js` — polling 5 s, cargando, error, refrescar, onActualizarActivo
- [x] `src/hooks/useAlertas.js` — polling 5 s, cargando, error, refrescar
- [x] `src/hooks/useBrigadas.js` — carga única, refrescar
- [x] `src/hooks/useBrigadaActual.js` — localStorage "geonx:brigadaId", setBrigada, brigadaObj
- [x] `src/constants/niveles.js` — NIVEL_HEX, NIVEL_META, ESTADO_META, NIVELES_CORRECCION, helpers
- [x] `src/utils/distancia.js` — haversineKm, nMasCercanos

### Componentes
- [x] `BarraSuperior.jsx` — título GeoNexa, selector brigada, contadores rojos/asegurados, botón nuevo
- [x] `TablaReportes.jsx` — lista rojo→amarillo→verde, badges con glow, estado loading/error/vacío
- [x] `PanelAlertas.jsx` — estaciones con barra de umbrales, avisos vigentes
- [x] `PanelDetalle.jsx` — datos completos, análisis IA, validación humana, estación cercana, brigadas cercanas
- [x] `MapaReportes.jsx` — Google Maps oscuro, círculos por nivel/tamaño, modo captura coord, fallback sin clave
- [x] `ModalNuevoReporte.jsx` — todos los campos del contrato, captura en mapa, foto de ejemplo
- [x] `EstadoCarga.jsx` — Cargando, Error, Vacio reutilizables
- [x] `App.jsx` — orquestador delgado, solo UI state + composición

### Lógica de negocio verificada
- [x] "Tomar este punto" visible para cualquier brigada cuando estado === "pendiente"
- [x] "Marcar asegurado" solo cuando estado === "en atención" Y brigadaId === brigadaActual
- [x] Errores 409 ("Ya lo tomó Brigada X") y 403 ("Solo la brigada asignada") con mensajes claros
- [x] Validación humana del nivel IA: confirmar o corregir a rojo/amarillo/verde
- [x] Estación SENAMHI más cercana en el detalle (Haversine)
- [x] 3 brigadas disponibles más cercanas en el detalle
- [x] Reporte activo se actualiza automáticamente con cada poll

---

## 🔲 Pendiente — Backend

- [ ] Lambdas en `backend/`: POST /reportes → invoca Bedrock para clasificación EDAN
- [ ] Lambda PATCH /reportes/{id} → lógica de bloqueo (409/403) en DynamoDB
- [ ] Integración SENAMHI: GET /alertas desde API SENAMHI o ingesta manual
- [ ] SQS: cola de clasificación asíncrona (reporte entra como "clasificando", Bedrock responde)
- [ ] DynamoDB: tablas `reportes`, `brigadas`
- [ ] API Gateway: rutas, CORS, throttling

---

## 🔲 Pendiente — Frontend (siguiente iteración)

- [ ] **Filtros en TablaReportes**: por nivel, por estado, por distrito
- [ ] **Búsqueda de distrito** en la barra superior o la tabla
- [ ] **Indicador de polling** (punto parpadeante "en vivo" en la barra)
- [ ] **Toast de notificación** al crear reporte o tomar punto exitosamente
- [ ] **Modo solo lectura** cuando no hay brigada seleccionada (deshabilitar acciones, no ocultarlas)
- [ ] **Foto real**: input `<file>` + upload a S3 presigned URL (fuera de alcance v1)
- [ ] **Panel de estadísticas** en la barra: total por nivel (sparklines)
- [ ] **Accesibilidad**: revisar contraste en badges amarillo sobre fondo oscuro (WCAG AA)
- [ ] **PWA**: service worker para uso offline básico en campo

---

## 🔲 Fuera de alcance (v1)

- Login / autenticación real
- Notificaciones push
- Subida real de fotos al almacenamiento
- Histórico de reportes cerrados
