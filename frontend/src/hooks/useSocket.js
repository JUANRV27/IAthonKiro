/**
 * Hook para conexión en tiempo real con el backend AMAPA
 *
 * - Desarrollo (npm run dev): WebSocket con Socket.IO en http://localhost:3001
 * - Producción sin VITE_SOCKET_URL (AWS Lambda + HTTP API, sin WebSocket):
 *   refresco periódico por polling cada POLL_INTERVAL_MS.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
const POLL_INTERVAL_MS = 10000;

export function useSocket(onEvent) {
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);
  const mode = SOCKET_URL ? 'socket' : 'polling';

  // Usar siempre el callback más reciente (evita closures obsoletos)
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!SOCKET_URL) {
      setConnected(true);
      const timer = setInterval(() => onEventRef.current?.('poll', null), POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Eventos del sistema
    const events = [
      'alert:created',
      'alert:resolved',
      'alert:full',
      'assignment:created',
      'brigadier:location_updated',
    ];

    events.forEach((evt) => {
      socket.on(evt, (data) => onEventRef.current?.(evt, data));
    });

    return () => socket.disconnect();
  }, []);

  return { socket: socketRef.current, connected, mode };
}
