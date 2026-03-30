import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const useSocket = () => {
  const { user } = useAuth();
  const listenersRef = useRef({});

  useEffect(() => {
    if (!user) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = socketInstance;

    socket.on('connect', () => {
      socket.emit('join:user', user.id);
      socket.emit('join:org', user.organisation);
    });

    // Re-join on reconnect
    socket.on('reconnect', () => {
      socket.emit('join:user', user.id);
      socket.emit('join:org', user.organisation);
    });

    return () => {
      // Don't disconnect on unmount — keep connection alive
    };
  }, [user]);

  const on = useCallback((event, handler) => {
    if (!socketInstance) return;
    socketInstance.on(event, handler);
    return () => socketInstance.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    if (!socketInstance) return;
    socketInstance.off(event, handler);
  }, []);

  return { on, off, socket: socketInstance };
};
