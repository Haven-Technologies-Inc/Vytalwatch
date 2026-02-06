/**
 * WebSocket Hook for VytalWatch
 *
 * Custom hook for real-time WebSocket connections.
 * @module hooks/useWebSocket
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  /**
   * Whether to automatically connect on mount
   */
  autoConnect?: boolean;

  /**
   * Whether to automatically reconnect on connection loss
   */
  autoReconnect?: boolean;

  /**
   * Reconnection delay in milliseconds
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Event handlers
   */
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
}

interface UseWebSocketReturn {
  /**
   * Current connection status
   */
  status: WebSocketStatus;

  /**
   * Last received message
   */
  lastMessage: any | null;

  /**
   * Send a message through the WebSocket
   */
  send: (data: any) => void;

  /**
   * Manually connect to WebSocket
   */
  connect: () => void;

  /**
   * Manually disconnect from WebSocket
   */
  disconnect: () => void;

  /**
   * Whether the connection is open
   */
  isConnected: boolean;
}

/**
 * Hook for WebSocket connections
 *
 * @example
 * ```tsx
 * const { status, lastMessage, send } = useWebSocket('/vitals', {
 *   autoConnect: true,
 *   onMessage: (event) => {
 *     console.log('New vital received:', event.data);
 *   },
 * });
 * ```
 */
export function useWebSocket(
  path: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const url = `${WS_BASE_URL}${path}`;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const token = localStorage.getItem('auth_token');
      const wsUrl = token ? `${url}?token=${token}` : url;

      const ws = new WebSocket(wsUrl);

      ws.onopen = (event) => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        wsRef.current = null;
        onClose?.(event);

        // Auto-reconnect if enabled and not a normal closure
        if (
          autoReconnect &&
          !event.wasClean &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (event) => {
        setStatus('error');
        onError?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(event);
        } catch {
          setLastMessage(event.data);
          onMessage?.(event);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setStatus('error');
      console.error('WebSocket connection error:', error);
    }
  }, [url, autoReconnect, maxReconnectAttempts, reconnectDelay, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  return {
    status,
    lastMessage,
    send,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
}

/**
 * Hook for subscribing to specific WebSocket events
 */
export function useWebSocketEvent<T = any>(
  path: string,
  eventType: string,
  callback: (data: T) => void,
  options?: UseWebSocketOptions
) {
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === eventType) {
          callback(data.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },
    [eventType, callback]
  );

  return useWebSocket(path, {
    ...options,
    onMessage: handleMessage,
  });
}

/**
 * Hook for real-time vitals monitoring
 */
export function useVitalsWebSocket(patientId: string, onVital: (vital: any) => void) {
  return useWebSocketEvent(`/patients/${patientId}/vitals`, 'vital', onVital, {
    autoConnect: true,
    autoReconnect: true,
  });
}

/**
 * Hook for real-time alerts monitoring
 */
export function useAlertsWebSocket(onAlert: (alert: any) => void) {
  return useWebSocketEvent('/alerts', 'alert', onAlert, {
    autoConnect: true,
    autoReconnect: true,
  });
}

/**
 * Hook for real-time messaging
 */
export function useMessagingWebSocket(conversationId: string, onMessage: (message: any) => void) {
  return useWebSocketEvent(`/conversations/${conversationId}`, 'message', onMessage, {
    autoConnect: true,
    autoReconnect: true,
  });
}

export default useWebSocket;
