import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  CheckSquare,
  FileText, 
  Lock, 
  MessageSquare, 
  Search, 
  User, 
  Users, 
  AlertTriangle,
  Download,
  Eye,
  Send,
  Paperclip,
  BarChart3,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  MapPin,
  DollarSign,
  MoreVertical,
  Filter,
  Grid,
  List,
  Edit,
  Trash2,
  Key,
  Globe,
  Shield as ShieldIcon,
  UserCheck,
  UserX,
  UserPlus,
  Archive,
  RotateCcw,
  Copy,
  ExternalLink,
  Info,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  Activity,
  Database,
  Server,
  HardDrive,
  Wifi,
  Zap,
  Target,
  Award,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  MessageSquare as MessageSquareIcon,
  Eye as EyeIcon,
  FileText as FileTextIcon2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { apiService } from '../services/api';
import { Exchange, Task, Document } from '../services/supabase';

interface Message {
  id: string;
  content: string;
  exchange_id: string;
  sender_id: string;
  message_type: string;
  read_by: string[];
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ThirdPartyDashboard: React.FC = () => {
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState('exchanges');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [exchangesData, tasksData, documentsData] = await Promise.all([
        apiService.getExchanges(),
        apiService.getTasks(),
        apiService.getDocuments()
      ]);

      setExchanges(exchangesData as any);
      setTasks(tasksData as any);
      setDocuments(documentsData as any);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeMessages = async (exchangeId: string) => {
    try {
              const messagesData = await apiService.getMessages(exchangeId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleExchangeSelect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    loadExchangeMessages(exchange.id);
  };

  const handleDocumentDownload = async (document: Document) => {
    try {
      if (document.pin_required) {
        setSelectedDocument(document);
        setShowDocumentModal(true);
      } else {
        await apiService.downloadDocument(document.id, document.original_filename);
      }
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedDocument || !pinCode) return;

    try {
              await apiService.downloadDocument(selectedDocument.id, pinCode);
      setShowDocumentModal(false);
      setPinCode('');
      setSelectedDocument(null);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedExchange || !newMessage.trim()) return;

    try {
              await apiService.sendMessage(selectedExchange.id, newMessage);
      setNewMessage('');
      setShowMessageModal(false);
      await loadExchangeMessages(selectedExchange.id); // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case '45D': return 'bg-blue-100 text-blue-800';
      case '180D': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExchangeStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = (exchange.exchange_name || exchange.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exchange.status === statusFilter;
    return matchesSearch && matchesStatus;
  });



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Third Party Dashboard</h1>
              <p className="text-sm text-gray-600">Read-only access to assigned exchanges</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Eye className="w-4 h-4 mr-2" />
                Read Only Access
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'exchanges', label: 'Assigned Exchanges', icon: FileText },
              { id: 'tasks', label: 'Task Overview', icon: CheckSquare },
              { id: 'documents', label: 'Documents', icon: Download },
              { id: 'messages', label: 'Messages', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'exchanges' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Exchanges
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search by name or client..."
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="45D">45 Day</option>
                    <option value="180D">180 Day</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exchanges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map((exchange) => (
                <div
                  key={exchange.id}
                  className={`bg-white shadow rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedExchange?.id === exchange.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleExchangeSelect(exchange)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{exchange.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exchange.status)}`}>
                      {exchange.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <span>
                        {exchange.client?.first_name} {exchange.client?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Started: {exchange.start_date ? new Date(exchange.start_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {exchange.completion_date && (
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Completed: {new Date(exchange.completion_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tasks</span>
                      <span className="font-medium">
                        {tasks.filter(task => task.exchange_id === exchange.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Documents</span>
                      <span className="font-medium">
                        {documents.filter(doc => doc.exchange_id === exchange.id).length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Exchange Details */}
            {selectedExchange && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Exchange Details: {selectedExchange.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Name: {selectedExchange.client?.first_name} {selectedExchange.client?.last_name}</p>
                      <p>Email: {selectedExchange.client?.email}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Exchange Information</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Status: <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedExchange.status)}`}>
                        {selectedExchange.status}
                      </span></p>
                      <p>Start Date: {selectedExchange.start_date ? new Date(selectedExchange.start_date).toLocaleDateString() : 'N/A'}</p>
                      {selectedExchange.completion_date && (
                        <p>Completion Date: {new Date(selectedExchange.completion_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Overview</h3>
              <p className="text-sm text-gray-600 mb-4">View tasks for exchanges you're involved with (read-only)</p>
              
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>  
                      <span>Exchange: {exchanges.find(e => e.id === task.exchange_id)?.name}</span>
                      <span>Assigned: {task.assigned_to || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No tasks found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              <p className="text-sm text-gray-600 mb-4">View and download documents for exchanges you're involved with</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((document) => (
                  <div key={document.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <h4 className="font-medium text-gray-900 truncate">{document.original_filename}</h4>
                          <p className="text-sm text-gray-500">{document.category}</p>
                        </div>
                      </div>
                      {document.pin_required && (
                        <Lock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>Exchange: {exchanges.find(e => e.id === document.exchange_id)?.name}</span>
                      <span>By: {document.uploader ? `${document.uploader.first_name} ${document.uploader.last_name}` : 'Unknown'}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDocumentDownload(document)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                ))}
                
                {documents.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-full">No documents found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
    <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </button>
              </div>
              
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {message.sender?.first_name} {message.sender?.last_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-700">{message.content}</p>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      Exchange: {exchanges.find(e => e.id === message.exchange_id)?.name}
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No messages found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document PIN Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Enter PIN</h3>
              <p className="text-sm text-gray-600 mb-4">
                This document requires a PIN to access: {selectedDocument.original_filename}
              </p>
              
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Enter PIN"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setPinCode('');
                    setSelectedDocument(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePinSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedExchange && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Message</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a message to the exchange team: {selectedExchange.name}
              </p>
              
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setNewMessage('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyDashboard; 