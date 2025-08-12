import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  person_id: string;
  ip_address: string;
  user_agent: string;
  details: any;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AuditStats {
  total: number;
  actionStats: Record<string, number>;
  entityStats: Record<string, number>;
  timeRange: {
    start: string;
    end: string;
  };
}

const AuditLogViewer: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator, isAgency } = usePermissions();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    userId: '',
    action: '',
    entityType: '',
    entityId: '',
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
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Load audit logs
  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await apiService.get(`/audit/logs?${queryParams}`);
      
      if (response.success) {
        setAuditLogs(response.data);
        setPagination(response.pagination);
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Load audit statistics
  const loadStats = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await apiService.get(`/audit/stats?${queryParams}`);
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load audit stats:', err);
    }
  };

  // Load available filter options
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

  // Export audit logs
  const exportAuditLogs = async (format: 'json' | 'csv') => {
    try {
      // For blob responses, we need to use fetch directly
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/audit/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          format,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(`Failed to export audit logs: ${err.message}`);
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
    loadAuditLogs();
    loadStats();
    loadFilterOptions();
  }, [filters]);

  // Check if user has access
  if (!isAdmin() && !isCoordinator() && !isAgency()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">
            Track all system activities and user actions
            {user?.role && ` (${user.role} view)`}
          </p>
        </div>
        
        {isAdmin() && (
          <div className="flex space-x-2">
            <button
              onClick={() => exportAuditLogs('json')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export JSON
            </button>
            <button
              onClick={() => exportAuditLogs('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Actions</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Top Action</div>
            <div className="text-lg font-semibold text-gray-900">
              {Object.entries(stats.actionStats)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Top Entity</div>
            <div className="text-lg font-semibold text-gray-900">
              {Object.entries(stats.entityStats)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Time Range</div>
            <div className="text-sm text-gray-900">
              {stats.timeRange.start ? new Date(stats.timeRange.start).toLocaleDateString() : 'All time'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search logs..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Actions</option>
              {availableActions.map(action => (
                <option key={action} value={action}>{action}</option>
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {availableEntityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Additional filters for admin */}
        {isAdmin() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => updateFilter('userId', e.target.value)}
                placeholder="Filter by user ID..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity ID
              </label>
              <input
                type="text"
                value={filters.entityId}
                onChange={(e) => updateFilter('entityId', e.target.value)}
                placeholder="Filter by entity ID..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {log.users?.email || 'Unknown User'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{log.entity_type || 'N/A'}</div>
                          {log.entity_id && (
                            <div className="text-xs text-gray-500">{log.entity_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <button
                          onClick={() => {
                            // Show details in a modal or expandable row
                            console.log('Log details:', log.details);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => updateFilter('page', (pagination.page - 1).toString())}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => updateFilter('page', (pagination.page + 1).toString())}
                    disabled={pagination.page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{pagination.total}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => updateFilter('page', (pagination.page - 1).toString())}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => updateFilter('page', (pagination.page + 1).toString())}
                        disabled={pagination.page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;

