import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

import { Exchange, Task, Document, Message, User } from '../services/supabase';

interface ClientStats {
  exchanges: {
    total: number;
    active: number;
    pending: number;
    completed: number;
    totalValue: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  documents: {
    total: number;
    recent: number;
  };
  messages: {
    total: number;
    unread: number;
  };
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [exchangesData, tasksData, documentsData, notificationsData] = await Promise.all([
        apiService.getExchanges(),
        apiService.getTasks(),
        apiService.getDocuments(),
        apiService.getNotifications()
      ]);

      setExchanges(exchangesData);
      setTasks(tasksData);
      setDocuments(documentsData);
      
      // Calculate client-specific stats
      const clientStats: ClientStats = {
        exchanges: {
          total: exchangesData.length,
          active: exchangesData.filter(e => e.status === 'In Progress').length,
          pending: exchangesData.filter(e => e.status === 'Draft').length,
          completed: exchangesData.filter(e => e.status === 'Completed').length,
          totalValue: exchangesData.reduce((sum, e) => sum + (e.exchange_value || 0), 0)
        },
        tasks: {
          total: tasksData.length,
          pending: tasksData.filter(t => t.status === 'PENDING').length,
          inProgress: tasksData.filter(t => t.status === 'IN_PROGRESS').length,
          completed: tasksData.filter(t => t.status === 'COMPLETED').length,
          overdue: tasksData.filter(t => 
            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED'
          ).length
        },
        documents: {
          total: documentsData.length,
          recent: documentsData.filter(d => 
            new Date(d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        },
        messages: {
          total: notificationsData.filter(n => n.type === 'message').length,
          unread: notificationsData.filter(n => n.type === 'message' && !n.read).length
        }
      };
      
      setStats(clientStats);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
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
      setError('Failed to load messages');
    }
  };

  const handleExchangeSelect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    loadExchangeMessages(exchange.id);
  };

  const downloadDocument = async (documentItem: Document, pin?: string) => {
    try {
      if (documentItem.pin_required && !pin) {
        setSelectedDocument(documentItem);
        setShowDocumentModal(true);
        return;
      }
      
      const blob = await apiService.downloadDocument(documentItem.id, pin);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = documentItem.original_filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedDocument || !pinCode) return;

    try {
      const blob = await apiService.downloadDocument(selectedDocument.id, pinCode);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedDocument.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowDocumentModal(false);
      setPinCode('');
      setSelectedDocument(null);
    } catch (error) {
      console.error('Invalid PIN:', error);
      setError('Invalid PIN or failed to download document');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case '45D': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
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

  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = (exchange.exchange_name || exchange.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exchange.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your 1031 exchange progress.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <BellIcon className="h-4 w-4 mr-2" />
              Notifications
              {stats.messages.unread > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {stats.messages.unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Exchanges */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Exchanges
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.exchanges.active}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium">
                {stats.exchanges.completed} completed
              </span>
              <span className="text-gray-500"> • </span>
              <span className="text-yellow-600 font-medium">
                {stats.exchanges.pending} pending
              </span>
            </div>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Portfolio Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.exchanges.totalValue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium flex items-center">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                Active investments
              </span>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Tasks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.tasks.pending + stats.tasks.inProgress}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {stats.tasks.overdue > 0 ? (
                <span className="text-red-600 font-medium flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {stats.tasks.overdue} overdue
                </span>
              ) : (
                <span className="text-green-600 font-medium">
                  All tasks on track
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Documents
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.documents.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-blue-600 font-medium">
                {stats.documents.recent} recent
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exchanges */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Exchanges</h3>
            <button className="text-sm text-blue-600 hover:text-blue-500">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {exchanges.slice(0, 3).map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exchange.status)}`}>
                    {exchange.status}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {exchange.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Started {exchange.start_date ? formatDateTime(exchange.start_date).split(',')[0] : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {exchange.exchange_value && (
                    <p className="text-sm text-gray-900">
                      {formatCurrency(exchange.exchange_value)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {exchanges.length === 0 && (
              <div className="text-center py-4">
                <InformationCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No exchanges found</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Tasks</h3>
            <button className="text-sm text-blue-600 hover:text-blue-500">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status !== 'COMPLETED').slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.due_date ? `Due ${formatDateTime(task.due_date).split(',')[0]}` : 'No due date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status !== 'COMPLETED').length === 0 && (
              <div className="text-center py-4">
                <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
          <button className="text-sm text-blue-600 hover:text-blue-500">
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.slice(0, 6).map((document) => (
            <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <h4 className="font-medium text-gray-900 truncate text-sm">{document.original_filename}</h4>
                    <p className="text-xs text-gray-500 capitalize">{document.category}</p>
                  </div>
                </div>
                {document.pin_required && (
                  <LockClosedIcon className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                <span>{formatDateTime(document.created_at).split(',')[0]}</span>
              </div>
              
              <button
                onClick={() => downloadDocument(document)}
                className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                Download
              </button>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="text-center py-8 col-span-full">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No documents found</p>
            </div>
          )}
        </div>
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
              onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
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
                disabled={!pinCode}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default ClientDashboard; 