import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';

interface UseRealTimeUpdatesOptions {
  events: string[];
  onUpdate?: (event: string, data: any) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface UseRealTimeUpdatesReturn {
  connected: boolean;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: Error | null;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions): UseRealTimeUpdatesReturn => {
  const socket = useSocket();
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const handlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<Array<{ event: string; data: any }>>([]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConnected(true);
      setConnectionStatus('connected');
      setLastError(null);
      
      // Process queued messages
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        if (message) {
          socket.emit(message.event, message.data);
        }
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
      
      if (options.autoReconnect !== false) {
        scheduleReconnect();
      }
    };

    const handleError = (error: Error) => {
      setLastError(error);
      setConnectionStatus('error');
      console.error('Socket error:', error);
    };

    const handleConnecting = () => {
      setConnectionStatus('connecting');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('connecting', handleConnecting);

    // Subscribe to specified events
    options.events.forEach(event => {
      socket.on(event, (data: any) => {
        if (options.onUpdate) {
          options.onUpdate(event, data);
        }
        
        // Call registered handlers
        const eventHandlers = handlers.current.get(event);
        if (eventHandlers) {
          eventHandlers.forEach(handler => handler(data));
        }
      });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('connecting', handleConnecting);
      
      options.events.forEach(event => {
        socket.off(event);
      });
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [socket, options]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      reconnect();
    }, options.reconnectDelay || 5000);
  }, [options.reconnectDelay]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!handlers.current.has(event)) {
      handlers.current.set(event, new Set());
      
      // If socket exists and event not in original options, subscribe now
      if (socket && !options.events.includes(event)) {
        socket.on(event, (data: any) => {
          const eventHandlers = handlers.current.get(event);
          if (eventHandlers) {
            eventHandlers.forEach(h => h(data));
          }
        });
      }
    }
    
    handlers.current.get(event)?.add(handler);
  }, [socket, options.events]);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    const eventHandlers = handlers.current.get(event);
    if (!eventHandlers) return;
    
    if (handler) {
      eventHandlers.delete(handler);
    } else {
      eventHandlers.clear();
    }
    
    if (eventHandlers.size === 0) {
      handlers.current.delete(event);
      
      // If socket exists and event not in original options, unsubscribe now
      if (socket && !options.events.includes(event)) {
        socket.off(event);
      }
    }
  }, [socket, options.events]);

  const emit = useCallback((event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      // Queue message for when connected
      messageQueue.current.push({ event, data });
    }
  }, [socket, connected]);

  const reconnect = useCallback(() => {
    if (socket && !connected) {
      socket.connect();
    }
  }, [socket, connected]);

  const disconnect = useCallback(() => {
    if (socket && connected) {
      socket.disconnect();
    }
  }, [socket, connected]);

  return {
    connected,
    subscribe,
    unsubscribe,
    emit,
    reconnect,
    disconnect,
    connectionStatus,
    lastError
  };
};