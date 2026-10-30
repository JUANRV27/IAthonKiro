const express = require('express');
const router = express.Router();
const svc = require('../services/alertService');

// GET /api/zones — todas las zonas
router.get('/', (req, res) => {
  try {
    const zones = svc.getAllZones();
    res.json({ success: true, data: zones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/zones/:id — zona específica
router.get('/:id', (req, res) => {
  try {
    const zone = svc.getZoneById(Number(req.params.id));
    if (!zone) return res.status(404).json({ success: false, message: 'Zona no encontrada' });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
