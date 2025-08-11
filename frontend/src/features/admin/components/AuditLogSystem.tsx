import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import ModernCard from '../../../components/ui/ModernCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import ModernDropdown from '../../../components/ui/ModernDropdown';
import FilterChips from '../../../components/ui/FilterChips';

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
  ChartBarIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  AtSymbolIcon,
  PaperAirplaneIcon,
  EllipsisHorizontalIcon,
  FlagIcon,
  CheckIcon,
  ClockIcon as ClockIconSolid,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/outline';

import { AuditLog, User } from '../../../types';

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

interface AuditComment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
  mentions: string[];
  isEdited: boolean;
  editedAt?: string;
}

interface AuditLike {
  id: string;
  userId: string;
  userName: string;
  reactionType: string;
  createdAt: string;
}

interface AuditAssignment {
  id: string;
  assignedBy: string;
  assignedTo: string;
  assignedByUser: string;
  assignedToUser: string;
  assignmentType: string;
  priority: string;
  status: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

interface AuditEscalation {
  id: string;
  escalatedBy: string;
  escalatedTo: string;
  escalatedByUser: string;
  escalatedToUser: string;
  escalationLevel: number;
  reason: string;
  priority: string;
  status: string;
  createdAt: string;
}

const AuditLogSystem: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);

  // Social features state
  const [comments, setComments] = useState<AuditComment[]>([]);
  const [likes, setLikes] = useState<AuditLike[]>([]);
  const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
  const [escalations, setEscalations] = useState<AuditEscalation[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState('');
  const [selectedUserForEscalation, setSelectedUserForEscalation] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

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
      console.log('🔍 Loading audit data...');
      
      const [logsResponse, usersData] = await Promise.all([
        apiService.getAuditLogs(),
        apiService.getUsers()
      ]);

      console.log('📋 Audit logs response:', logsResponse);
      
      // Handle different response formats
      let logs: AuditLog[] = [];
      const logsResponseAny = logsResponse as any;
      if (logsResponseAny?.success && logsResponseAny?.data) {
        logs = Array.isArray(logsResponseAny.data) ? logsResponseAny.data : [];
      } else if (Array.isArray(logsResponse)) {
        logs = logsResponse;
      } else if (logsResponseAny?.data && Array.isArray(logsResponseAny.data)) {
        logs = logsResponseAny.data;
      }

      console.log('✅ Processed audit logs:', logs.length);
      
      setAuditLogs(logs);
      const usersDataAny = usersData as any;
      setUsers(Array.isArray(usersData) ? usersData : (usersDataAny?.data || []));
      calculateStats(logs);
    } catch (error) {
      console.error('❌ Failed to load audit data:', error);
      // Set empty arrays as fallback
      setAuditLogs([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: AuditLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setStats({
      total: logs.length,
      today: logs.filter(log => new Date(log.createdAt || log.timestamp || '') >= today).length,
      warnings: logs.filter(log => log.severity === 'warning').length,
      errors: logs.filter(log => log.severity === 'error').length,
      users: new Set(logs.map(log => log.userId)).size,
      actions: new Set(logs.map(log => log.action)).size
    });
  };

  const getFilteredAuditLogs = (logs: AuditLog[]) => {
    return logs.filter(log => {
      // Action filter
      if (filters.action !== 'all' && log.action !== filters.action) return false;

      // User filter
      if (filters.user && !log.userName?.toLowerCase().includes(filters.user.toLowerCase())) return false;

      // Date range filter
      if (filters.dateRange !== 'all') {
        const logDate = new Date(log.createdAt || log.timestamp || '');
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (logDate < today) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (logDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (logDate < monthAgo) return false;
            break;
        }
      }

      // Severity filter
      if (filters.severity !== 'all' && log.severity !== filters.severity) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          log.action,
          log.userName,
          log.details ? JSON.stringify(log.details) : '',
          log.ip,
          log.userAgent
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) return false;
      }

      return true;
    });
  };

  const applyFilters = () => {
    // This will be called when filters change
    // The filtering is done in getFilteredAuditLogs
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      login: <ArrowRightOnRectangleIcon className="w-4 h-4 text-green-600" />,
      logout: <ArrowLeftOnRectangleIcon className="w-4 h-4 text-gray-600" />,
      document_upload: <DocumentTextIcon className="w-4 h-4 text-blue-600" />,
      document_viewed: <EyeIcon className="w-4 h-4 text-blue-600" />,
      document_downloaded: <DocumentTextIcon className="w-4 h-4 text-green-600" />,
      message_sent: <ChatBubbleLeftIcon className="w-4 h-4 text-purple-600" />,
      user_created: <UserPlusIcon className="w-4 h-4 text-green-600" />,
      user_deactivated: <UserIcon className="w-4 h-4 text-red-600" />,
      security_alert: <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />,
      PERFORMANCE_ISSUE: <ExclamationCircleIcon className="w-4 h-4 text-yellow-600" />,
      task_completed: <CheckCircleIcon className="w-4 h-4 text-green-600" />,
      exchange_created: <ComputerDesktopIcon className="w-4 h-4 text-blue-600" />,
      backup_created: <ShieldCheckIcon className="w-4 h-4 text-green-600" />
    };

    return iconMap[action] || <InformationCircleIcon className="w-4 h-4 text-gray-600" />;
  };

  const getSeverityColor = (severity: string | undefined) => {
    const colorMap: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };

    return colorMap[severity || 'info'] || colorMap.info;
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getActiveFilters = () => {
    const active: Array<{ key: string; label: string; value: string }> = [];
    if (filters.action !== 'all') active.push({ key: 'action', label: 'Action', value: filters.action });
    if (filters.user) active.push({ key: 'user', label: 'User', value: filters.user });
    if (filters.dateRange !== 'all') active.push({ key: 'dateRange', label: 'Date Range', value: filters.dateRange });
    if (filters.severity !== 'all') active.push({ key: 'severity', label: 'Severity', value: filters.severity });
    if (filters.search) active.push({ key: 'search', label: 'Search', value: filters.search });
    return active;
  };

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: key === 'action' || key === 'dateRange' || key === 'severity' ? 'all' : '' }));
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

  // Social features functions
  const loadSocialData = async (auditLogId: string) => {
    try {
      const response = await apiService.getAuditLogInteractions(auditLogId);
      const { interactions } = response;
      
      setComments(interactions?.comments || []);
      setLikes(interactions?.likes || []);
      setAssignments(interactions?.assignments || []);
      setEscalations(interactions?.escalations || []);
    } catch (error) {
      console.error('Failed to load social data:', error);
    }
  };

  const handleLike = async (auditLogId: string) => {
    try {
      await apiService.likeAuditLog(auditLogId, 'like');
      
      // Refresh social data
      await loadSocialData(auditLogId);
    } catch (error) {
      console.error('Failed to like audit log:', error);
    }
  };

  const handleComment = async (auditLogId: string) => {
    if (!newComment.trim()) return;

    try {
      await apiService.commentOnAuditLog(auditLogId, newComment, extractMentions(newComment));
      
      setNewComment('');
      await loadSocialData(auditLogId);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@(\w+)/g);
    if (!mentions) return [];
    
    return mentions.map(mention => {
      const username = mention.substring(1);
      const user = users.find(u => 
        u.firstName?.toLowerCase() === username.toLowerCase() ||
        u.lastName?.toLowerCase() === username.toLowerCase() ||
        u.email?.toLowerCase().includes(username.toLowerCase())
      );
      return user?.id;
    }).filter(Boolean) as string[];
  };

  const handleAssign = async (auditLogId: string) => {
    if (!selectedUserForAssignment) return;

    try {
      await apiService.assignAuditLog(auditLogId, {
        assignedTo: selectedUserForAssignment,
        assignmentType: 'review',
        priority: 'normal',
        notes: assignmentNotes
      });
      
      setShowAssignmentModal(false);
      setSelectedUserForAssignment('');
      setAssignmentNotes('');
      await loadSocialData(auditLogId);
    } catch (error) {
      console.error('Failed to assign audit log:', error);
    }
  };

  const handleEscalate = async (auditLogId: string) => {
    if (!selectedUserForEscalation || !escalationReason) return;

    try {
      await apiService.escalateAuditLog(auditLogId, {
        escalatedTo: selectedUserForEscalation,
        reason: escalationReason,
        priority: 'high'
      });
      
      setShowEscalationModal(false);
      setSelectedUserForEscalation('');
      setEscalationReason('');
      await loadSocialData(auditLogId);
    } catch (error) {
      console.error('Failed to escalate audit log:', error);
    }
  };

  const openSocialModal = async (log: AuditLog) => {
    setSelectedLog(log);
    setShowSocialModal(true);
    await loadSocialData(log.id);
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
    { value: 'PERFORMANCE_ISSUE', label: 'Performance Issue' },
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
              ? 'Complete system activity monitoring and security logs with social features'
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
                      {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'N/A'}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openSocialModal(log)}
                        className="text-green-600 hover:text-green-900"
                        title="Social Features"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      </button>
                    </div>
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
                  <p className="text-sm text-gray-800">
                    {selectedLog.details ? (typeof selectedLog.details === 'object' ? JSON.stringify(selectedLog.details, null, 2) : String(selectedLog.details)) : 'N/A'}
                  </p>
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

      {/* Social Features Modal */}
      {showSocialModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Social Features - {selectedLog.action}</h3>
              <button
                onClick={() => setShowSocialModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <button
                onClick={() => handleLike(selectedLog.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <HeartIcon className="w-5 h-5" />
                <span>Like ({likes.length})</span>
              </button>

              <button
                onClick={() => setReplyTo('main')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                <span>Comment ({comments.length})</span>
              </button>

              {(user?.role === 'admin' || user?.role === 'coordinator') && (
                <>
                  <button
                    onClick={() => setShowAssignmentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                    <span>Assign ({assignments.length})</span>
                  </button>

                  <button
                    onClick={() => setShowEscalationModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  >
                    <ExclamationCircleIcon className="w-5 h-5" />
                    <span>Escalate ({escalations.length})</span>
                  </button>
                </>
              )}
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-4">Comments</h4>
              
              {/* Add Comment */}
              {replyTo && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... Use @username to mention someone"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleComment(selectedLog.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setReplyTo(null);
                        setNewComment('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">{comment.userName}</span>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(comment.createdAt)}
                        </span>
                        {comment.isEdited && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <EllipsisHorizontalIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-800">{comment.content}</p>
                    {comment.mentions.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <AtSymbolIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-600">
                          Mentioned: {comment.mentions.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments Section */}
            {assignments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Assignments</h4>
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{assignment.assignedToUser}</span>
                          <span className="text-sm text-gray-600"> assigned by {assignment.assignedByUser}</span>
                        </div>
                        <StatusBadge status={assignment.status} />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Type: {assignment.assignmentType} | Priority: {assignment.priority}
                      </div>
                      {assignment.notes && (
                        <div className="text-sm text-gray-700 mt-1">{assignment.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Escalations Section */}
            {escalations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Escalations</h4>
                <div className="space-y-2">
                  {escalations.map((escalation) => (
                    <div key={escalation.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{escalation.escalatedToUser}</span>
                          <span className="text-sm text-gray-600"> escalated by {escalation.escalatedByUser}</span>
                        </div>
                        <StatusBadge status={escalation.status} />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Level: {escalation.escalationLevel} | Priority: {escalation.priority}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{escalation.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Assign Audit Log</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
                <select
                  value={selectedUserForAssignment}
                  onChange={(e) => setSelectedUserForAssignment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Add notes about this assignment..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedLog && handleAssign(selectedLog.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Escalate Audit Log</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escalate to</label>
                <select
                  value={selectedUserForEscalation}
                  onChange={(e) => setSelectedUserForEscalation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Why is this being escalated?"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEscalationModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedLog && handleEscalate(selectedLog.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogSystem;