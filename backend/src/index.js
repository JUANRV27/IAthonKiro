/**
 * AMAPA — Servidor principal
 * Sistema de Alertas y Gestión de Brigadieres - FEN Piura
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const alertService = require('./services/alertService');

// ── Express ────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Rutas API ──────────────────────────────────────────────────────────────
app.use('/api/zones',      require('./routes/zones'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/brigadiers', require('./routes/brigadiers'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'AMAPA Backend' });
});

// ── Socket.IO ──────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Inyectar io en el servicio para emitir eventos
alertService.setIO(io);

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // El brigadier envía su posición en tiempo real
  socket.on('brigadier:update_location', ({ brigadier_id, lat, lng }) => {
    try {
      alertService.updateBrigadierLocation(brigadier_id, lat, lng);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ── Iniciar servidor ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 AMAPA Backend corriendo en http://localhost:${PORT}`);
  console.log(`📡 WebSocket disponible en ws://localhost:${PORT}`);
  console.log(`\nRutas disponibles:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/zones`);
  console.log(`  GET  /api/alerts?active=true`);
  console.log(`  POST /api/alerts`);
  console.log(`  PATCH /api/alerts/:id/resolve`);
  console.log(`  POST  /api/alerts/:id/auto-assign`);
  console.log(`  GET  /api/brigadiers?available=true`);
  console.log(`  POST /api/brigadiers/:id/assign/:alertId`);
  console.log(`  PATCH /api/brigadiers/:id/location\n`);
});
