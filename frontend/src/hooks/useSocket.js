/**
 * Hook para conexión WebSocket con el backend AMAPA
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onEvent) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
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
      socket.on(evt, (data) => onEvent && onEvent(evt, data));
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { socket: socketRef.current, connected };
}
