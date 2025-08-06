import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../services/chatService';
import ExchangeParticipantsManager from './ExchangeParticipantsManager';
import StatusBadge from './ui/StatusBadge';
import DebugChatInfo from './DebugChatInfo';
import { 
  PaperAirplaneIcon,
  PaperClipIcon,
  UserCircleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BoltIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon as CheckSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';

const UnifiedChatInterface: React.FC = () => {
  const {
    exchanges,
    selectedExchange,
    messages,
    loading,
    sending,
    error,
    typingUsers,
    selectExchange,
    sendMessage,
    sendFile,
    clearError,
    loadExchanges,
    handleTyping,
    stopTypingIndicator
  } = useChat();

  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enhanced message send with better UX
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      stopTypingIndicator();
      await sendMessage(newMessage);
      setNewMessage('');
      if (messageInputRef.current) {
        messageInputRef.current.style.height = '40px';
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Enhanced input change with auto-resize and typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = '40px';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    if (value.trim()) {
      handleTyping();
    } else {
      stopTypingIndicator();
    }
  };

  // Enhanced file upload with drag & drop and validation
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size must be less than 50MB');
      return;
    }

    try {
      await sendFile(file);
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Enhanced timestamp formatting
  const formatTime = (date: string | Date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if message is from current user
  const isOwnMessage = (message: ChatMessage) => {
    return message.sender_id === user?.id;
  };

  // Get message sender info with enhanced data
  const getMessageSender = (message: ChatMessage) => {
    if (message.sender) {
      return {
        name: `${message.sender.first_name} ${message.sender.last_name}`,
        initials: `${message.sender.first_name?.[0] || ''}${message.sender.last_name?.[0] || ''}`
      };
    }
    return {
      name: 'Unknown User',
      initials: 'U'
    };
  };

  // Filter exchanges based on search
  const filteredExchanges = exchanges.filter(exchange =>
    exchange.exchange_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exchange.participants.some(p => 
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );



  // Enhanced loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-700 font-medium">Loading your conversations...</p>
          <p className="text-gray-500 text-sm mt-1">Setting up secure chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
      {/* Enhanced Sidebar */}
      <div className="w-80 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col">
        {/* Enhanced Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BoltIcon className="w-6 h-6 text-blue-600 mr-2" />
              Conversations
            </h2>
            <button
              onClick={loadExchanges}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* Enhanced Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* Enhanced Exchange List */}
        <div className="flex-1 overflow-y-auto">
          {filteredExchanges.length === 0 ? (
            <div className="p-6 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No conversations found</p>
              <p className="text-gray-400 text-sm mt-1">You'll see your exchanges here</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredExchanges.map((exchange) => (
                <div
                  key={exchange.id}
                  onClick={() => selectExchange(exchange)}
                  className={`p-4 cursor-pointer rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    selectedExchange?.id === exchange.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-[1.02]'
                      : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold truncate ${
                          selectedExchange?.id === exchange.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {exchange.exchange_name}
                        </h3>
                        {exchange.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium min-w-[20px] text-center">
                            {exchange.unread_count > 99 ? '99+' : exchange.unread_count}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          exchange.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : exchange.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {exchange.status}
                        </span>
                        <span className={`text-xs ${
                          selectedExchange?.id === exchange.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {exchange.participants.length} members
                        </span>
                      </div>

                      {exchange.last_message && (
                        <p className={`text-sm mt-2 truncate ${
                          selectedExchange?.id === exchange.id ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {exchange.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedExchange ? (
          <>
            {/* Enhanced Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    {selectedExchange.participants.slice(0, 3).map((participant, index) => (
                      <div
                        key={participant.id}
                        className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-white"
                        title={`${participant.first_name} ${participant.last_name}`}
                      >
                        {participant.first_name?.[0]}{participant.last_name?.[0]}
                      </div>
                    ))}
                    {selectedExchange.participants.length > 3 && (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm border-2 border-white">
                        +{selectedExchange.participants.length - 3}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      {selectedExchange.exchange_name}
                      {selectedExchange.status === 'ACTIVE' && (
                        <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse"></div>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedExchange.participants.length} participants • Secure chat
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {(user?.role === 'admin' || user?.role === 'coordinator') && (
                    <button
                      onClick={() => setShowParticipantsManager(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Manage Participants"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setShowParticipants(!showParticipants)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Show participants"
                  >
                    <UserGroupIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <PhoneIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Messages Area */}
            <div
              className={`flex-1 overflow-y-auto p-4 space-y-4 relative ${
                dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 z-10">
                  <div className="text-center">
                    <PaperClipIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-blue-700 font-medium">Drop files here to upload</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                    <button
                      onClick={clearError}
                      className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Start the conversation!</p>
                  <p className="text-gray-500">Send your first message to begin collaborating with your team.</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const showDate = index === 0 || 
                    new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
                  const sender = getMessageSender(message);
                  const isOwn = isOwnMessage(message);
                  
                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center my-6">
                          <span className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full font-medium">
                            {new Date(message.created_at).toLocaleDateString([], {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`flex items-end space-x-2 max-w-lg ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isOwn && (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {sender.initials}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                              isOwn
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-semibold mb-1 opacity-70">
                                {sender.name}
                              </p>
                            )}
                            
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            
                            {message.attachment && (
                              <div className="mt-3 p-2 rounded-lg bg-black/10 flex items-center space-x-2">
                                <PaperClipIcon className="h-4 w-4 opacity-70" />
                                <span className="text-xs opacity-70">{message.attachment.original_filename}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                {formatTime(message.created_at)}
                              </p>
                              
                              {isOwn && (
                                <div className="flex items-center space-x-1">
                                  <CheckSolidIcon className="h-3 w-3 text-blue-200" />
                                  <CheckSolidIcon className="h-3 w-3 text-blue-200 -ml-1" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600">
                            <HeartIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Enhanced Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Message Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Attach file"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onBlur={stopTypingIndicator}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                    disabled={sending}
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  
                  <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      😊
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </button>
              </form>
              
              <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Next-Gen Chat</h3>
              <p className="text-gray-600 mb-4">Select a conversation from the sidebar to start messaging with your team.</p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <BoltIcon className="w-4 h-4 mr-1" />
                  Real-time
                </div>
                <div className="flex items-center">
                  <CheckSolidIcon className="w-4 h-4 mr-1" />
                  Secure
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="w-4 h-4 mr-1" />
                  Modern
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Participants Sidebar */}
      {showParticipants && selectedExchange && (
        <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-10">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Participants</h3>
            <button
              onClick={() => setShowParticipants(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {selectedExchange.participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {participant.first_name?.[0]}{participant.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {participant.first_name} {participant.last_name}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{participant.role}</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants Manager Modal */}
      {selectedExchange && (
        <ExchangeParticipantsManager
          exchangeId={selectedExchange.id}
          isOpen={showParticipantsManager}
          onClose={() => setShowParticipantsManager(false)}
          onParticipantsChange={() => {
            // Refresh exchange data to update participant count
            loadExchanges();
          }}
        />
      )}
      
      {/* Debug Info in Development */}
      <DebugChatInfo />
    </div>
  );
};

export default UnifiedChatInterface;