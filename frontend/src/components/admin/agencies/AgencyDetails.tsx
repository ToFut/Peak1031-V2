/**
 * Agency Details Component
 * View and manage agency details with third party assignments
 */

import React, { useState } from 'react';
import { Agency, AssignThirdPartiesRequest } from '../../../services/agencyApi';
import {
  formatAgencyName,
  getAgencyStatusColor,
  getPerformanceScoreColor,
  formatCurrency,
  getAgencyAvatar,
  calculateAgencyHealth
} from '../../../utils/agencyUtils';
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface AgencyDetailsProps {
  agency: Agency;
  onEdit: () => void;
  onDelete: (hardDelete: boolean) => void;
  onAssignThirdParties: (agencyId: string, request: AssignThirdPartiesRequest) => Promise<void>;
  onRemoveThirdParties: (agencyId: string, thirdPartyIds: string[]) => Promise<void>;
  onClose: () => void;
}

const AgencyDetails: React.FC<AgencyDetailsProps> = ({
  agency,
  onEdit,
  onDelete,
  onAssignThirdParties,
  onRemoveThirdParties,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'third-parties' | 'users' | 'activity'>('overview');
  const healthScore = agency.stats ? calculateAgencyHealth(agency.stats) : null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={getAgencyAvatar(agency)}
                alt={formatAgencyName(agency)}
                className="h-12 w-12 rounded-full"
              />
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatAgencyName(agency)}
                </h2>
                {agency.company && (
                  <p className="text-sm text-gray-500">{agency.company}</p>
                )}
              </div>
              <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgencyStatusColor(agency.status)}`}>
                {agency.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-gray-500"
                title="Edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onDelete(false)}
                className="p-2 text-gray-400 hover:text-red-500"
                title="Delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: BuildingOfficeIcon },
              { id: 'third-parties', label: 'Third Parties', icon: UserGroupIcon },
              { id: 'users', label: 'Users', icon: UserPlusIcon },
              { id: 'activity', label: 'Activity', icon: ChartBarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm flex items-center
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{agency.email}</p>
                    </div>
                  </div>
                  {agency.phone_primary && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{agency.phone_primary}</p>
                      </div>
                    </div>
                  )}
                  {agency.address && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {agency.address}<br />
                          {agency.city && `${agency.city}, `}{agency.state} {agency.zip}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(agency.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              {agency.stats && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Health Score</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {healthScore?.score || 0}/100
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {healthScore?.label || 'Unknown'}
                          </p>
                        </div>
                        <div className={`h-12 w-12 rounded-full bg-${healthScore?.color || 'gray'}-100 flex items-center justify-center`}>
                          <ChartBarIcon className={`h-6 w-6 text-${healthScore?.color || 'gray'}-600`} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Third Parties</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {agency.stats.third_parties}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Active assignments
                          </p>
                        </div>
                        <UserGroupIcon className="h-12 w-12 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(agency.stats.exchanges.totalValue)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {agency.stats.exchanges.total} exchanges
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {agency.stats.exchanges.active}
                      </p>
                      <p className="text-sm text-gray-500">Active Exchanges</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {agency.stats.exchanges.completed}
                      </p>
                      <p className="text-sm text-gray-500">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-semibold ${getPerformanceScoreColor(agency.stats.performance.success_rate)}`}>
                        {agency.stats.performance.success_rate}%
                      </p>
                      <p className="text-sm text-gray-500">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-semibold ${getPerformanceScoreColor(agency.stats.performance.average_score)}`}>
                        {agency.stats.performance.average_score}
                      </p>
                      <p className="text-sm text-gray-500">Performance Score</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'third-parties' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assigned Third Parties ({agency.third_parties?.length || 0})
                </h3>
                <button
                  onClick={() => {
                    // TODO: Implement third party assignment modal
                    console.log('Assign third parties');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Assign Third Party
                </button>
              </div>

              {agency.third_parties && agency.third_parties.length > 0 ? (
                <div className="space-y-4">
                  {agency.third_parties.map((tp) => (
                    <div key={tp.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{tp.display_name}</h4>
                          <p className="text-sm text-gray-500">{tp.email}</p>
                          {tp.company && (
                            <p className="text-sm text-gray-500">{tp.company}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${getPerformanceScoreColor(tp.performance_score)}`}>
                              {tp.performance_score}%
                            </p>
                            <p className="text-xs text-gray-500">Performance</p>
                          </div>
                          <button
                            onClick={() => onRemoveThirdParties(agency.id, [tp.third_party_contact_id])}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No third parties assigned</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Agency Users ({agency.users?.length || 0})
              </h3>
              {agency.users && agency.users.length > 0 ? (
                <div className="space-y-4">
                  {agency.users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-sm text-gray-500">Role: {user.role}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No users found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Activity log coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyDetails;