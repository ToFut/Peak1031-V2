import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, ChatMessage, ChatExchange } from '../services/chatService';
import { useAuth } from './useAuth';

export const useChat = () => {
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<ChatExchange | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const subscriptionsRef = useRef<Map<string, any>>(new Map());

  // Load exchanges for the current user
  const loadExchanges = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const chatExchanges = await chatService.getExchanges(user.id);
      setExchanges(chatExchanges);
    } catch (err: any) {
      console.error('Error loading exchanges:', err);
      setError(err.message || 'Failed to load exchanges');
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
    if (!selectedExchange || !user?.id || !content.trim()) return;

    try {
      setSending(true);
      setError(null);
      
      const newMessage = await chatService.sendMessage({
        content: content.trim(),
        exchange_id: selectedExchange.id,
        sender_id: user.id,
        attachment_id: attachmentId,
        message_type: 'text'
      });

      // Add the new message to the local state
      setMessages(prev => [...prev, newMessage]);
      
      // Update the exchange's last message
      setExchanges(prev => prev.map(ex => 
        ex.id === selectedExchange.id 
          ? { ...ex, last_message: newMessage }
          : ex
      ));
    } catch (err: any) {
      console.error('Error sending message:', err);
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
      const attachmentId = await chatService.uploadAttachment(file, selectedExchange.id);
      
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

    // Subscribe to exchange updates
    const exchangeSubscription = chatService.subscribeToExchanges(
      (updatedExchange: any) => {
        if (updatedExchange.id === selectedExchange.id) {
          setExchanges(prev => prev.map(ex => 
            ex.id === selectedExchange.id 
              ? { ...ex, ...updatedExchange }
              : ex
          ));
          setSelectedExchange(prev => prev ? { ...prev, ...updatedExchange } : null);
        }
      }
    );

    // Store subscriptions for cleanup
    subscriptionsRef.current.set(`messages:${selectedExchange.id}`, messageSubscription);
    subscriptionsRef.current.set(`exchange:${selectedExchange.id}`, exchangeSubscription);

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.delete(`messages:${selectedExchange.id}`);
      subscriptionsRef.current.delete(`exchange:${selectedExchange.id}`);
    };
  }, [selectedExchange?.id, user?.id]);

  // Load exchanges on mount and when user changes
  useEffect(() => {
    loadExchanges();
  }, [loadExchanges]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    // State
    exchanges,
    selectedExchange,
    messages,
    loading,
    sending,
    error,
    
    // Actions
    selectExchange,
    sendMessage,
    sendFile,
    loadExchanges,
    loadMessages,
    
    // Utilities
    clearError: () => setError(null)
  };
}; 