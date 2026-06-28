'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useAppointmentSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { clinic, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !clinic?.id) return;

    // const socket = io(`${SOCKET_URL}/appointments`, {
    //   auth: { token: localStorage.getItem('accessToken') },
    //   transports: ['websocket'],
    // });

    const socket = io(`${SOCKET_URL}/appointments`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-clinic', clinic.id);
    });

    socket.on('appointment:created', () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    });

    socket.on('appointment:updated', () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    });

    socket.on('appointment:cancelled', () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.emit('leave-clinic', clinic.id);
      socket.disconnect();
    };
  }, [isAuthenticated, clinic?.id, qc]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, connected: socketRef.current?.connected };
}
