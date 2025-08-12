/**
 * Agency Filters Component
 * Filter options for agency list
 */

import React from 'react';
import { AgencyListParams } from '../../../services/agencyApi';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AgencyFiltersProps {
  filters: AgencyListParams;
  onFiltersChange: (filters: AgencyListParams) => void;
}

const AgencyFilters: React.FC<AgencyFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleChange = (key: keyof AgencyListParams, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1 // Reset to first page when filters change
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      page: 1,
      limit: 20,
      includeStats: true
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy || 'created_at'}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="created_at">Created Date</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="third_parties">Third Parties</option>
            <option value="performance">Performance</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            value={filters.sortOrder || 'desc'}
            onChange={(e) => handleChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {/* Results Per Page */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Results Per Page
          </label>
          <select
            value={filters.limit || 20}
            onChange={(e) => handleChange('limit', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {/* Include Stats */}
        <div className="flex items-end">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includeStats !== false}
              onChange={(e) => handleChange('includeStats', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Include Statistics</span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      <div className="flex justify-end">
        <button
          onClick={clearFilters}
          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default AgencyFilters;