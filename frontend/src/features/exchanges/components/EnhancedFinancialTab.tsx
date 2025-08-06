import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calculator, PieChart, BarChart3 } from 'lucide-react';
import { extractRichExchangeData } from '@/shared/utils/utils/exchangeDataExtractor';

interface Props {
  exchange: any;
}

const EnhancedFinancialTab: React.FC<Props> = ({ exchange }) => {
  const data = extractRichExchangeData(exchange);
  
  const formatCurrency = (amount: number) => 
    amount ? `$${amount.toLocaleString()}` : 'N/A';
    
  // Calculate financial metrics
  const exchangeEquity = data.totalReplacementValue - data.totalRelinquishedValue;
  const proceedsUtilization = data.totalReplacementValue > 0 
    ? ((data.proceeds / data.totalReplacementValue) * 100).toFixed(1)
    : 0;
  const equityGrowth = data.totalRelinquishedValue > 0 
    ? (((data.totalReplacementValue - data.totalRelinquishedValue) / data.totalRelinquishedValue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Relinquished</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.totalRelinquishedValue)}</h3>
          <p className="text-sm text-gray-600">Property Value</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Replacement</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.totalReplacementValue)}</h3>
          <p className="text-sm text-gray-600">Property Value</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Proceeds</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(data.proceeds)}</h3>
          <p className="text-sm text-gray-600">Available Cash</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
              {exchangeEquity >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
            </div>
            <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Net Equity</span>
          </div>
          <h3 className={`text-2xl font-bold mb-1 ${exchangeEquity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {exchangeEquity >= 0 ? '+' : ''}{formatCurrency(Math.abs(exchangeEquity))}
          </h3>
          <p className="text-sm text-gray-600">
            {exchangeEquity >= 0 ? 'Equity Gained' : 'Additional Investment'}
          </p>
        </div>
      </div>

      {/* Financial Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transaction Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Transaction Breakdown</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Relinquished Property</p>
                <p className="text-sm text-gray-500">Sale proceeds from property sold</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(data.totalRelinquishedValue)}</p>
                <p className="text-xs text-gray-500">Sale Value</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Available Proceeds</p>
                <p className="text-sm text-gray-500">Cash available for replacement</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">{formatCurrency(data.proceeds)}</p>
                <p className="text-xs text-gray-500">Net Proceeds</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Replacement Property</p>
                <p className="text-sm text-gray-500">Value of property acquired</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(data.totalReplacementValue)}</p>
                <p className="text-xs text-gray-500">Purchase Value</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
              <div>
                <p className="font-medium text-gray-900">Net Position Change</p>
                <p className="text-sm text-gray-500">Change in property equity</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${exchangeEquity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {exchangeEquity >= 0 ? '+' : ''}{formatCurrency(Math.abs(exchangeEquity))}
                </p>
                <p className={`text-xs ${exchangeEquity >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {equityGrowth}% change
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <PieChart className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Financial Metrics</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Exchange Ratio</span>
                <span className="text-sm font-bold text-gray-900">
                  {data.totalRelinquishedValue > 0 
                    ? (data.totalReplacementValue / data.totalRelinquishedValue).toFixed(2) + ':1'
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, (data.totalReplacementValue / data.totalRelinquishedValue) * 50)}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Replacement to relinquished value ratio</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Proceeds Utilization</span>
                <span className="text-sm font-bold text-gray-900">{proceedsUtilization}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Number(proceedsUtilization))}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Percentage of proceeds used in replacement</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Key Financial Indicators</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exchange Type:</span>
                  <span className="font-medium">{data.exchangeType || 'Standard 1031'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Investment Growth:</span>
                  <span className={`font-medium ${exchangeEquity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {equityGrowth}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exchange Status:</span>
                  <span className="font-medium">{data.status}</span>
                </div>
                {data.bank && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Banking Partner:</span>
                    <span className="font-medium">{data.bank}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow Information */}
      {(data.relinquishedEscrowNumber || data.replacementEscrowNumber) && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Escrow Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.relinquishedEscrowNumber && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Relinquished Property Escrow</h4>
                <div className="bg-red-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Escrow Number:</span>
                    <span className="text-sm font-medium">{data.relinquishedEscrowNumber}</span>
                  </div>
                  {data.closeOfEscrowDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Close Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(data.closeOfEscrowDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {data.replacementEscrowNumber && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Replacement Property Escrow</h4>
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Escrow Number:</span>
                    <span className="text-sm font-medium">{data.replacementEscrowNumber}</span>
                  </div>
                  {data.replacementContractDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Contract Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(data.replacementContractDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFinancialTab;