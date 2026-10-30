/**
 * AMAPA — Servidor principal
 * Sistema de Alertas y Gestión de Brigadieres - FEN Piura
 */
const http = require('http');
const { Server } = require('socket.io');

const alertService = require('./services/alertService');
const { createApp } = require('./app');

// ── Express (rutas API + /health, definidas en app.js) ─────────────────────
const app = createApp({ teamId: process.env.TEAM_ID || null });

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
