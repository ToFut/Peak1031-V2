import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';

import {
  ShieldCheckIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { AuditLog, User } from '../../../types';

interface AuditCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actions: string[];
}

interface SimpleFilter {
  category: string;
  timeframe: string;
  search: string;
}

interface AuditStats {
  userActivities: number;
  systemActivities: number;
  todayTotal: number;
  weekTotal: number;
}

const EnhancedAuditSystem: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'user' | 'system'>('overview');
  
  const [filters, setFilters] = useState<SimpleFilter>({
    category: 'all',
    timeframe: 'today',
    search: ''
  });

  const [stats, setStats] = useState<AuditStats>({
    userActivities: 0,
    systemActivities: 0,
    todayTotal: 0,
    weekTotal: 0
  });

  // Comprehensive activity categories with all tracked actions
  const categories: AuditCategory[] = [
    {
      id: 'authentication',
      name: 'Authentication & Access',
      description: 'User logins, logouts, and authentication activities',
      icon: <UserIcon className="w-5 h-5" />,
      color: 'blue',
      actions: [
        'user_login', 'user_login_success', 'user_logout', 
        'failed_login_attempt', 'password_change', 'password_reset_request',
        'password_reset', 'user_registration', 'session_expired',
        'login', 'logout', 'login_attempt'
      ]
    },
    {
      id: 'messaging',
      name: 'Messages & Communication',
      description: 'All messaging and communication activities',
      icon: <ChatBubbleLeftIcon className="w-5 h-5" />,
      color: 'purple',
      actions: [
        'message_sent', 'messages_viewed', 'message_deleted',
        'message_created', 'notification_sent', 'email_sent',
        'message_edited', 'message_archived'
      ]
    },
    {
      id: 'exchanges',
      name: 'Exchange Management',
      description: 'Exchange operations and status changes',
      icon: <ChartBarIcon className="w-5 h-5" />,
      color: 'indigo',
      actions: [
        'exchange_created', 'exchange_updated', 'exchange_deleted',
        'exchange_viewed', 'exchanges_listed', 'exchange_status_change',
        'exchange_assigned', 'exchange_completed', 'exchange_archived'
      ]
    },
    {
      id: 'tasks',
      name: 'Task Management',
      description: 'Task creation, updates, and completions',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      color: 'green',
      actions: [
        'task_created', 'task_updated', 'task_deleted',
        'task_completed', 'tasks_viewed', 'task_assigned',
        'task_status_change', 'task_priority_change'
      ]
    },
    {
      id: 'documents',
      name: 'Document Operations',
      description: 'Document uploads, downloads, and management',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      color: 'yellow',
      actions: [
        'document_uploaded', 'document_downloaded', 'document_viewed',
        'document_deleted', 'document_shared', 'document_created',
        'document_updated', 'document_archived', 'document_upload'
      ]
    },
    {
      id: 'users',
      name: 'User Management',
      description: 'User account and profile management',
      icon: <UserPlusIcon className="w-5 h-5" />,
      color: 'pink',
      actions: [
        'user_created', 'user_updated', 'user_deleted',
        'users_viewed', 'user_deactivated', 'user_activated',
        'profile_updated', 'user_role_changed'
      ]
    },
    {
      id: 'contacts',
      name: 'Contact Management',
      description: 'Contact creation and management',
      icon: <UserIcon className="w-5 h-5" />,
      color: 'teal',
      actions: [
        'contact_created', 'contact_updated', 'contact_deleted',
        'contacts_viewed', 'contact_imported', 'contact_exported'
      ]
    },
    {
      id: 'sync',
      name: 'Data Synchronization',
      description: 'PracticePanther and system sync operations',
      icon: <ArrowRightOnRectangleIcon className="w-5 h-5" />,
      color: 'orange',
      actions: [
        'sync_started', 'sync_completed', 'sync_failed',
        'incremental_sync', 'full_sync', 'sync_error',
        'pp_sync_started', 'pp_sync_completed'
      ]
    },
    {
      id: 'system',
      name: 'System Operations',
      description: 'System maintenance, backups, and automated processes',
      icon: <ComputerDesktopIcon className="w-5 h-5" />,
      color: 'gray',
      actions: [
        'backup_created', 'backup_started', 'backup_completed',
        'system_restart', 'maintenance', 'PERFORMANCE_ISSUE',
        'system_error', 'system_warning', 'cron_job_executed'
      ]
    },
    {
      id: 'security',
      name: 'Security Events',
      description: 'Security alerts, violations, and suspicious activities',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      color: 'red',
      actions: [
        'security_alert', 'suspicious_activity', 'suspicious_endpoint_access',
        'access_denied', 'multiple_failed_logins', 'security_violation',
        'ip_blocked', 'rate_limit_exceeded', 'unauthorized_access'
      ]
    },
    {
      id: 'integrations',
      name: 'API & Integrations',
      description: 'External API calls and integration activities',
      icon: <SparklesIcon className="w-5 h-5" />,
      color: 'cyan',
      actions: [
        'api_call', 'integration_connected', 'integration_disconnected',
        'webhook_received', 'webhook_sent', 'api_error'
      ]
    }
  ];

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    calculateStats(auditLogs);
  }, [auditLogs]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading audit data...');
      
      const [logsResponse] = await Promise.all([
        apiService.getAuditLogs()
      ]);

      let logs: AuditLog[] = [];
      const logsResponseAny = logsResponse as any;
      if (logsResponseAny?.success && logsResponseAny?.data) {
        logs = Array.isArray(logsResponseAny.data) ? logsResponseAny.data : [];
      } else if (Array.isArray(logsResponse)) {
        logs = logsResponse;
      } else if (logsResponseAny?.data && Array.isArray(logsResponseAny.data)) {
        logs = logsResponseAny.data;
      }

      console.log('✅ Loaded audit logs:', logs);
      console.log('🔍 Sample log:', logs[0]);
      
      setAuditLogs(logs);
    } catch (error) {
      console.error('❌ Failed to load audit data:', error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: AuditLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayLogs = logs.filter(log => new Date(log.createdAt || log.timestamp || '') >= today);
    const weekLogs = logs.filter(log => new Date(log.createdAt || log.timestamp || '') >= weekAgo);

    const systemActions = ['backup_created', 'sync_completed', 'PERFORMANCE_ISSUE', 'system_restart', 'maintenance', 'sync_started', 'backup_started'];
    
    const userActivities = logs.filter(log => {
      // If it has a user name, it's likely a user action
      if (log.userName && log.userName !== 'System' && log.userName !== 'system') {
        return true;
      }
      // If it's not a system action, include it
      if (!systemActions.includes(log.action)) {
        return true;
      }
      return false;
    }).length;

    const systemActivities = logs.filter(log => {
      // If it's a system action, include it
      if (systemActions.includes(log.action)) {
        return true;
      }
      // If it has no user name or user name is 'System', include it
      if (!log.userName || log.userName === 'System' || log.userName === 'system') {
        return true;
      }
      return false;
    }).length;

    setStats({
      userActivities,
      systemActivities,
      todayTotal: todayLogs.length,
      weekTotal: weekLogs.length
    });
  };

  const getCategoryForAction = (action: string): AuditCategory => {
    for (const category of categories) {
      if (category.actions.includes(action)) {
        return category;
      }
    }
    
    // Smart categorization for unknown actions
    if (action.includes('user') || action.includes('login') || action.includes('logout') || action.includes('auth')) {
      return categories.find(c => c.id === 'user_access') || categories[0];
    }
    if (action.includes('document') || action.includes('file') || action.includes('upload')) {
      return categories.find(c => c.id === 'documents') || categories[0];
    }
    if (action.includes('message') || action.includes('notification') || action.includes('email')) {
      return categories.find(c => c.id === 'communication') || categories[0];
    }
    if (action.includes('exchange') || action.includes('task')) {
      return categories.find(c => c.id === 'exchanges') || categories[0];
    }
    if (action.includes('security') || action.includes('alert') || action.includes('violation')) {
      return categories.find(c => c.id === 'security') || categories[0];
    }
    
    // Default to system category for everything else
    return categories.find(c => c.id === 'system') || categories[0];
  };

  const getFilteredLogs = () => {
    let filtered = auditLogs;

    // Time filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      let cutoff: Date;

      switch (filters.timeframe) {
        case 'today':
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        default:
          cutoff = new Date(0);
      }

      filtered = filtered.filter(log => 
        new Date(log.createdAt || log.timestamp || '') >= cutoff
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      const category = categories.find(c => c.id === filters.category);
      if (category) {
        filtered = filtered.filter(log => category.actions.includes(log.action));
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        (log.userName && log.userName.toLowerCase().includes(searchLower)) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    // View-specific filtering
    if (activeView === 'user') {
      // More inclusive user filtering - include anything that's NOT clearly a system operation
      const systemActions = ['backup_created', 'sync_completed', 'PERFORMANCE_ISSUE', 'system_restart', 'maintenance', 'sync_started', 'backup_started'];
      console.log('🔍 System actions to exclude:', systemActions);
      
      filtered = filtered.filter(log => {
        // If it has a user name, it's likely a user action
        if (log.userName && log.userName !== 'System' && log.userName !== 'system') {
          return true;
        }
        // If it's not a system action, include it
        if (!systemActions.includes(log.action)) {
          return true;
        }
        return false;
      });
      console.log('🔍 User filtered results:', filtered.length);
    } else if (activeView === 'system') {
      // System view - include system actions OR actions without usernames
      const systemActions = ['backup_created', 'sync_completed', 'PERFORMANCE_ISSUE', 'system_restart', 'maintenance', 'sync_started', 'backup_started'];
      filtered = filtered.filter(log => {
        // If it's a system action, include it
        if (systemActions.includes(log.action)) {
          return true;
        }
        // If it has no user name or user name is 'System', include it
        if (!log.userName || log.userName === 'System' || log.userName === 'system') {
          return true;
        }
        return false;
      });
    }

    return filtered;
  };

  const getUserFriendlyActionName = (action: string): string => {
    const actionMap: Record<string, string> = {
      login: 'User logged in',
      logout: 'User logged out',
      document_upload: 'Document uploaded',
      document_viewed: 'Document viewed',
      document_downloaded: 'Document downloaded',
      message_sent: 'Message sent',
      user_created: 'New user account created',
      user_deactivated: 'User account deactivated',
      exchange_created: 'Exchange created',
      exchange_updated: 'Exchange updated',
      task_completed: 'Task completed',
      task_created: 'Task created',
      backup_created: 'System backup completed',
      sync_completed: 'Data sync completed',
      PERFORMANCE_ISSUE: 'Performance issue detected',
      security_alert: 'Security alert triggered',
      failed_login: 'Failed login attempt'
    };

    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Activity Monitor</h2>
          <p className="text-gray-600 mt-1">
            Track user activities and system operations in a simple, organized view
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">User Activities</p>
              <p className="text-3xl font-bold">{stats.userActivities}</p>
            </div>
            <UserIcon className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm">System Activities</p>
              <p className="text-3xl font-bold">{stats.systemActivities}</p>
            </div>
            <ComputerDesktopIcon className="w-10 h-10 text-gray-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Today</p>
              <p className="text-3xl font-bold">{stats.todayTotal}</p>
            </div>
            <ClockIcon className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">This Week</p>
              <p className="text-3xl font-bold">{stats.weekTotal}</p>
            </div>
            <ChartBarIcon className="w-10 h-10 text-purple-200" />
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: SparklesIcon },
            { id: 'user', label: 'User Activities', icon: UserIcon },
            { id: 'system', label: 'System Activities', icon: ComputerDesktopIcon }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeView === view.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
            </button>
          ))}
        </div>

        {/* Simple Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <select
            value={filters.timeframe}
            onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <p className="text-sm text-gray-500 mt-1">
            {getFilteredLogs().length} activities found
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {getFilteredLogs().slice(0, 50).map((log) => {
            const category = getCategoryForAction(log.action);
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-700 border-blue-200',
              green: 'bg-green-50 text-green-700 border-green-200',
              purple: 'bg-purple-50 text-purple-700 border-purple-200',
              indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              gray: 'bg-gray-50 text-gray-700 border-gray-200',
              red: 'bg-red-50 text-red-700 border-red-200'
            };

            return (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg border ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                    {category.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {getUserFriendlyActionName(log.action)}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                          {category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(log.timestamp || log.createdAt)}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      {log.userName && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {log.userName}
                        </span>
                      )}
                      {log.exchangeId && (
                        <span className="text-blue-600">Exchange #{log.exchangeId}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {getFilteredLogs().length === 0 && (
          <div className="p-12 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Activity Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                {getCategoryForAction(selectedLog.action).icon}
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {getUserFriendlyActionName(selectedLog.action)}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {getCategoryForAction(selectedLog.action).description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">When</label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Who</label>
                  <p className="text-sm text-gray-900">{selectedLog.userName || 'System'}</p>
                </div>

                {selectedLog.ip && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <p className="text-sm text-gray-900">{selectedLog.ip}</p>
                  </div>
                )}

                {selectedLog.exchangeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Exchange</label>
                    <p className="text-sm text-blue-600">Exchange #{selectedLog.exchangeId}</p>
                  </div>
                )}
              </div>

              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {typeof selectedLog.details === 'object' 
                        ? JSON.stringify(selectedLog.details, null, 2)
                        : String(selectedLog.details)
                      }
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAuditSystem;