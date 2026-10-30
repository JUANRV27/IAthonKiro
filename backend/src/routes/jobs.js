/**
 * Rutas públicas /jobs (insignia "Asíncrono o agente")
 *   POST /jobs          { input } → 202 { jobId }
 *   GET  /jobs/:jobId             → 200 { jobId, status: "queued"|"done", output } | 404
 *
 * Resolución al leer: el trabajo queda listo READY_DELAY_MS después de crearse;
 * la primera lectura posterior calcula el resultado (input al revés) y lo guarda.
 */
const crypto = require('crypto');
const express = require('express');

const MAX_INPUT_LENGTH = 1024;
const READY_DELAY_MS = 2000;

/** Invierte el texto carácter por carácter (por code points: "abc1" → "1cba") */
const reverseText = (text) => Array.from(text).reverse().join('');

function createJobsRouter(store, { now = () => Date.now() } = {}) {
  const router = express.Router();
  // Acepta el cuerpo como JSON aunque el cliente no envíe Content-Type
  router.use(express.json({ type: () => true, limit: '8kb' }));

  router.use((req, res, next) => {
    if (!store) return res.status(503).json({ success: false, message: 'TABLE_NAME no configurado' });
    next();
  });

  router.post('/', async (req, res, next) => {
    try {
      const input = req.body && req.body.input;
      if (typeof input !== 'string' || input.length === 0 || input.length > MAX_INPUT_LENGTH) {
        return res.status(400).json({ success: false, message: `"input" debe ser un texto de 1 a ${MAX_INPUT_LENGTH} caracteres` });
      }
      const createdAt = now();
      const job = {
        jobId: crypto.randomUUID(),
        input,
        status: 'queued',
        output: null,
        createdAt: new Date(createdAt).toISOString(),
        readyAt: createdAt + READY_DELAY_MS,
      };
      await store.put(job);
      res.status(202).json({ jobId: job.jobId });
    } catch (err) { next(err); }
  });

  router.get('/:jobId', async (req, res, next) => {
    try {
      const job = await store.get(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, message: 'Trabajo no encontrado' });

      if (job.status === 'queued' && now() >= job.readyAt) {
        job.output = reverseText(job.input);
        job.status = 'done';
        await store.complete(job.jobId, job.output);
      }
      res.json({ jobId: job.jobId, status: job.status, output: job.status === 'done' ? job.output : null });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { createJobsRouter, reverseText, READY_DELAY_MS };
