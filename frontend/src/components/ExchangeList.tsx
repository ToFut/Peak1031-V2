import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Exchange } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { ExchangeCard } from './ExchangeCard';
import ModernDropdown from './ui/ModernDropdown';
import {
  Search,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Settings,
  User,
  Building,
  FileText,
  Shield,
  TrendingUp,
  Activity
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
}

// Filter Chips Component
const FilterChip: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}> = ({ label, value, onRemove, className = '' }) => (
  <div className={`inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium ${className}`}>
    <span>{label}: {value}</span>
    <button
      onClick={onRemove}
      className="text-blue-600 hover:text-blue-800 transition-colors"
    >
      ×
    </button>
  </div>
);

// Exchange Stats Component
const ExchangeStats: React.FC<{ exchanges: Exchange[] }> = ({ exchanges }) => {
  const stats = useMemo(() => ({
    total: exchanges.length,
    active: exchanges.filter(e => e.status === '45D' || e.status === '180D' || e.status === 'In Progress').length,
    completed: exchanges.filter(e => e.status === 'COMPLETED' || e.status === 'Completed').length,
    pending: exchanges.filter(e => e.status === 'PENDING' || e.status === 'Draft').length,
    totalValue: exchanges.reduce((sum, e) => sum + (e.exchangeValue || 0), 0),
    avgProgress: exchanges.length > 0 ? 
      exchanges.reduce((sum, e) => sum + (e.progress || 0), 0) / exchanges.length : 0
  }), [exchanges]);

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
};

export const ExchangeList: React.FC<ExchangeListProps> = ({ 
  title = "Exchanges", 
  showCreateButton = false,
  filters = {},
  onExchangeSelect,
  showFilters = true,
  showSearch = true,
  showStats = true
}) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const navigate = useNavigate();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [valueMinFilter, setValueMinFilter] = useState('');
  const [valueMaxFilter, setValueMaxFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilterChips, setShowFilterChips] = useState(false);

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: '45D', label: '45-Day Period' },
    { value: '180D', label: '180-Day Period' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'TERMINATED', label: 'Terminated' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'LIKE_KIND', label: 'Like-Kind' },
    { value: 'REVERSE', label: 'Reverse' },
    { value: 'BUILD_TO_SUIT', label: 'Build-to-Suit' },
    { value: 'CONSTRUCTION', label: 'Construction' }
  ];

  const dateOptions = [
    { value: '', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  const loadExchanges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const endpoint = `/exchanges${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(endpoint);
      setExchanges(response.exchanges || response || []);
      
    } catch (err: any) {
      console.error('Error loading exchanges:', err);
      setError(err.message || 'Failed to load exchanges');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.limit]);

  useEffect(() => {
    loadExchanges();
  }, [loadExchanges]);

  // Filter exchanges based on current filters - memoized to prevent unnecessary re-computations
  const filteredExchanges = useMemo(() => {
    return exchanges.filter(exchange => {
      const matchesSearch = !searchTerm || 
        exchange.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exchange.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exchange.client?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exchange.exchangeNumber?.toString().includes(searchTerm);

      const matchesStatus = !statusFilter || exchange.status === statusFilter;
      const matchesType = !typeFilter || exchange.exchangeType === typeFilter;
      
      const matchesValueMin = !valueMinFilter || (exchange.exchangeValue && exchange.exchangeValue >= parseFloat(valueMinFilter));
      const matchesValueMax = !valueMaxFilter || (exchange.exchangeValue && exchange.exchangeValue <= parseFloat(valueMaxFilter));
      
      const matchesDate = !dateFilter || (() => {
        const exchangeDate = new Date(exchange.createdAt || exchange.identificationDeadline || '');
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            return exchangeDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return exchangeDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return exchangeDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return exchangeDate >= quarterAgo;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return exchangeDate >= yearAgo;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesType && matchesValueMin && matchesValueMax && matchesDate;
    });
  }, [exchanges, searchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter]);

  const handleExchangeClick = (exchange: Exchange) => {
    if (onExchangeSelect) {
      onExchangeSelect(exchange);
    } else {
      navigate(`/exchanges/${exchange.id}`);
    }
  };

  const handleCreateExchange = () => {
    navigate('/exchanges/new');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setValueMinFilter('');
    setValueMaxFilter('');
    setDateFilter('');
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter || typeFilter || valueMinFilter || valueMaxFilter || dateFilter;
  }, [searchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter]);

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

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Exchanges</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadExchanges}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1">
            {filteredExchanges.length} of {exchanges.length} exchanges
          </p>
        </div>
        
        {showCreateButton && (isAdmin() || isCoordinator()) && (
          <button
            onClick={handleCreateExchange}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Exchange
          </button>
        )}
      </div>

      {/* Stats */}
      {showStats && (
        <ExchangeStats exchanges={exchanges} />
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilterChips(!showFilterChips)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {showFilterChips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showFilterChips ? 'Hide' : 'Show'} Active Filters
            </button>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {showSearch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exchanges..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <ModernDropdown
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <ModernDropdown
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <ModernDropdown
                options={dateOptions}
                value={dateFilter}
                onChange={setDateFilter}
                className="w-full"
              />
            </div>
          </div>

          {/* Value Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Value ($)</label>
              <input
                type="number"
                value={valueMinFilter}
                onChange={(e) => setValueMinFilter(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Value ($)</label>
              <input
                type="number"
                value={valueMaxFilter}
                onChange={(e) => setValueMaxFilter(e.target.value)}
                placeholder="1000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {showFilterChips && hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              
              {searchTerm && (
                <FilterChip
                  label="Search"
                  value={searchTerm}
                  onRemove={() => setSearchTerm('')}
                />
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
              
              {valueMinFilter && (
                <FilterChip
                  label="Min Value"
                  value={`$${parseInt(valueMinFilter).toLocaleString()}`}
                  onRemove={() => setValueMinFilter('')}
                />
              )}
              
              {valueMaxFilter && (
                <FilterChip
                  label="Max Value"
                  value={`$${parseInt(valueMaxFilter).toLocaleString()}`}
                  onRemove={() => setValueMaxFilter('')}
                />
              )}
              
              {dateFilter && (
                <FilterChip
                  label="Date"
                  value={dateOptions.find(opt => opt.value === dateFilter)?.label || dateFilter}
                  onRemove={() => setDateFilter('')}
                />
              )}
              
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Exchange Grid */}
      {filteredExchanges.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchanges Found</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters 
              ? "No exchanges match your current filters. Try adjusting your search criteria."
              : "No exchanges have been created yet."
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExchanges.map((exchange) => (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              onClick={() => handleExchangeClick(exchange)}
              selected={false}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {filteredExchanges.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {filteredExchanges.length} of {exchanges.length} exchanges
            </p>
            {!filters.limit && exchanges.length >= 10 && (
              <Link
                to="/exchanges"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                View all exchanges →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};