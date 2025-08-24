import React from 'react';
import { Exchange } from '../../../types';
import { 
  CalendarIcon, 
  CurrencyDollarIcon, 
  HomeIcon, 
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ComprehensiveExchangeDetailsProps {
  exchange: Exchange;
}

export const ComprehensiveExchangeDetails: React.FC<ComprehensiveExchangeDetailsProps> = ({ exchange }) => {
  const formatDate = (date: string | undefined) => {
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  };

  const formatCurrency = (amount: number | undefined) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case '45d': return 'bg-blue-100 text-blue-800';
      case '180d': return 'bg-purple-100 text-purple-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{exchange.name || exchange.exchangeName}</h2>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exchange.status)}`}>
              {exchange.status}
            </span>
            {exchange.priority && (
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(exchange.priority)}`}>
                {exchange.priority}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Exchange Number:</span>
            <p className="text-gray-900">{exchange.exchangeNumber || exchange.exchange_number || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Exchange Type:</span>
            <p className="text-gray-900">{exchange.exchangeType || exchange.type_of_exchange || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <p className="text-gray-900">{formatDate(exchange.createdAt || exchange.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Timeline & Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          Timeline & Deadlines
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">Start Date</h4>
            <p className="text-blue-800">{formatDate(exchange.startDate)}</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 text-sm mb-2">45-Day Deadline</h4>
            <p className="text-yellow-800">{formatDate(exchange.identificationDeadline || exchange.day_45)}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 text-sm mb-2">180-Day Deadline</h4>
            <p className="text-purple-800">{formatDate(exchange.completionDeadline || exchange.day_180 || exchange.exchangeDeadline)}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 text-sm mb-2">Completion Date</h4>
            <p className="text-green-800">{formatDate(exchange.completionDate || exchange.close_of_escrow_date)}</p>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500" />
          Financial Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Exchange Value</h4>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(exchange.exchangeValue || exchange.exchange_value)}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Relinquished Value</h4>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.rel_value)}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Replacement Value</h4>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(exchange.replacementValue)}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Proceeds</h4>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(exchange.proceeds)}</p>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <HomeIcon className="h-5 w-5 mr-2 text-purple-500" />
          Property Information
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Relinquished Property */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-900 text-sm mb-3">Relinquished Property</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-red-800">Address:</span>
                <p className="text-red-700">{exchange.relinquishedPropertyAddress || exchange.rel_property_address || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-red-800">City:</span>
                  <p className="text-red-700">{exchange.rel_property_city || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-red-800">State:</span>
                  <p className="text-red-700">{exchange.rel_property_state || 'N/A'}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-red-800">APN:</span>
                <p className="text-red-700">{exchange.rel_apn || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-red-800">Escrow Number:</span>
                <p className="text-red-700">{exchange.rel_escrow_number || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-red-800">Contract Date:</span>
                <p className="text-red-700">{formatDate(exchange.rel_contract_date)}</p>
              </div>
            </div>
          </div>

          {/* Replacement Property */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 text-sm mb-3">Replacement Property</h4>
            {exchange.replacementProperties && exchange.replacementProperties.length > 0 ? (
              <div className="space-y-4">
                {exchange.replacementProperties.map((property, index) => (
                  <div key={index} className="border-b border-green-200 pb-2 last:border-b-0">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-green-800">Address:</span>
                        <p className="text-green-700">{property.address || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Purchase Price:</span>
                        <p className="text-green-700">{formatCurrency(property.purchasePrice)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Closing Date:</span>
                        <p className="text-green-700">{formatDate(property.closingDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-green-800">Address:</span>
                  <p className="text-green-700">{exchange.rep_1_address || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-green-800">City:</span>
                    <p className="text-green-700">{exchange.rep_1_city || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">State:</span>
                    <p className="text-green-700">{exchange.rep_1_state || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-green-800">Sale Price:</span>
                  <p className="text-green-700">{formatCurrency(exchange.rep_1_sale_price)}</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">APN:</span>
                  <p className="text-green-700">{exchange.rep_1_apn || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">Close Date:</span>
                  <p className="text-green-700">{formatDate(exchange.rep_1_close_date)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-indigo-500" />
          Participants & Contacts
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Client</h4>
            <p className="text-gray-900">{exchange.clientName || 
              (exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : 'N/A')}</p>
            {exchange.client?.email && (
              <p className="text-sm text-gray-600">{exchange.client.email}</p>
            )}
            <p className="text-sm text-gray-600">{exchange.client_vesting || 'N/A'}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Coordinator</h4>
            <p className="text-gray-900">{exchange.coordinator ? 
              `${exchange.coordinator.first_name} ${exchange.coordinator.last_name}` : 'N/A'}</p>
            {exchange.coordinator?.email && (
              <p className="text-sm text-gray-600">{exchange.coordinator.email}</p>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">QI Company</h4>
            <p className="text-gray-900">{exchange.qiCompany || 'N/A'}</p>
            {exchange.qiContact && (
              <p className="text-sm text-gray-600">Contact available</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Buyer Information</h4>
            <p className="text-gray-900">{exchange.buyer_1_name || exchange.buyerName || 'N/A'}</p>
            {exchange.buyer_2_name && (
              <p className="text-sm text-gray-600">{exchange.buyer_2_name}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Bank/Escrow</h4>
            <p className="text-gray-900">{exchange.bank || 'N/A'}</p>
            <p className="text-sm text-gray-600">{exchange.bankAccountEscrow || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Compliance & Risk */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
          Compliance & Risk Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 text-sm mb-3">Compliance Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Overall Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  exchange.complianceStatus === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                  exchange.complianceStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-800' :
                  exchange.complianceStatus === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exchange.complianceStatus || 'PENDING_REVIEW'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 text-sm mb-3">Risk Assessment</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Risk Level</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  exchange.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                  exchange.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  exchange.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exchange.riskLevel || 'NOT_ASSESSED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Additional Information */}
      {(exchange.notes || exchange.clientNotes) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
            Notes & Additional Information
          </h3>
          
          <div className="space-y-4">
            {exchange.notes && (
              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-2">General Notes</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{exchange.notes}</p>
                </div>
              </div>
            )}
            
            {exchange.clientNotes && (
              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-2">Client Notes</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{exchange.clientNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata & System Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <p className="text-gray-900">{formatDate(exchange.createdAt || exchange.created_at)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <p className="text-gray-900">{formatDate(exchange.updatedAt || exchange.updated_at)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Activity:</span>
            <p className="text-gray-900">{formatDate(exchange.lastActivityAt)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">PP Matter ID:</span>
            <p className="text-gray-900">{exchange.ppMatterId || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Sync:</span>
            <p className="text-gray-900">{formatDate(exchange.lastSyncAt)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Active Status:</span>
            <p className="text-gray-900">{exchange.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        
        {exchange.tags && exchange.tags.length > 0 && (
          <div className="mt-4">
            <span className="font-medium text-gray-700 text-sm">Tags:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {exchange.tags.map((tag, index) => (
                <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprehensiveExchangeDetails;
