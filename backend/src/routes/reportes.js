/**
 * Rutas públicas /reportes (historia de usuario principal)
 *   POST  /reportes        → 201 reporte con nivel "clasificando" | 400
 *   GET   /reportes        → 200 [reporte] ordenado rojo → amarillo → verde → clasificando
 *   PATCH /reportes/:id    { estado } → 200 | 400 | 404
 */
const express = require('express');

function createReportesRouter(service) {
  const router = express.Router();
  router.use(express.json({ type: () => true, limit: '16kb' }));

  router.use((req, res, next) => {
    if (!service) return res.status(503).json({ success: false, message: 'Almacén de reportes no configurado' });
    next();
  });

  const wrap = (fn) => async (req, res, next) => {
    try { await fn(req, res); } catch (err) {
      if (err.status === 400 || err.status === 404) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  };

  router.post('/', wrap(async (req, res) => res.status(201).json(await service.crear(req.body))));
  router.get('/', wrap(async (req, res) => res.json(await service.listar())));
  router.patch('/:id', wrap(async (req, res) => res.json(await service.cambiarEstado(req.params.id, req.body))));

  return router;
}

module.exports = { createReportesRouter };
