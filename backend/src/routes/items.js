/**
 * Rutas públicas /items (insignia "Persistencia")
 *   POST /items        { value } → 201 { id, value }
 *   GET  /items/:id              → 200 { id, value } | 404
 *   GET  /items                  → 200 [{ id, value }, ...] (hasta 100)
 */
const crypto = require('crypto');
const express = require('express');

const MAX_VALUE_LENGTH = 1024;

const toItem = ({ id, value }) => ({ id, value });

function createItemsRouter(store) {
  const router = express.Router();
  // Acepta el cuerpo como JSON aunque el cliente no envíe Content-Type
  router.use(express.json({ type: () => true, limit: '8kb' }));

  router.use((req, res, next) => {
    if (!store) return res.status(503).json({ success: false, message: 'TABLE_NAME no configurado' });
    next();
  });

  router.post('/', async (req, res, next) => {
    try {
      const value = req.body && req.body.value;
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VALUE_LENGTH) {
        return res.status(400).json({ success: false, message: `"value" debe ser un texto de 1 a ${MAX_VALUE_LENGTH} caracteres` });
      }
      const item = { id: crypto.randomUUID(), value, created_at: new Date().toISOString() };
      await store.put(item);
      res.status(201).json(toItem(item));
    } catch (err) { next(err); }
  });

  router.get('/', async (req, res, next) => {
    try {
      const items = await store.list();
      res.json(items.map(toItem));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const item = await store.get(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
      res.json(toItem(item));
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { createItemsRouter };
