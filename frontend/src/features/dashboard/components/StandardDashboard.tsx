import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import { DashboardStats } from '../../../shared/hooks/useDashboardData';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  BellIcon,
  CogIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CloudArrowUpIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  FireIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import {
  SparklesIcon
} from '@heroicons/react/24/solid';
import { formatDistanceToNow, isAfter, addDays, addHours, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// Role-specific configurations
const roleConfigs: Record<string, any> = {
  admin: {
    title: 'Admin Dashboard',
    primaryColor: 'purple',
    quickActions: [
      { id: 'sync', label: 'Sync PracticePanther', icon: ArrowPathIcon, action: 'sync', color: 'purple' },
      { id: 'users', label: 'Manage Users', icon: UsersIcon, action: 'create-user', color: 'blue' },
      { id: 'agencies', label: 'Agency Management', icon: BuildingOfficeIcon, action: 'agencies', color: 'orange' },
      { id: 'audit', label: 'View Audit Logs', icon: DocumentTextIcon, action: 'audit', color: 'green' },
      { id: 'settings', label: 'System Settings', icon: CogIcon, action: 'settings', color: 'gray' }
    ]
  },
  coordinator: {
    title: 'Coordinator Dashboard',
    primaryColor: 'blue',
    quickActions: [
      { id: 'exchange', label: 'New Exchange', icon: PlusIcon, action: 'exchanges', color: 'blue' },
      { id: 'tasks', label: 'Manage Tasks', icon: CalendarIcon, action: 'tasks', color: 'green' },
      { id: 'documents', label: 'Upload Documents', icon: CloudArrowUpIcon, action: 'upload', color: 'purple' },
      { id: 'clients', label: 'View Clients', icon: UsersIcon, action: 'clients', color: 'yellow' }
    ]
  },
  client: {
    title: 'My Dashboard',
    primaryColor: 'green',
    quickActions: [
      { id: 'exchanges', label: 'My Exchanges', icon: DocumentTextIcon, action: 'my_exchanges', color: 'green' },
      { id: 'tasks', label: 'My Tasks', icon: CalendarIcon, action: 'tasks', color: 'blue' },
      { id: 'documents', label: 'My Documents', icon: CloudArrowUpIcon, action: 'upload', color: 'purple' },
      { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon, action: 'messages', color: 'yellow' }
    ]
  },
  third_party: {
    title: 'Partner Dashboard',
    primaryColor: 'teal',
    quickActions: [
      { id: 'exchanges', label: 'View Exchanges', icon: EyeIcon, action: 'exchanges', color: 'teal' },
      { id: 'documents', label: 'View Documents', icon: DocumentTextIcon, action: 'documents', color: 'blue' }
    ]
  },
  agency: {
    title: 'Agency Dashboard',
    primaryColor: 'orange',
    quickActions: [
      { id: 'clients', label: 'Client Overview', icon: UsersIcon, action: 'clients', color: 'orange' },
      { id: 'reports', label: 'Generate Reports', icon: ChartBarIcon, action: 'reports', color: 'purple' },
      { id: 'exchanges', label: 'All Exchanges', icon: DocumentTextIcon, action: 'exchanges', color: 'blue' }
    ]
  }
};

// Quick Action Card Component
const QuickActionCard: React.FC<{
  action: any;
  onClick: (id: string, action: string) => void;
  loading?: boolean;
}> = ({ action, onClick, loading = false }) => {
  const Icon = action.icon;
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
    teal: 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200',
    gray: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <button
      onClick={() => onClick(action.id, action.action)}
      disabled={loading}
      className={`p-4 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center space-y-2 ${
        colorClasses[action.color || 'gray']
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'}`}
    >
      <Icon className="h-8 w-8" />
      <div className="text-center">
        <p className="font-medium text-sm">{action.label}</p>
      </div>
    </button>
  );
};

// Recent Activity Item
const ActivityItem: React.FC<{
  activity: any;
}> = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'exchange_created':
        return <PlusIcon className="h-5 w-5 text-green-500" />;
      case 'task_completed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'document_uploaded':
        return <CloudArrowUpIcon className="h-5 w-5 text-purple-500" />;
      case 'message_sent':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b last:border-0">
      <div className="flex-shrink-0">{getActivityIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, icon: Icon = ExclamationCircleIcon, actionLabel, onAction }) => (
  <div className="text-center py-12">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-6">
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionLabel}
        </button>
      </div>
    )}
  </div>
);

// Urgency detection for messages
const detectMessageUrgency = (message: any): { score: number; reasons: string[] } => {
  const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'deadline', 'today', 'now', 'emergency', 'important'];
  const content = (message.content || '').toLowerCase();
  
  let score = 0;
  const reasons: string[] = [];
  
  urgentKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      score += 20;
      reasons.push(`Contains "${keyword}"`);
    }
  });
  
  if (!message.read_by?.includes(message.sender_id)) {
    score += 10;
    reasons.push('Unread');
  }
  
  const messageTime = new Date(message.created_at);
  const twoHoursAgo = addHours(new Date(), -2);
  if (isAfter(messageTime, twoHoursAgo)) {
    score += 15;
    reasons.push('Recent message');
  }
  
  return { score: Math.min(score, 100), reasons };
};

// Calculate deadline urgency
const getDeadlineUrgency = (date: string | Date) => {
  const deadline = new Date(date);
  const now = new Date();
  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil < 0) return { level: 'overdue', color: 'red', text: 'OVERDUE' };
  if (hoursUntil < 24) return { level: 'critical', color: 'red', text: `${Math.floor(hoursUntil)} hours` };
  if (hoursUntil < 48) return { level: 'urgent', color: 'orange', text: 'Tomorrow' };
  if (hoursUntil < 72) return { level: 'soon', color: 'yellow', text: '2 days' };
  if (hoursUntil < 168) return { level: 'upcoming', color: 'blue', text: `${Math.floor(hoursUntil / 24)} days` };
  return { level: 'future', color: 'gray', text: formatDistanceToNow(deadline) };
};

export const StandardDashboard: React.FC<{
  role?: string;
  customContent?: React.ReactElement;
}> = ({ role: propRole, customContent }) => {
  const { user } = useAuth();
  const role = propRole || user?.role || 'client';
  const config = roleConfigs[role] || roleConfigs.client;

  const {
    stats,
    exchanges,
    tasks,
    documents,
    messages,
    users,
    loading,
    error,
    refreshData,
    syncPracticePanther,
    syncing,
    clearCache
  } = useDashboardData({ 
    role, 
    autoRefresh: true, 
    refreshInterval: 300000 // 5 minutes
  });

  // Calculate urgent items (next 48 hours)
  const urgentItems = useMemo(() => {
    const now = new Date();
    const in48Hours = addDays(now, 2);
    
    const urgentExchanges = exchanges.filter((ex: any) => {
      const deadline = ex.targetCloseDate || ex.deadline || ex.dueDate;
      if (!deadline) return false;
      const date = new Date(deadline);
      return date < in48Hours && ex.status !== 'COMPLETED';
    });
    
    const urgentTasks = tasks.filter((task: any) => {
      const dueDate = task.dueDate || task.due_date;
      if (!dueDate) return false;
      const date = new Date(dueDate);
      return date < in48Hours && task.status !== 'COMPLETED';
    });
    
    const overdueTasks = tasks.filter((task: any) => {
      const dueDate = task.dueDate || task.due_date;
      if (!dueDate) return false;
      const date = new Date(dueDate);
      return date < now && task.status !== 'COMPLETED';
    });
    
    const pendingDocs = documents.filter((doc: any) => 
      doc.status === 'pending_signature' || doc.status === 'pending_review'
    );
    
    const urgentMessages = messages
      .map((msg: any) => ({
        ...msg,
        urgency: detectMessageUrgency(msg)
      }))
      .filter((msg: any) => msg.urgency.score > 50)
      .sort((a: any, b: any) => b.urgency.score - a.urgency.score);
    
    return {
      exchanges: urgentExchanges,
      tasks: urgentTasks,
      overdueTasks,
      documents: pendingDocs,
      messages: urgentMessages,
      total: urgentExchanges.length + urgentTasks.length + overdueTasks.length + pendingDocs.length
    };
  }, [exchanges, tasks, documents, messages]);

  const navigate = useNavigate();
  
  const handleQuickAction = async (actionId: string, action: string) => {
    try {
      switch (action) {
        case 'sync':
          await syncPracticePanther();
          break;
        case 'create-user':
          navigate('/users');
          break;
        case 'agencies':
          navigate('/agencies');
          break;
        case 'audit':
          navigate('/admin/audit');
          break;
        case 'settings':
          navigate('/settings');
          break;
        case 'exchanges':
        case 'my_exchanges':
          navigate('/exchanges');
          break;
        case 'tasks':
          navigate('/tasks');
          break;
        case 'upload':
          navigate('/documents');
          break;
        case 'clients':
          navigate('/contacts');
          break;
        default:
          
      }
    } catch (error) {
      console.error('Quick action error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            title="Unable to load dashboard"
            description={error || "Please try refreshing the page"}
            actionLabel="Refresh"
            onAction={refreshData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {urgentItems.total > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full">
                  <FireIcon className="h-4 w-4" />
                  <span className="text-sm font-bold">{urgentItems.total} Urgent Items</span>
                </div>
              )}
              <button
                onClick={refreshData}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Custom Content */}
        {customContent && (
          <div className="mb-8">
            {customContent}
          </div>
        )}

        {/* No Exchanges Warning for Clients */}
        {stats.exchanges.total === 0 && (role === 'client' || role === 'third_party') && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Exchanges Assigned</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You currently don't have any exchanges assigned to your account. Please contact your administrator to be added to an exchange.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Urgent Deadlines Section - Replacing meaningless metrics */}
        {(urgentItems.overdueTasks.length > 0 || urgentItems.exchanges.length > 0) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Critical Deadlines - Action Required!</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {urgentItems.overdueTasks.slice(0, 3).map((task: any) => (
                <Link key={task.id} to="/tasks" className="block p-3 bg-white border border-red-300 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">{task.title || task.name}</p>
                      <p className="text-sm text-red-600">OVERDUE</p>
                    </div>
                    <BellAlertIcon className="h-5 w-5 text-red-500" />
                  </div>
                </Link>
              ))}
              {urgentItems.exchanges.slice(0, 3).map((exchange: any) => (
                <Link key={exchange.id} to={`/exchanges/${exchange.id}`} className="block p-3 bg-white border border-orange-300 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-orange-900">{exchange.exchangeName || `Exchange ${exchange.exchangeNumber}`}</p>
                      <p className="text-sm text-orange-600">Due: {getDeadlineUrgency(exchange.targetCloseDate || exchange.deadline).text}</p>
                    </div>
                    <ClockIcon className="h-5 w-5 text-orange-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Next 48 Hours - Priority Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-orange-600" />
                Next 48 Hours - Priority Items
              </h2>
              <span className="text-sm text-gray-500">
                {urgentItems.tasks.length + urgentItems.exchanges.length} urgent items
              </span>
            </div>
            
            {urgentItems.tasks.length === 0 && urgentItems.exchanges.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No urgent deadlines in the next 48 hours</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {urgentItems.tasks.map((task: any) => {
                  const urgency = getDeadlineUrgency(task.dueDate || task.due_date);
                  return (
                    <Link key={task.id} to="/tasks" className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
                      urgency.level === 'critical' ? 'border-red-200 bg-red-50' :
                      urgency.level === 'urgent' ? 'border-orange-200 bg-orange-50' :
                      'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircleIcon className={`h-5 w-5 ${
                            urgency.level === 'critical' ? 'text-red-600' :
                            urgency.level === 'urgent' ? 'text-orange-600' :
                            'text-gray-600'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{task.title || task.name}</p>
                            <p className="text-sm text-gray-600">{task.priority} priority</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          urgency.level === 'critical' ? 'bg-red-100 text-red-800' :
                          urgency.level === 'urgent' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {urgency.text}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {urgentItems.exchanges.map((exchange: any) => {
                  const urgency = getDeadlineUrgency(exchange.targetCloseDate || exchange.deadline);
                  return (
                    <Link key={exchange.id} to={`/exchanges/${exchange.id}`} className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
                      urgency.level === 'critical' ? 'border-red-200 bg-red-50' :
                      urgency.level === 'urgent' ? 'border-orange-200 bg-orange-50' :
                      'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <DocumentTextIcon className={`h-5 w-5 ${
                            urgency.level === 'critical' ? 'text-red-600' :
                            urgency.level === 'urgent' ? 'text-orange-600' :
                            'text-gray-600'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{exchange.exchangeName || `Exchange ${exchange.exchangeNumber}`}</p>
                            <p className="text-sm text-gray-600">${(exchange.exchangeValue || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          urgency.level === 'critical' ? 'bg-red-100 text-red-800' :
                          urgency.level === 'urgent' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {urgency.text}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats - Simplified */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overdue Items</span>
                  <span className={`font-bold ${urgentItems.overdueTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {urgentItems.overdueTasks.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Due in 48h</span>
                  <span className={`font-bold ${urgentItems.total > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {urgentItems.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unread Messages</span>
                  <span className="font-bold text-blue-600">{stats?.messages?.unread || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Documents</span>
                  <span className="font-bold text-purple-600">{urgentItems.documents.length}</span>
                </div>
              </div>
            </div>

            {/* Urgent Messages */}
            {urgentItems.messages.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                  <BellAlertIcon className="h-4 w-4" />
                  Urgent Messages
                </h4>
                <div className="space-y-2">
                  {urgentItems.messages.slice(0, 3).map((msg: any) => (
                    <Link key={msg.id} to="/messages" className="block p-2 bg-white rounded border border-orange-200 hover:border-orange-300">
                      <p className="text-sm font-medium text-gray-900">{msg.sender?.firstName || 'Unknown'}</p>
                      <p className="text-xs text-gray-600">{msg.content?.substring(0, 50)}...</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {config.quickActions.map((action: any) => (
              <QuickActionCard
                key={action.id}
                action={action}
                onClick={handleQuickAction}
                loading={action.id === 'sync' && syncing}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Exchanges */}
          {exchanges.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Exchanges</h2>
                <Link
                  to="/exchanges"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {exchanges.slice(0, 5).map((exchange: any) => (
                  <Link
                    key={exchange.id}
                    to={`/exchanges/${exchange.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {exchange.name || exchange.exchangeName || `Exchange ${exchange.exchangeNumber}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {exchange.status} • ${(exchange.exchangeValue || 0).toLocaleString()}
                        </p>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tasks */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
                <Link
                  to="/tasks"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title || task.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {new Date(task.dueDate || task.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.priority === 'HIGH' || task.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : task.priority === 'MEDIUM' || task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {task.priority || 'Normal'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Status for Admin */}
        {role === 'admin' && stats.system && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${
                  stats.system.systemHealth === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">System Health</p>
                  <p className="text-sm text-gray-500 capitalize">{stats.system.systemHealth}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Sync</p>
                  <p className="text-sm text-gray-500">
                    {stats.system.lastSync ? new Date(stats.system.lastSync).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Documents</p>
                  <p className="text-sm text-gray-500">{stats.system.totalDocuments}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Heroicon imports that might be missing
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Simple MetricCard component to replace missing import
const MetricCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: string;
  trend?: 'up' | 'down' | 'neutral' | 'attention';
  trendValue?: string;
}> = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    teal: 'text-teal-600',
    gray: 'text-gray-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {trendValue && <p className="text-sm text-gray-500">{trendValue}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-full bg-gray-50 ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StandardDashboard;