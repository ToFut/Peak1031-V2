import React from 'react';
import { Exchange } from '../../../types';

interface PropertyComparisonMatrixProps {
  exchange: Exchange;
}

export const PropertyComparisonMatrix: React.FC<PropertyComparisonMatrixProps> = ({ exchange }) => {
  // Property comparison data using correct Exchange interface properties
  const propertyData = [
    {
      label: 'Property Type',
      relinquished: exchange.exchangeType || 'N/A',
      replacement: exchange.replacementProperties?.[0] ? 'Replacement Property' : 'N/A'
    },
    {
      label: 'Property Value',
      relinquished: exchange.relinquishedValue ? `$${exchange.relinquishedValue.toLocaleString()}` : 
                   exchange.relinquishedSalePrice ? `$${exchange.relinquishedSalePrice.toLocaleString()}` : 'N/A',
      replacement: exchange.replacementValue ? `$${exchange.replacementValue.toLocaleString()}` :
                  exchange.replacementProperties?.[0]?.purchasePrice ? `$${exchange.replacementProperties[0].purchasePrice.toLocaleString()}` : 'N/A'
    },
    {
      label: 'Location',
      relinquished: exchange.relinquishedPropertyAddress || exchange.rel_property_address || 'N/A',
      replacement: exchange.replacementProperties?.[0]?.address || 'N/A'
    },
    {
      label: 'Exchange Value',
      relinquished: exchange.exchangeValue ? `$${exchange.exchangeValue.toLocaleString()}` : 'N/A',
      replacement: exchange.exchangeValue ? `$${exchange.exchangeValue.toLocaleString()}` : 'N/A'
    },
    {
      label: 'Status',
      relinquished: exchange.status || 'N/A',
      replacement: exchange.status || 'N/A'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Comparison Matrix</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Relinquished Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Replacement Property
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {propertyData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.relinquished}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.replacement}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Additional comparison metrics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Exchange Timeline</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p>Start Date: {exchange.createdAt ? new Date(exchange.createdAt).toLocaleDateString() : 
                           exchange.created_at ? new Date(exchange.created_at).toLocaleDateString() : 'N/A'}</p>
            <p>Target Date: {exchange.exchangeDeadline ? new Date(exchange.exchangeDeadline).toLocaleDateString() : 
                           exchange.completionDeadline ? new Date(exchange.completionDeadline).toLocaleDateString() : 'N/A'}</p>
            <p>Status: <span className="font-medium">{exchange.status}</span></p>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Financial Summary</h4>
          <div className="space-y-1 text-sm text-green-800">
            <p>Exchange Value: {exchange.exchangeValue ? `$${exchange.exchangeValue.toLocaleString()}` : 
                               exchange.exchange_value ? `$${exchange.exchange_value.toLocaleString()}` : 'N/A'}</p>
            <p>Relinquished Value: {exchange.relinquishedValue ? `$${exchange.relinquishedValue.toLocaleString()}` : 
                                   exchange.relinquishedSalePrice ? `$${exchange.relinquishedSalePrice.toLocaleString()}` : 'N/A'}</p>
            <p>Replacement Value: {exchange.replacementValue ? `$${exchange.replacementValue.toLocaleString()}` : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Key Participants</h4>
          <div className="space-y-1 text-sm text-yellow-800">
            <p>Client: {exchange.clientName || 
                       (exchange.client?.firstName ? `${exchange.client.firstName} ${exchange.client.lastName}` : 'N/A')}</p>
            <p>Coordinator: {exchange.coordinator?.first_name ? 
                           `${exchange.coordinator.first_name} ${exchange.coordinator.last_name}` : 'N/A'}</p>
            <p>QI Company: {exchange.qiCompany || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">1031 Exchange Compliance Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.exchangeType ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-700">Like-Kind Property Requirement</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.identificationDeadline || exchange.day_45 ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm text-gray-700">45-Day Identification Period</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.completionDeadline || exchange.day_180 || exchange.exchangeDeadline ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm text-gray-700">180-Day Exchange Period</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.qiCompany ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-700">Qualified Intermediary</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.replacementValue && exchange.relinquishedValue && exchange.replacementValue >= exchange.relinquishedValue ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm text-gray-700">Equal or Greater Value</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${exchange.complianceStatus === 'COMPLIANT' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm text-gray-700">Compliance Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyComparisonMatrix;
