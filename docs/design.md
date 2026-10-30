# GeoNexa — Diseño de arquitectura frontend

## Stack

React 19 + Vite 8 + Tailwind CSS 3. Sin librerías de estado global.
Interfaz en español. Mapa: Google Maps API (key en `VITE_GOOGLE_MAPS_KEY`).

---

## Estructura de carpetas

```
frontend/src/
├── api.js                  única puerta a la API (mock o HTTP)
├── App.jsx                 orquestador delgado — solo UI state + layout
├── index.css               tokens de diseño globales (glass, btn-menta, badges…)
│
├── hooks/
│   ├── useReportes.js      polling 5 s · cargando · error · refrescar()
│   ├── useBrigadas.js      carga única · refrescar()
│   ├── useAlertas.js       polling 5 s · cargando · error · refrescar()
│   └── useBrigadaActual.js localStorage "geonx:brigadaId" · setBrigada()
│
├── constants/
│   └── niveles.js          NIVEL_HEX · NIVEL_META · ESTADO_META · NIVELES_CORRECCION
│                           nivelEfectivo() · metaDeReporte() · metaDeEstado()
│
├── utils/
│   └── distancia.js        haversineKm() · nMasCercanos()
│
├── components/
│   ├── BarraSuperior.jsx   header glass · selector brigada · contadores · botón nuevo
│   ├── MapaReportes.jsx    Google Maps oscuro · círculos por nivel · modo captura coord
│   ├── TablaReportes.jsx   lista rojo→amarillo→verde · badges con glow
│   ├── PanelDetalle.jsx    detalle completo · acciones · validación IA · SENAMHI cercana
│   ├── PanelAlertas.jsx    estaciones caudal/umbrales · avisos vigentes
│   ├── ModalNuevoReporte.jsx formulario contrato · captura coord en mapa
│   └── EstadoCarga.jsx     Cargando · Error · Vacio (reutilizables)
│
└── data/
    └── mock.js             8 reportes · 5 brigadas · 2 estaciones SENAMHI
```

---

## Principios de arquitectura

### App.jsx delgado
App solo tiene:
- Llamadas a los 4 hooks de datos
- `useState` de UI: `reporteActivo`, `modalAbierto`, `modoCaptura`, `coordCapturada`
- Composición del layout (columnas, mobile overlay)
- Handlers que conectan UI con hooks

**Nunca en App:** lógica de fetch, haversine, colores de nivel, localStorage raw.

### Hooks de datos
Cada hook encapsula un endpoint + su ciclo de vida:

| Hook | Endpoint | Polling |
|---|---|---|
| `useReportes` | `GET /reportes` | ✓ 5 s |
| `useAlertas` | `GET /alertas` | ✓ 5 s |
| `useBrigadas` | `GET /brigadas` | ✗ (manual) |
| `useBrigadaActual` | localStorage | — |

`useReportes` expone `onActualizarActivo(fn)` para que App mantenga el reporte
activo sincronizado con los datos frescos del polling sin prop drilling extra.

### Fuente única de verdad para niveles
`constants/niveles.js` es el único lugar donde se definen:
- Colores hex para Google Maps Circles
- Clases Tailwind para badges (con glow)
- Labels ("Alto", "Medio", "Bajo")
- Opciones de corrección de nivel

**Regla:** ningún componente define colores o textos de nivel inline.

### Distancia
`utils/distancia.js` expone `haversineKm` y `nMasCercanos`.
Usado en `PanelDetalle` para brigadas cercanas y estación SENAMHI más cercana.

---

## Sistema de diseño

Basado en `index.css` y `tailwind.config.js`:

| Token | Valor | Uso |
|---|---|---|
| `bg-fondo` / `.bg-app` | `#0B1215` + gradiente radial menta | Fondo global |
| `.glass` | `rgba(17,26,31,0.75)` + blur(16px) | Paneles principales |
| `.glass-dark` | `rgba(11,18,21,0.85)` + blur(20px) | Header, overlays |
| `border-borde` | `#1F2A30` | Bordes de paneles y filas |
| `text-primario` | `#E5E7EB` | Texto principal |
| `text-secundario` | `#9CA3AF` | Texto secundario |
| `text-menta` | `#2DD4BF` | Acento (botones, nav, IA) |
| `.btn-menta` | `#2DD4BF` + glow | Botón de acción primario |
| `.btn-verde` | `#22C55E` + glow | Botón "Marcar asegurado" |
| `.badge-rojo/amarillo/verde/gris` | Bg translúcido + glow + borde | Badges de nivel |
| `.pulse-rojo` | Animación ring | Indicador rojos activos |

**Regla del steering:** el acento menta nunca va en el mapa, solo en botones/nav.

---

## Contrato de API

Ver `docs/contrato-api.md`. Siempre respetado:
- `nivel`: `"clasificando" | "rojo" | "amarillo" | "verde"`
- `estado`: `"pendiente" | "en atención" | "asegurado"`
- PATCH retorna 409 si otro ya tomó el punto, 403 si no es la brigada asignada
- `nivelValidado` y `validadoPor` son extensiones del mock (Bedrock los añadirá en backend)

---

## Variables de entorno

```
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=true
VITE_GOOGLE_MAPS_KEY=          # vacía → aviso en lugar del mapa
```
