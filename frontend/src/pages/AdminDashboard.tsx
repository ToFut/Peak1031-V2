import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  exchanges: {
    total: number;
    pending: number;
    active: number;
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
  users: {
    total: number;
    active: number;
    admins: number;
    clients: number;
  };
  documents: {
    total: number;
    recent: number;
  };
  messages: {
    total: number;
    recent: number;
  };
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: 'running' | 'success' | 'error' | 'partial';
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_updated: number;
  records_created: number;
  error_message?: string;
  triggeredByUser?: {
    name: string;
    email: string;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSyncs, setRecentSyncs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [dashboardStats, syncLogs] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getSyncLogs()
      ]);
      setStats(dashboardStats);
      setRecentSyncs(syncLogs.slice(0, 5) as any); // Show only recent 5 syncs
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async (syncType: string = 'full') => {
    try {
      setSyncLoading(true);
      setError(null);
      await apiService.triggerSync(syncType);
      // Refresh sync logs after a short delay
      setTimeout(() => {
        loadDashboardData();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger sync');
    } finally {
      setSyncLoading(false);
    }
  };

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

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'error':
        return <ExclamationCircleIcon className="h-4 w-4" />;
      case 'running':
        return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
      case 'partial':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <BellIcon className="h-4 w-4" />;
    }
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
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
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
              Here's what's happening with your 1031 exchange platform today.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleTriggerSync('contacts')}
              disabled={syncLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              Sync Contacts
            </button>
            <button
              onClick={() => handleTriggerSync('full')}
              disabled={syncLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Full Sync
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Exchanges */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Exchanges
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.exchanges.total}
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
              <span className="text-blue-600 font-medium">
                {stats.exchanges.active} active
              </span>
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Exchange Value
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
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Active portfolio value
              </span>
            </div>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Tasks
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

        {/* Active Users */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.users.active}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">
                {stats.users.clients} clients
              </span>
              <span className="text-gray-500"> • </span>
              <span className="text-gray-600">
                {stats.users.admins} admins
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exchange Status Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Exchange Status Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">
                  {stats.exchanges.pending}
                </span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{
                      width: `${(stats.exchanges.pending / stats.exchanges.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Active (45D & 180D)</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">
                  {stats.exchanges.active}
                </span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(stats.exchanges.active / stats.exchanges.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">
                  {stats.exchanges.completed}
                </span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(stats.exchanges.completed / stats.exchanges.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Sync Activity
          </h3>
          <div className="space-y-3">
            {recentSyncs.length > 0 ? (
              recentSyncs.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSyncStatusColor(sync.status)}`}>
                      {getSyncStatusIcon(sync.status)}
                      <span className="ml-1 capitalize">{sync.status}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {sync.sync_type} Sync
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(sync.started_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {sync.records_processed} records
                    </p>
                    <p className="text-xs text-gray-500">
                      {sync.records_created} created, {sync.records_updated} updated
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <BellIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent sync activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <UsersIcon className="h-5 w-5 mr-2" />
            Manage Users
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            View Audit Logs
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Generate Reports
          </button>
          <button 
            onClick={() => window.open('/pp-oauth-test', '_blank')}
            className="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-md shadow-sm bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <CogIcon className="h-5 w-5 mr-2" />
            PP OAuth Test
          </button>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">API Server</p>
              <p className="text-xs text-gray-500">Operational</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">Healthy</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">PracticePanther</p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Real-time Messaging</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 