/**
 * AMAPA — Aplicación Express (sin servidor HTTP ni Socket.IO)
 * La usan tanto el servidor local (index.js) como la Lambda (lambda.js).
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

/**
 * @param {{ teamId?: string|null, staticDir?: string|null, itemsStore?: object|null,
 *           jobsStore?: object|null, now?: () => number }} options
 *   teamId     → valor devuelto en GET /health (campo "team")
 *   staticDir  → carpeta con el build del frontend, servida en GET /app
 *   itemsStore → almacén de /items (DynamoDB en Lambda; falso en tests)
 *   jobsStore  → almacén de /jobs  (DynamoDB en Lambda; falso en tests)
 *   now        → reloj en ms (inyectable en tests)
 *   briefing   → { client, modelId, sleep? } de Bedrock para el boletín IA (simulado en tests)
 *   reportes   → servicio de reportes (createReportesService); null = 503
 *   legacyState → almacén compartido de alertas/brigadistas ({ load, save }); null = solo memoria/archivo
 */
function createApp({
  teamId = null, staticDir = null, itemsStore = null, jobsStore = null, now = Date.now, briefing = {},
  reportes = null, legacyState = null,
} = {}) {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // ── Health checks ──────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', team: teamId });
  });
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', team: teamId, time: new Date().toISOString(), service: 'AMAPA Backend' });
  });

  // ── Rutas API ──────────────────────────────────────────────────────────
  // En Lambda, zonas/alertas/brigadistas se cargan y guardan en DynamoDB en
  // cada petición para que todas las instancias vean el mismo estado.
  if (legacyState) app.use('/api', require('./db/legacySync').createLegacySync(legacyState));
  // IA generativa (Bedrock): antes de /api/alerts para que no lo capture /:id
  app.use('/api/alerts/briefing', require('./routes/briefing').createBriefingRouter(briefing));
  app.use('/api/zones',      require('./routes/zones'));
  app.use('/api/alerts',     require('./routes/alerts'));
  app.use('/api/brigadiers', require('./routes/brigadiers'));

  // ── Persistencia (DynamoDB) ────────────────────────────────────────────
  app.use('/items', require('./routes/items').createItemsRouter(itemsStore));
  app.use('/jobs',  require('./routes/jobs').createJobsRouter(jobsStore, { now }));

  // ── Reportes de puntos críticos clasificados con IA (historia principal) ──
  app.use('/reportes', require('./routes/reportes').createReportesRouter(reportes));

  // ── Frontend compilado en /app ─────────────────────────────────────────
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    const indexHtml = path.join(staticDir, 'index.html');
    // /app y /app/ devuelven index.html directamente (sin redirección 301).
    // Sin caché ni ETag: en el zip de Lambda todos los archivos tienen fecha 1980
    // y index.html mide lo mismo en cada build, así que el ETag (tamaño + fecha)
    // no cambia, el navegador recibe 304 y se queda con un HTML que apunta a
    // assets que ya no existen (404 en /app/assets/index-<hash>.js).
    app.get(['/app', '/app/'], (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.sendFile(indexHtml, { etag: false, lastModified: false, cacheControl: false });
    });
    app.use('/app', express.static(staticDir, { index: false, redirect: false, maxAge: '1h' }));
  }

  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });
  });

  // Errores siempre en JSON (JSON mal formado → 400; resto → 500)
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.type === 'entity.parse.failed' ? 400 : (err.status || 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ success: false, message: status >= 500 ? 'Error interno' : err.message });
  });

  return app;
}

module.exports = { createApp };
