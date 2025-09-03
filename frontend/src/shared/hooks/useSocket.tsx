import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Exchange } from '../types';

interface SocketState {
  connected: boolean;
  connectionId?: string;
}

interface SocketContextType extends SocketState {
  off(arg0: string, handleExchangeUpdate: (data: { type: string; exchange: Exchange; }) => void): unknown;
  on(arg0: string, handleExchangeUpdate: (data: { type: string; exchange: Exchange; }) => void): unknown;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socketState, setSocketState] = useState<SocketState>({
    connected: false
  });

  const connect = useCallback(() => {
    // TODO: Implement actual socket connection
    setSocketState({
      connected: true,
      connectionId: 'dummy-connection-id'
    });
  }, []);

  const disconnect = useCallback(() => {
    setSocketState({
      connected: false
    });
  }, []);

  useEffect(() => {
    // Auto-connect on mount
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value: SocketContextType = {
    ...socketState,
    connect,
    disconnect,
    off: function (arg0: string, handleExchangeUpdate: (data: { type: string; exchange: Exchange; }) => void): unknown {
      throw new Error('Function not implemented.');
    },
    on: function (arg0: string, handleExchangeUpdate: (data: { type: string; exchange: Exchange; }) => void): unknown {
      throw new Error('Function not implemented.');
    }
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