# Requisitos — AMAPA serverless (Alertas FEN Piura en AWS)

## Introducción

AMAPA ayuda a coordinar brigadistas de defensa civil ante alertas climáticas del Fenómeno El Niño (FEN) en la región Piura (Perú), con alertas por zona inspiradas en los niveles del SENAMHI. El MVP corría solo en local (Express + Socket.IO + Vite). Esta spec cubre llevarlo a AWS con un único `template.yaml` de SAM y cumplir los contratos de las insignias de la Kiro IAthon: "API viva", "Persistencia" y "Asíncrono o agente".

Equipo: **T067**. Región: **us-east-1**. Stack: **amapa-iathon**.

Fuentes usadas: `README.md` y `.kiro/steering/amapa-project.md`. En el repositorio no hay `CANVAS.md` ni `RETOS.md`; si se agregan, revisar que esta spec siga siendo coherente con la carta del track.

## Glosario

- **Alerta**: aviso de riesgo (rojo, naranja, amarillo, verde) asociado a una zona de Piura.
- **Brigadista**: persona de defensa civil que se asigna a una alerta. En el sistema solo hay datos ficticios.
- **Ítem**: registro `{id, value}` guardado en DynamoDB (insignia "Persistencia").
- **Trabajo (job)**: tarea asíncrona `{jobId, status, output}` que invierte un texto (insignia "Asíncrono").
- **ApiUrl**: `https://<api>.execute-api.us-east-1.amazonaws.com`, sin barra final.

## Requisitos

### Requisito 1 — Salud de la API (insignia "API viva")

**Historia:** Como evaluador de la IAthon, quiero consultar `/health` para saber que la API del equipo está viva.

**Criterios de aceptación**
1. CUANDO se hace `GET /health` sin credenciales, la API DEBE responder 200 con `Content-Type: application/json`.
2. El cuerpo DEBE ser exactamente `{"status":"ok","team":"T067"}`.
3. El valor de `team` DEBE venir del parámetro `TeamId` de `template.yaml`, que llega a la Lambda como `TEAM_ID`. No puede estar escrito en el código.

### Requisito 2 — Frontend publicado (Entregas > Frontend)

**Historia:** Como coordinador, quiero abrir la app web desde una URL pública para ver el mapa de alertas de Piura.

**Criterios de aceptación**
1. CUANDO se hace `GET <ApiUrl>/app`, la API DEBE responder 200 con `text/html`, sin redirección.
2. Los recursos `GET /app/assets/*` DEBEN responder 200 con su content-type correcto.
3. La app DEBE llamar a la API por rutas relativas `/api/*` del mismo origen, sin CORS entre dominios.
4. SI no hay WebSocket (HTTP API), el frontend DEBE refrescar los datos cada 10 s e indicarlo en la cabecera.

### Requisito 3 — API de alertas y brigadistas

**Historia:** Como brigadista, quiero ver las alertas activas y auto-asignarme para que el sistema sugiera al más cercano.

**Criterios de aceptación**
1. `GET /api/zones`, `GET /api/alerts?active=true` y `GET /api/brigadiers` DEBEN responder 200 con `{success:true,data:[...]}`.
2. `POST /api/alerts/{id}/auto-assign` DEBE asignar al brigadista disponible más cercano según la distancia Haversine y responder 201.
3. CUANDO `assigned_count` alcanza `max_brigadiers`, la alerta DEBE pasar a `status = "full"` y rechazar nuevas asignaciones con 400.
4. Los datos iniciales (10 zonas, 12 brigadistas, 4 alertas) DEBEN ser simulados: sin nombres, teléfonos ni correos de personas reales.

### Requisito 4 — Persistencia de ítems (insignia "Persistencia")

**Historia:** Como evaluador, quiero crear un ítem y recuperarlo por id y en la lista para comprobar que se guarda en DynamoDB.

**Criterios de aceptación**
1. CUANDO se hace `POST /items` con `{"value":"<nonce>"}`, la API DEBE responder 201 con `{"id":"<uuid>","value":"<nonce>"}` y guardar el ítem en `ItemsTable` (variable `TABLE_NAME`).
2. `GET /items/{id}` DEBE responder 200 con `{"id","value"}`, o 404 en JSON si el ítem no existe.
3. `GET /items` DEBE responder 200 con un arreglo JSON de hasta 100 ítems. Para reunirlos DEBE recorrer las páginas del scan (`LastEvaluatedKey`), sin quedarse en la primera.
4. SI `value` no es un texto de 1 a 1024 caracteres, o el JSON está mal formado, la API DEBE responder 400 en JSON.
5. El ciclo crear → leer → listar DEBE completarse en menos de 25 s. El valor medido en AWS fue 1,3 s.

### Requisito 5 — Trabajos asíncronos (insignia "Asíncrono o agente")

**Historia:** Como evaluador, quiero encolar un trabajo y consultarlo hasta que termine.

**Criterios de aceptación**
1. CUANDO se hace `POST /jobs` con `{"input":"<nonce>"}`, la API DEBE responder 202 de inmediato con `{"jobId":"<uuid>"}` y guardar el trabajo en `ItemsTable`.
2. `GET /jobs/{jobId}` DEBE responder 200 con `{"jobId","status","output"}`, donde `status` es `"queued"` o `"done"`, o 404 si el trabajo no existe.
3. CUANDO han pasado al menos 2 s desde la creación (`readyAt`), la siguiente lectura DEBE devolver `status:"done"` y `output` igual al input invertido carácter por carácter (`"abc1"` → `"1cba"`).
4. El trabajo DEBE estar en `"done"` antes de 12 s. El valor medido en AWS fue 4,4 s.
5. Los trabajos NO DEBEN aparecer en `GET /items`.

### Requisito 6 — Despliegue reproducible y seguro

**Criterios de aceptación**
1. `sam build && sam deploy ... --parameter-overrides TeamId=T067` DEBE desplegar API y frontend en un solo stack, con los Outputs `ApiUrl` y `WebUrl`.
2. La Lambda DEBE tener solo los permisos `dynamodb:PutItem`, `GetItem`, `Scan` y `UpdateItem` sobre `ItemsTable`.
3. La HTTP API DEBE limitar el tráfico (20 peticiones/s, ráfaga de 50). Los logs DEBEN conservarse 14 días.
4. No se DEBE conectar ningún sistema externo fuera de la cuenta AWS y los recursos declarados en `template.yaml`.
