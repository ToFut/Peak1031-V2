import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiService } from '@/shared/services/api';

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  exchange_id?: string;
  created_at: string;
  type: 'text' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  read_by?: string[];
}

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
  markAsRead: (messageId: string) => void;
  typing: { [userId: string]: boolean };
  setTyping: (isTyping: boolean) => void;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
}

export const useChat = (exchangeId?: string): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTypingState] = useState<{ [userId: string]: boolean }>({});
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const socket = useSocket();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial messages
  const loadMessages = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const endpoint = exchangeId 
        ? `/api/messages?exchange_id=${exchangeId}&page=${pageNum}`
        : `/api/messages?page=${pageNum}`;
      
      const response = await apiService.get(endpoint);
      
      if (response.success && response.data) {
        if (pageNum === 1) {
          setMessages(response.data.messages || []);
        } else {
          setMessages(prev => [...prev, ...(response.data.messages || [])]);
        }
        setHasMore(response.data.hasMore || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: ChatMessage) => {
      setMessages(prev => [message, ...prev]);
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingState(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));
    };

    const handleMessageRead = (data: { messageId: string; userId: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            read_by: [...(msg.read_by || []), data.userId]
          };
        }
        return msg;
      }));
    };

    if (exchangeId) {
      socket.emit('join:exchange', exchangeId);
    }

    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleUserTyping);
    socket.on('message:read', handleMessageRead);

    return () => {
      if (exchangeId) {
        socket.emit('leave:exchange', exchangeId);
      }
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleUserTyping);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, exchangeId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user) return;

    try {
      const response = await apiService.post('/api/messages', {
        content,
        exchange_id: exchangeId,
        type: 'text'
      });

      if (response.success && response.data) {
        // Message will be added via socket event
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [user, exchangeId]);

  const sendFile = useCallback(async (file: File) => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (exchangeId) {
        formData.append('exchange_id', exchangeId);
      }

      const response = await apiService.post('/api/messages/file', formData);

      if (response.success && response.data) {
        // File message will be added via socket event
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send file');
      throw err;
    }
  }, [user, exchangeId]);

  const markAsRead = useCallback((messageId: string) => {
    if (!user || !socket) return;

    socket.emit('message:read', { messageId, userId: user.id });
    
    // Optimistically update
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && !msg.read_by?.includes(user.id)) {
        return {
          ...msg,
          read_by: [...(msg.read_by || []), user.id]
        };
      }
      return msg;
    }));
  }, [user, socket]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('user:typing', { 
      isTyping, 
      exchangeId,
      userId: user.id 
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('user:typing', { 
          isTyping: false, 
          exchangeId,
          userId: user.id 
        });
      }, 3000);
    }
  }, [socket, user, exchangeId]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await loadMessages(nextPage);
  }, [hasMore, loading, page, loadMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendFile,
    markAsRead,
    typing,
    setTyping,
    loadMoreMessages,
    hasMore
  };
};