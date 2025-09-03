import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  BellIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  sender_name: string;
  preview: string;
  timestamp: string;
  type: 'email' | 'text' | 'chat';
  is_urgent: boolean;
  exchange_title?: string;
  is_read: boolean;
}

interface CommunicationSidebarProps {
  isVisible?: boolean;
  onToggle?: () => void;
  maxMessages?: number;
}

const MessageTypeIcon: React.FC<{ type: 'email' | 'text' | 'chat', isUrgent?: boolean }> = ({ type, isUrgent }) => {
  const iconClass = `w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-gray-500'}`;
  
  switch (type) {
    case 'email': return <EnvelopeIcon className={iconClass} />;
    case 'text': return <PhoneIcon className={iconClass} />;
    case 'chat': return <ChatBubbleLeftRightIcon className={iconClass} />;
  }
};

const CommunicationSidebar: React.FC<CommunicationSidebarProps> = ({ 
  isVisible = true, 
  onToggle,
  maxMessages = 10 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadRecentMessages();
    // Set up real-time updates here
    const interval = setInterval(loadRecentMessages, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [maxMessages]);

  const loadRecentMessages = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: '1',
          sender_name: 'Robert Johnson',
          preview: 'Urgent: Need clarification on property deed requirements for the exchange...',
          timestamp: '2025-08-18T10:30:00Z',
          type: 'email',
          is_urgent: true,
          exchange_title: 'Johnson Property Exchange',
          is_read: false
        },
        {
          id: '2',
          sender_name: 'Escrow Officer - ABC Title',
          preview: 'Documents ready for review, please confirm receipt and timeline...',
          timestamp: '2025-08-18T09:15:00Z',
          type: 'email',
          is_urgent: true,
          exchange_title: 'Smith Commercial Exchange',
          is_read: false
        },
        {
          id: '3',
          sender_name: 'Sarah Smith',
          preview: 'Thank you for the update. When can we schedule the final walkthrough?',
          timestamp: '2025-08-18T08:45:00Z',
          type: 'chat',
          is_urgent: false,
          exchange_title: 'Smith Commercial Exchange',
          is_read: true
        },
        {
          id: '4',
          sender_name: '+1 (555) 123-4567',
          preview: 'URGENT: Property inspection found issues. Need to discuss ASAP.',
          timestamp: '2025-08-18T08:20:00Z',
          type: 'text',
          is_urgent: true,
          exchange_title: 'Davis Residential Exchange',
          is_read: false
        },
        {
          id: '5',
          sender_name: 'Michael Davis',
          preview: 'Attached are the signed documents you requested. Let me know if...',
          timestamp: '2025-08-18T07:30:00Z',
          type: 'email',
          is_urgent: false,
          exchange_title: 'Davis Residential Exchange',
          is_read: true
        }
      ];
      
      setMessages(mockMessages.slice(0, maxMessages));
      setUnreadCount(mockMessages.filter(m => !m.is_read).length);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleMessageClick = (message: Message) => {
    // Mark as read and navigate to message
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, is_read: true } : m
    ));
    setUnreadCount(prev => Math.max(0, prev - (message.is_read ? 0 : 1)));
    
    // Navigate to appropriate page based on message type
    if (message.type === 'chat') {
      window.location.href = '/messages';
    } else if (message.type === 'email') {
      // Open email client or email page
      console.log('Opening email:', message.id);
    } else if (message.type === 'text') {
      // Open text/SMS interface
      console.log('Opening text message:', message.id);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed right-4 top-20 z-50">
        <button
          onClick={onToggle}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors relative"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white shadow-xl border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Communications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">Latest emails, texts & messages</p>
      </div>
      
      {/* Urgent Messages Alert */}
      {messages.some(m => m.is_urgent && !m.is_read) && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center text-sm text-red-800">
            <BellIcon className="w-4 h-4 mr-2 animate-pulse" />
            <span className="font-medium">
              {messages.filter(m => m.is_urgent && !m.is_read).length} urgent message(s) require attention
            </span>
          </div>
        </div>
      )}
      
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 h-20"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No recent messages</p>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    message.is_urgent && !message.is_read
                      ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                      : !message.is_read
                      ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <MessageTypeIcon type={message.type} isUrgent={message.is_urgent} />
                      <span className={`font-medium text-sm text-gray-900 truncate ${
                        !message.is_read ? 'font-semibold' : ''
                      }`}>
                        {message.sender_name}
                      </span>
                      {message.is_urgent && (
                        <span className="px-1 py-0.5 text-xs bg-red-200 text-red-800 rounded font-medium flex-shrink-0">
                          URGENT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTimeAgo(message.timestamp)}
                    </span>
                  </div>
                  
                  <p className={`text-sm text-gray-700 line-clamp-2 mb-1 ${
                    !message.is_read ? 'font-medium' : ''
                  }`}>
                    {message.preview}
                  </p>
                  
                  {message.exchange_title && (
                    <p className="text-xs text-gray-500 truncate">
                      Re: {message.exchange_title}
                    </p>
                  )}
                  
                  {!message.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-3 right-3"></div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button 
          onClick={() => window.location.href = '/messages'}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm font-medium"
        >
          View All Messages
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors">
            Email
          </button>
          <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors">
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunicationSidebar;