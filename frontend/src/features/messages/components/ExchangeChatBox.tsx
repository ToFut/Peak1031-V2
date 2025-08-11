import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Exchange } from '../../../types';
import { useSocket } from '../../../hooks/useSocket';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import { ChatDocumentViewer } from '../../../components/shared';
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

  // Define loadExchangeData first
  const loadExchangeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load exchange participants and check access
      const [exchangeParticipants, exchangeMessages] = await Promise.all([
        apiService.get(`/exchange-participants?exchange_id=${exchange.id}`),
        apiService.get(`/messages/exchange/${exchange.id}`)
      ]);

      // Check if user has access to this exchange
      const userParticipant = exchangeParticipants.find((p: ExchangeParticipant) => 
        (p.user && p.user.email === user?.email) || 
        (p.contact && p.contact.email === user?.email)
      );

      if (!userParticipant) {
        setError('You do not have access to this exchange');
        setHasAccess(false);
        return;
      }

      setHasAccess(true);
      setParticipants(exchangeParticipants);
      setMessages(exchangeMessages || []);

    } catch (err: any) {
      console.error('Error loading exchange data:', err);
      setError(err.message || 'Failed to load exchange data');
    } finally {
      setLoading(false);
    }
  }, [exchange.id, user?.email]);

  useEffect(() => {
    if (exchange.id && user) {
      loadExchangeData();
    }
  }, [exchange.id, user, loadExchangeData]);

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
    <div className={`flex flex-col bg-gray-50 rounded-xl shadow-lg border border-gray-200 ${className}`} style={{ height: '650px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <ChatBubbleLeftIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Exchange Chat</h3>
            <p className="text-sm text-gray-500 truncate max-w-xs">{exchange.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="hidden md:flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Participants Count */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <UserCircleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{participants.length} members</span>
            <span className="sm:hidden">{participants.length}</span>
          </div>
          
          {/* Security Indicator */}
          <div className="hidden lg:flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <ShieldCheckIcon className="h-3 w-3" />
            <span>Secure</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-gray-100">
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
          <div className="text-center text-gray-500 py-12">
            <div className="bg-gray-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <ChatBubbleLeftIcon className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-sm text-gray-500">Start the conversation with your exchange team!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDate = index === 0 || 
              formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);
            const isOwn = isOwnMessage(message);
            const showSender = !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            
            return (
              <div key={message.id} className="mb-1">
                {showDate && (
                  <div className="text-center my-6">
                    <span className="px-3 py-1 text-xs text-gray-500 bg-white shadow-sm border rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}
                
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                    {showSender && !isOwn && (
                      <p className="text-xs font-medium text-gray-600 mb-1 px-3">
                        {getMessageSenderName(message)}
                      </p>
                    )}
                    
                    <div
                      className={`px-3 py-2 relative ${
                        message.messageType === 'system'
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 mx-auto text-center text-sm rounded-lg'
                          : isOwn
                          ? 'bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md shadow-sm'
                          : 'bg-white text-gray-900 rounded-r-2xl rounded-tl-2xl rounded-bl-md shadow-sm border border-gray-100'
                      }`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                      
                      {message.attachment && (
                        <div className="mt-3">
                          <ChatDocumentViewer 
                            document={{
                              id: message.attachment.id,
                              original_filename: message.attachment.originalFilename || message.attachment.original_filename || message.attachment.filename,
                              file_size: message.attachment.fileSize || message.attachment.file_size || 0,
                              mime_type: message.attachment.mimeType || message.attachment.mime_type || 'application/octet-stream',
                              pin_required: message.attachment.pinRequired,
                              category: message.attachment.category || 'general',
                              description: message.attachment.description,
                              created_at: (message.attachment.createdAt || message.attachment.created_at || new Date().toISOString()) as string
                            }}
                            className="max-w-sm"
                          />
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isOwn ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        <span className="text-xs">
                          {formatTime(message.createdAt)}
                        </span>
                        
                        {isOwn && (
                          <div className="flex items-center space-x-1">
                            {message.readBy && message.readBy.length > 0 ? (
                              <div className="flex items-center">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-4 h-4 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicators */}
        {isTyping.length > 0 && (
          <div className="flex justify-start mb-2">
            <div className="bg-white shadow-sm border border-gray-100 px-4 py-3 rounded-r-2xl rounded-tl-2xl rounded-bl-md max-w-xs">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {isTyping.length === 1 ? 'typing' : `${isTyping.length} typing`}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        {userPermissions.canMessage !== false ? (
          <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
            <div className="flex-1 flex items-end space-x-2">
              {userPermissions.canUpload && (
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                  disabled={!isConnected}
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
              )}
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
                  disabled={!isConnected}
                  maxLength={1000}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className={`p-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                newMessage.trim() && isConnected
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
              You do not have permission to send messages in this exchange.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};