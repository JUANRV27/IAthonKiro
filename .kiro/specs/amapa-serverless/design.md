# Diseño — AMAPA serverless

## Resumen

Hay un solo stack SAM (`amapa-iathon`, us-east-1) con la arquitectura mínima que cumple los requisitos 1 a 6. Una HTTP API envía todas las rutas a una sola Lambda Node.js 22, que reutiliza la app Express del MVP mediante `serverless-http`. El frontend React compilado viaja dentro del paquete de la Lambda y se sirve en `/app`. Ítems y trabajos se guardan en una sola tabla DynamoDB.

```mermaid
flowchart LR
  U[Navegador / verificador IAthon] -->|HTTPS| G[API Gateway HTTP API<br/>throttling 20 rps / 50 burst]
  G -->|/health, /api/*, /items*, /jobs*, /app*| L[Lambda AmapaFunction<br/>nodejs22.x, 512 MB, 10 s]
  L -->|PutItem/GetItem/Scan/UpdateItem| D[(DynamoDB ItemsTable<br/>PK id: S, on-demand, SSE)]
  L -->|seed simulado| T[/tmp/amapa-data/db.json]
  L --> C[CloudWatch Logs 14 días]
```

## Recursos en `template.yaml`

| Recurso | Tipo | Notas |
|---|---|---|
| `AmapaHttpApi` | `AWS::Serverless::HttpApi` | Etapa `$default` (sin prefijo en la URL) y throttling por defecto |
| `AmapaFunction` | `AWS::Serverless::Function` | `BuildMethod: makefile`, handler `src/lambda.handler` |
| `ItemsTable` | `AWS::DynamoDB::Table` | `PAY_PER_REQUEST`, clave `id` (S), cifrado SSE |
| `AmapaFunctionLogGroup` | `AWS::Logs::LogGroup` | Retención de 14 días |

- **Parámetro:** `TeamId` (patrón `^[A-Za-z0-9_-]{1,32}$`), que llega a la Lambda como `TEAM_ID`.
- **Outputs:** `ApiUrl`, `WebUrl` (`ApiUrl` + `/app`) e `ItemsTableName`.
- **Rutas declaradas:**
  - `GET /health`, `ANY /api/{proxy+}`
  - `GET /app`, `GET /app/{proxy+}`
  - `POST /items`, `GET /items`, `GET /items/{id}`
  - `POST /jobs`, `GET /jobs/{jobId}`

## Build (`Makefile`, objetivo `build-AmapaFunction`)

1. `frontend`: se ejecuta `npm ci` y `vite build --base=/app/`, con salida en `$(ARTIFACTS_DIR)/public`.
2. Se copia `backend/src` a `$(ARTIFACTS_DIR)/src` y se ejecuta `npm ci --omit=dev`.

## Componentes del backend

- `src/app.js`: `createApp({ teamId, staticDir, itemsStore, jobsStore, now })`. Las dependencias se inyectan para que los tests usen tablas falsas y un reloj controlable. Al final van un 404 y un manejador de errores, ambos en JSON.
- `src/lambda.js`: siembra los datos simulados si `/tmp` está vacío, crea los almacenes DynamoDB a partir de `TABLE_NAME` y exporta `handler`.
- `src/index.js`: servidor local con Socket.IO, que se mantiene para `npm start`.
- `src/routes/items.js` y `src/routes/jobs.js`: validan la entrada (texto de 1 a 1024 caracteres) y aceptan JSON aunque falte el `Content-Type`.
- `src/services/itemsStore.js`:
  - Ítems: `id = uuid`, sin atributo `kind`. `list()` usa `Scan` con `FilterExpression attribute_not_exists(kind)` y sigue `LastEvaluatedKey` hasta reunir 100 ítems.
  - Trabajos: `id = "job#<jobId>"`, `kind = "job"`, con `readyAt = createdAt + 2000 ms`. `complete()` usa `UpdateItem` con la condición `status = queued`, así que solo la primera lectura escribe el resultado.

## Decisión: resolver el trabajo al leerlo

Se compararon tres opciones:

| Opción | Pros | Contras |
|---|---|---|
| Resolver al leer (elegida) | Sin recursos extra, determinista, termina en unos 2 s | No es una cola real |
| SQS + Lambda worker | Asíncrono de verdad | Más recursos, IAM y latencia variable |
| Agente (Bedrock) | Demuestra uso de IA | Coste y dependencia de modelos, innecesario para invertir texto |

El contrato evalúa el comportamiento. Resolver al leer cumple el límite de 12 s con el menor número de piezas, y la escritura condicionada lo hace idempotente.

## Límites conocidos

- Los datos de alertas viven en `/tmp` de cada instancia: se re-siembran en cada arranque en frío y pueden diferir entre instancias. Para persistirlos habría que migrarlos a DynamoDB.
- HTTP API no admite WebSocket, así que el frontend usa polling cada 10 s.
- La cuenta deniega `s3:PutBucketPublicAccessBlock`, así que `--resolve-s3` falla. Se despliega con el bucket privado `amapa-sam-artifacts-808474789727-us-east-1`.

## Estrategia de pruebas

- **Local:** `cd backend && npm test`, con `node:test`, tablas falsas y reloj inyectado. Los tests cubren `/health`, `/items` (incluido el scan de varias páginas con un cliente DynamoDB falso) y `/jobs` (`queued` → `done`).
- **En AWS:** `curl` contra `ApiUrl` reproduciendo cada verificador (nonce aleatorio y consulta cada 1,5 s).
