import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, ChatMessage, ChatExchange } from '../../../services/chatService';
import { useAuth } from '../../../hooks/useAuth';

export const useChat = () => {
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<ChatExchange | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const subscriptionsRef = useRef<Map<string, any>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadExchangesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load exchanges for the current user
  const loadExchanges = useCallback(async () => {
    if (!user?.id) return;

    // Clear any pending timeout
    if (loadExchangesTimeoutRef.current) {
      clearTimeout(loadExchangesTimeoutRef.current);
    }

    try {
      setLoading(true);
      setError(null);
      const chatExchanges = await chatService.getExchanges(user.id);
      
      setExchanges(chatExchanges);
      
      // Return exchanges for auto-selection logic
      return chatExchanges;
    } catch (err: any) {
      console.error('Error loading exchanges:', err);
      const errorMessage = err.message || 'Failed to load exchanges';
      setError(errorMessage);
      
      // If it's a rate limit error, retry after a delay
      if (errorMessage.includes('Too many requests')) {
        loadExchangesTimeoutRef.current = setTimeout(() => {
          loadExchanges();
        }, 5000); // Retry after 5 seconds
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load messages for a specific exchange
  const loadMessages = useCallback(async (exchangeId: string) => {
    try {
      setError(null);
      const chatMessages = await chatService.getMessages(exchangeId);
      setMessages(chatMessages);
      
      // Mark messages as read
      const unreadMessages = chatMessages.filter(
        msg => msg.sender_id !== user?.id && !msg.read_by?.includes(user?.id || '')
      );
      if (unreadMessages.length > 0) {
        await chatService.markAsRead(
          unreadMessages.map(msg => msg.id),
          user?.id || ''
        );
      }
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
    }
  }, [user?.id]);

  // Select an exchange and load its messages
  const selectExchange = useCallback(async (exchange: ChatExchange) => {
    setSelectedExchange(exchange);
    await loadMessages(exchange.id);
  }, [loadMessages]);

  // Send a message
  const sendMessage = useCallback(async (content: string, attachmentId?: string) => {
    if (!selectedExchange || !user?.id || !content.trim()) {
      console.warn('❌ Cannot send message - missing requirements:', {
        selectedExchange: !!selectedExchange,
        userId: !!user?.id,
        content: !!content.trim()
      });
      return;
    }

    try {
      setSending(true);
      setError(null);
      
      const messageData = {
        content: content.trim(),
        exchange_id: selectedExchange.id,
        sender_id: user.id,
        attachment_id: attachmentId,
        message_type: 'text' as const
      };

      const newMessage = await chatService.sendMessage(messageData);

      

      // Add the new message to the local state
      setMessages(prev => {
        const updated = [...prev, newMessage];
        
        return updated;
      });
      
      // Update the exchange's last message
      setExchanges(prev => prev.map(ex => 
        ex.id === selectedExchange.id 
          ? { ...ex, last_message: newMessage }
          : ex
      ));

      
    } catch (err: any) {
      console.error('❌ useChat: Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [selectedExchange, user?.id]);

  // Upload and send file attachment
  const sendFile = useCallback(async (file: File) => {
    if (!selectedExchange || !user?.id) return;

    try {
      setSending(true);
      setError(null);
      
      // Upload the file
      const attachmentId = await chatService.uploadFile(file);
      
      // Send message with attachment
      await sendMessage(`📎 ${file.name}`, attachmentId);
    } catch (err: any) {
      console.error('Error sending file:', err);
      setError(err.message || 'Failed to send file');
    } finally {
      setSending(false);
    }
  }, [selectedExchange, user?.id, sendMessage]);

  // Subscribe to real-time updates for selected exchange
  useEffect(() => {
    if (!selectedExchange) return;

    // Subscribe to new messages
    const messageSubscription = chatService.subscribeToMessages(
      selectedExchange.id,
      (newMessage: ChatMessage) => {
        setMessages(prev => {
          // Check if message already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Mark as read if it's not from current user
        if (newMessage.sender_id !== user?.id) {
          chatService.markAsRead([newMessage.id], user?.id || '');
        }

        // Update exchange's last message
        setExchanges(prev => prev.map(ex => 
          ex.id === selectedExchange.id 
            ? { ...ex, last_message: newMessage }
            : ex
        ));
      }
    );

    // Subscribe to typing indicators
    const typingSubscription = chatService.subscribeToTyping(
      selectedExchange.id,
      (data: { userId: string; name: string; isTyping: boolean }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping && data.userId !== user?.id) {
            newSet.add(data.name || data.userId);
          } else {
            newSet.delete(data.name || data.userId);
          }
          return newSet;
        });
      }
    );

    // Subscribe to exchange updates - commented out as method doesn't exist yet
    // const exchangeSubscription = chatService.subscribeToExchanges(
    //   (updatedExchange: any) => {
    //     if (updatedExchange.id === selectedExchange.id) {
    //       setExchanges(prev => prev.map(ex => 
    //         ex.id === selectedExchange.id 
    //           ? { ...ex, ...updatedExchange }
    //           : ex
    //       ));
    //       setSelectedExchange(prev => prev ? { ...prev, ...updatedExchange } : null);
    //     }
    //   }
    // );

    // Store subscriptions for cleanup
    subscriptionsRef.current.set(`messages:${selectedExchange.id}`, messageSubscription);
    subscriptionsRef.current.set(`typing:${selectedExchange.id}`, typingSubscription);

    return () => {
      // Cleanup subscriptions
      const currentSubscriptions = subscriptionsRef.current;
      currentSubscriptions.delete(`messages:${selectedExchange.id}`);
      currentSubscriptions.delete(`typing:${selectedExchange.id}`);
      chatService.unsubscribeFromMessages(selectedExchange.id);
      typingSubscription();
      
      // Clear typing users when leaving exchange
      setTypingUsers(new Set());
    };
  }, [selectedExchange?.id, user?.id]);

  // Initialize socket connection when user is available
  useEffect(() => {
    if (user?.id) {
      const token = localStorage.getItem('token');
      if (token) {
        chatService.initializeSocket(token);
      }
    }
    
    return () => {
      chatService.disconnect();
    };
  }, [user?.id]);

  // Load exchanges on mount and when user changes
  useEffect(() => {
    const initializeExchanges = async () => {
      const exchanges = await loadExchanges();
      
      // Auto-select first exchange if none selected
      if (exchanges && exchanges.length > 0 && !selectedExchange) {
        
        await selectExchange(exchanges[0]);
      }
    };
    
    initializeExchanges();
  }, [loadExchanges, selectedExchange, selectExchange]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.clear();
    };
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!selectedExchange) return;
    
    chatService.startTyping(selectedExchange.id);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedExchange) {
        chatService.stopTyping(selectedExchange.id);
      }
    }, 3000);
  }, [selectedExchange]);

  const stopTypingIndicator = useCallback(() => {
    if (!selectedExchange) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    chatService.stopTyping(selectedExchange.id);
  }, [selectedExchange]);

  return {
    // State
    exchanges,
    selectedExchange,
    messages,
    loading,
    sending,
    error,
    typingUsers,
    
    // Actions
    selectExchange,
    sendMessage,
    sendFile,
    loadExchanges,
    loadMessages,
    handleTyping,
    stopTypingIndicator,
    
    // Utilities
    clearError: () => setError(null)
  };
}; 