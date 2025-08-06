import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { roleBasedApiService } from '@/shared/services/roleBasedApiService';
import {
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  StarIcon,
  UserGroupIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

interface AgencyStats {
  clients: {
    total: number;
    active: number;
    new: number;
  };
  exchanges: {
    total: number;
    active: number;
    completed: number;
    thisMonth: number;
  };
  agents: {
    total: number;
    active: number;
    onboarding: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    pending: number;
  };
  performance: {
    successRate: number;
    avgDays: number;
    satisfaction: number;
  };
}

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'exchanges' | 'agents' | 'performance' | 'reports'>('overview');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<AgencyStats>({
    clients: { total: 0, active: 0, new: 0 },
    exchanges: { total: 0, active: 0, completed: 0, thisMonth: 0 },
    agents: { total: 0, active: 0, onboarding: 0 },
    revenue: { total: 0, thisMonth: 0, pending: 0 },
    performance: { successRate: 0, avgDays: 0, satisfaction: 0 }
  });

  const loadAgencyData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role as any,
        company: user.company || ''
      });

      const agencyExchanges = dashboardData.exchanges || [];
      const agencyContacts = dashboardData.contacts || [];

      setExchanges(agencyExchanges);
      setClients(agencyContacts);

      // Calculate stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        clients: {
          total: agencyContacts.length,
          active: agencyContacts.filter((c: any) => c.is_active !== false).length,
          new: agencyContacts.filter((c: any) => new Date(c.createdAt || '2024-01-01') >= monthStart).length
        },
        exchanges: {
          total: agencyExchanges.length,
          active: agencyExchanges.filter((e: any) => e.status === 'active').length,
          completed: agencyExchanges.filter((e: any) => e.status === 'completed').length,
          thisMonth: agencyExchanges.filter((e: any) => new Date(e.createdAt || '2024-01-01') >= monthStart).length
        },
        agents: {
          total: 25, // Mock data
          active: 18,
          onboarding: 3
        },
        revenue: {
          total: 1250000, // Mock data
          thisMonth: 85000,
          pending: 320000
        },
        performance: {
          successRate: 94,
          avgDays: 45,
          satisfaction: 4.8
        }
      });
    } catch (err) {
      console.error('Error loading agency data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'agency') {
      loadAgencyData();
    }
  }, [user, loadAgencyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg relative">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agency Dashboard</h1>
              <p className="text-sm text-gray-600">{user?.company || 'Agency'}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 space-y-4">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.clients.total}</p>
                <p className="text-sm opacity-90">Total Clients</p>
              </div>
              <UsersIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.exchanges.total}</p>
                <p className="text-sm opacity-90">Total Exchanges</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">${(stats.revenue.total / 1000).toFixed(0)}K</p>
                <p className="text-sm opacity-90">Total Revenue</p>
              </div>
              <BanknotesIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center text-xs text-purple-700">
              <StarIcon className="w-4 h-4 mr-2" />
              <span>Satisfaction: {stats.performance.satisfaction}/5</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{stats.performance.successRate}% Success Rate</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <nav className="flex space-x-8 mb-6 border-b border-gray-200">
            {[
              { name: 'Overview', id: 'overview', icon: ChartBarIcon },
              { name: 'Clients', id: 'clients', icon: UsersIcon },
              { name: 'Exchanges', id: 'exchanges', icon: DocumentTextIcon },
              { name: 'Agents', id: 'agents', icon: UserGroupIcon },
              { name: 'Reports', id: 'reports', icon: ChartPieIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'clients' | 'exchanges' | 'agents' | 'performance' | 'reports')}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Portfolio Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <UsersIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.clients.total}</p>
                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                    <p className="text-xs text-green-600 mt-1">+{stats.clients.new} new this month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.exchanges.total}</p>
                    <p className="text-sm font-medium text-gray-600">Total Exchanges</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.exchanges.active} active, {stats.exchanges.completed} completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <BanknotesIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">${(stats.revenue.total / 1000).toFixed(0)}K</p>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-xs text-green-600 mt-1">${(stats.revenue.thisMonth / 1000).toFixed(0)}K this month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-yellow-100">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.performance.successRate}%</p>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-xs text-gray-500 mt-1">⭐ {stats.performance.satisfaction}/5.0 satisfaction</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Super Third Party Network Health */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-purple-900">🌐 Super Third Party Network Health</h2>
                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[View Network]</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{Math.round((stats.exchanges.completed / Math.max(stats.exchanges.total, 1)) * 100)}%</div>
                  <div className="text-sm text-gray-600">Exchange Success Rate</div>
                  <div className="text-xs text-gray-500 mt-1">🏆 Across all agents</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.agents.active}</div>
                  <div className="text-sm text-gray-600">Active Agents</div>
                  <div className="text-xs text-gray-500 mt-1">👥 Network strength</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.clients.total}</div>
                  <div className="text-sm text-gray-600">Clients Managed</div>
                  <div className="text-xs text-gray-500 mt-1">📈 Portfolio size</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">${(stats.revenue.pending / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-gray-600">Revenue Pipeline</div>
                  <div className="text-xs text-gray-500 mt-1">💰 Expected this quarter</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {exchanges.slice(0, 5).map((exchange: any) => (
                  <div key={exchange.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Exchange {exchange.id} - {exchange.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(exchange.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <EyeIcon className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Client Management</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <p className="text-gray-600">Client management interface coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {/* Exchanges Tab */}
        {activeTab === 'exchanges' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Exchange Management</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <p className="text-gray-600">Exchange management interface coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Network</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <p className="text-gray-600">Agent network management interface coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <p className="text-gray-600">Reports and analytics interface coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyDashboard;