import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BellIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ActivityStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByEntity: Record<string, number>;
  recentActivity: AuditLog[];
}

interface AuditSummary {
  totalActions: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  topActions: Array<{ action: string; count: number }>;
  unreadNotifications: number;
}

const UserAuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Available options for filters
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Load user's activity
  const loadUserActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await apiService.getUserAuditActivity(filters);
      
      if (response.success) {
        setAuditLogs(response.data);
        setActivityStats(response.statistics);
        setPagination(response.pagination);
      } else {
        setError('Failed to load activity');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  // Load audit summary
  const loadAuditSummary = async () => {
    try {
      const response = await apiService.getAuditSummary();
      
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load audit summary:', err);
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [actionsResponse, entityTypesResponse] = await Promise.all([
        apiService.get('/audit/actions'),
        apiService.get('/audit/entity-types')
      ]);

      if (actionsResponse.success) {
        setAvailableActions(actionsResponse.data);
      }
      if (entityTypesResponse.success) {
        setAvailableEntityTypes(entityTypesResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to load filter options:', err);
    }
  };

  // Update filters
  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Load data on component mount
  useEffect(() => {
    loadUserActivity();
    loadAuditSummary();
    loadFilterOptions();
  }, [filters]);

  // Format action for display
  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <UserIcon className="h-4 w-4" />;
      case 'LOGOUT':
        return <XCircleIcon className="h-4 w-4" />;
      case 'DOCUMENT_UPLOADED':
        return <DocumentTextIcon className="h-4 w-4" />;
      case 'TASK_COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'EXCHANGE_CREATED':
        return <ChartBarIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'text-green-600 bg-green-100';
      case 'LOGOUT':
        return 'text-red-600 bg-red-100';
      case 'DOCUMENT_UPLOADED':
        return 'text-blue-600 bg-blue-100';
      case 'TASK_COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'EXCHANGE_CREATED':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
          <p className="text-gray-600">
            Track your system activities and recent actions
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <BellIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">
            {summary?.unreadNotifications || 0} unread notifications
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Actions</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalActions}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">This Week</div>
            <div className="text-2xl font-bold text-blue-600">{summary.actionsThisWeek}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">This Month</div>
            <div className="text-2xl font-bold text-green-600">{summary.actionsThisMonth}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Top Action</div>
            <div className="text-lg font-semibold text-gray-900">
              {summary.topActions[0]?.action ? formatAction(summary.topActions[0].action) : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <FunnelIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              {availableActions.map(action => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => updateFilter('entityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {availableEntityTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                page: 1,
                limit: 20,
                action: '',
                entityType: '',
                startDate: '',
                endDate: '',
                search: ''
              })}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600">
            Showing {auditLogs.length} activities
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your activity...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-6 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activity found for the selected filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {auditLogs.map((log, index) => (
              <div key={log.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 p-2 rounded-full ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatAction(log.action)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.entity_type && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              {log.entity_type}
                            </span>
                          )}
                          {log.details?.message || 'No additional details'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2">
                        <details className="text-sm text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-900">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => updateFilter('page', (pagination.page - 1).toString())}
              disabled={pagination.page <= 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => updateFilter('page', (pagination.page + 1).toString())}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAuditLogs;
