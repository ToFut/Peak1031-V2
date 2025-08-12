/**
 * Agency Management Page
 * Professional admin interface for managing agencies
 */

import React, { useState } from 'react';
import { useAgencies } from '../../hooks/useAgencies';
import { 
  PlusIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const AgencyManagement: React.FC = () => {
  const {
    agencies,
    loading,
    error,
    isAdmin
  } = useAgencies();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-600">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage agencies, assign third parties, and monitor performance
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Import
                </button>
                <button
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Agency
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <div className="relative max-w-lg">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agencies by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading agencies...</p>
            </div>
          ) : agencies.length === 0 ? (
            <div className="p-8 text-center">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No agencies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new agency.
              </p>
            </div>
          ) : (
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
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {agency.display_name || `${agency.first_name} ${agency.last_name}`}
                        </div>
                        {agency.company && (
                          <div className="text-sm text-gray-500">{agency.company}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agency.email}</div>
                        {agency.phone_primary && (
                          <div className="text-sm text-gray-500">{agency.phone_primary}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {agency.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(agency.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyManagement;