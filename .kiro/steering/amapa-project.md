---
inclusion: auto
name: amapa-project
description: Información completa del proyecto AMAPA - Sistema de Alertas FEN Piura, arquitectura, convenciones y estilos
---

# AMAPA — Sistema de Alertas y Gestión de Brigadieres FEN Piura

## Contexto del Proyecto

AMAPA es un sistema web para la gestión de alertas climáticas basado en datos del SENAMHI para el Fenómeno El Niño (FEN) en la región de Piura, Perú. El sistema permite que brigadieres de defensa civil se auto-asignen a alertas activas, con un backend inteligente que:

1. Calcula la distancia usando la fórmula de Haversine
2. Genera rutas GeoJSON simplificadas
3. Sugiere al brigadier más cercano cuando hay diferencias significativas (>20%)
4. Bloquea automáticamente las alertas cuando se alcanza el cupo máximo
5. Notifica en tiempo real usando WebSockets

**Stack tecnológico:**
- Backend: Node.js, Express, Socket.IO
- Frontend: React, Vite, React-Leaflet
- Base de datos: JSON store en memoria con persistencia (sin deps nativas)
- Mapa: OpenStreetMap via Leaflet

## Arquitectura del Sistema

```
IAthonKiro/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js      # Store JSON con API tipo ORM
│   │   │   └── seed.js          # Datos iniciales (10 zonas, 12 brigadieres, 4 alertas)
│   │   ├── services/
│   │   │   ├── alertService.js  # LÓGICA DE NEGOCIO PRINCIPAL
│   │   │   └── geoService.js    # Cálculos geoespaciales (Haversine, rutas)
│   │   ├── routes/
│   │   │   ├── zones.js         # Endpoints de zonas
│   │   │   ├── alerts.js        # Endpoints de alertas
│   │   │   └── brigadiers.js    # Endpoints de brigadieres
│   │   └── index.js             # Servidor Express + Socket.IO
│   ├── data/
│   │   └── db.json              # Base de datos persistida (gitignored)
│   ├── package.json
│   └── kill-port.ps1            # Utility para liberar puerto 3001
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js           # Cliente HTTP REST
│   │   ├── hooks/
│   │   │   └── useSocket.js     # Hook WebSocket
│   │   ├── components/
│   │   │   ├── MapView.jsx      # Mapa Leaflet de Piura
│   │   │   ├── AlertCard.jsx    # Tarjeta de alerta con acciones
│   │   │   ├── CreateAlertModal.jsx # Modal nueva alerta
│   │   │   └── RiskBadge.jsx    # Badge de nivel de riesgo
│   │   ├── App.jsx              # Componente principal
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Estilos globales
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

## Modelos de Datos

### Zone (Zona de riesgo)
```javascript
{
  id: number,                    // Autoincremental
  name: string,                  // "Bajo Piura", "Catacaos"
  district: string,              // "Piura", "Catacaos"
  lat: number,                   // Latitud decimal
  lng: number,                   // Longitud decimal
  risk_level: enum,              // "red" | "orange" | "yellow" | "green"
  max_brigadiers: number,        // Cupo máximo de brigadieres
  description: string | null,
  created_at: ISO8601
}
```

### Alert (Alerta climática)
```javascript
{
  id: number,
  zone_id: number,               // FK → zones.id
  status: enum,                  // "active" | "full" | "resolved"
  risk_level: enum,              // "red" | "orange" | "yellow" | "green"
  title: string,                 // "Alerta Roja - Inundación Bajo Piura"
  description: string | null,
  senamhi_data: string,          // JSON serializado con datos meteorológicos
  assigned_count: number,        // Contador de brigadieres asignados
  created_at: ISO8601,
  resolved_at: ISO8601 | null,
  // Campos desnormalizados (joins precalculados)
  zone_name: string,
  district: string,
  zone_lat: number,
  zone_lng: number,
  max_brigadiers: number
}
```

**Datos SENAMHI típicos (dentro de `senamhi_data`):**
```json
{
  "precipitacion_mm": 112.5,
  "nivel_rio_m": 8.3,
  "umbral_critico_m": 7.5,
  "pronostico_24h": "lluvias intensas",
  "estacion": "La Esperanza",
  "fecha_reporte": "2026-10-30T06:00:00Z"
}
```

### Brigadier (Brigadista de defensa civil)
```javascript
{
  id: number,
  name: string,                  // "Brigada simulada 01" (dato simulado)
  phone: string | null,          // null en el seed (sin teléfonos reales)
  lat: number,                   // Posición GPS actual
  lng: number,
  status: enum,                  // "available" | "assigned" | "offline"
  created_at: ISO8601
}
```

### Assignment (Asignación brigadier ↔ alerta)
```javascript
{
  id: number,
  alert_id: number,              // FK → alerts.id
  brigadier_id: number,          // FK → brigadiers.id
  distance_km: number,           // Distancia calculada (Haversine)
  route_geojson: string,         // GeoJSON Feature con geometría LineString
  assigned_at: ISO8601,
  completed_at: ISO8601 | null   // Cuando se resuelve la alerta
}
```

## API REST - Endpoints

### Health Check
```
GET /api/health
→ { status: "ok", time: ISO8601, service: "AMAPA Backend" }
```

### Zonas
```
GET /api/zones
→ { success: true, data: Zone[] }

GET /api/zones/:id
→ { success: true, data: Zone }
```

### Alertas
```
GET /api/alerts?active=true
→ { success: true, data: Alert[] }

GET /api/alerts/:id
→ { success: true, data: { ...Alert, assignments: Assignment[] } }

POST /api/alerts
Body: { zone_id, risk_level, title, description?, senamhi_data? }
→ { success: true, data: Alert }

PATCH /api/alerts/:id/resolve
→ { success: true, data: Alert }

POST /api/alerts/:id/auto-assign
→ { success: true, data: { assignment, alert, nearest_suggestion? } }
```

### Brigadieres
```
GET /api/brigadiers?available=true
→ { success: true, data: Brigadier[] }

GET /api/brigadiers/:id
→ { success: true, data: Brigadier }

POST /api/brigadiers/:brigadierId/assign/:alertId
→ { success: true, data: { assignment, alert, nearest_suggestion? } }

PATCH /api/brigadiers/:id/location
Body: { lat, lng }
→ { success: true, data: Brigadier }
```

## WebSocket Events

**Eventos emitidos por el servidor:**
```javascript
socket.on('alert:created', (alert) => {
  // Nueva alerta creada
});

socket.on('alert:resolved', ({ alert, released_brigadiers }) => {
  // Alerta resuelta, brigadieres liberados
});

socket.on('alert:full', ({ alert }) => {
  // Alerta bloqueada por cupo completo
});

socket.on('assignment:created', ({ assignment, alert, brigadier }) => {
  // Nuevo brigadier asignado
});

socket.on('brigadier:location_updated', (brigadier) => {
  // Posición GPS actualizada
});
```

**Eventos recibidos del cliente:**
```javascript
socket.emit('brigadier:update_location', { brigadier_id, lat, lng });
```

## Lógica de Negocio Principal

### Auto-asignación (`selfAssign`)

Flujo cuando un brigadier se asigna a sí mismo:

1. **Validaciones:**
   - Alerta debe existir y estar en estado `active` (no `full`, no `resolved`)
   - Brigadier debe existir y estar `available` (no `assigned`, no `offline`)
   - No debe existir una asignación previa del mismo brigadier a la misma alerta

2. **Cálculo de distancia:**
   ```javascript
   const zone = { lat: alert.zone_lat, lng: alert.zone_lng };
   const distanceKm = haversineDistance(zone.lat, zone.lng, brigadier.lat, brigadier.lng);
   ```

3. **Generación de ruta:**
   ```javascript
   const route = generateRoute(brigadier.lat, brigadier.lng, zone.lat, zone.lng);
   // Retorna GeoJSON Feature con LineString
   ```

4. **Comparación con brigadieres disponibles:**
   - Busca todos los brigadieres con `status = 'available'`
   - Los ordena por distancia a la zona (Haversine)
   - Si el más cercano está >20% más cerca que el solicitante, genera `nearest_suggestion`

5. **Registro atómico:**
   - Inserta asignación en tabla `assignments`
   - Actualiza `brigadier.status = 'assigned'`
   - Incrementa `alert.assigned_count`
   - Si `assigned_count >= max_brigadiers` → `alert.status = 'full'`

6. **Notificaciones WebSocket:**
   - Emite `assignment:created`
   - Si la alerta se llenó, emite `alert:full`

### Asignación automática (`autoAssignNearest`)

El sistema asigna al brigadier más cercano automáticamente:

1. Obtiene todos los brigadieres `available`
2. Calcula distancia Haversine de cada uno a la zona
3. Selecciona el de menor distancia
4. Llama a `selfAssign` con ese brigadier

### Resolución de alerta (`resolveAlert`)

Cuando se marca una alerta como resuelta:

1. Cambia `alert.status = 'resolved'`
2. Marca `alert.resolved_at = now()`
3. Completa todas las asignaciones abiertas (`assignment.completed_at = now()`)
4. Libera todos los brigadieres asignados (`brigadier.status = 'available'`)
5. Emite `alert:resolved` con contador de brigadieres liberados

## Convenciones de Código

### Backend (Node.js CommonJS)

**Estructura de archivos:**
- Usar `module.exports` para exportar
- Usar `require()` para importar
- Mantener servicios agnósticos de Express (no reciben `req`/`res`)
- Los controladores en `routes/` son thin wrappers sobre servicios

**Nombres:**
- Funciones: `camelCase` (`createAlert`, `selfAssign`)
- Constantes: `SCREAMING_SNAKE_CASE` (`EARTH_RADIUS_KM`)
- Tablas/campos: `snake_case` (`zone_id`, `assigned_count`)

**Base de datos (database.js):**
```javascript
// API estilo ORM
db.insertAlert({ zone_id, risk_level, title, ... })
db.getAllAlerts()
db.getAlertById(id)
db.updateAlert(id, { status: 'resolved' })
db.insertAssignment({ alert_id, brigadier_id, ... })
db.getAssignmentsByAlert(alert_id)
```

**Persistencia:**
- Todo cambio llama a `save(_state)` — escritura síncrona inmediata
- El estado completo se guarda en `data/db.json` (gitignored)

### Frontend (React + JSX)

**Estructura de componentes:**
- Componentes en `PascalCase` (`AlertCard`, `MapView`)
- Hooks en `camelCase` con prefijo `use` (`useSocket`)
- Props en `camelCase` (`alertId`, `onRefresh`)

**Estilos:**
- Inline styles con objetos JavaScript
- Variables CSS en `:root` (ver `index.css`)
- No usar clases CSS (todo inline para MVP)
- Modo oscuro por defecto (`background: #0f172a`)

**Paleta de colores:**
```css
--bg-dark:    #0f172a  /* Fondo principal */
--bg-card:    #1e293b  /* Tarjetas */
--border:     #334155  /* Bordes */
--text-primary: #e2e8f0
--text-muted: #94a3b8

/* Niveles de riesgo */
--red:    #ef4444
--orange: #f97316
--yellow: #eab308
--green:  #22c55e
```

**Gestión de estado:**
- `useState` local para UI state
- `useEffect` para cargar datos en mount
- `useCallback` para funciones estables (evitar re-renders)
- WebSocket events actualizan estado vía `setToast` + `refresh()`

**Fetch pattern:**
```javascript
// En services/api.js
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, { ...options });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
```

## Estilos de UI/UX

### Diseño Visual

**Layout:**
- Header fijo arriba (stats + botón nueva alerta)
- Panel lateral izquierdo (360px): lista de alertas o brigadieres
- Contenido principal (flex): mapa de Leaflet a pantalla completa
- Leyenda del mapa: esquina inferior derecha

**Tipografía:**
- Font family: `'Segoe UI', system-ui, -apple-system, sans-serif`
- Header título: 18px bold
- Tarjetas: 13-14px normal
- Labels pequeños: 11px
- Colores de texto: `#e2e8f0` (primary), `#94a3b8` (muted)

**Componentes:**

**AlertCard:**
```
┌─────────────────────────────────────┐
│ 🔴 ROJO  ● Activa                  │
│ Alerta Roja - Inundación Bajo Piura│
│ 📍 Bajo Piura — Piura               │
│                                     │
│ Brigadieres asignados     1 / 5    │
│ ████░░░░░░░░ 20%                   │
│                                     │
│ [Expandir ▼]                       │
│                                     │
│ [🙋 Auto-asignarme] [✔ Resolver]  │
└─────────────────────────────────────┘
```

**MapView:**
- Círculos coloreados para zonas (radio 18-22px)
- Opacidad según estado: `active: 0.7`, `full: 0.5`, `resolved: 0.2`
- Brigadieres como círculos pequeños (radio 7px)
  - Verde: disponible
  - Naranja: asignado
  - Gris: offline
- Rutas como líneas punteadas azules

**Toasts de notificación:**
```
┌────────────────────────────────────┐
│  🚨 Nueva alerta: [título]         │
└────────────────────────────────────┘
```
- Posición: bottom center
- Background: `#1e40af`
- Duración: 4 segundos
- Animación: fade in

### Responsividad

**Breakpoints (para futuras versiones):**
- Desktop: >1024px (layout actual)
- Tablet: 768-1023px (panel colapsable)
- Mobile: <768px (panel como drawer, mapa a pantalla completa)

**Prioridad actual:** Desktop-first (MVP para hackathon)

## Zonas de Riesgo de Piura

**10 zonas precargadas en el seed:**

| Zona | Distrito | Risk Level | Max Brigadiers | Descripción |
|------|----------|------------|----------------|-------------|
| Bajo Piura | Piura | 🔴 red | 5 | Zona crítica de inundación - cauce del río Piura |
| Catacaos | Catacaos | 🔴 red | 4 | Zona baja susceptible a inundaciones FEN |
| La Unión | La Unión | 🟠 orange | 3 | Desbordamiento de quebradas |
| Sechura | Sechura | 🟠 orange | 3 | Inundaciones por laguna La Niña |
| Tambogrande | Tambogrande | 🟡 yellow | 3 | Deslizamientos y lluvias moderadas |
| Piura Centro | Piura | 🟡 yellow | 2 | Zona urbana con riesgo por lluvias |
| Chulucanas | Chulucanas | 🟠 orange | 3 | Quebradas activas |
| Paita | Paita | 🟢 green | 2 | Riesgo bajo, monitoreo preventivo |
| Sullana | Sullana | 🟡 yellow | 3 | Zonas bajas con riesgo moderado |
| Morropón | Morropón | 🟠 orange | 3 | Área serrana con riesgo de huaycos |

**Coordenadas reales de Piura:**
- Centro del mapa: `[-5.1945, -80.6328]` (ciudad de Piura)
- Zoom inicial: `10`

## Fórmula de Haversine

```javascript
function haversineDistance(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
```

Esta fórmula calcula la distancia ortodrómica (great-circle) entre dos puntos en una esfera.

## Testing y Debugging

**Endpoints de prueba (PowerShell):**
```powershell
# Health check
Invoke-RestMethod http://localhost:3001/api/health

# Alertas activas
Invoke-RestMethod "http://localhost:3001/api/alerts?active=true"

# Brigadieres disponibles
Invoke-RestMethod "http://localhost:3001/api/brigadiers?available=true"

# Auto-asignar brigadier 3 a alerta 1
Invoke-RestMethod -Method POST http://localhost:3001/api/brigadiers/3/assign/1

# Asignar al más cercano automáticamente
Invoke-RestMethod -Method POST http://localhost:3001/api/alerts/1/auto-assign

# Resolver alerta
Invoke-RestMethod -Method PATCH http://localhost:3001/api/alerts/1/resolve
```

**Logs del backend:**
- Socket.IO muestra conexiones/desconexiones
- Errores se capturan en routes y se devuelven como `{ success: false, message }`

**Estado de la DB:**
- Ver `backend/data/db.json` — se actualiza en cada operación
- Resetear datos: `node src/db/seed.js`

## Scripts Útiles

**Backend:**
```bash
npm start              # Iniciar servidor en puerto 3001
node src/db/seed.js   # Recargar datos iniciales
.\kill-port.ps1       # Liberar puerto 3001 (Windows)
```

**Frontend:**
```bash
npm run dev           # Dev server en puerto 5173
npm run build         # Build para producción (dist/)
npm run preview       # Preview del build
```

## Mejoras Futuras (Post-MVP)

**Backend:**
- [ ] Migrar a PostgreSQL + PostGIS para geo-queries eficientes
- [ ] Autenticación JWT (roles: brigadier, coordinador, admin)
- [ ] Rate limiting y validación Zod/Joi
- [ ] Integración real con API SENAMHI
- [ ] Servicio de rutas real (OSRM / GraphHopper)
- [ ] Notificaciones push a móvil
- [ ] Tests unitarios (Jest) + integración (Supertest)

**Frontend:**
- [ ] Modo mobile-first responsive
- [ ] PWA con service worker para offline
- [ ] Filtros avanzados de alertas
- [ ] Timeline de eventos de una alerta
- [ ] Panel de estadísticas con gráficos
- [ ] Actualización de posición GPS en tiempo real (geolocation API)
- [ ] Tests e2e (Playwright / Cypress)

## Referencias Externas

- **SENAMHI Perú:** https://www.senamhi.gob.pe/
- **CENEPRED (mapas de riesgo):** https://sigrid.cenepred.gob.pe/
- **React-Leaflet docs:** https://react-leaflet.js.org/
- **Socket.IO docs:** https://socket.io/docs/v4/
- **Haversine formula:** https://en.wikipedia.org/wiki/Haversine_formula

---

**Última actualización:** 2026-10-30  
**Versión del proyecto:** 1.0.0 (MVP Hackathon)
