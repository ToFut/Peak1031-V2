import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiService } from '@/shared/services/api';
import ModernCard from '@/shared/ui/atoms/ModernCard';
import StatusBadge from '@/shared/ui/atoms/StatusBadge';
import ModernDropdown from '@/shared/ui/atoms/ModernDropdown';
import FilterChips from '@/shared/ui/atoms/FilterChips';

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
  KeyIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

import { AuditLog, User } from '@/shared/types';

interface AuditLogFilter {
  action: string;
  user: string;
  dateRange: string;
  severity: string;
  search: string;
}

interface AuditStats {
  total: number;
  today: number;
  warnings: number;
  errors: number;
  users: number;
  actions: number;
}

const AuditLogSystem: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilter>({
    action: 'all',
    user: '',
    dateRange: 'all',
    severity: 'all',
    search: ''
  });

  // Stats
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    today: 0,
    warnings: 0,
    errors: 0,
    users: 0,
    actions: 0
  });

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const [logsData, usersData] = await Promise.all([
        apiService.getAuditLogs(),
        apiService.getUsers()
      ]);

      const logs = Array.isArray(logsData) ? logsData : [];
      setAuditLogs(logs);
      setUsers(Array.isArray(usersData) ? usersData : []);
      calculateStats(logs);
    } catch (error) {
      console.error('Failed to load audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: AuditLog[]) => {
    const today = new Date().toDateString();
    const filteredLogs = getFilteredAuditLogs(logs);

    setStats({
      total: filteredLogs.length,
      today: filteredLogs.filter(log => log.timestamp && new Date(log.timestamp).toDateString() === today).length,
      warnings: filteredLogs.filter(log => log.severity === 'warning').length,
      errors: filteredLogs.filter(log => log.severity === 'error').length,
      users: Array.from(new Set(filteredLogs.map(log => log.userName).filter(Boolean))).length,
      actions: Array.from(new Set(filteredLogs.map(log => log.action))).length
    });
  };

  // Role-based filtering logic from reference
  const getFilteredAuditLogs = (logs: AuditLog[]) => {
    let filteredLogs = logs;
    
    // Role-based filtering
    switch (user?.role) {
      case 'admin':
        // Admin sees everything
        break;
      case 'coordinator':
        // Coordinators see system activities and their network
        filteredLogs = logs.filter(log => 
          log.action === 'security_alert' ||
          log.userName === user.first_name + ' ' + user.last_name ||
          log.details.includes('Coordinator') ||
          log.details.includes('Exchange')
        );
        break;
      case 'agency':
        // Agency Managers see their network activities and security alerts
        filteredLogs = logs.filter(log => 
          log.action === 'security_alert' ||
          log.userName === user.first_name + ' ' + user.last_name ||
          log.details.includes('Agency') ||
          log.details.includes('Third Party')
        );
        break;
      case 'third_party':
        // Third Parties see their own activities and their clients' activities
        filteredLogs = logs.filter(log => 
          log.userName === user.first_name + ' ' + user.last_name ||
          log.details.includes('Third Party')
        );
        break;
      case 'client':
        // Clients see only their own activities and their exchange activities
        filteredLogs = logs.filter(log => 
          log.userName === user.first_name + ' ' + user.last_name ||
          (log.exchangeId && log.details.includes('exchange'))
        );
        break;
      default:
        // Default: show only own activities
        filteredLogs = logs.filter(log => log.userName === user?.first_name + ' ' + user?.last_name);
    }
    
    return filteredLogs;
  };

  const applyFilters = () => {
    let filtered = getFilteredAuditLogs(auditLogs);

    // Apply additional filters
    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.user) {
      filtered = filtered.filter(log => 
        log.userName?.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.severity !== 'all') {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.search) {
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.userName?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Date range filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (filters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(log => log.timestamp && new Date(log.timestamp) >= cutoffDate);
    }

    calculateStats(filtered);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <ArrowRightOnRectangleIcon className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <ArrowLeftOnRectangleIcon className="w-4 h-4 text-gray-600" />;
      case 'document_upload':
      case 'document_viewed':
      case 'document_downloaded':
        return <DocumentTextIcon className="w-4 h-4 text-blue-600" />;
      case 'message_sent':
      case 'message_received':
        return <ChatBubbleLeftIcon className="w-4 h-4 text-purple-600" />;
      case 'user_created':
      case 'user_deactivated':
        return <UserIcon className="w-4 h-4 text-indigo-600" />;
      case 'security_alert':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      case 'task_completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'exchange_created':
        return <DocumentTextIcon className="w-4 h-4 text-blue-600" />;
      case 'backup_created':
        return <ShieldCheckIcon className="w-4 h-4 text-green-600" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string | undefined) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getActiveFilters = () => {
    const activeFilters = [];
    if (filters.action !== 'all') activeFilters.push({ key: 'action', label: 'Action', value: filters.action });
    if (filters.user) activeFilters.push({ key: 'user', label: 'User', value: filters.user });
    if (filters.dateRange !== 'all') activeFilters.push({ key: 'dateRange', label: 'Date Range', value: filters.dateRange });
    if (filters.severity !== 'all') activeFilters.push({ key: 'severity', label: 'Severity', value: filters.severity });
    if (filters.search) activeFilters.push({ key: 'search', label: 'Search', value: filters.search });
    return activeFilters;
  };

  const removeFilter = (key: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: key === 'user' || key === 'search' ? '' : 'all'
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      action: 'all',
      user: '',
      dateRange: 'all',
      severity: 'all',
      search: ''
    });
  };

  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'document_upload', label: 'Document Upload' },
    { value: 'document_viewed', label: 'Document Viewed' },
    { value: 'document_downloaded', label: 'Document Downloaded' },
    { value: 'message_sent', label: 'Message Sent' },
    { value: 'user_created', label: 'User Created' },
    { value: 'user_deactivated', label: 'User Deactivated' },
    { value: 'security_alert', label: 'Security Alert' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'exchange_created', label: 'Exchange Created' },
    { value: 'backup_created', label: 'Backup Created' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600 mt-1">
            {user?.role === 'admin' 
              ? 'Complete system activity monitoring and security logs'
              : 'Your activity logs and relevant system events'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Audit Trail Active</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ChartBarIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm text-blue-600">Total Events</div>
        </ModernCard>

        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700">{stats.today}</div>
          <div className="text-sm text-green-600">Today</div>
        </ModernCard>

        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-700">{stats.warnings}</div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </ModernCard>

        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
          <div className="text-sm text-red-600">Errors</div>
        </ModernCard>

        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <UserIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.users}</div>
          <div className="text-sm text-purple-600">Active Users</div>
        </ModernCard>

        <ModernCard hover className="text-center">
          <div className="flex items-center justify-center mb-2">
            <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">{stats.actions}</div>
          <div className="text-sm text-indigo-600">Action Types</div>
        </ModernCard>
      </div>

      {/* Filters */}
      <ModernCard padding="sm">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>

          <ModernDropdown
            options={actionOptions}
            value={filters.action}
            onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
            className="w-48"
          />

          <ModernDropdown
            options={dateRangeOptions}
            value={filters.dateRange}
            onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            className="w-48"
          />

          <ModernDropdown
            options={severityOptions}
            value={filters.severity}
            onChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
            className="w-48"
          />

          <input
            type="text"
            placeholder="Filter by user..."
            value={filters.user}
            onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
          />
        </div>

        <FilterChips
          filters={getActiveFilters()}
          onRemoveFilter={removeFilter}
          onClearAll={clearAllFilters}
        />
      </ModernCard>

      {/* Audit Logs Table */}
      <ModernCard>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredAuditLogs(auditLogs).slice(0, 50).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {log.action.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.userName || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{log.ip || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {log.details}
                    </div>
                    {log.exchangeId && (
                      <div className="text-xs text-blue-600">Exchange: {log.exchangeId}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.timestamp ? formatTimestamp(log.timestamp) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(log.severity || 'info')}`}>
                      {log.severity || 'info'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetailsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {getFilteredAuditLogs(auditLogs).length === 0 && (
          <div className="text-center py-8">
            <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found matching your criteria.</p>
          </div>
        )}
      </ModernCard>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="font-medium capitalize">{selectedLog.action.replace('_', ' ')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getSeverityColor(selectedLog.severity || 'info')}`}>
                    {selectedLog.severity || 'info'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <div>
                    <div className="font-medium">{selectedLog.userName || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">ID: {selectedLog.userId}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timestamp</label>
                  <div className="font-medium">{selectedLog.timestamp ? formatTimestamp(selectedLog.timestamp) : 'N/A'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
                  <div className="font-medium">{selectedLog.ip || 'N/A'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                  <div className="font-medium truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-800">{selectedLog.details}</p>
                </div>
              </div>

              {selectedLog.exchangeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Related Exchange</label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">Exchange ID: {selectedLog.exchangeId}</p>
                  </div>
                </div>
              )}

              {selectedLog.documentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Related Document</label>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">Document ID: {selectedLog.documentId}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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

export default AuditLogSystem;