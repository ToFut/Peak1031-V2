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
  const hasInitializedRef = useRef(false);
  const loadingMessagesRef = useRef<string | null>(null);

  // Load exchanges for the current user
  const loadExchanges = useCallback(async (retries = 0) => {
    if (!user?.id) {
      console.warn('⚠️ useChat: Cannot load exchanges - no user ID');
      setLoading(false);
      return [];
    }

    // Clear any pending timeout
    if (loadExchangesTimeoutRef.current) {
      clearTimeout(loadExchangesTimeoutRef.current);
    }

    try {
      console.log('📋 useChat: Loading exchanges for user:', user.id);
      setLoading(true);
      setError(null);
      
      const chatExchanges = await chatService.getExchanges(user.id);
      console.log('✅ useChat: Loaded', chatExchanges.length, 'exchanges');
      
      setExchanges(chatExchanges);
      
      // Return exchanges for auto-selection logic
      return chatExchanges;
    } catch (err: any) {
      console.error('❌ useChat: Error loading exchanges:', err);
      const errorMessage = err.message || 'Failed to load exchanges';
      
      // If it's a server error and we haven't retried, try once more
      if (retries === 0 && errorMessage.includes('Server error')) {
        console.log('🔄 useChat: Retrying exchanges load after server error...');
        setTimeout(() => loadExchanges(1), 2000);
        return [];
      }
      
      // If it's an auth error, clear the token
      if (errorMessage.includes('session has expired') || errorMessage.includes('Authentication')) {
        localStorage.removeItem('token');
        setError('Your session has expired. Please refresh the page to log in again.');
        return [];
      }
      
      setError(errorMessage);
      
      // If it's a rate limit error, retry after a delay
      if (errorMessage.includes('Too many requests')) {
        console.log('⏱️ useChat: Rate limited, retrying in 5 seconds...');
        loadExchangesTimeoutRef.current = setTimeout(() => {
          loadExchanges(retries + 1);
        }, 5000);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load messages for a specific exchange
  const loadMessages = useCallback(async (exchangeId: string, retries = 0) => {
    // Prevent duplicate loading
    if (loadingMessagesRef.current === exchangeId) {
      console.log('⏭️ useChat: Already loading messages for exchange:', exchangeId);
      return;
    }
    
    try {
      console.log('📥 useChat: Loading messages for exchange:', exchangeId);
      loadingMessagesRef.current = exchangeId;
      setError(null);
      
      const chatMessages = await chatService.getMessages(exchangeId);
      console.log('✅ useChat: Loaded', chatMessages.length, 'messages');
      
      setMessages(chatMessages);
      
      // Mark messages as read
      if (user?.id) {
        const unreadMessages = chatMessages.filter(
          msg => msg.sender_id !== user.id && !msg.read_by?.includes(user.id)
        );
        
        if (unreadMessages.length > 0) {
          console.log('🔍 useChat: Marking', unreadMessages.length, 'messages as read');
          try {
            await chatService.markAsRead(
              unreadMessages.map(msg => msg.id),
              user.id
            );
          } catch (readError) {
            console.warn('⚠️ useChat: Failed to mark messages as read:', readError);
            // Don't throw - read receipts are not critical
          }
        }
      }
    } catch (err: any) {
      console.error('❌ useChat: Error loading messages:', err);
      
      const errorMessage = err.message || 'Failed to load messages';
      
      // If it's a server error and we haven't retried, try once more
      if (retries === 0 && errorMessage.includes('Server error')) {
        console.log('🔄 useChat: Retrying message load after server error...');
        setTimeout(() => loadMessages(exchangeId, 1), 2000);
        return;
      }
      
      // If it's an auth error, clear the token
      if (errorMessage.includes('session has expired') || errorMessage.includes('Authentication')) {
        localStorage.removeItem('token');
        setError('Your session has expired. Please refresh the page to log in again.');
        return;
      }
      
      // Set specific error messages for better UX
      if (errorMessage.includes('not found')) {
        setError('This exchange no longer exists or you no longer have access to it.');
      } else if (errorMessage.includes('permission')) {
        setError('You do not have permission to view messages in this exchange.');
      } else {
        setError(errorMessage);
      }
      
      // Clear messages on error to avoid showing stale data
      setMessages([]);
    } finally {
      // Clear loading state
      if (loadingMessagesRef.current === exchangeId) {
        loadingMessagesRef.current = null;
      }
    }
  }, [user?.id]);

  // Select an exchange and load its messages
  const selectExchange = useCallback(async (exchange: ChatExchange) => {
    try {
      console.log('🎯 useChat: Selecting exchange:', exchange.id, exchange.exchange_name);
      
      // Clear previous state
      setSelectedExchange(exchange);
      setMessages([]);
      setError(null);
      setTypingUsers(new Set());
      
      // Load messages for the selected exchange
      await loadMessages(exchange.id);
      
    } catch (err: any) {
      console.error('❌ useChat: Error selecting exchange:', err);
      setError(err.message || 'Failed to select exchange');
    }
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

  // Upload and send file attachment with optional message and PIN protection
  const sendFile = useCallback(async (file: File, message?: string, pinRequired: boolean = false, pin?: string) => {
    if (!selectedExchange || !user?.id) return;

    try {
      setSending(true);
      setError(null);
      
      console.log('📤 useChat: Uploading file with parameters:', {
        fileName: file.name,
        exchangeId: selectedExchange.id,
        pinRequired,
        hasMessage: !!message
      });
      
      // Upload the file with exchange ID and PIN settings
      const attachmentId = await chatService.uploadFile(
        file, 
        selectedExchange.id, 
        'chat', // category
        pinRequired, 
        pin
      );
      
      console.log('✅ useChat: File uploaded, attachment ID:', attachmentId);
      
      // Send message with attachment
      const messageContent = message || `📎 ${file.name}`;
      await sendMessage(messageContent, attachmentId);
      
      console.log('✅ useChat: Message with attachment sent successfully');
    } catch (err: any) {
      console.error('❌ useChat: Error sending file:', err);
      setError(err.message || 'Failed to send file');
      throw new Error(err.message || 'Failed to send file'); // Re-throw so UI can handle it
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
    let mounted = true;
    
    const initializeExchanges = async () => {
      // Prevent duplicate initialization
      if (hasInitializedRef.current) {
        console.log('⏭️ useChat: Already initialized, skipping...');
        return;
      }
      
      try {
        console.log('🚀 useChat: Initializing exchanges...');
        hasInitializedRef.current = true;
        const exchanges = await loadExchanges();
        
        if (!mounted) return; // Prevent state updates if unmounted
        
        // Auto-select first exchange if none selected and exchanges exist
        if (exchanges && exchanges.length > 0 && !selectedExchange) {
          // Double-check we still don't have a selected exchange (race condition prevention)
          setSelectedExchange((currentSelected) => {
            if (!currentSelected) {
              console.log('🎯 useChat: Auto-selecting first exchange:', exchanges[0].exchange_name);
              selectExchange(exchanges[0]);
              return exchanges[0];
            }
            return currentSelected;
          });
        } else if (exchanges && exchanges.length === 0) {
          console.log('📋 useChat: No exchanges found for user');
          setMessages([]);
        }
      } catch (err) {
        console.error('❌ useChat: Failed to initialize exchanges:', err);
        hasInitializedRef.current = false; // Reset on error
      }
    };
    
    if (user?.id) {
      initializeExchanges();
    }
    
    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only depend on user.id

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