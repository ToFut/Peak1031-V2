import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import apiService from '../../../services/api';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  UsersIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  ClockIcon as ClockIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  EnvelopeIcon as EnvelopeIconSolid
} from '@heroicons/react/24/solid';
import { StandardDashboard } from './StandardDashboard';
import Layout from '../../../components/Layout';

interface DashboardStats {
  exchanges: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    urgent: number;
    overdue: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
    urgent: number;
  };
  messages: {
    unread: number;
    recent: number;
  };
  clients: {
    total: number;
    active: number;
  };
}

interface UrgentTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  exchangeId: string;
  exchangeNumber?: string;
  exchangeName?: string;
  assignedTo?: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

interface UrgentExchange {
  id: string;
  exchangeNumber: string;
  name: string;
  status: string;
  identificationDeadline?: string;
  completionDeadline?: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  clientName?: string;
}

interface CommunicationItem {
  id: string;
  type: 'email' | 'text' | 'chat';
  subject: string;
  content: string;
  sender: string;
  timestamp: string;
  isUrgent: boolean;
  exchangeId?: string;
  exchangeNumber?: string;
  unread: boolean;
}

interface ManagedExchange {
  id: string;
  exchangeNumber: string;
  name: string;
  status: string;
  clientName?: string;
  startDate?: string;
  identificationDeadline?: string;
  completionDeadline?: string;
}

const StandardizedCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  
  console.log('🔍 DEBUG - Current user:', { id: user?.id, role: user?.role, email: user?.email });
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats;
    urgentTasks: UrgentTask[];
    recentMessages: CommunicationItem[];
    managedExchanges: ManagedExchange[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommunicationPanel, setShowCommunicationPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'urgent' | 'communications'>('overview');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📊 Fetching coordinator dashboard data...');
        console.log('🔍 DEBUG - API call to getCoordinatorDashboard()');
        const response = await apiService.getCoordinatorDashboard();
        console.log('🔍 DEBUG - API response:', response);
        
        if (response.success && response.data) {
          const data = response.data;
          
          // Transform urgent tasks
          const transformedTasks = (data.urgentTasks || []).map((task: any) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.due_date,
            priority: task.priority || 'MEDIUM',
            status: task.status,
            exchangeId: task.exchange_id,
            exchangeNumber: task.exchange?.exchange_number,
            exchangeName: task.exchange?.name,
            assignedTo: task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Unassigned',
            isOverdue: new Date(task.due_date) < new Date(),
            daysUntilDue: Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }));
          
          // Transform recent messages
          const transformedMessages = (data.recentMessages || []).map((msg: any) => ({
            id: msg.id,
            type: 'chat' as const,
            subject: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
            content: msg.content,
            sender: msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : 'Unknown',
            timestamp: msg.created_at,
            isUrgent: msg.content.toLowerCase().includes('urgent') || msg.content.toLowerCase().includes('asap'),
            exchangeId: msg.exchange_id,
            exchangeNumber: msg.exchange?.exchange_number,
            unread: !msg.read_by?.includes(user?.id)
          }));
          
          // Transform managed exchanges
          const transformedExchanges = (data.managedExchanges || []).map((exchange: any) => ({
            id: exchange.id,
            exchangeNumber: exchange.exchange_number,
            name: exchange.name,
            status: exchange.status,
            clientName: exchange.client ? `${exchange.client.first_name} ${exchange.client.last_name}` : 'Unknown',
            startDate: exchange.start_date,
            identificationDeadline: exchange.identification_deadline,
            completionDeadline: exchange.completion_deadline
          }));
          
          setDashboardData({
            stats: data.stats,
            urgentTasks: transformedTasks,
            recentMessages: transformedMessages,
            managedExchanges: transformedExchanges
          });
          
          console.log('✅ Coordinator dashboard data loaded:', {
            exchanges: data.stats.exchanges.total,
            tasks: data.stats.tasks.total,
            messages: data.stats.messages.recent,
            clients: data.stats.clients.total
          });
        } else {
          throw new Error('Invalid response format');
        }
        
      } catch (error: any) {
        console.error('Error fetching coordinator dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyColor = (isOverdue: boolean, daysUntilDue: number) => {
    if (isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    if (daysUntilDue <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (daysUntilDue <= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case '45D': return 'text-blue-600 bg-blue-50 border-blue-200';
      case '180D': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500">No dashboard data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
          <p className="text-gray-600">Manage your exchanges and monitor urgent matters</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Exchanges</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.stats.exchanges.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Urgent Tasks</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.stats.tasks.urgent}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.stats.clients.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.stats.messages.unread}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('urgent')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'urgent'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Urgent Matters
                  </button>
                  <button
                    onClick={() => setActiveTab('communications')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'communications'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Communications
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Exchange Overview */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                        Exchange Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-600">Active</p>
                              <p className="text-2xl font-bold text-blue-900">{dashboardData.stats.exchanges.active}</p>
                            </div>
                            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-400" />
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-yellow-600">Pending</p>
                              <p className="text-2xl font-bold text-yellow-900">{dashboardData.stats.exchanges.pending}</p>
                            </div>
                            <ClockIcon className="h-8 w-8 text-yellow-400" />
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-600">Completed</p>
                              <p className="text-2xl font-bold text-green-900">{dashboardData.stats.exchanges.completed}</p>
                            </div>
                            <CheckCircleIcon className="h-8 w-8 text-green-400" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Recent Exchanges */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Exchanges</h4>
                        <div className="space-y-2">
                          {dashboardData.managedExchanges.slice(0, 5).map((exchange) => (
                            <div key={exchange.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{exchange.name}</p>
                                  <p className="text-xs text-gray-500">#{exchange.exchangeNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exchange.status)}`}>
                                  {exchange.status}
                                </span>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Task Overview */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                        Task Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                          <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.tasks.total}</p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-yellow-600">Pending</p>
                          <p className="text-2xl font-bold text-yellow-900">{dashboardData.stats.tasks.pending}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-red-600">Overdue</p>
                          <p className="text-2xl font-bold text-red-900">{dashboardData.stats.tasks.overdue}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-600">Completed</p>
                          <p className="text-2xl font-bold text-green-900">{dashboardData.stats.tasks.completed}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'urgent' && (
                  <div className="space-y-6">
                    {/* Urgent Tasks */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                        Urgent Tasks ({dashboardData.urgentTasks.length})
                      </h3>
                      <div className="space-y-3">
                        {dashboardData.urgentTasks.length > 0 ? (
                          dashboardData.urgentTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-4 border rounded-lg ${getUrgencyColor(task.isOverdue, task.daysUntilDue)}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                    {task.isOverdue && (
                                      <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                                        OVERDUE
                                      </span>
                                    )}
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span>Exchange: {task.exchangeNumber || 'N/A'}</span>
                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                    {task.assignedTo && task.assignedTo !== 'Unassigned' && <span>Assigned to: {task.assignedTo}</span>}
                                  </div>
                                </div>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  View Details
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
                            <p>No urgent tasks at the moment</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'communications' && (
                  <div className="space-y-4">
                    {dashboardData.recentMessages.length > 0 ? (
                      dashboardData.recentMessages.map((comm) => (
                        <div
                          key={comm.id}
                          className={`p-4 border rounded-lg ${
                            comm.isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                          } ${comm.unread ? 'ring-2 ring-blue-200' : ''}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {comm.type === 'email' && (
                                <EnvelopeIcon className={`h-5 w-5 ${comm.unread ? 'text-blue-600' : 'text-gray-400'}`} />
                              )}
                              {comm.type === 'text' && (
                                <PhoneIcon className={`h-5 w-5 ${comm.unread ? 'text-blue-600' : 'text-gray-400'}`} />
                              )}
                              {comm.type === 'chat' && (
                                <ChatBubbleLeftRightIcon className={`h-5 w-5 ${comm.unread ? 'text-blue-600' : 'text-gray-400'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{comm.subject}</p>
                                <span className="text-xs text-gray-500">{formatTimeAgo(comm.timestamp)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{comm.content}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>From: {comm.sender}</span>
                                {comm.exchangeNumber && <span>Exchange: #{comm.exchangeNumber}</span>}
                                {comm.isUrgent && (
                                  <span className="text-red-600 font-medium">URGENT</span>
                                )}
                                {comm.unread && (
                                  <span className="text-blue-600 font-medium">NEW</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No recent communications</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Communication Panel */}
          <div className="space-y-6">
            {/* Communication Panel Toggle */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Communication Panel</h3>
                <button
                  onClick={() => setShowCommunicationPanel(!showCommunicationPanel)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showCommunicationPanel ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {showCommunicationPanel && (
              <>
                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Communication Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unread Messages:</span>
                      <span className="font-medium text-blue-600">{dashboardData.stats.messages.unread}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recent Messages:</span>
                      <span className="font-medium text-gray-900">{dashboardData.stats.messages.recent}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Clients:</span>
                      <span className="font-medium text-purple-600">{dashboardData.stats.clients.active}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Send Email
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                      Start Chat
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      Send SMS
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {dashboardData.recentMessages.slice(0, 5).map((comm) => (
                      <div key={comm.id} className="flex items-center space-x-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          comm.isUrgent ? 'bg-red-500' : comm.unread ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <span className="text-gray-600 truncate">{comm.subject}</span>
                        <span className="text-gray-400">{formatTimeAgo(comm.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Use StandardDashboard with agency role and custom content
  return (
    <Layout>
    <StandardDashboard  
      role="coordinator" 
    />
    </Layout>
  );
};


export default StandardizedCoordinatorDashboard;