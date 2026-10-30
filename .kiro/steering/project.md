---
inclusion: always
---

# AMAPA — Convenciones del proyecto (equipo T067, Kiro IAthon)

## Producto
Mapa en vivo de puntos críticos ante el FEN en Piura para **brigadas y autoridades (COE distrital, Defensa Civil)**. La brigada registra un reporte EDAN mínimo y la IA (Bedrock) lo clasifica en rojo, amarillo o verde, explica el porqué y sugiere una acción. SENAMHI es el cliente de los datos de verificación. Track: Solidaridad y ayuda humanitaria ante el FEN.
- Spec principal: `.kiro/specs/reportes-criticos/`. Despliegue e insignias: `.kiro/specs/amapa-serverless/`.
- Stack `amapa-iathon`, región `us-east-1`, TeamId `T067`.

## Stack
- **Backend:** Node.js 22 (CommonJS), Express 4 y `serverless-http` en una sola Lambda (`AmapaFunction`, en `backend/src/`). No hay Python ni `src/app.py`. Socket.IO solo en local.
- **Frontend:** React 18 + Vite 5 + React-Leaflet/OpenStreetMap en `frontend/src/`, servido por la Lambda en `GET /app`. No se usan Google Maps ni Amplify.
- **AWS** (solo lo declarado en `template.yaml`): HTTP API, Lambda, DynamoDB `ItemsTable`, Bedrock Converse (`MODEL_ID`, perfil `us.`), CloudWatch Logs y, cuando se implemente la tarea 4, SQS `ClasificarQueue` con su DLQ.

## Nombres y datos
- Funciones en `camelCase`, constantes en `SCREAMING_SNAKE_CASE`.
- El contrato `/reportes` usa camelCase en español, tal como se acordó con el frontend: `tipoPeligro`, `personasEnRiesgo`, `viaAcceso`, `lugaresCriticos`, `accionSugerida`, `porque`, `nivel`, `estado`, `fecha`.
  - Valores de `nivel`: `clasificando` | `rojo` | `amarillo` | `verde`.
  - Valores de `estado`: `pendiente` | `en atención` | `asegurado`.
- El modelo heredado de alertas y brigadistas mantiene `snake_case`.
- Los contratos de las insignias no se renombran: `status`/`team`, `id`/`value` y `jobId`/`status`/`output`.
- Claves en `ItemsTable`:
  - Ítems: `id` UUID, sin `kind`.
  - Trabajos: `id = "job#<id>"`, `kind = "job"`.
  - Reportes: `id = "reporte#<id>"`, `kind = "reporte"`.
- Las dependencias se inyectan en `createApp({...})`: almacenes, cliente Bedrock, cola y reloj. Las rutas no crean clientes AWS.

## IA (Bedrock)
- Usar siempre la API Converse con `maxTokens` explícito, prompt de sistema con el contexto del COE Piura y los datos del usuario delimitados con etiquetas y tratados como datos.
- Validar la salida del modelo antes de usarla.
- Ante `ThrottlingException`, reintentar con backoff. Si el modelo no responde, usar el respaldo determinista (`reglasEdan` / boletín de respaldo). En los demás errores síncronos, responder 502 en JSON.

## Cómo probar
- **Local:** `cd backend && npm test` (`node:test` con tablas, cola y Bedrock simulados). Todos los tests deben pasar antes de desplegar.
- **Despliegue:**
  `sam build && sam deploy --stack-name amapa-iathon --region us-east-1 --s3-bucket amapa-sam-artifacts-808474789727-us-east-1 --s3-prefix amapa-iathon --capabilities CAPABILITY_IAM --parameter-overrides TeamId=T067 --no-confirm-changeset --no-fail-on-empty-changeset`
- **Humo en AWS:** `/health` debe devolver `{"status":"ok","team":"T067"}`. `/app` debe responder 200 `text/html` (con GET). `/items` y `/jobs` se prueban con un nonce. Para `/reportes`, hacer POST y comprobar que el reporte tiene color antes de 12 s.

## Qué no hacer
- No usar `--resolve-s3`: la cuenta deniega `s3:PutBucketPublicAccessBlock`.
- No borrar el stack ni la tabla `ItemsTable`.
- No poner el TeamId en el código. Viene de `TeamId` → `TEAM_ID`.
- No usar datos personales reales (nombres, correos, teléfonos). El seed y los tests usan solo datos simulados y coordenadas aproximadas.
- No conectar sistemas externos (Google Maps, WhatsApp, PHISIS en vivo) ni añadir servicios fuera de `template.yaml`.
- No ampliar el IAM más allá de DynamoDB `PutItem`/`GetItem`/`Scan`/`UpdateItem` sobre `ItemsTable`, `bedrock:InvokeModel` sobre `MODEL_ID` y `sqs:SendMessage` sobre `ClasificarQueue`.
- No añadir autenticación a `/health`, `/items`, `/jobs`, `/reportes` ni `/app`: el evaluador entra sin login.
- No devolver respuestas que no sean JSON en la API (404 y errores también van en JSON).
