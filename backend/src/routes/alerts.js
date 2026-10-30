const express = require('express');
const router = express.Router();
const svc = require('../services/alertService');

// GET /api/alerts — todas las alertas
router.get('/', (req, res) => {
  try {
    const alerts = req.query.active === 'true' ? svc.getActiveAlerts() : svc.getAllAlerts();
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/alerts/:id — alerta específica con sus asignaciones
router.get('/:id', (req, res) => {
  try {
    const alert = svc.getAlertById(Number(req.params.id));
    if (!alert) return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    const assignments = svc.getAssignmentsByAlert(alert.id);
    res.json({ success: true, data: { ...alert, assignments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts — crear nueva alerta (desde SENAMHI / administrador)
router.post('/', (req, res) => {
  try {
    const { zone_id, risk_level, title, description, senamhi_data } = req.body;
    if (!zone_id || !risk_level || !title) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos: zone_id, risk_level, title' });
    }
    if (!['green', 'yellow', 'orange', 'red'].includes(risk_level)) {
      return res.status(400).json({ success: false, message: 'risk_level inválido. Use: green, yellow, orange, red' });
    }
    const alert = svc.createAlert({ zone_id, risk_level, title, description, senamhi_data });
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/alerts/:id/resolve — resolver una alerta
router.patch('/:id/resolve', (req, res) => {
  try {
    const alert = svc.resolveAlert(Number(req.params.id));
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/:id/auto-assign — asignar automáticamente al más cercano
router.post('/:id/auto-assign', (req, res) => {
  try {
    const result = svc.autoAssignNearest(Number(req.params.id));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
