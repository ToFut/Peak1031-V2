import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import Layout from '../components/Layout';
import {
  Search, Filter, Plus, Download, Users, BarChart3,
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  DollarSign, FileText, MessageSquare, Settings,
  Eye, Edit, MoreVertical, Calendar, Target,
  Activity, Shield, ExternalLink, RefreshCw
} from 'lucide-react';

interface EnterpriseExchange {
  id: string;
  name: string;
  status: string;
  lifecycle_stage: string;
  completion_percentage: number;
  days_in_current_stage: number;
  compliance_status: string;
  risk_level: string;
  total_replacement_value: number;
  identification_deadline: string;
  exchange_deadline: string;
  participant_count: number;
  coordinator_name: string;
  compliance_issues: number;
  on_track: boolean;
  created_at: string;
}

interface DashboardStats {
  total_exchanges: number;
  active_exchanges: number;
  completed_exchanges: number;
  overdue_items: number;
  compliance_issues: number;
  total_value: number;
  stage_breakdown: any[];
  compliance_breakdown: any[];
}

const LIFECYCLE_STAGES = {
  'INITIATION': { label: 'Initiation', color: 'bg-gray-500', textColor: 'text-gray-700' },
  'QUALIFICATION': { label: 'Qualification', color: 'bg-blue-500', textColor: 'text-blue-700' },
  'DOCUMENTATION': { label: 'Documentation', color: 'bg-purple-500', textColor: 'text-purple-700' },
  'RELINQUISHED_SALE': { label: 'Sale Complete', color: 'bg-orange-500', textColor: 'text-orange-700' },
  'IDENTIFICATION_PERIOD': { label: '45-Day Period', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  'REPLACEMENT_ACQUISITION': { label: '180-Day Period', color: 'bg-amber-500', textColor: 'text-amber-700' },
  'COMPLETION': { label: 'Completed', color: 'bg-green-500', textColor: 'text-green-700' }
};

const RISK_COLORS = {
  'LOW': 'text-green-700 bg-green-50 border-green-200',
  'MEDIUM': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'HIGH': 'text-orange-700 bg-orange-50 border-orange-200',
  'CRITICAL': 'text-red-700 bg-red-50 border-red-200'
};

const COMPLIANCE_COLORS = {
  'COMPLIANT': 'text-green-700 bg-green-50 border-green-200',
  'AT_RISK': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'NON_COMPLIANT': 'text-red-700 bg-red-50 border-red-200',
  'PENDING': 'text-gray-700 bg-gray-50 border-gray-200'
};

const EnterpriseAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [exchanges, setExchanges] = useState<EnterpriseExchange[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // View options
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(stageFilter !== 'all' && { stage: stageFilter }),
        ...(riskFilter !== 'all' && { risk: riskFilter })
      });

      const [exchangeData, statsData] = await Promise.all([
        apiService.get(`/enterprise-exchanges?${params}`),
        apiService.get('/enterprise-exchanges/dashboard/stats')
      ]);

      setExchanges(exchangeData.exchanges || []);
      setTotalPages(exchangeData.pagination?.totalPages || 1);
      setStats(statsData);

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, searchTerm, statusFilter, stageFilter, riskFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadDashboardData();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter change handlers
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'stage':
        setStageFilter(value);
        break;
      case 'risk':
        setRiskFilter(value);
        break;
    }
    setPage(1);
  };

  // Get days remaining for deadlines
  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Export functionality
  const handleExport = async () => {
    try {
      const exportData = exchanges.map(exchange => ({
        'Exchange Name': exchange.name,
        'Status': exchange.status,
        'Stage': LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.label || exchange.lifecycle_stage,
        'Progress': `${exchange.completion_percentage}%`,
        'Risk Level': exchange.risk_level,
        'Compliance': exchange.compliance_status,
        'Value': `$${exchange.total_replacement_value?.toLocaleString()}`,
        'Coordinator': exchange.coordinator_name,
        'Participants': exchange.participant_count,
        'Days in Stage': exchange.days_in_current_stage,
        'Created': new Date(exchange.created_at).toLocaleDateString()
      }));

      const csvContent = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).join(','))
      ].join('\\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exchanges-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You need admin privileges to access this dashboard.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-96"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Admin Dashboard</h1>
            <p className="text-gray-600">Complete overview of all exchanges and system performance</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={loadDashboardData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Exchanges</p>
                  <p className="text-2xl font-bold text-gray-900">{exchanges.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.active_exchanges} active • {stats.completed_exchanges} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(stats.total_value || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Active exchanges
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Issues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.compliance_issues || 0}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Need attention
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue_items || 0}</p>
                  <p className="text-xs text-red-600 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Past deadline
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Breakdown */}
        {stats?.stage_breakdown && stats.stage_breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Stages Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {stats.stage_breakdown.map((stage: any) => {
                const stageConfig = LIFECYCLE_STAGES[stage.lifecycle_stage as keyof typeof LIFECYCLE_STAGES];
                return (
                  <div key={stage.lifecycle_stage} className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-lg ${stageConfig?.color || 'bg-gray-500'} flex items-center justify-center mb-2`}>
                      <span className="text-white font-bold text-lg">{stage.count}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{stageConfig?.label || stage.lifecycle_stage}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exchanges..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => handleFilterChange('stage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Stages</option>
                  {Object.entries(LIFECYCLE_STAGES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <select
                  value={riskFilter}
                  onChange={(e) => handleFilterChange('risk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="CRITICAL">Critical Risk</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Exchanges Table */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">All Exchanges</h3>
              <span className="text-sm text-gray-500">({exchanges.length} total)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading exchanges...</p>
            </div>
          ) : exchanges.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchanges Found</h3>
              <p className="text-gray-500">No exchanges match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage & Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk & Compliance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value & Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadlines
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exchanges.map((exchange) => {
                    const stageConfig = LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES];
                    const identificationDays = getDaysRemaining(exchange.identification_deadline);
                    const exchangeDays = getDaysRemaining(exchange.exchange_deadline);

                    return (
                      <tr key={exchange.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center">
                              <button
                                onClick={() => navigate(`/exchanges/${exchange.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {exchange.name}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {exchange.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageConfig?.textColor} ${stageConfig?.color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                              {stageConfig?.label}
                            </span>
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${stageConfig?.color}`}
                                style={{ width: `${exchange.completion_percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {exchange.completion_percentage}% • {exchange.days_in_current_stage}d in stage
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${RISK_COLORS[exchange.risk_level as keyof typeof RISK_COLORS]}`}>
                              {exchange.risk_level}
                            </span>
                            <div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${COMPLIANCE_COLORS[exchange.compliance_status as keyof typeof COMPLIANCE_COLORS]}`}>
                                {exchange.compliance_status}
                              </span>
                            </div>
                            {exchange.compliance_issues > 0 && (
                              <div className="text-xs text-red-600">
                                {exchange.compliance_issues} issues
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${exchange.total_replacement_value?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {exchange.participant_count} participants
                          </div>
                          <div className="text-xs text-gray-500">
                            Coord: {exchange.coordinator_name || 'Unassigned'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className={`text-xs ${
                              identificationDays < 0 ? 'text-red-600 font-medium' :
                              identificationDays < 7 ? 'text-orange-600 font-medium' :
                              'text-gray-600'
                            }`}>
                              45d: {identificationDays < 0 ? 'OVERDUE' : `${identificationDays}d left`}
                            </div>
                            <div className={`text-xs ${
                              exchangeDays < 0 ? 'text-red-600 font-medium' :
                              exchangeDays < 14 ? 'text-orange-600 font-medium' :
                              'text-gray-600'
                            }`}>
                              180d: {exchangeDays < 0 ? 'OVERDUE' : `${exchangeDays}d left`}
                            </div>
                            {!exchange.on_track && (
                              <div className="text-xs text-orange-600 font-medium">
                                Behind schedule
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/exchanges/${exchange.id}`)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/exchanges/${exchange.id}/edit`)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Edit Exchange"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-800"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing page {page} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                  {page}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EnterpriseAdminDashboard;