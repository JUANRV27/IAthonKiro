# AMAPA — Sistema de Alertas y Gestión de Brigadieres
### Hackathon Kiro 2026 | FEN Piura

Sistema web para la gestión de alertas climáticas basado en datos del SENAMHI para el Fenómeno El Niño (FEN) en Piura. Permite que brigadieres se auto-asignen a alertas, con lógica backend que calcula rutas y recomienda al más cercano.

---

## 🚀 Cómo ejecutar

### Backend
```bash
cd backend
npm install
node src/db/seed.js    # carga datos iniciales
npm start              # inicia en puerto 3001
```

**Si el puerto 3001 está ocupado:**
```powershell
# Windows PowerShell
.\kill-port.ps1
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # inicia en puerto 5173
```

Abrir: **http://localhost:5173**

---

## 🏗️ Arquitectura

```
backend/
  src/
    db/
      database.js       # Store JSON en memoria + persistencia
      seed.js           # Datos iniciales (10 zonas, 12 brigadieres, 4 alertas)
    services/
      alertService.js   # Lógica de negocio principal
      geoService.js     # Haversine + generación de rutas
    routes/
      zones.js          # GET /api/zones
      alerts.js         # GET/POST /api/alerts, PATCH /resolve, POST /auto-assign
      brigadiers.js     # GET /api/brigadiers, POST /assign, PATCH /location
    index.js            # Express + Socket.IO

frontend/
  src/
    services/api.js     # Cliente HTTP
    hooks/useSocket.js  # WebSocket en tiempo real
    components/
      MapView.jsx       # Mapa Leaflet interactivo de Piura
      AlertCard.jsx     # Tarjeta de alerta con acciones
      CreateAlertModal.jsx # Modal para nueva alerta (SENAMHI)
      RiskBadge.jsx     # Badge de nivel de riesgo
    App.jsx             # Aplicación principal
```

---

## 🎯 Funcionalidades principales

| Funcionalidad | Descripción |
|---|---|
| **Alertas SENAMHI** | Generación de alertas por zona con nivel rojo/naranja/amarillo/verde |
| **Auto-asignación** | Brigadier se asigna a sí mismo a una alerta activa |
| **Asignación automática** | El sistema asigna al brigadier más cercano (Haversine) |
| **Sugerencia de ruta óptima** | Si hay alguien 20%+ más cercano, se notifica al brigadier |
| **Bloqueo por cupo** | Al alcanzar `max_brigadiers`, la alerta se bloquea automáticamente |
| **Resolución** | Al resolver, libera brigadieres y notifica por WebSocket |
| **Tiempo real** | Socket.IO para actualizar mapa y lista sin recargar |

---

## 📡 API REST

```
GET  /api/health
GET  /api/zones
GET  /api/alerts?active=true
GET  /api/alerts/:id
POST /api/alerts                     { zone_id, risk_level, title, description, senamhi_data }
PATCH /api/alerts/:id/resolve
POST  /api/alerts/:id/auto-assign

GET  /api/brigadiers?available=true
GET  /api/brigadiers/:id
POST /api/brigadiers/:id/assign/:alertId
PATCH /api/brigadiers/:id/location   { lat, lng }
```

## 📡 WebSocket Events

| Evento | Descripción |
|---|---|
| `alert:created` | Nueva alerta creada |
| `alert:resolved` | Alerta resuelta, brigadieres liberados |
| `alert:full` | Alerta bloqueada por cupo completo |
| `assignment:created` | Nuevo brigadier asignado |
| `brigadier:location_updated` | Actualización de posición GPS |

---

## 🗺️ Zonas de riesgo (Piura)

Basadas en datos CENEPRED/SENAMHI FEN 2026:
- 🔴 **Bajo Piura, Catacaos** — riesgo ROJO (inundación crítica)
- 🟠 **La Unión, Sechura, Chulucanas, Morropón** — riesgo NARANJA
- 🟡 **Tambogrande, Sullana, Piura Centro** — riesgo AMARILLO
- 🟢 **Paita** — riesgo VERDE (monitoreo preventivo)

---

## 💡 Lógica de asignación

### Flujo de auto-asignación:
1. Brigadier selecciona su perfil en el dropdown
2. Hace clic en "🙋 Auto-asignarme" en una alerta activa
3. Backend:
   - Verifica estado de la alerta (no `full`, no `resolved`)
   - Verifica que el brigadier esté `available`
   - Calcula distancia con **Haversine** entre brigadier y zona
   - Genera ruta GeoJSON (simplificada para MVP)
   - Compara con todos los disponibles → si hay alguien 20%+ más cercano, lo notifica
   - Registra asignación, marca brigadier como `assigned`
   - Si `assigned_count >= max_brigadiers` → bloquea alerta (`status = 'full'`)
4. Frontend recibe evento por Socket.IO y actualiza mapa + tarjetas

### Resolución de alerta:
1. Admin/brigadier hace clic en "✔ Resolver"
2. Backend:
   - Cambia `status` a `resolved`
   - Completa todas las asignaciones abiertas (`completed_at = now`)
   - Libera brigadieres asignados → `status = 'available'`
   - Emite evento `alert:resolved` por WebSocket
3. Frontend actualiza lista y mapa en tiempo real

---

## 🧪 Probar API con cURL / PowerShell

```powershell
# Health check
Invoke-RestMethod http://localhost:3001/api/health

# Ver brigadieres disponibles
Invoke-RestMethod http://localhost:3001/api/brigadiers?available=true

# Asignar brigadier 3 a alerta 1
Invoke-RestMethod -Method POST http://localhost:3001/api/brigadiers/3/assign/1

# Asignar automáticamente al más cercano
Invoke-RestMethod -Method POST http://localhost:3001/api/alerts/1/auto-assign

# Resolver alerta 1
Invoke-RestMethod -Method PATCH http://localhost:3001/api/alerts/1/resolve
```

---

## 🛠️ Stack técnico

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** React, Vite, React-Leaflet
- **Base de datos:** JSON store en memoria con persistencia
- **Mapa:** OpenStreetMap (Leaflet)
- **Cálculo de distancia:** Fórmula de Haversine

---

## 📦 Dependencias

### Backend
- `express` — servidor HTTP
- `socket.io` — WebSocket para tiempo real
- `cors` — CORS habilitado para el frontend

### Frontend
- `react` + `react-dom` — UI
- `vite` — bundler y dev server
- `leaflet` + `react-leaflet` — mapa interactivo
- `socket.io-client` — WebSocket cliente

---

## 📝 Datos de ejemplo (seed)

El archivo `backend/src/db/seed.js` carga:
- **10 zonas** de riesgo en Piura con coordenadas reales
- **12 brigadieres** distribuidos geográficamente
- **4 alertas iniciales** con datos simulados del SENAMHI (precipitación, nivel de río, pronóstico)

---

## 🎨 Capturas conceptuales

**Interfaz:**
- **Panel lateral izquierdo:** Lista de alertas activas con tarjetas expandibles (datos SENAMHI, barra de progreso de brigadieres)
- **Mapa central:** Zonas de riesgo coloreadas (rojo/naranja/amarillo/verde), posición de brigadieres en tiempo real
- **Header:** Estadísticas rápidas (cuántas alertas rojas, brigadieres disponibles/asignados), botón "Nueva Alerta"
- **Tiempo real:** Toast de notificaciones cuando ocurren eventos (nueva alerta, brigadier asignado, alerta resuelta)

---

## 🔐 Seguridad y límites del MVP

Este es un **MVP para hackathon**. En producción se necesitaría:
- Autenticación JWT para brigadieres y admin
- Roles y permisos (solo brigadier puede asignarse, solo admin puede resolver)
- Rate limiting en los endpoints
- Validación más estricta de inputs
- Base de datos real (PostgreSQL/PostGIS para geoespacial)
- Integración con API real de SENAMHI
- Integración con servicio de rutas (OSRM, GraphHopper)
- Tests unitarios y e2e

---

## 📄 Licencia

MIT — Hackathon Kiro 2026
