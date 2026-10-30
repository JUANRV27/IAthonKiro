# Plan de implementación — AMAPA serverless

Las tareas están en orden de ejecución. Cada una indica los requisitos que cubre (ver `requirements.md`).

- [x] 1. Preparar el entorno de despliegue
  - Instalar SAM CLI (1.171.0) y `make`, y comprobar `aws sts get-caller-identity`.
  - Crear el bucket privado de artefactos `amapa-sam-artifacts-808474789727-us-east-1`, porque la cuenta bloquea `--resolve-s3`.
  - _Requisitos: 6.1_

- [x] 2. Separar la app Express del servidor local
  - Crear `backend/src/app.js` con `createApp()` y hacer que `index.js` lo use, manteniendo Socket.IO en local.
  - Configurar la carpeta de datos con `AMAPA_DATA_DIR` y hacer que `seed.js` se pueda importar sin ejecutarse.
  - _Requisitos: 3.1, 3.4_

- [x] 3. Crear el handler Lambda y el health check
  - Crear `backend/src/lambda.js` con `serverless-http`, que siembra datos simulados en `/tmp`.
  - Implementar `GET /health` → `{"status":"ok","team":TEAM_ID}`.
  - _Requisitos: 1.1, 1.2, 1.3_

- [x] 4. Servir el frontend en `/app`
  - Compilar Vite con `--base=/app/` y servir `/app` y `/app/` sin 301, más los recursos estáticos.
  - Cambiar `useSocket.js` para que en producción refresque por polling cada 10 s.
  - _Requisitos: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Escribir `template.yaml` y el `Makefile`
  - Declarar HTTP API con throttling, Lambda `nodejs22.x`, LogGroup de 14 días y los Outputs `ApiUrl`/`WebUrl`.
  - Añadir el objetivo `build-AmapaFunction` (frontend + backend).
  - _Requisitos: 6.1, 6.3_

- [x] 6. Primer despliegue y verificación de "API viva"
  - Desplegar con `TeamId=T067` y comprobar con `curl` que `/health` devuelve `{"status":"ok","team":"T067"}` y que `/app` responde 200 con `text/html`.
  - _Requisitos: 1.1, 1.2, 2.1_

- [x] 7. Implementar la persistencia de ítems
  - Añadir `ItemsTable` (on-demand, SSE), `TABLE_NAME` y la política mínima de IAM.
  - Crear `itemsStore.js`, con `list()` paginando el scan hasta 100 ítems, y `routes/items.js` (201/200/404/400).
  - Tests en `backend/test/app.test.js` con una tabla falsa y un cliente DynamoDB falso de 250 ítems en páginas de 30.
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 6.2_

- [x] 8. Desplegar y verificar "Persistencia"
  - Ciclo POST → GET id → GET lista con un nonce aleatorio: 1,3 s, content-type `application/json`.
  - _Requisitos: 4.5_

- [x] 9. Implementar los trabajos asíncronos
  - Crear `routes/jobs.js` (202 con `jobId`, `queued` → `done` cuando se alcanza `readyAt`, input invertido por code points).
  - Añadir `createDynamoJobsStore` (`job#<id>`, `kind=job`, `UpdateItem` condicionado) y excluir los trabajos de `/items`.
  - Añadir el permiso `dynamodb:UpdateItem` y las rutas `/jobs`, más tests con reloj inyectado.
  - _Requisitos: 5.1, 5.2, 5.3, 5.5_

- [x] 10. Desplegar y verificar "Asíncrono o agente"
  - Consultar cada 1,5 s: `done` a los 4,4 s con el output correcto, y `/items` sin trabajos.
  - _Requisitos: 5.4_

- [x] 11. Dejar evidencia del proceso con Kiro
  - Escribir esta spec (requirements, design, tasks), el steering `project.md` y los hooks en `.kiro/hooks/`.

- [ ] 12. Pendiente (post-MVP)
  - Migrar zonas, alertas y brigadistas de `/tmp` a DynamoDB para que sus datos persistan entre instancias.
  - Añadir autenticación para las rutas que modifican datos (`/api/*` POST y PATCH), sin afectar a las rutas públicas de las insignias.
  - _Requisitos: 3 (persistencia de alertas), 6_
