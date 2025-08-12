/**
 * Agency List Component
 * Display agencies in list or grid view with pagination
 */

import React from 'react';
import { Agency } from '../../../services/agencyApi';
import { 
  formatAgencyName, 
  getAgencyStatusColor, 
  getPerformanceScoreColor,
  formatCurrency,
  getAgencyInitials,
  getAgencyAvatar
} from '../../../utils/agencyUtils';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface AgencyListProps {
  agencies: Agency[];
  viewMode: 'list' | 'grid';
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onViewDetails: (agency: Agency) => void;
  onEdit: (agency: Agency) => void;
  onDelete: (agencyId: string, hardDelete: boolean) => void;
  onPageChange: (page: number) => void;
}

const AgencyList: React.FC<AgencyListProps> = ({
  agencies,
  viewMode,
  loading,
  pagination,
  onViewDetails,
  onEdit,
  onDelete,
  onPageChange
}) => {
  if (agencies.length === 0 && !loading) {
    return (
      <div className="p-8 text-center">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No agencies found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new agency.
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <img
                      src={getAgencyAvatar(agency)}
                      alt={formatAgencyName(agency)}
                      className="h-12 w-12 rounded-full"
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {formatAgencyName(agency)}
                      </h3>
                      {agency.company && (
                        <p className="text-sm text-gray-500">{agency.company}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgencyStatusColor(agency.status)}`}>
                    {agency.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">{agency.email}</p>
                  {agency.phone_primary && (
                    <p className="text-sm text-gray-600">{agency.phone_primary}</p>
                  )}
                </div>

                {/* Stats */}
                {agency.stats && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        Third Parties
                      </div>
                      <p className="text-lg font-semibold">{agency.stats.third_parties}</p>
                    </div>
                    <div>
                      <div className="flex items-center text-sm text-gray-500">
                        <ChartBarIcon className="h-4 w-4 mr-1" />
                        Performance
                      </div>
                      <p className={`text-lg font-semibold ${getPerformanceScoreColor(agency.stats.performance.average_score)}`}>
                        {agency.stats.performance.average_score}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active Exchanges</p>
                      <p className="text-lg font-semibold">{agency.stats.exchanges.active}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(agency.stats.exchanges.totalValue)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => onViewDetails(agency)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(agency)}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(agency.id, false)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Third Parties
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exchanges
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={getAgencyAvatar(agency)}
                        alt={formatAgencyName(agency)}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAgencyName(agency)}
                      </div>
                      {agency.company && (
                        <div className="text-sm text-gray-500">{agency.company}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agency.email}</div>
                  {agency.phone_primary && (
                    <div className="text-sm text-gray-500">{agency.phone_primary}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgencyStatusColor(agency.status)}`}>
                    {agency.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {agency.stats?.third_parties || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {agency.stats?.exchanges.active || 0} active
                  </div>
                  <div className="text-sm text-gray-500">
                    {agency.stats?.exchanges.total || 0} total
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {agency.stats && (
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceScoreColor(agency.stats.performance.average_score)}`}>
                        {agency.stats.performance.average_score}%
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {agency.stats ? formatCurrency(agency.stats.exchanges.totalValue) : '$0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(agency)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(agency)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(agency.id, false)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  );
};

// Pagination Component
const Pagination: React.FC<{
  pagination: AgencyListProps['pagination'];
  onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { page, totalPages, total, limit } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (totalPages <= 1) return null;

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AgencyList;