/**
 * POST /api/alerts/briefing — boletín para brigadistas redactado con Amazon Bedrock
 * a partir de los datos de la alerta que el coordinador está registrando.
 *
 * Body: { zone_id, risk_level, title, description?, senamhi_data? }
 * 200 → { success: true, data: { text, source: "bedrock"|"fallback", model } }
 * 400 → entrada faltante o demasiado larga · 502 → error del modelo
 */
const express = require('express');
const svc = require('../services/alertService');
const { validateBriefingInput, generateBriefing } = require('../services/briefingService');

function createBriefingRouter({ client = null, modelId = null, sleep } = {}) {
  const router = express.Router();
  router.use(express.json({ type: () => true, limit: '8kb' }));

  router.post('/', async (req, res, next) => {
    try {
      const { errors, input, zone } = validateBriefingInput(req.body, svc.getZoneById);
      if (errors.length) return res.status(400).json({ success: false, message: errors.join('; ') });

      const result = await generateBriefing(input, zone, { client, modelId, sleep });
      res.json({ success: true, data: { text: result.text, source: result.source, model: result.model } });
    } catch (err) {
      if (err.status === 502) return res.status(502).json({ success: false, message: err.message });
      next(err);
    }
  });

  return router;
}

module.exports = { createBriefingRouter };
