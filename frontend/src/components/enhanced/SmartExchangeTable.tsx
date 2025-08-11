/**
 * Smart Exchange Table Component
 * Advanced table with pagination, filtering, sorting, and AI analysis
 */

import React, { useState, useCallback } from 'react';
import { useSmartExchanges } from '../../hooks/useSmartExchanges';
import { Exchange } from '../../types';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatValue, getRiskColor, getTimelineColor } from '../../utils/smartFetching';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface SmartExchangeTableProps {
  onExchangeSelect?: (exchange: Exchange) => void;
  showFilters?: boolean;
  showAnalytics?: boolean;
  initialFilters?: any;
  className?: string;
}

const SmartExchangeTable: React.FC<SmartExchangeTableProps> = ({
  onExchangeSelect,
  showFilters = true,
  showAnalytics = true,
  initialFilters = {},
  className = ''
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  const {
    exchanges,
    summary,
    loading,
    error,
    pagination,
    hasNext,
    hasPrevious,
    filters,
    loadMore,
    refresh,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    setFilters,
    clearFilters,
    setSortBy
  } = useSmartExchanges({
    initialLimit: 30,
    enableAutoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  const { formatValue: formatCurrency, getRiskColor } = useAnalytics();

  /**
   * Apply filters
   */
  const applyFilters = useCallback(() => {
    const newFilters: any = {};
    
    if (searchTerm) newFilters.searchTerm = searchTerm;
    if (selectedStatus) newFilters.status = selectedStatus;
    if (selectedType) newFilters.exchangeType = selectedType;
    if (minValue) newFilters.minValue = parseFloat(minValue);
    if (maxValue) newFilters.maxValue = parseFloat(maxValue);

    setFilters(newFilters);
    setShowFilterPanel(false);
  }, [searchTerm, selectedStatus, selectedType, minValue, maxValue, setFilters]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedType('');
    setMinValue('');
    setMaxValue('');
    clearFilters();
    setShowFilterPanel(false);
  }, [clearFilters]);

  /**
   * Handle sorting
   */
  const handleSort = useCallback((field: string, order: 'asc' | 'desc' = 'desc') => {
    setSortBy(field, order);
  }, [setSortBy]);

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get timeline badge
   */
  const getTimelineBadge = (exchange: Exchange) => {
    const { timelineStatus, days_remaining } = exchange;
    
    if (!timelineStatus) return null;

    const color = getTimelineColor(timelineStatus);
    let text = '';
    let icon = <ClockIcon className="h-3 w-3" />;

    switch (timelineStatus) {
      case 'OVERDUE_45':
        text = 'Overdue 45-Day';
        icon = <ExclamationTriangleIcon className="h-3 w-3" />;
        break;
      case 'OVERDUE_180':
        text = 'Overdue 180-Day';
        icon = <ExclamationTriangleIcon className="h-3 w-3" />;
        break;
      case 'CRITICAL_45':
        text = `${days_remaining || 0} days to 45-Day`;
        break;
      case 'CRITICAL_180':
        text = `${days_remaining || 0} days to 180-Day`;
        break;
      case 'WARNING_45':
        text = 'Approaching 45-Day';
        break;
      case 'WARNING_180':
        text = 'Approaching 180-Day';
        break;
      case 'COMPLETED':
        text = 'Completed';
        break;
      default:
        text = 'On Track';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
        {icon}
        {text}
      </span>
    );
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Exchanges</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Exchange Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Loading...' : `${pagination.total} exchanges found`}
              {summary && (
                <span className="ml-2 text-green-600">
                  • Total Value: {formatCurrency(summary.totalValue)}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium ${
                  showFilterPanel || Object.keys(filters).length > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
                {Object.keys(filters).length > 0 && (
                  <span className="bg-blue-600 text-white rounded-full text-xs px-2 py-0.5">
                    {Object.keys(filters).length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Exchange name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="delayed">Delayed</option>
                  <option value="simultaneous">Simultaneous</option>
                  <option value="reverse">Reverse</option>
                  <option value="improvement">Improvement</option>
                </select>
              </div>

              {/* Value Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('exchange_number')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Exchange
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('exchange_value')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <CurrencyDollarIcon className="h-4 w-4" />
                  Value
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk & Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Created
                </button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && exchanges.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mt-2"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </td>
                </tr>
              ))
            ) : (
              exchanges.map((exchange) => (
                <tr
                  key={exchange.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onExchangeSelect?.(exchange)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {exchange.exchangeNumber || exchange.exchange_number}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {exchange.name || exchange.exchangeName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exchange.status)}`}>
                        {exchange.status}
                      </span>
                      {getTimelineBadge(exchange)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {(exchange.exchangeValue || exchange.exchange_value) ? formatCurrency(exchange.exchangeValue || exchange.exchange_value || 0) : 'N/A'}
                    </div>
                    {(exchange.relinquishedValue || exchange.relinquished_property_value) && (
                      <div className="text-xs text-gray-500">
                        Relinquished: {formatCurrency(exchange.relinquishedValue || exchange.relinquished_property_value || 0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {exchange.riskLevel && (
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-${getRiskColor(exchange.riskLevel)}-100 text-${getRiskColor(exchange.riskLevel)}-800`}>
                          {exchange.riskLevel} Risk
                        </span>
                      )}
                      {exchange.progressPercentage && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, exchange.progressPercentage)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(exchange.createdAt || exchange.created_at || new Date()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExchangeSelect?.(exchange);
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {pagination.startItem} to {pagination.endItem} of {pagination.total} results
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pagination.limit}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={30}>30 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={previousPage}
              disabled={!hasPrevious}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            
            <span className="px-3 py-1 text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <button
              onClick={nextPage}
              disabled={!hasNext}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {hasNext && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Load More
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartExchangeTable;