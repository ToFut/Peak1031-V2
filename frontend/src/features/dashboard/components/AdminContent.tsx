import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { smartApi } from '@/shared/services/smartApi';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  EyeIcon,
  PlusIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface AdminStats {
  exchanges: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    ppSynced: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    clients: number;
    coordinators: number;
  };
  system: {
    lastSync: string | null;
    syncStatus: 'success' | 'error' | 'pending';
    totalDocuments: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  };
}

const QuickAction: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color: 'green' | 'blue' | 'purple' | 'orange';
}> = ({ title, description, icon: Icon, onClick, color }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left w-full ${colorClasses[color]}`}
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-6 h-6 mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
};

const EnhancedAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    exchanges: { total: 0, pending: 0, active: 0, completed: 0, ppSynced: 0 },
    tasks: { total: 0, pending: 0, overdue: 0, completed: 0 },
    users: { total: 0, active: 0, admins: 0, clients: 0, coordinators: 0 },
    system: { lastSync: null, syncStatus: 'pending', totalDocuments: 0, systemHealth: 'healthy' }
  });

  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [exchangeStats, taskStats, userStats, systemStats] = await Promise.all([
        smartApi.getExchangeStats(),
        smartApi.getTaskStats(),
        smartApi.getUserStats(),
        smartApi.getSystemStats()
      ]);

      setStats({
        exchanges: exchangeStats,
        tasks: taskStats,
        users: userStats,
        system: systemStats
      });
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPP = async () => {
    try {
      setSyncing(true);
      await smartApi.syncPracticePanther();
      await loadAdminStats();
    } catch (err) {
      console.error('PP sync failed:', err);
      setError('Failed to sync PracticePanther data');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Admin Overview Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">{user?.company || 'System Administration'}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Dashboard Overview Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2" /> Dashboard Overview
              </h1>
              <p className="text-gray-600 mt-2 text-sm">
                Monitor key metrics and system performance at a glance
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSyncPP}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                {syncing ? 'Syncing...' : 'Sync PP Data'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Statistics Cards with Enhanced Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <DocumentTextIcon className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+12%</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.exchanges.total}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Total Exchanges</p>
              <p className="text-xs text-gray-500 mt-2">📊 {stats.exchanges.ppSynced} synced from PP</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <UsersIcon className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.users.active}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Platform Users</p>
              <p className="text-xs text-gray-500 mt-2">👥 {stats.users.admins} admins, {stats.users.coordinators} coordinators</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                {stats.tasks.overdue > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full animate-pulse">
                    {stats.tasks.overdue} overdue!
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.tasks.pending}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Pending Tasks</p>
              <p className="text-xs text-gray-500 mt-2">⏰ Requires attention</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <ServerIcon className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                  <span className="text-xs font-medium text-green-600">Healthy</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">98%</p>
              <p className="text-sm font-medium text-gray-600 mt-1">System Health</p>
              <p className="text-xs text-gray-500 mt-2">✅ All systems operational</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAction
                title="Sync PP Data"
                description="Update from PracticePanther"
                icon={ArrowPathIcon}
                onClick={handleSyncPP}
                color="green"
              />
              <QuickAction
                title="Create User"
                description="Add new platform user"
                icon={PlusIcon}
                onClick={() => window.location.href = '/admin/users'}
                color="blue"
              />
              <QuickAction
                title="View Audit Logs"
                description="System activity history"
                icon={EyeIcon}
                onClick={() => window.location.href = '/admin/system'}
                color="purple"
              />
              <QuickAction
                title="System Settings"
                description="Configure platform"
                icon={CogIcon}
                onClick={() => window.location.href = '/admin/system'}
                color="orange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;