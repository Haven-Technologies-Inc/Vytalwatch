/**
 * VitalWatch Socket.io Client
 * Real-time connection for dashboard updates
 */

'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { config } from '@/config';

interface SocketAuth {
  token: string;
  userId: string;
  role: string;
  organizationId?: string;
}

interface VitalUpdate {
  patientId: string;
  type: string;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
  deviceId?: string;
}

interface AlertUpdate {
  id: string;
  patientId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationUpdate {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();
  private pendingAuth: SocketAuth | null = null;
  private connectionPromise: Promise<void> | null = null;

  connect(auth: SocketAuth): Promise<void> {
    // Store auth for potential reconnection
    this.pendingAuth = auth;

    // Return existing promise if already connecting
    if (this.connectionPromise && this.socket) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const url = config.api.baseUrl.replace('/api/v1', '');

      this.socket = io(`${url}/live`, {
        auth: {
          token: auth.token,
          userId: auth.userId,
          role: auth.role,
          organizationId: auth.organizationId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      // Re-register all listeners on reconnect
      this.socket.on('connect', () => {
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach((callback) => {
            this.socket?.on(event, callback as any);
          });
        });
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on<T>(event: string, callback: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    // Return cleanup function
    return () => {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback as any);
    };
  }

  off(event: string, callback?: Function) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  async emit(event: string, data?: any): Promise<any> {
    // Wait for connection if connecting
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {
        // Connection failed, try to reconnect with stored auth
      }
    }

    // Try to auto-connect if not connected but have auth
    if (!this.socket?.connected && this.pendingAuth) {
      try {
        await this.connect(this.pendingAuth);
      } catch (err) {
        throw new Error('Socket not connected and auto-connect failed');
      }
    }

    // Still not connected after attempts
    if (!this.socket?.connected) {
      throw new Error('Socket not connected. Please refresh the page.');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  subscribeToPatient(patientId: string): Promise<void> {
    return this.emit('subscribe:patient', { patientId });
  }

  unsubscribeFromPatient(patientId: string): Promise<void> {
    return this.emit('unsubscribe:patient', { patientId });
  }

  subscribeToAlerts(): Promise<void> {
    return this.emit('subscribe:alerts');
  }
}

// Singleton instance
export const socketClient = new SocketClient();

// React hook for socket connection
export function useSocket(auth: SocketAuth | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!auth || connectedRef.current) return;

    const connect = async () => {
      try {
        await socketClient.connect(auth);
        setIsConnected(true);
        connectedRef.current = true;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Connection failed'));
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      socketClient.disconnect();
      connectedRef.current = false;
      setIsConnected(false);
    };
  }, [auth?.token]);

  return { isConnected, error };
}

// Hook for vital updates
export function useVitalUpdates(
  patientId: string | null,
  onUpdate: (vital: VitalUpdate) => void
) {
  useEffect(() => {
    if (!patientId) return;

    // Subscribe to patient's vitals
    socketClient.subscribeToPatient(patientId).catch(console.error);

    // Listen for vital updates
    const cleanup = socketClient.on<VitalUpdate>('vital:new', (vital) => {
      if (vital.patientId === patientId) {
        onUpdate(vital);
      }
    });

    return () => {
      cleanup();
      socketClient.unsubscribeFromPatient(patientId).catch(console.error);
    };
  }, [patientId, onUpdate]);
}

// Hook for alert updates
export function useAlertUpdates(onAlert: (alert: AlertUpdate) => void) {
  useEffect(() => {
    socketClient.subscribeToAlerts().catch(console.error);

    const cleanup = socketClient.on<AlertUpdate>('alert:new', onAlert);
    const cleanupCritical = socketClient.on<AlertUpdate>('alert:critical', onAlert);

    return () => {
      cleanup();
      cleanupCritical();
    };
  }, [onAlert]);
}

// Hook for notifications
export function useNotificationUpdates(
  userId: string | null,
  onNotification: (notification: NotificationUpdate) => void
) {
  useEffect(() => {
    if (!userId) return;

    const cleanup = socketClient.on<NotificationUpdate>(
      'notification:new',
      onNotification
    );

    return cleanup;
  }, [userId, onNotification]);
}

export default socketClient;
