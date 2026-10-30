---
inclusion: always
---

# AMAPA — Convenciones del proyecto (equipo T067, Kiro IAthon)

## Producto
Alertas climáticas del FEN en Piura y asignación de brigadistas al más cercano (Haversine). Se despliega en AWS con SAM: stack `amapa-iathon`, región `us-east-1`, TeamId `T067`. La spec vigente está en `.kiro/specs/amapa-serverless/`.

## Stack
- **Backend:** Node.js 22 (CommonJS), Express 4 y `serverless-http` en Lambda. Socket.IO solo en local (`npm start`).
- **Frontend:** React 18 + Vite 5 + React-Leaflet, servido por la Lambda en `GET /app` (compilado con `--base=/app/`).
- **AWS** (todo declarado en `template.yaml`): HTTP API, una Lambda (`AmapaFunction`), DynamoDB `ItemsTable` (clave `id`) y CloudWatch Logs. El build lo hace el `Makefile` (`build-AmapaFunction`).

## Nombres
- Funciones en `camelCase`, constantes en `SCREAMING_SNAKE_CASE`, campos de datos del dominio en `snake_case`.
- Los contratos de las insignias usan exactamente estos campos: `status`/`team`, `id`/`value` y `jobId`/`status`/`output`. No se renombran.
- En DynamoDB, los trabajos usan `id = "job#<jobId>"` y `kind = "job"`; los ítems no llevan `kind`.
- Las dependencias se inyectan en `createApp({ teamId, staticDir, itemsStore, jobsStore, now })`. Las rutas no crean clientes AWS.

## Cómo probar
- **Local:** `cd backend && npm test` (`node:test` con tablas falsas y reloj inyectado). Todos los tests deben pasar antes de desplegar.
- **Build y despliegue:**
  `sam build && sam deploy --stack-name amapa-iathon --region us-east-1 --s3-bucket amapa-sam-artifacts-808474789727-us-east-1 --s3-prefix amapa-iathon --capabilities CAPABILITY_IAM --parameter-overrides TeamId=T067 --no-confirm-changeset --no-fail-on-empty-changeset`
- **Humo en AWS:** `curl -s $ApiUrl/health` debe devolver `{"status":"ok","team":"T067"}`. `/app` debe responder 200 `text/html` (con GET). Para `/items` y `/jobs`, usar un nonce aleatorio.

## Qué no hacer
- No usar `--resolve-s3`: la cuenta deniega `s3:PutBucketPublicAccessBlock`.
- No borrar el stack ni la tabla `ItemsTable`.
- No poner el TeamId en el código. Viene de `TeamId` → `TEAM_ID`.
- No usar datos personales reales (nombres, correos, teléfonos). El seed y los tests usan solo datos simulados.
- No conectar sistemas externos ni añadir servicios que no estén declarados en `template.yaml`.
- No dar a la Lambda permisos más amplios que `PutItem`/`GetItem`/`Scan`/`UpdateItem` sobre `ItemsTable`.
- No añadir autenticación a `/health`, `/items` ni `/jobs`: los verificadores necesitan que sean públicas.
- No devolver respuestas que no sean JSON en la API (404 y errores también van en JSON).
