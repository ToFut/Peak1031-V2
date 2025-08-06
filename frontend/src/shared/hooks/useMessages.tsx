import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/shared/services/api';
import { useSocket } from '@/shared/hooks/useSocket';
import { useAuth } from '@/shared/hooks/useAuth';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  exchange_id?: string;
  channel_id?: string;
  created_at: string;
  read_by?: string[];
  attachments?: string[];
  reply_to?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, exchangeId?: string) => Promise<Message>;
  markAsRead: (messageId: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  getUnreadCount: () => number;
  getMessagesByExchange: (exchangeId: string) => Message[];
  refreshMessages: () => Promise<void>;
  typing: { [userId: string]: boolean };
  setTyping: (isTyping: boolean) => void;
}

export const useMessages = (exchangeId?: string): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTypingState] = useState<{ [userId: string]: boolean }>({});
  const { user } = useAuth();
  const socket = useSocket();
  const typingTimeout = useRef<NodeJS.Timeout>();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = exchangeId 
        ? `/api/messages?exchange_id=${exchangeId}`
        : '/api/messages';
      const response = await apiService.get(endpoint);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('message:deleted', (messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on('user:typing', (data: { userId: string; isTyping: boolean }) => {
      setTypingState(prev => ({ ...prev, [data.userId]: data.isTyping }));
    });

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('user:typing');
    };
  }, [socket]);

  const sendMessage = useCallback(async (content: string, targetExchangeId?: string): Promise<Message> => {
    const response = await apiService.post('/api/messages', {
      content,
      exchange_id: targetExchangeId || exchangeId
    });
    if (response.success && response.data) {
      const newMessage = response.data;
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    }
    throw new Error('Failed to send message');
  }, [exchangeId]);

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    await apiService.put(`/api/messages/${messageId}/read`);
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, read_by: [...(m.read_by || []), user?.id || ''] }
        : m
    ));
  }, [user]);

  const deleteMessage = useCallback(async (id: string): Promise<void> => {
    const response = await apiService.delete(`/api/messages/${id}`);
    if (response.success) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  }, []);

  const getUnreadCount = useCallback((): number => {
    if (!user) return 0;
    return messages.filter(m => !m.read_by?.includes(user.id)).length;
  }, [messages, user]);

  const getMessagesByExchange = useCallback((targetExchangeId: string): Message[] => {
    return messages.filter(m => m.exchange_id === targetExchangeId);
  }, [messages]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket || !user) return;
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    socket.emit('user:typing', { isTyping, exchangeId });

    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        socket.emit('user:typing', { isTyping: false, exchangeId });
      }, 3000);
    }
  }, [socket, user, exchangeId]);

  const refreshMessages = useCallback(async (): Promise<void> => {
    await fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteMessage,
    getUnreadCount,
    getMessagesByExchange,
    refreshMessages,
    typing,
    setTyping
  };
};