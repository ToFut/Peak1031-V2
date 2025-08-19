import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../../../hooks/useAuth';
import { useSocket } from '../../../hooks/useSocket';
import { useChatTasks } from '../../../hooks/useChatTasks';
import { ChatMessage } from '../../../services/chatService';
// import ExchangeParticipantsManager from '../../../components/ExchangeParticipantsManager'; // Component not found
import StatusBadge from '../../../components/ui/StatusBadge';
import DebugChatInfo from './DebugChatInfo';
import { FileAttachmentPreview, ChatDocumentViewer } from '../../../components/shared';
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
  HeartIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon as CheckSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';

interface UnifiedChatInterfaceProps {
  exchangeId?: string;  // Optional: If provided, locks to this exchange only
  hideExchangeList?: boolean;  // Optional: Hide the exchange list sidebar
}

const UnifiedChatInterface: React.FC<UnifiedChatInterfaceProps> = ({ 
  exchangeId,
  hideExchangeList = false 
}) => {
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
  const { connectionStatus } = useSocket();
  const isConnected = connectionStatus === 'connected';
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | '45' | '180'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Chat task functionality
  const {
    parseTaskFromMessage,
    formatMessageWithMentions,
    renderTaskCreationIndicator,
    getTaskPreview,
    renderTaskPreview
  } = useChatTasks();
  
  const [taskPreview, setTaskPreview] = useState<any>(null);
  
  // @mention autocomplete state
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // If exchangeId is provided, auto-select that exchange
  useEffect(() => {
    if (exchangeId && exchanges.length > 0) {
      const targetExchange = exchanges.find(ex => ex.id === exchangeId);
      if (targetExchange && (!selectedExchange || selectedExchange.id !== exchangeId)) {
        selectExchange(targetExchange);
      }
    }
  }, [exchangeId, exchanges, selectedExchange, selectExchange]);

  // Enhanced message send with better UX and error handling
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const originalMessage = newMessage;
    
    try {
      console.log('📤 UnifiedChatInterface: Sending message...');
      stopTypingIndicator();
      
      // Clear message optimistically for better UX
      setNewMessage('');
      if (messageInputRef.current) {
        messageInputRef.current.style.height = '40px';
      }
      
      await sendMessage(originalMessage);
      console.log('✅ UnifiedChatInterface: Message sent successfully');
      
    } catch (err: any) {
      console.error('❌ UnifiedChatInterface: Error sending message:', err);
      
      // Restore message if sending failed
      setNewMessage(originalMessage);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        messageInputRef.current.style.height = '40px';
        messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 120) + 'px';
      }
      
      // Show user-friendly error message
      const errorMessage = err.message || 'Failed to send message';
      if (errorMessage.includes('session has expired')) {
        alert('Your session has expired. Please refresh the page to continue.');
      } else if (errorMessage.includes('permission')) {
        alert('You do not have permission to send messages to this exchange.');
      } else {
        alert(`Failed to send message: ${errorMessage}`);
      }
    }
  };

  // Enhanced input change with auto-resize, typing indicators, and @mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewMessage(value);
    setCursorPosition(cursorPos);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = '40px';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    if (value.trim()) {
      handleTyping();
    } else {
      stopTypingIndicator();
    }
    
    // Check for @mention at cursor position (but exclude @task/@TASK)
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch && selectedExchange?.participants) {
      const query = mentionMatch[1].toLowerCase();
      
      // Skip @mention autocomplete if this is a @task command
      if (query === 'task') {
        setShowMentionSuggestions(false);
        setMentionSuggestions([]);
        
        // Show task preview when typing @task
        const taskPreviewData = getTaskPreview(value, []);
        setTaskPreview(taskPreviewData);
        return;
      }
      setMentionQuery(query);
      
      console.log('🔍 @mention detection:', {
        query,
        participantCount: selectedExchange.participants.length,
        participants: selectedExchange.participants
      });
      
      // Filter participants based on query
      const filtered = selectedExchange.participants.filter(participant => {
        // Handle both backend (first_name, last_name) and frontend (firstName, lastName) formats
        const firstName = (participant.first_name || participant.firstName || '')?.toLowerCase();
        const lastName = (participant.last_name || participant.lastName || '')?.toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = participant.email?.toLowerCase() || '';
        
        console.log('🔍 Checking participant:', {
          participant,
          firstName,
          lastName,
          email,
          query,
          matches: {
            firstName: firstName.includes(query),
            lastName: lastName.includes(query),
            fullName: fullName.includes(query),
            email: email.includes(query)
          }
        });
        
        // Empty query shows all participants
        if (query === '') {
          return true;
        }
        
        return firstName.includes(query) || 
               lastName.includes(query) || 
               fullName.includes(query) ||
               email.includes(query);
      });
      
      setMentionSuggestions(filtered);
      setShowMentionSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setMentionSuggestions([]);
      setMentionQuery('');
      
      // Clear task preview if no @task in message
      if (!value.includes('@task')) {
        setTaskPreview(null);
      }
    }
    
    // Check for task command
    const { hasTask, mentions } = parseTaskFromMessage(value);
    if (hasTask) {
      const preview = getTaskPreview(value, mentions);
      setTaskPreview(preview);
    } else {
      setTaskPreview(null);
    }
  };

  // Handle keyboard navigation for mention suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : mentionSuggestions.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < mentionSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Tab':
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            insertMention(mentionSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowMentionSuggestions(false);
          break;
      }
    }
  };

  // Insert selected mention into message
  const insertMention = (participant: any) => {
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const textAfterCursor = newMessage.substring(cursorPosition);
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const mentionText = `@${participant.first_name || participant.firstName || 'user'}`;
    
    const newText = beforeMention + mentionText + ' ' + textAfterCursor;
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    
    // Focus back to textarea and position cursor
    setTimeout(() => {
      if (messageInputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        messageInputRef.current.focus();
        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Enhanced file upload with drag & drop, validation, and better error handling
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size must be less than 50MB');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'text/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
      alert('File type not supported. Please upload images, PDFs, Word documents, or text files.');
      return;
    }

    // Show the file attachment preview instead of immediately uploading
    setPendingFile(file);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle sending file with message from preview modal
  const handleSendFileWithMessage = async (message: string, file: File, pinRequired: boolean, pin?: string) => {
    try {
      setUploadingFile(true);
      console.log('📤 UnifiedChatInterface: Uploading file with message:', file.name, file.size + ' bytes', 'PIN required:', pinRequired);
      
      // Use sendFile method which should handle the file upload and message creation
      await sendFile(file, message, pinRequired, pin);
      
      console.log('✅ UnifiedChatInterface: File with message uploaded successfully');
      setPendingFile(null); // Close the preview modal
    } catch (err: any) {
      console.error('❌ UnifiedChatInterface: Error uploading file with message:', err);
      
      const errorMessage = err.message || 'Failed to upload file';
      if (errorMessage.includes('session has expired')) {
        alert('Your session has expired. Please refresh the page to continue.');
      } else if (errorMessage.includes('permission')) {
        alert('You do not have permission to upload files to this exchange.');
      } else if (errorMessage.includes('size')) {
        alert('File is too large. Please choose a smaller file.');
      } else {
        alert(`Failed to upload file: ${errorMessage}`);
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle canceling file attachment
  const handleCancelFileAttachment = () => {
    setPendingFile(null);
    setUploadingFile(false);
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

  // Format exchange name to E-XXXX format
  const formatExchangeName = (exchange: any) => {
    if (!exchange) return 'Unknown Exchange';
    
    // Try to extract numeric ID from various possible ID formats
    let numericId = '';
    if (exchange.id) {
      // If ID is already numeric, use it
      if (/^\d+$/.test(exchange.id)) {
        numericId = exchange.id;
      } else {
        // Extract numbers from UUID or other formats
        const numbers = exchange.id.replace(/\D/g, '');
        if (numbers) {
          numericId = numbers.slice(-4); // Use last 4 digits
        }
      }
    }
    
    // If we couldn't get a numeric ID, create one from the exchange name
    if (!numericId && exchange.exchange_name) {
      const hash = exchange.exchange_name.split('').reduce((a: number, b: string) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      numericId = Math.abs(hash).toString().slice(-4);
    }
    
    // Fallback to a random 4-digit number
    if (!numericId) {
      numericId = Math.floor(1000 + Math.random() * 9000).toString();
    }
    
    return `E-${numericId}`;
  };

  // Navigate to exchange details page
  const handleExchangeNameClick = (e: React.MouseEvent, exchange: any) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    navigate(`/exchanges/${exchange.id}`);
  };

  // Get days until closing for an exchange
  const getDaysUntilClosing = (exchange: any) => {
    if (!exchange.completionDeadline && !exchange.completion_deadline) return null;
    const closingDate = exchange.completionDeadline || exchange.completion_deadline;
    const closing = new Date(closingDate);
    const today = new Date();
    const diffTime = closing.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter exchanges based on search and status
  const filteredExchanges = exchanges.filter(exchange => {
    // Search filter
    const exchangeName = exchange.exchange_name || '';
    const matchesSearch = exchangeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exchange.participants.some(p => {
        const firstName = p.first_name || '';
        const lastName = p.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (statusFilter === 'all') return true;
    
    if (statusFilter === 'active') {
      return exchange.status === 'In Progress' || exchange.status === 'PENDING' || exchange.status === '45D' || exchange.status === '180D';
    }
    
    if (statusFilter === 'closed') {
      return exchange.status === 'COMPLETED' || exchange.status === 'TERMINATED' || exchange.status === 'Completed' || exchange.status === 'Cancelled';
    }
    
    const daysUntilClosing = getDaysUntilClosing(exchange);
    
    if (statusFilter === '45') {
      return daysUntilClosing !== null && daysUntilClosing <= 45 && daysUntilClosing > 0;
    }
    
    if (statusFilter === '180') {
      return daysUntilClosing !== null && daysUntilClosing <= 180 && daysUntilClosing > 0;
    }
    
    return true;
  });

  // Enhanced loading state with error handling
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center max-w-md px-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-700 font-medium">Loading your conversations...</p>
          <p className="text-gray-500 text-sm mt-1">Setting up secure chat</p>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={() => {
                      clearError();
                      loadExchanges();
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Show empty state if no exchanges and not loading
  if (!loading && exchanges.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center max-w-md px-6">
          <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations</h3>
          <p className="text-gray-500 mb-6">You don't have access to any exchanges yet. Contact your administrator to get started.</p>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-red-800">Error Loading Exchanges</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={() => {
                      clearError();
                      loadExchanges();
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => loadExchanges()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 via-white to-blue-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50">
      {/* Enhanced Sidebar - Only show if not hidden and no specific exchangeId */}
      {!hideExchangeList && !exchangeId && (
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Enhanced Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <BoltIcon className="w-6 h-6 text-blue-600 mr-2" />
                  Conversations
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadExchanges()}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh conversations"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-2 w-full">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => loadExchanges()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh conversations"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Enhanced Search and Filter */}
          {!sidebarCollapsed && (
          <div className="space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search exchanges or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>
            
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  All Exchanges
                </span>
              </button>
              
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'active'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                  Active
                </span>
              </button>
              
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'closed'
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <CheckIcon className="w-3 h-3" />
                  Closed
                </span>
              </button>
              
              <button
                onClick={() => setStatusFilter('45')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === '45'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <BoltIcon className="w-3 h-3" />
                  45 Days
                </span>
              </button>
              
              <button
                onClick={() => setStatusFilter('180')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === '180'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <HeartIcon className="w-3 h-3" />
                  180 Days
                </span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Enhanced Exchange List */}
        <div className="flex-1 overflow-y-auto">
          {filteredExchanges.length === 0 ? (
            <div className={`${sidebarCollapsed ? 'p-2' : 'p-6'} text-center`}>
              {!sidebarCollapsed ? (
                <>
                  <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No conversations found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery ? 'Try a different search term' : 'You\'ll see your exchanges here'}
                  </p>
                  {statusFilter !== 'all' && (
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              ) : (
                <UserGroupIcon className="w-8 h-8 text-gray-300 mx-auto" />
              )}
            </div>
          ) : (
            <div className={`${sidebarCollapsed ? 'p-1' : 'p-2'} space-y-1`}>
              {filteredExchanges.map((exchange) => {
                const daysUntilClosing = getDaysUntilClosing(exchange);
                return (
                  <div
                    key={exchange.id}
                    onClick={() => selectExchange(exchange)}
                    className={`${sidebarCollapsed ? 'p-2' : 'p-4'} cursor-pointer rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                      selectedExchange?.id === exchange.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-[1.02]'
                        : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                    title={sidebarCollapsed ? exchange.exchange_name : undefined}
                  >
                    {sidebarCollapsed ? (
                      // Collapsed view - show only E-XXXX and minimal info
                      <div className="flex flex-col items-center space-y-1">
                        <div 
                          className={`text-xs font-bold cursor-pointer hover:underline ${
                            selectedExchange?.id === exchange.id ? 'text-white' : 'text-gray-900'
                          }`}
                          onClick={(e) => handleExchangeNameClick(e, exchange)}
                          title="Click to view exchange details"
                        >
                          {formatExchangeName(exchange)}
                        </div>
                        {exchange.unread_count > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                        {daysUntilClosing !== null && daysUntilClosing <= 45 && daysUntilClosing > 0 && (
                          <div className={`w-3 h-3 rounded-full ${
                            daysUntilClosing <= 45 ? 'bg-red-400 animate-pulse' : 'bg-yellow-400'
                          }`}></div>
                        )}
                      </div>
                    ) : (
                      // Expanded view - show full details
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 
                              className={`font-semibold truncate cursor-pointer hover:underline ${
                                selectedExchange?.id === exchange.id ? 'text-white' : 'text-gray-900'
                              }`}
                              onClick={(e) => handleExchangeNameClick(e, exchange)}
                              title="Click to view exchange details"
                            >
                              {formatExchangeName(exchange)}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              selectedExchange?.id === exchange.id ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-600'
                            }`} title={exchange.exchange_name}>
                              {exchange.exchange_name?.length > 20 ? `${exchange.exchange_name.substring(0, 20)}...` : exchange.exchange_name}
                            </span>
                            {exchange.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium min-w-[20px] text-center animate-pulse">
                                {exchange.unread_count > 99 ? '99+' : exchange.unread_count}
                              </span>
                            )}
                          </div>
                        
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            exchange.status === 'In Progress' || exchange.status === '45D' || exchange.status === '180D'
                              ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' 
                              : exchange.status === 'PENDING'
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                          }`}>
                            {(exchange.status === 'In Progress' || exchange.status === '45D' || exchange.status === '180D') && <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>}
                            {exchange.status}
                          </span>
                          
                          {daysUntilClosing !== null && daysUntilClosing > 0 && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              daysUntilClosing <= 45
                                ? 'bg-gradient-to-r from-red-400 to-pink-400 text-white animate-pulse'
                                : daysUntilClosing <= 180
                                ? 'bg-gradient-to-r from-purple-400 to-indigo-400 text-white'
                                : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
                            }`}>
                              <BoltIcon className="w-3 h-3 mr-1" />
                              {daysUntilClosing}d left
                            </span>
                          )}
                          
                          <span className={`text-xs ${
                            selectedExchange?.id === exchange.id ? 'text-blue-100' : 'text-gray-500'
                          }`} title="Includes exchange participants, coordinator, and client">
                            <UserGroupIcon className="w-3 h-3 inline mr-1" />
                            {exchange.participants.length}
                          </span>
                        </div>

                        {exchange.last_message && (
                          <p className={`text-sm mt-2 truncate ${
                            selectedExchange?.id === exchange.id ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            <span className="opacity-75">{exchange.last_message.sender?.first_name}:</span> {exchange.last_message.content}
                          </p>
                        )}
                        
                        {exchange.participants.length > 0 && (
                          <div className="flex items-center mt-2 -space-x-2">
                            {exchange.participants.slice(0, 4).map((participant, idx) => (
                              <div
                                key={participant.id}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                                  selectedExchange?.id === exchange.id
                                    ? 'border-blue-400 bg-blue-700 text-white'
                                    : 'border-white bg-gradient-to-br from-indigo-400 to-purple-500 text-white'
                                }`}
                                title={`${participant.first_name || participant.firstName || ''} ${participant.last_name || participant.lastName || ''}`}
                              >
                                {(participant.first_name || participant.firstName || '')[0]}
                              </div>
                            ))}
                            {exchange.participants.length > 4 && (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                                selectedExchange?.id === exchange.id
                                  ? 'border-blue-400 bg-blue-700 text-white'
                                  : 'border-white bg-gray-300 text-gray-700'
                              }`}>
                                +{exchange.participants.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedExchange ? (
          <>
            {/* Enhanced Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    {selectedExchange.participants.slice(0, 3).map((participant, index) => (
                      <div
                        key={participant.id}
                        className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-white"
                        title={`${participant.first_name || participant.firstName || ''} ${participant.last_name || participant.lastName || ''}`}
                      >
                        {(participant.first_name || participant.firstName || '')[0]}{(participant.last_name || participant.lastName || '')[0]}
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
                      {(selectedExchange.status === 'In Progress' || selectedExchange.status === '45D' || selectedExchange.status === '180D') && (
                        <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse"></div>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {(() => {
                        console.log('🔍 DEBUG: Chat header participant count', {
                          exchangeId: selectedExchange.id,
                          exchangeName: selectedExchange.exchange_name,
                          participantsLength: selectedExchange.participants.length,
                          participants: selectedExchange.participants,
                          firstParticipant: selectedExchange.participants[0]
                        });
                        return selectedExchange.participants.length;
                      })()} participants • Secure chat
                      <span className="ml-1 text-xs text-gray-400" title="Includes exchange participants, coordinator, and client">
                        (all access)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Connection Status */}
                  <div className="flex items-center space-x-2 px-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {isConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  {/* Security Badge */}
                  <div className="hidden lg:flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <ShieldCheckIcon className="w-3 h-3" />
                    <span>Secure</span>
                  </div>
                  
                  {/* View Exchange Details Button */}
                  <button
                    onClick={() => navigate(`/exchanges/${selectedExchange.id}`)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                    title="View Exchange Details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  
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
              className={`flex-1 overflow-y-auto p-6 relative bg-gradient-to-b from-white/50 to-gray-50/30 ${
                dragOver ? 'bg-blue-50/80 border-2 border-dashed border-blue-300' : ''
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
                  <p className="text-gray-500 mb-6">Send your first message to begin collaborating with your team.</p>
                  
                  {/* View Exchange Details Button */}
                  <button
                    onClick={() => navigate(`/exchanges/${selectedExchange.id}`)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                    title="View Exchange Details"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Exchange Details
                  </button>
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
                      
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-4`}>
                        <div className={`flex items-end space-x-3 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isOwn && (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {sender.initials}
                            </div>
                          )}
                          
                          <div
                            className={`px-5 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-lg ${
                              message.message_type === 'system'
                                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 mx-auto text-center'
                                : isOwn
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-white border border-gray-100 text-gray-900'
                            }`}
                          >
                            {!isOwn && message.message_type !== 'system' && (
                              <p className="text-xs font-semibold mb-1 opacity-70">
                                {sender.name}
                              </p>
                            )}
                            
                            <p className="text-sm leading-relaxed">
                              {formatMessageWithMentions(message.content)}
                            </p>
                            
                            {/* Show task creation indicator if message created a task */}
                            {message.metadata?.created_task_id && renderTaskCreationIndicator({
                              id: message.metadata.created_task_id,
                              title: message.metadata.task_title || 'Task created',
                              assigned_to_name: message.metadata.assigned_to_name
                            })}
                            
                            {(message.attachment || message.attachment_id || ((message as any).attachments && (message as any).attachments.length > 0)) && (() => {
                              // Debug log to see the actual data structure
                              console.log('📎 Message attachment data:', {
                                attachment: message.attachment,
                                attachment_id: message.attachment_id,
                                attachments: (message as any).attachments,
                                fullMessage: message
                              });
                              
                              // Extract attachment ID from various possible locations
                              const attachmentId = message.attachment_id || 
                                                 message.attachment?.id || 
                                                 ((message as any).attachments && (message as any).attachments[0]) || 
                                                 '';
                              
                              if (!attachmentId) {
                                console.warn('⚠️ No attachment ID found for message:', message.id);
                                return null;
                              }
                              
                              return (
                                <div className="mt-3">
                                  <ChatDocumentViewer
                                    document={{
                                      id: attachmentId,
                                      original_filename: message.attachment?.original_filename || message.attachment?.filename || 'Attachment',
                                      file_size: message.attachment?.file_size || message.attachment?.size || 0,
                                      mime_type: message.attachment?.mime_type || message.attachment?.type || 'application/octet-stream',
                                      pin_required: message.attachment?.pin_required || false,
                                      category: message.attachment?.category || 'chat',
                                      description: message.attachment?.description,
                                      created_at: message.attachment?.created_at || message.created_at
                                    }}
                                    className={isOwn ? 'border-blue-200 bg-blue-50/50' : ''}
                                  />
                                </div>
                              );
                            })()}
                            
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
            <div className="border-t border-gray-200 p-4 bg-white/95 backdrop-blur-sm">
              {/* Task Preview */}
              {taskPreview && (
                <div className="max-w-5xl mx-auto mb-2">
                  {renderTaskPreview(taskPreview)}
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3 max-w-5xl mx-auto">
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
                    placeholder="Type your message... (use @name for mentions, @TASK to create tasks)"
                    className="w-full px-5 py-3 pr-12 bg-gray-50/80 border border-gray-200/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all resize-none"
                    disabled={sending || !isConnected}
                    rows={1}
                    maxLength={1000}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    onKeyDown={(e) => {
                      // Handle mention suggestions first
                      if (showMentionSuggestions && mentionSuggestions.length > 0) {
                        switch (e.key) {
                          case 'ArrowUp':
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => 
                              prev > 0 ? prev - 1 : mentionSuggestions.length - 1
                            );
                            return;
                          case 'ArrowDown':
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => 
                              prev < mentionSuggestions.length - 1 ? prev + 1 : 0
                            );
                            return;
                          case 'Tab':
                            e.preventDefault();
                            insertMention(mentionSuggestions[selectedSuggestionIndex]);
                            return;
                          case 'Escape':
                            e.preventDefault();
                            setShowMentionSuggestions(false);
                            return;
                          case 'Enter':
                            if (!e.shiftKey) {
                              e.preventDefault();
                              insertMention(mentionSuggestions[selectedSuggestionIndex]);
                              return;
                            }
                            break;
                        }
                      }
                      
                      // Handle regular Enter key for sending messages
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  
                  {/* @mention suggestions dropdown */}
                  {showMentionSuggestions && mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-2 text-xs text-gray-500 border-b border-gray-100">
                        Use ↑↓ to navigate, Enter/Tab to select, Esc to cancel
                      </div>
                      {mentionSuggestions.map((participant, index) => (
                        <button
                          key={participant.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-blue-50 ${
                            index === selectedSuggestionIndex ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => insertMention(participant)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {(participant.first_name || participant.firstName || '')[0]}{(participant.last_name || participant.lastName || '')[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {participant.first_name || participant.firstName || ''} {participant.last_name || participant.lastName || ''}
                            </div>
                            <div className="text-sm text-gray-500">
                              {participant.email} • {participant.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
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
                  disabled={!newMessage.trim() || sending || !isConnected}
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
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
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
            <div className="text-center max-w-lg p-8">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform">
                <SparklesIcon className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Welcome to Next-Gen Chat</h3>
              <p className="text-gray-600 text-lg mb-6">Select a conversation from the sidebar to start messaging with your team.</p>
              <div className="flex justify-center space-x-6 text-sm">
                <div className="flex items-center text-gray-600">
                  <BoltIcon className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="font-medium">Real-time</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CheckSolidIcon className="w-5 h-5 mr-2 text-green-500" />
                  <span className="font-medium">Secure</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <SparklesIcon className="w-5 h-5 mr-2 text-purple-500" />
                  <span className="font-medium">Modern</span>
                </div>
              </div>
              
              {filteredExchanges.length === 0 && exchanges.length > 0 && (
                <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                    No exchanges match your current filters. 
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className="font-medium underline hover:no-underline"
                    >
                      Clear filters
                    </button>
                  </p>
                </div>
              )}
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
                  {(participant.first_name?.[0] || participant.firstName?.[0] || '') + (participant.last_name?.[0] || participant.lastName?.[0] || '') || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {participant.first_name || participant.firstName || participant.last_name || participant.lastName 
                      ? `${participant.first_name || participant.firstName || ''} ${participant.last_name || participant.lastName || ''}`.trim()
                      : 'Unknown User'
                    }
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{participant.role}</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants Manager Modal - Component not found, temporarily disabled */}
      {selectedExchange && showParticipantsManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Exchange Participants</h3>
            <p className="text-gray-600 mb-4">Participants management coming soon...</p>
            <button
              onClick={() => setShowParticipantsManager(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* File Attachment Preview Modal */}
      {pendingFile && (
        <FileAttachmentPreview
          file={pendingFile}
          onSend={handleSendFileWithMessage}
          onCancel={handleCancelFileAttachment}
          uploading={uploadingFile}
        />
      )}
      
      {/* Debug Info in Development */}
      <DebugChatInfo />
    </div>
  );
};

export default UnifiedChatInterface;