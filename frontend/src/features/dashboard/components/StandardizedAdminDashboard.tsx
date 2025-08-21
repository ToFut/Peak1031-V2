import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Remove unused lazy loading components since we're using StandardDashboard

// Remove AdminTabContent since we're using StandardDashboard for navigation

const StandardizedAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enhancedMetrics, setEnhancedMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mtdMetrics, setMtdMetrics] = useState<any>(null);
  const [quickActions, setQuickActions] = useState<Array<{ action: string; label: string; icon?: string }>>([]);

  // Fetch enhanced metrics from your backend
  const fetchEnhancedMetrics = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching fast dashboard, MTD metrics, and quick actions');
      const results = await Promise.allSettled([
        api.get('/dashboard/fast'),
        api.get('/metrics/friday-metrics'),
        api.get('/dashboard/quick-actions')
      ]);
      const fastResp = results[0].status === 'fulfilled' ? results[0].value : null;
      const mtdResp = results[1].status === 'fulfilled' ? results[1].value : null;
      const actionsResp = results[2].status === 'fulfilled' ? results[2].value : null;

      console.log('✅ Fast dashboard response:', fastResp);
      if (!fastResp) throw new Error('Failed to load fast dashboard');
      
      // Detailed logging for Friday metrics
      if (results[1].status === 'rejected') {
        console.warn('⚠️ Friday metrics failed:', results[1].reason);
      } else {
        console.log('✅ Friday metrics response:', mtdResp);
      }
      
      if (results[2].status === 'rejected') {
        console.warn('⚠️ Quick actions failed:', results[2].reason);
      } else {
        console.log('✅ Quick actions response:', actionsResp);
      }

      // Unwrap envelopes
      setEnhancedMetrics((fastResp as any)?.data || fastResp);
      setMtdMetrics((mtdResp as any)?.metrics || (mtdResp as any)?.data?.metrics || null);
      setQuickActions((actionsResp as any)?.quickActions || (actionsResp as any)?.data?.quickActions || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching enhanced metrics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create_user':
        navigate('/admin/users');
        break;
      case 'create_exchange':
        navigate('/exchanges');
        break;
      case 'view_audit_logs':
        navigate('/admin/audit');
        break;
      case 'sync_pp_data':
        navigate('/admin/practice-panther');
        break;
      default:
        console.log('Quick action clicked:', action);
    }
  };

  useEffect(() => {
    fetchEnhancedMetrics();
  }, []);

  const handleRefresh = () => {
    fetchEnhancedMetrics();
  };


  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">1031 Exchange Performance Metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Metrics (mapped to backend fast dashboard fields) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 1. Total Exchanges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exchanges</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.exchanges?.total ?? enhancedMetrics?.stats?.totalExchanges ?? 0}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          {/* 2. Active Exchanges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Exchanges</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.exchanges?.active ?? enhancedMetrics?.stats?.activeExchanges ?? 0}
                </p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          {/* 3. Completed Exchanges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Exchanges</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.exchanges?.completed ?? enhancedMetrics?.stats?.completedExchanges ?? 0}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          {/* 4. Total Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.tasks?.total ?? enhancedMetrics?.stats?.totalTasks ?? 0}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          {/* 5. Pending Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.tasks?.pending ?? enhancedMetrics?.stats?.pendingTasks ?? 0}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </div>

          {/* 6. Completed Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedMetrics?.tasks?.completed ?? enhancedMetrics?.stats?.completedTasks ?? 0}
                </p>
              </div>
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Debug Section - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>MTD Metrics Available: {mtdMetrics ? 'Yes' : 'No'}</p>
              {mtdMetrics && (
                <pre className="text-xs bg-yellow-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(mtdMetrics, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Month-To-Date Metrics */}
        {mtdMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Exchanges Created MTD</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mtdMetrics?.monthToDate?.exchangesCreated ?? 0}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Amount Funded MTD</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(mtdMetrics?.monthToDate?.amountFunded || 0).toLocaleString()}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Deal Size MTD</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(mtdMetrics?.monthToDate?.averageDealSize || 0).toLocaleString()}
                  </p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((qa) => (
                <button
                  key={qa.action}
                  onClick={() => handleQuickAction(qa.action)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Friday Metrics - Next 7 Days */}
        {mtdMetrics?.next7Days && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Incoming Funds (Next 7 Days)</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Gross</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(mtdMetrics?.next7Days?.incomingFunds?.grossSalesPrice || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Projected Net (60%)</p>
                    <p className="text-xl font-semibold text-gray-900">
                      ${(mtdMetrics?.next7Days?.incomingFunds?.projectedNet || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Deals</p>
                    <p className="text-lg font-medium text-gray-900">
                      {mtdMetrics?.next7Days?.incomingFunds?.numberOfDeals || 0}
                    </p>
                  </div>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outgoing Funds (Next 7 Days)</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(mtdMetrics?.next7Days?.outgoingFunds?.total || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Transactions</p>
                    <p className="text-lg font-medium text-gray-900">
                      {mtdMetrics?.next7Days?.outgoingFunds?.numberOfTransactions || 0}
                    </p>
                    <div className="text-xs text-gray-600 mt-2 space-y-1">
                      <p>Closings: {mtdMetrics?.next7Days?.outgoingFunds?.breakdown?.closings || 0}</p>
                      <p>Closeouts: {mtdMetrics?.next7Days?.outgoingFunds?.breakdown?.closeouts || 0}</p>
                      <p>EMDs: {mtdMetrics?.next7Days?.outgoingFunds?.breakdown?.emds || 0}</p>
                    </div>
                  </div>
                </div>
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Friday Metrics - Largest Upcoming Files */}
        {mtdMetrics?.largestUpcomingFiles && mtdMetrics.largestUpcomingFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3 Largest Files Incoming (Next 30 Days)</h3>
            <div className="space-y-3">
              {mtdMetrics.largestUpcomingFiles.map((file: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{file.propertyAddress || 'Unknown Property'}</p>
                    <p className="text-sm text-gray-600">
                      Expected: {file.closingDate ? new Date(file.closingDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">{file.exchangeNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${(file.grossSalesPrice || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Gross Sales Price</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Largest Files Incoming Next 30 Days */}
        {enhancedMetrics?.largestFilesNext30Days && enhancedMetrics.largestFilesNext30Days.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              3 Largest Files Incoming Next 30 Days
            </h3>
            <div className="space-y-3">
              {enhancedMetrics.largestFilesNext30Days.slice(0, 3).map((file: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{file.property_address || 'Unknown Property'}</p>
                    <p className="text-sm text-gray-600">
                      Expected: {new Date(file.expected_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ${(file.gross_sales_price || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Gross Sales Price</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );

};

export default StandardizedAdminDashboard;