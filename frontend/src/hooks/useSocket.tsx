import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface SocketContextType {
  socket: Socket | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  joinExchange: (exchangeId: string) => void;
  leaveExchange: (exchangeId: string) => void;
  sendMessage: (exchangeId: string, content: string, attachmentId?: string) => void;
  startTyping: (exchangeId: string) => void;
  stopTyping: (exchangeId: string) => void;
  markMessageRead: (exchangeId: string, messageId: string) => void;
}

interface SocketProviderProps {
  children: ReactNode;
}

interface MessageData {
  id: string;
  content: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
  };
  exchange_id: string;
  created_at: string;
  message_type: string;
  attachment?: any;
}

interface TypingData {
  userId: string;
  name: string;
  exchangeId: string;
}

interface UserStatusData {
  userId: string;
  name?: string;
  timestamp: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());

  // Disconnect socket function
  const disconnectSocket = useCallback(() => {
    if (socket) {
      console.log('🔌 Disconnecting socket...');
      socket.off(); // Remove all listeners
      socket.disconnect();
      setSocket(null);
    }
    setConnectionStatus('disconnected');
    setTypingUsers(new Map());
  }, [socket]);

  const initializeSocket = useCallback(() => {
    // Don't reinitialize if already connected or connecting
    if (socket?.connected || connectionStatus === 'connecting' || connectionStatus === 'connected') {
      console.log('🔌 Socket already connected or connecting, skipping initialization');
      return;
    }

    if (socket) {
      socket.disconnect();
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    setConnectionStatus('connecting');

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
    
    const newSocket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      
      // Join user-specific room
      if (user?.id) {
        newSocket.emit('join_user_room', user.id);
      }
    });

    newSocket.on('disconnect', (reason) => {
      
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        setTimeout(() => newSocket.connect(), 1000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnectionStatus('error');
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔄 Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed after maximum attempts');
      setConnectionStatus('error');
    });

    // Message handlers - inline to avoid circular dependencies
    setupMessageHandlers(newSocket);

    setSocket(newSocket);
  }, [user?.id, connectionStatus, socket]); // Add connectionStatus and socket to prevent re-initialization

  const setupMessageHandlers = useCallback((socket: Socket) => {
    // New message received
    socket.on('new_message', (message: MessageData) => {
      
      
      // Dispatch custom event for components to listen to
      const event = new CustomEvent('socket_new_message', {
        detail: message
      });
      window.dispatchEvent(event);
    });

    // Exchange joined successfully
    socket.on('joined_exchange', (data: { exchangeId: string; status: string }) => {
      
      
      const event = new CustomEvent('socket_joined_exchange', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // Error joining exchange
    socket.on('join_error', (data: { exchangeId: string; error: string }) => {
      console.error('❌ Error joining exchange:', data);
      
      const event = new CustomEvent('socket_join_error', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // User typing indicators
    socket.on('user_typing', (data: TypingData) => {
      
      
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const exchangeTypers = newMap.get(data.exchangeId) || new Set();
        exchangeTypers.add(data.userId);
        newMap.set(data.exchangeId, exchangeTypers);
        return newMap;
      });

      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          const exchangeTypers = newMap.get(data.exchangeId);
          if (exchangeTypers) {
            exchangeTypers.delete(data.userId);
            if (exchangeTypers.size === 0) {
              newMap.delete(data.exchangeId);
            }
          }
          return newMap;
        });
      }, 3000);
    });

    socket.on('user_stopped_typing', (data: TypingData) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const exchangeTypers = newMap.get(data.exchangeId);
        if (exchangeTypers) {
          exchangeTypers.delete(data.userId);
          if (exchangeTypers.size === 0) {
            newMap.delete(data.exchangeId);
          }
        }
        return newMap;
      });
    });

    // User online/offline status
    socket.on('user_online', (data: UserStatusData) => {
      
      
      const event = new CustomEvent('socket_user_online', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    socket.on('user_offline', (data: UserStatusData) => {
      
      
      const event = new CustomEvent('socket_user_offline', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // Message read receipts
    socket.on('message_read', (data: { messageId: string; userId: string; timestamp: string }) => {
      const event = new CustomEvent('socket_message_read', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // Error handling
    socket.on('message_error', (error: { error: string }) => {
      console.error('💬 Message error:', error);
      
      const event = new CustomEvent('socket_message_error', {
        detail: error
      });
      window.dispatchEvent(event);
    });

    // System notifications
    socket.on('notification', (notification: any) => {
      
      
      const event = new CustomEvent('socket_notification', {
        detail: notification
      });
      window.dispatchEvent(event);
    });

    // Exchange updates
    socket.on('exchange_updated', (data: any) => {
      
      
      const event = new CustomEvent('socket_exchange_updated', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // Document updates
    socket.on('document_processed', (data: any) => {
      
      
      const event = new CustomEvent('socket_document_processed', {
        detail: data
      });
      window.dispatchEvent(event);
    });

    // Task updates
    socket.on('task_updated', (data: any) => {
      
      
      const event = new CustomEvent('socket_task_updated', {
        detail: data
      });
      window.dispatchEvent(event);
    });
  }, [setTypingUsers]); // Add dependencies for useCallback

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]); // Only depend on authentication status, not user.id which can change

  const joinExchange = useCallback((exchangeId: string) => {
    if (socket && connectionStatus === 'connected') {
      
      socket.emit('join_exchange', exchangeId);
    } else {
      console.warn('Cannot join exchange: socket not connected');
    }
  }, [socket, connectionStatus]);

  const leaveExchange = useCallback((exchangeId: string) => {
    if (socket && connectionStatus === 'connected') {
      
      socket.emit('leave_exchange', exchangeId);
    }
  }, [socket, connectionStatus]);

  const sendMessage = useCallback((exchangeId: string, content: string, attachmentId?: string) => {
    if (socket && connectionStatus === 'connected') {
      
      
      const messageData = {
        exchangeId,
        content,
        messageType: attachmentId ? 'file' : 'text',
        attachmentId
      };

      socket.emit('send_message', messageData);
    } else {
      console.warn('Cannot send message: socket not connected');
      throw new Error('Not connected to server');
    }
  }, [socket, connectionStatus]);

  const startTyping = useCallback((exchangeId: string) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit('typing_start', { exchangeId });
    }
  }, [socket, connectionStatus]);

  const stopTyping = useCallback((exchangeId: string) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit('typing_stop', { exchangeId });
    }
  }, [socket, connectionStatus]);

  const markMessageRead = useCallback((exchangeId: string, messageId: string) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit('mark_read', { exchangeId, messageId });
    }
  }, [socket, connectionStatus]);

  const value: SocketContextType = {
    socket,
    connectionStatus,
    joinExchange,
    leaveExchange,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageRead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Hook for listening to specific socket events
export const useSocketEvent = (eventName: string, handler: (data: any) => void) => {
  useEffect(() => {
    const eventHandler = (event: CustomEvent) => {
      handler(event.detail);
    };

    window.addEventListener(`socket_${eventName}`, eventHandler as EventListener);

    return () => {
      window.removeEventListener(`socket_${eventName}`, eventHandler as EventListener);
    };
  }, [eventName, handler]);
};

// Hook for managing exchange connection
export const useExchangeSocket = (exchangeId: string | null) => {
  const { joinExchange, leaveExchange, connectionStatus } = useSocket();
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (exchangeId && connectionStatus === 'connected') {
      joinExchange(exchangeId);
      setIsJoined(true);
    }

    return () => {
      if (exchangeId && isJoined) {
        leaveExchange(exchangeId);
        setIsJoined(false);
      }
    };
  }, [exchangeId, connectionStatus, joinExchange, leaveExchange, isJoined]);

  return { isJoined };
};

// Hook for real-time messages in an exchange
export const useExchangeMessages = (exchangeId: string) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { sendMessage, startTyping, stopTyping, markMessageRead } = useSocket();

  // Listen for new messages
  useSocketEvent('new_message', useCallback((message: MessageData) => {
    if (message.exchange_id === exchangeId) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    }
  }, [exchangeId]));

  // Listen for typing indicators
  useSocketEvent('user_typing', useCallback((data: TypingData) => {
    if (data.exchangeId === exchangeId) {
      setTypingUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    }
  }, [exchangeId]));

  useSocketEvent('user_stopped_typing', useCallback((data: TypingData) => {
    if (data.exchangeId === exchangeId) {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    }
  }, [exchangeId]));

  // Handle sending messages
  const handleSendMessage = useCallback((content: string, attachmentId?: string) => {
    sendMessage(exchangeId, content, attachmentId);
  }, [exchangeId, sendMessage]);

  // Handle typing indicators with debouncing
  const handleStartTyping = useCallback(() => {
    startTyping(exchangeId);
  }, [exchangeId, startTyping]);

  const handleStopTyping = useCallback(() => {
    stopTyping(exchangeId);
  }, [exchangeId, stopTyping]);

  // Handle marking messages as read
  const handleMarkMessageRead = useCallback((messageId: string) => {
    markMessageRead(exchangeId, messageId);
  }, [exchangeId, markMessageRead]);

  return {
    messages,
    setMessages,
    typingUsers,
    sendMessage: handleSendMessage,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    markMessageRead: handleMarkMessageRead
  };
};

// Hook for connection status monitoring
export const useConnectionStatus = () => {
  const { connectionStatus } = useSocket();
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [disconnectedDuration, setDisconnectedDuration] = useState<number>(0);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setLastConnected(new Date());
      setDisconnectedDuration(0);
    } else if (connectionStatus === 'disconnected' && lastConnected) {
      const interval = setInterval(() => {
        setDisconnectedDuration(Date.now() - lastConnected.getTime());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus, lastConnected]);

  return {
    connectionStatus,
    lastConnected,
    disconnectedDuration,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error'
  };
};

// Hook for real-time notifications
export const useSocketNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useSocketEvent('notification', useCallback((notification: any) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100
  }, []));

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification
  };
};

// Hook for real-time exchange updates
export const useExchangeUpdates = (exchangeId?: string) => {
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useSocketEvent('exchange_updated', useCallback((data: any) => {
    if (!exchangeId || data.exchange_id === exchangeId) {
      setLastUpdate(data);
    }
  }, [exchangeId]));

  return { lastUpdate };
};

// Hook for real-time task updates
export const useTaskUpdates = (exchangeId?: string) => {
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useSocketEvent('task_updated', useCallback((data: any) => {
    if (!exchangeId || data.exchange_id === exchangeId) {
      setLastUpdate(data);
    }
  }, [exchangeId]));

  return { lastUpdate };
};

// Hook for real-time document processing updates
export const useDocumentProcessingUpdates = (exchangeId?: string) => {
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useSocketEvent('document_processed', useCallback((data: any) => {
    if (!exchangeId || data.exchange_id === exchangeId) {
      setLastUpdate(data);
    }
  }, [exchangeId]));

  return { lastUpdate };
};

export default useSocket;