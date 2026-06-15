'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function useSocket() {
  const { userId, getToken } = useAuth();
  const subscribedRooms = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    if (!socket) {
      socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
    }

    socket.on('connect', async () => {
      // Join personal room for notifications
      socket?.emit('join:personal', { userId });
    });

    return () => {
      // Don't disconnect on component unmount — socket is app-wide
    };
  }, [userId]);

  const subscribeToCase = useCallback((caseId: string) => {
    if (!socket || subscribedRooms.current.has(`case:${caseId}`)) return;
    socket.emit('subscribe:case', { caseId });
    subscribedRooms.current.add(`case:${caseId}`);
  }, []);

  const subscribeToDashboard = useCallback((role: string) => {
    if (!socket || subscribedRooms.current.has(`dashboard:${role}`)) return;
    socket.emit('subscribe:dashboard', { role });
    subscribedRooms.current.add(`dashboard:${role}`);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.on(event, handler);
    return () => { socket?.off(event, handler); };
  }, []);

  return { socket, on, subscribeToCase, subscribeToDashboard };
}
