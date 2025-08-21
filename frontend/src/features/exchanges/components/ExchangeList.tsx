import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Exchange } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useExchanges } from '../hooks/useExchanges';
import { useSmartExchanges } from '../../../hooks/useSmartExchanges';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { ExchangeCard } from './ExchangeCard';
import { DeadlineWarning } from './DeadlineWarning';
import ModernDropdown from './ModernDropdown';
import { VirtualizedList } from './VirtualizedList';
import {
  Search,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building,
  TrendingUp,
  Activity,
  Grid3X3,
  Table,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  BarChart3,
  MapPin
} from 'lucide-react';

interface ExchangeListProps {
  title?: string;
  showCreateButton?: boolean;
  filters?: {
    status?: string;
    limit?: number;
  };
  onExchangeSelect?: (exchange: Exchange) => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  enableSmartMode?: boolean; // New: Enable smart pagination and analytics
  showAIAnalysis?: boolean;  // New: Show AI analysis panel
}

// Filter Chips Component
const FilterChip: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}> = ({ label, value, onRemove, className = '' }) => (
  <div className={`inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200 ${className}`}>
    <span>{label}: {value}</span>
    <button
      onClick={onRemove}
      className="text-blue-500 hover:text-blue-700 transition-colors ml-1 hover:bg-blue-200 rounded-sm px-1"
    >
      ×
    </button>
  </div>
);

// Exchange Stats Component - Memoized
const ExchangeStats: React.FC<{ exchanges: Exchange[]; total?: number }> = React.memo(({ exchanges, total }) => {
  const stats = useMemo(() => ({
    total: total || exchanges.length,
    active: exchanges.filter(e => e.status === '45D' || e.status === '180D' || e.status === 'In Progress').length,
    completed: exchanges.filter(e => e.status === 'COMPLETED' || e.status === 'Completed').length,
    pending: exchanges.filter(e => e.status === 'PENDING' || e.status === 'Draft').length,
    totalValue: exchanges.reduce((sum, e) => sum + (e.exchangeValue || 0), 0),
    avgProgress: exchanges.length > 0 ? 
      exchanges.reduce((sum, e) => sum + (e.progress || 0), 0) / exchanges.length : 0
  }), [exchanges, total]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <Building className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <Activity className="w-8 h-8 text-green-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Value</p>
            <p className="text-lg font-bold text-gray-900">
              ${(stats.totalValue / 1000000).toFixed(1)}M
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Progress</p>
            <p className="text-2xl font-bold text-purple-600">{Math.round(stats.avgProgress)}%</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
      </div>
    </div>
  );
});

ExchangeStats.displayName = 'ExchangeStats';

// Timeline Badge Component
const getTimelineBadge = (exchange: Exchange) => {
  const { timelineStatus, days_remaining } = exchange as any;
  
  if (!timelineStatus) return null;

  let text = '';
  let icon = <Clock className="h-3 w-3" />;
  let colorClass = 'bg-gray-100 text-gray-800';

  switch (timelineStatus) {
    case 'OVERDUE_45':
      text = 'Overdue 45-Day';
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800';
      break;
    case 'OVERDUE_180':
      text = 'Overdue 180-Day';
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800';
      break;
    case 'CRITICAL_45':
      text = `${days_remaining || 0} days to 45-Day`;
      colorClass = 'bg-red-100 text-red-800';
      break;
    case 'CRITICAL_180':
      text = `${days_remaining || 0} days to 180-Day`;
      colorClass = 'bg-red-100 text-red-800';
      break;
    case 'WARNING_45':
      text = `${days_remaining || 0} days to 45-Day`;
      colorClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 'WARNING_180':
      text = `${days_remaining || 0} days to 180-Day`;
      colorClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 'COMPLETED':
      text = 'Completed';
      icon = <CheckCircle className="h-3 w-3" />;
      colorClass = 'bg-green-100 text-green-800';
      break;
    default:
      text = 'On Track';
      colorClass = 'bg-green-100 text-green-800';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {icon}
      {text}
    </span>
  );
};

// Main ExchangeList Component - Memoized
export const ExchangeList: React.FC<ExchangeListProps> = React.memo(({ 
  title = "Exchanges", 
  showCreateButton = false,
  filters = {},
  onExchangeSelect,
  showFilters = true,
  showSearch = true,
  showStats = true,
  enableSmartMode = false,
  showAIAnalysis = false
}) => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const navigate = useNavigate();
  
  // Always use smart mode for better performance and features
  const smartExchanges = useSmartExchanges({
    initialLimit: 30,
    enableAutoRefresh: false, // Disable auto-refresh by default
    refreshInterval: 300000 // 5 minutes
  });

  // Use data from smart exchanges
  const dataSource = smartExchanges;

  // Extract data with defaults
  const {
    exchanges = [],
    loading,
    error,
    summary,
    pagination,
    hasNext,
    hasPrevious,
    loadMore,
    previousPage = () => {}, // Fallback if not provided
    refresh: refreshExchanges,
    setFilters: setSmartFilters,
    clearFilters,
    setSortBy
  } = dataSource;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [valueMinFilter, setValueMinFilter] = useState('');
  const [valueMaxFilter, setValueMaxFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [propertyAddressFilter, setPropertyAddressFilter] = useState('');
  const [showFilterChips, setShowFilterChips] = useState(false);

  // View toggle state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Memoize filter options
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: '45D', label: '45-Day Period' },
    { value: '180D', label: '180-Day Period' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'TERMINATED', label: 'Terminated' }
  ], []);

  const typeOptions = useMemo(() => [
    { value: '', label: 'All Types' },
    { value: 'LIKE_KIND', label: 'Like-Kind' },
    { value: 'REVERSE', label: 'Reverse' },
    { value: 'BUILD_TO_SUIT', label: 'Build-to-Suit' },
    { value: 'CONSTRUCTION', label: 'Construction' }
  ], []);

  const dateOptions = useMemo(() => [
    { value: '', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ], []);


  // Memoize event handlers
  const handleExchangeClick = useCallback((exchange: Exchange) => {
    if (onExchangeSelect) {
      onExchangeSelect(exchange);
    } else {
      if (exchange.id) {
        navigate(`/exchanges/${exchange.id}`);
      } else {
        console.error('Exchange missing ID:', exchange);
        alert('Cannot view exchange: No ID found');
      }
    }
  }, [onExchangeSelect, navigate]);

  const handleCreateExchange = useCallback(() => {
    navigate('/exchanges/new');
  }, [navigate]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setValueMinFilter('');
    setValueMaxFilter('');
    setDateFilter('');
    setPropertyAddressFilter('');
  }, []);

  // Memoize active filters check
  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter || typeFilter || valueMinFilter || valueMaxFilter || dateFilter || propertyAddressFilter;
  }, [searchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter, propertyAddressFilter]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !error.includes('cached')) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Exchanges</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={refreshExchanges}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cached data warning */}
      {error && error.includes('cached') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
          <button
            onClick={refreshExchanges}
            className="bg-yellow-600 text-white px-3 py-1.5 rounded-md hover:bg-yellow-700 text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
      
      {/* Clean Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-gray-600 text-sm mt-1">
              Showing {exchanges.length} of {pagination?.total || exchanges.length} exchanges
              {user?.role === 'admin' && (pagination?.total || exchanges.length) >= 100 && (
                <span className="ml-2 text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded-full">
                  Admin View
                </span>
              )}
            </p>
          </div>
          
          {showCreateButton && (isAdmin() || isCoordinator()) && (
            <button
              onClick={handleCreateExchange}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Exchange
            </button>
          )}
        </div>
      )}

      {/* Compact Stats */}
      {showStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{exchanges.filter(e => e.status === '45D' || e.status === '180D' || e.status === 'In Progress').length}</div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{exchanges.filter(e => e.status === 'COMPLETED' || e.status === 'Completed').length}</div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{exchanges.filter(e => e.status === 'PENDING' || e.status === 'Draft').length}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">${(exchanges.reduce((sum, e) => sum + (e.exchangeValue || 0), 0) / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(exchanges.length > 0 ? exchanges.reduce((sum, e) => sum + (e.progress || 0), 0) / exchanges.length : 0)}%</div>
              <div className="text-xs text-gray-600">Avg Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{pagination?.total || exchanges.length}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Streamlined Filters Bar */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Primary Filter Controls */}
          <div className="flex items-center gap-4 flex-wrap mb-4">
            {showSearch && (
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exchanges..."
                    className={`w-full pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      hasActiveFilters ? 'pr-20 border-blue-300 bg-blue-50/30' : 'pr-4 border-gray-300'
                    }`}
                  />
                  {/* Filter Indicator */}
                  {hasActiveFilters && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <div className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                        <Filter className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ModernDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-32"
            />

            <button
              onClick={() => setViewMode(prev => prev === 'grid' ? 'table' : 'grid')}
              className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              {viewMode === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <Table className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowFilterChips(!showFilterChips)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilterChips && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <ModernDropdown
                  options={typeOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  className="w-full"
                />
                <ModernDropdown
                  options={dateOptions}
                  value={dateFilter}
                  onChange={setDateFilter}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={valueMinFilter}
                    onChange={(e) => setValueMinFilter(e.target.value)}
                    placeholder="Min ($)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    value={valueMaxFilter}
                    onChange={(e) => setValueMaxFilter(e.target.value)}
                    placeholder="Max ($)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={propertyAddressFilter}
                    onChange={(e) => setPropertyAddressFilter(e.target.value)}
                    placeholder="Filter by property address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
              <span className="text-xs font-medium text-gray-600">Active:</span>
              
              {searchTerm && (
                <FilterChip label="Search" value={searchTerm} onRemove={() => setSearchTerm('')} />
              )}
              {statusFilter && (
                <FilterChip
                  label="Status"
                  value={statusOptions.find(opt => opt.value === statusFilter)?.label || statusFilter}
                  onRemove={() => setStatusFilter('')}
                />
              )}
              {typeFilter && (
                <FilterChip
                  label="Type"
                  value={typeOptions.find(opt => opt.value === typeFilter)?.label || typeFilter}
                  onRemove={() => setTypeFilter('')}
                />
              )}
              {(valueMinFilter || valueMaxFilter) && (
                <FilterChip
                  label="Value Range"
                  value={`$${valueMinFilter || '0'} - $${valueMaxFilter || '∞'}`}
                  onRemove={() => {
                    setValueMinFilter('');
                    setValueMaxFilter('');
                  }}
                />
              )}
              {dateFilter && (
                <FilterChip
                  label="Date"
                  value={dateOptions.find(opt => opt.value === dateFilter)?.label || dateFilter}
                  onRemove={() => setDateFilter('')}
                />
              )}
              {propertyAddressFilter && (
                <FilterChip
                  label="Property"
                  value={propertyAddressFilter}
                  onRemove={() => setPropertyAddressFilter('')}
                />
              )}
              
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-800 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}


      {/* Exchange Grid/Table */}
      {viewMode === 'grid' ? (
        exchanges.length === 0 ? (
          <div className="bg-white rounded-lg shadow border p-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchanges Found</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? "No exchanges match your current filters. Try adjusting your search criteria."
                : (user?.role === 'client' || user?.role === 'third_party') 
                  ? "You haven't been assigned to any exchanges yet. Please contact your coordinator or administrator."
                  : "No exchanges have been created yet."
              }
            </p>
            {!hasActiveFilters && (user?.role === 'client' || user?.role === 'third_party') && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  To be added to an exchange, your coordinator needs to:
                </p>
                <ol className="text-sm text-gray-600 text-left max-w-md mx-auto">
                  <li>1. Navigate to the exchange details page</li>
                  <li>2. Click on the "Invitations" tab</li>
                  <li>3. Add your email address as a participant</li>
                </ol>
                <div className="mt-4">
                  <button 
                    onClick={() => window.location.href = 'mailto:admin@peak1031.com?subject=Request to Join Exchange'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Contact Administrator
                  </button>
                </div>
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : exchanges.length > 100 && user?.role === 'admin' ? (
          // Use virtualized rendering for admin users with large datasets
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                All System Exchanges ({exchanges.length} total)
                <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Virtualized for Performance
                </span>
              </h3>
            </div>
            <VirtualizedList
              items={exchanges}
              itemHeight={80}
              containerHeight={600}
              renderItem={(exchange, index) => (
                <div
                  key={exchange.id}
                  className="border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleExchangeClick(exchange)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {exchange.name || exchange.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {exchange.status}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span>{exchange.client?.firstName} {exchange.client?.lastName}</span>
                      {exchange.exchangeValue && (
                        <span className="ml-4">
                          ${(exchange.exchangeValue / 1000000).toFixed(1)}M
                        </span>
                      )}
                      <span className="ml-4">
                        {(exchange as any).lifecycle_stage || exchange.status || 'N/A'}
                      </span>
                      <span className="ml-4 text-xs">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchanges.map((exchange) => (
              <ExchangeCard
                key={exchange.id}
                exchange={exchange}
                onClick={() => handleExchangeClick(exchange)}
                selected={false}
              />
            ))}
          </div>
        )
      ) : (
        // Table view placeholder
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchanges</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exchange Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exchanges.map((exchange) => (
                  <tr key={exchange.id} onClick={() => handleExchangeClick(exchange)} className="hover:bg-gray-100 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exchange.exchangeNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exchange.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.client?.firstName} {exchange.client?.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exchange.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exchange.exchangeType}</td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${exchange.exchangeValue ? (exchange.exchangeValue / 1000000).toFixed(1) + 'M' : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exchange.progress}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(exchange.createdAt || exchange.identificationDeadline || '').toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTimelineBadge(exchange)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer with Pagination Controls */}
      {exchanges.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm text-gray-700">
                Showing <span className="font-semibold">{exchanges.length.toLocaleString()}</span> of <span className="font-semibold">{(pagination?.total || exchanges.length).toLocaleString()}</span> exchanges
              </p>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                    <Filter className="w-3 h-3 inline mr-1" />
                    Filtered
                  </span>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              {hasPrevious && (
                <button
                  onClick={dataSource.previousPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
              
              {/* Page Info */}
              {pagination && pagination.totalPages > 1 && (
                <span className="text-sm text-gray-600 px-2">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
              )}
              
              {/* Next/Load More Button */}
              {hasNext && (
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      Load More
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ExchangeList;