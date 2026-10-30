const express = require('express');
const router = express.Router();
const svc = require('../services/alertService');

// GET /api/brigadiers — todos los brigadieres
router.get('/', (req, res) => {
  try {
    const all = req.query.available === 'true'
      ? svc.getAvailableBrigadiers()
      : svc.getAllBrigadiers();
    res.json({ success: true, data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/brigadiers/:id — brigadier específico
router.get('/:id', (req, res) => {
  try {
    const b = svc.getBrigadierById(Number(req.params.id));
    if (!b) return res.status(404).json({ success: false, message: 'Brigadier no encontrado' });
    res.json({ success: true, data: b });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/brigadiers/:id/location — actualizar posición GPS
router.patch('/:id/location', (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Se requieren lat y lng' });
    }
    const updated = svc.updateBrigadierLocation(Number(req.params.id), Number(lat), Number(lng));
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/brigadiers/:brigadierId/assign/:alertId — auto-asignación
router.post('/:brigadierId/assign/:alertId', (req, res) => {
  try {
    const result = svc.selfAssign(
      Number(req.params.alertId),
      Number(req.params.brigadierId)
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
