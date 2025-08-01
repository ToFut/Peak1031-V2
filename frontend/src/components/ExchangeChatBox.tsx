import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Exchange } from '../types';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

interface ExchangeChatBoxProps {
  exchange: Exchange;
  className?: string;
}

interface ExchangeParticipant {
  id: string;
  role: string;
  contact?: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  };
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  permissions: {
    canView: boolean;
    canMessage: boolean;
    canUpload: boolean;
    canViewDocuments: boolean;
  };
}

export const ExchangeChatBox: React.FC<ExchangeChatBoxProps> = ({ exchange, className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { user } = useAuth();
  const { socket, connectionStatus } = useSocket();
  const isConnected = connectionStatus === 'connected';

  // Check if current user can access this exchange
  const [hasAccess, setHasAccess] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    if (exchange.id && user) {
      loadExchangeData();
    }
  }, [exchange.id, user]); // loadExchangeData is defined inside this component so it's safe to exclude

  const setupSocketListeners = useCallback(() => {
    if (!socket) return;

    socket.on('new_message', (message: Message) => {
      if (message.exchangeId === exchange.id) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if it's not from current user
        if (message.senderId !== user?.id) {
          setTimeout(() => {
            socket.emit('mark_read', {
              messageId: message.id,
              exchangeId: exchange.id
            });
          }, 1000);
        }
      }
    });

    socket.on('user_typing', (data: { userId: string; name: string; exchangeId: string }) => {
      if (data.exchangeId === exchange.id && data.userId !== user?.id) {
        setIsTyping(prev => [...prev.filter(id => id !== data.userId), data.userId]);
      }
    });

    socket.on('user_stopped_typing', (data: { userId: string; exchangeId: string }) => {
      if (data.exchangeId === exchange.id) {
        setIsTyping(prev => prev.filter(id => id !== data.userId));
      }
    });

    socket.on('user_online', (data: { userId: string; name: string }) => {
      // Handle online users if needed
    });

    socket.on('user_offline', (data: { userId: string }) => {
      // Handle offline users if needed
    });

    socket.on('message_read', (data: { messageId: string; userId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), data.userId] }
          : msg
      ));
    });

    socket.on('join_error', (data: { exchangeId: string; error: string }) => {
      if (data.exchangeId === exchange.id) {
        setError(`Failed to join chat: ${data.error}`);
      }
    });
  }, [socket, exchange.id, user?.id]);

  const joinExchangeRoom = useCallback(() => {
    if (socket && hasAccess) {
      socket.emit('join_exchange', exchange.id);
    }
  }, [socket, hasAccess, exchange.id]);

  useEffect(() => {
    if (socket && hasAccess) {
      setupSocketListeners();
      joinExchangeRoom();
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('user_online');
        socket.off('user_offline');
        socket.off('message_read');
        socket.off('join_error');
      }
    };
  }, [socket, hasAccess, setupSocketListeners, joinExchangeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadExchangeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load exchange participants and check access
      const [exchangeParticipants, exchangeMessages] = await Promise.all([
        apiService.get(`/exchanges/${exchange.id}/participants`),
        apiService.get(`/exchanges/${exchange.id}/messages`)
      ]);

      setParticipants(exchangeParticipants);
      
      // Check if current user has access to this exchange
      const userAccess = exchangeParticipants.some((p: ExchangeParticipant) => 
        (p.user?.email === user?.email) || 
        (p.contact?.email === user?.email) ||
        (user?.role === 'admin') ||
        (user?.role === 'coordinator')
      );

      if (!userAccess) {
        setError('You do not have permission to access this exchange chat.');
        setHasAccess(false);
        return;
      }

      setHasAccess(true);
      
      // Get user permissions
      const userParticipant = exchangeParticipants.find((p: ExchangeParticipant) => 
        p.user?.email === user?.email || p.contact?.email === user?.email
      );
      
      setUserPermissions(userParticipant?.permissions || {});
      setMessages(exchangeMessages);

    } catch (err: any) {
      console.error('Error loading exchange data:', err);
      setError(err.message || 'Failed to load exchange chat');
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };



  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !isConnected || !hasAccess) return;
    
    if (!userPermissions.canMessage) {
      setError('You do not have permission to send messages in this exchange.');
      return;
    }

    try {
      socket.emit('send_message', {
        content: newMessage.trim(),
        exchangeId: exchange.id,
        messageType: 'text'
      });

      setNewMessage('');
      
      // Stop typing indicator
      socket.emit('typing_stop', { exchangeId: exchange.id });
      
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleTyping = () => {
    if (!socket || !hasAccess) return;

    socket.emit('typing_start', { exchangeId: exchange.id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { exchangeId: exchange.id });
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: string | Date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const isOwnMessage = (message: Message) => {
    return message.senderId === user?.id;
  };

  const getMessageSenderName = (message: Message) => {
    if (message.messageType === 'system') return 'System';
    if (isOwnMessage(message)) return 'You';
    
    // Find sender in participants
    const sender = participants.find(p => 
      p.user?.email === message.sender?.email || 
      p.contact?.email === message.sender?.email
    );
    
    if (sender?.user) {
      return `${sender.user.first_name} ${sender.user.last_name}`;
    }
    if (sender?.contact) {
      return `${sender.contact.firstName} ${sender.contact.lastName}`;
    }
    
    return message.sender?.first_name && message.sender?.last_name 
      ? `${message.sender.first_name} ${message.sender.last_name}`
      : 'Unknown User';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">
            {error || 'You do not have permission to access this exchange chat.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-sm border ${className}`} style={{ height: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Exchange Chat</h3>
            <p className="text-sm text-gray-500">{exchange.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Security Indicator */}
          <div className="flex items-center space-x-1 text-sm text-green-600">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Secure Chat</span>
          </div>
          
          {/* Participants Count */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <UserCircleIcon className="h-4 w-4" />
            <span>{participants.length} members</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation with your exchange team!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDate = index === 0 || 
              formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);
            
            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-4">
                    <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}
                
                <div className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.messageType === 'system'
                        ? 'bg-gray-100 text-gray-700 mx-auto text-center text-sm'
                        : isOwnMessage(message)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.messageType !== 'system' && !isOwnMessage(message) && (
                      <p className="text-xs font-medium mb-1 opacity-75">
                        {getMessageSenderName(message)}
                      </p>
                    )}
                    
                    <p className={message.messageType === 'system' ? 'text-xs' : 'text-sm'}>
                      {message.content}
                    </p>
                    
                    {message.attachment && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2 text-xs opacity-75">
                          <PaperClipIcon className="h-4 w-4" />
                          <span>{message.attachment.originalFilename}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        message.messageType === 'system' 
                          ? 'text-gray-500'
                          : isOwnMessage(message) 
                          ? 'text-blue-100' 
                          : 'text-gray-500'
                      }`}>
                        {formatTime(message.createdAt)}
                      </p>
                      
                      {isOwnMessage(message) && message.readBy && (
                        <span className="text-xs text-blue-100">
                          {message.readBy.length > 0 ? `Read by ${message.readBy.length}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicators */}
        {isTyping.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-600">
                {isTyping.length === 1 ? 'Someone is typing...' : `${isTyping.length} people are typing...`}
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        {userPermissions.canMessage !== false ? (
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
                maxLength={1000}
              />
              
              {userPermissions.canUpload && (
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  disabled={!isConnected}
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>Send</span>
            </button>
          </form>
        ) : (
          <div className="text-center py-3 text-gray-500 text-sm">
            You do not have permission to send messages in this exchange.
          </div>
        )}
      </div>
    </div>
  );
};