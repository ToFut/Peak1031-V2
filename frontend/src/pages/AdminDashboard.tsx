import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Settings, 
  Shield, 
  Upload, 
  User, 
  Users, 
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  MapPin,
  DollarSign,
  MoreVertical,
  Activity,
  Database,
  Server,
  HardDrive,
  Wifi,
  Zap,
  TrendingUp,
  AlertCircle,
  Check,
  X,
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
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { 
  adminService, 
  userService, 
  syncService
} from '../services/api';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    status: string;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  lastSync: {
    contacts: string;
    matters: string;
    tasks: string;
  };
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  recentLogins: number;
}

interface ExchangeStats {
  total: number;
  byStatus: Record<string, number>;
  recent: number;
  overdue: number;
}

interface SyncStats {
  lastSync: string;
  successRate: number;
  errors: number;
  pending: number;
}

const AdminDashboard: React.FC = () => {
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [exchangeStats, setExchangeStats] = useState<ExchangeStats | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        healthData,
        dashboardData,
        usersData,
        auditData,
        syncData
      ] = await Promise.all([
        adminService.getSystemHealth(),
        adminService.getDashboardData(),
        userService.getUsers(),
        adminService.getAuditLogs({ limit: 50 }),
        syncService.getSyncLogs({ limit: 20 })
      ]);

      setSystemHealth(healthData);
      setUserStats(dashboardData.userStats);
      setExchangeStats(dashboardData.exchangeStats);
      setSyncStats(dashboardData.syncStats);
      setUsers(usersData);
      setAuditLogs(auditData);
      setSyncLogs(syncData);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (type: 'contacts' | 'matters' | 'tasks' | 'all') => {
    try {
      setSyncInProgress(true);
      await syncService.triggerSync(type);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      switch (action) {
        case 'activate':
          await userService.activateUser(userId);
          break;
        case 'deactivate':
          await userService.deactivateUser(userId);
          break;
        case 'delete':
          await userService.deleteUser(userId);
          break;
      }
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('User action failed:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Check className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <X className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System administration and monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleSync('all')}
                disabled={syncInProgress}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
                {syncInProgress ? 'Syncing...' : 'Sync All'}
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'sync', label: 'Sync Management', icon: RefreshCw },
              { id: 'audit', label: 'Audit Logs', icon: Shield },
              { id: 'system', label: 'System Health', icon: Activity }
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Activity className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">System Status</dt>
                        <dd className="flex items-baseline">
                          <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${getHealthStatusColor(systemHealth?.status || 'unknown')}`}>
                            {getHealthStatusIcon(systemHealth?.status || 'unknown')}
                            <span className="ml-1 capitalize">{systemHealth?.status || 'Unknown'}</span>
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                        <dd className="text-lg font-medium text-gray-900">{userStats?.active || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Exchanges</dt>
                        <dd className="text-lg font-medium text-gray-900">{exchangeStats?.total || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <RefreshCw className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Sync Success Rate</dt>
                        <dd className="text-lg font-medium text-gray-900">{syncStats?.successRate || 0}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSync('contacts')}
                    disabled={syncInProgress}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Contacts
                  </button>
                  <button
                    onClick={() => handleSync('matters')}
                    disabled={syncInProgress}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Matters
                  </button>
                  <button
                    onClick={() => handleSync('tasks')}
                    disabled={syncInProgress}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Tasks
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {auditLogs.slice(0, 5).map((log, index) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {index !== auditLogs.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <User className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  {log.action} by <span className="font-medium text-gray-900">{log.user?.email}</span>
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={log.created_at}>
                                  {new Date(log.created_at).toLocaleDateString()}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Management Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setShowUserModal(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {users.map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate')}
                          className={`${
                            user.is_active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-6">
            {/* Sync Status */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Sync Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Contacts</h4>
                    <p className="text-sm text-gray-500">Last sync: {syncStats?.lastSync || 'Never'}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Matters</h4>
                    <p className="text-sm text-gray-500">Last sync: {syncStats?.lastSync || 'Never'}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Tasks</h4>
                    <p className="text-sm text-gray-500">Last sync: {syncStats?.lastSync || 'Never'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Logs */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Sync Logs</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {syncLogs.map((log, index) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {index !== syncLogs.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {log.status === 'success' ? (
                                  <Check className="h-4 w-4 text-white" />
                                ) : (
                                  <X className="h-4 w-4 text-white" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  {log.sync_type} sync {log.status}
                                </p>
                                {log.error_message && (
                                  <p className="text-sm text-red-500">{log.error_message}</p>
                                )}
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={log.started_at}>
                                  {new Date(log.started_at).toLocaleDateString()}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Audit Logs */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Audit Logs</h3>
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
                          Entity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.user?.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.entity_type} {log.entity_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.ip_address}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
    <div className="space-y-6">
            {/* System Health Details */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Health</h3>
                {systemHealth && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Memory Usage</h4>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${systemHealth.memory.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {systemHealth.memory.used}MB / {systemHealth.memory.total}MB ({systemHealth.memory.percentage}%)
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Disk Usage</h4>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${systemHealth.disk.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {systemHealth.disk.used}GB / {systemHealth.disk.total}GB ({systemHealth.disk.percentage}%)
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Database Connections</h4>
                      <p className="text-sm text-gray-500">
                        {systemHealth.database.connections} / {systemHealth.database.maxConnections} active
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {systemHealth.database.status}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">System Uptime</h4>
                      <p className="text-sm text-gray-500">
                        {Math.floor(systemHealth.uptime / 3600)} hours, {Math.floor((systemHealth.uptime % 3600) / 60)} minutes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedUser ? 'Edit User' : 'Add User'}
              </h3>
              {/* User form would go here */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                  {selectedUser ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 