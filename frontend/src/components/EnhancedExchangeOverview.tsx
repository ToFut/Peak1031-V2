import React from 'react';
import { 
  MapPin, Home, DollarSign, Calendar, User, Building, 
  FileText, AlertTriangle, CheckCircle, Clock, Target,
  TrendingUp, Shield, Activity
} from 'lucide-react';
import { extractRichExchangeData, EnhancedExchangeData } from '@/features/exchanges/utils/exchangeDataExtractor';

interface Props {
  exchange: any;
}

const EnhancedExchangeOverview: React.FC<Props> = ({ exchange }) => {
  const data = extractRichExchangeData(exchange);
  
  const formatCurrency = (amount: number) => 
    amount ? `$${amount.toLocaleString()}` : 'N/A';
    
  const formatDate = (dateStr: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';
    
  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    const targetDate = new Date(dateStr);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-blue-600" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              data.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
              data.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {data.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Exchange #{data.exchangeNumber}</h3>
          <p className="text-sm text-gray-600">{data.exchangeType}</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{data.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${data.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
            <span className="text-xs text-gray-500">Financial</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {formatCurrency(data.totalRelinquishedValue)}
          </h3>
          <p className="text-sm text-gray-600">Relinquished Value</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Replacement:</span>
              <span className="font-medium">{formatCurrency(data.totalReplacementValue)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Proceeds:</span>
              <span className="font-medium">{formatCurrency(data.proceeds)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-orange-600" />
            <span className="text-xs text-gray-500">Deadlines</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">45-Day</span>
                {getDaysUntil(data.day45Deadline || "") !== null && (
                  <span className={`text-xs font-medium ${
                    getDaysUntil(data.day45Deadline || "")! < 0 ? 'text-red-600' :
                    getDaysUntil(data.day45Deadline || "")! < 7 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {getDaysUntil(data.day45Deadline || "")! < 0 ? 'OVERDUE' : `${getDaysUntil(data.day45Deadline || "")}d left`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{formatDate(data.day45Deadline || "")}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">180-Day</span>
                {getDaysUntil(data.day180Deadline || "") !== null && (
                  <span className={`text-xs font-medium ${
                    getDaysUntil(data.day180Deadline || "")! < 0 ? 'text-red-600' :
                    getDaysUntil(data.day180Deadline || "")! < 14 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {getDaysUntil(data.day180Deadline || "")! < 0 ? 'OVERDUE' : `${getDaysUntil(data.day180Deadline || "")}d left`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{formatDate(data.day180Deadline || "")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              data.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
              data.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {data.riskLevel} RISK
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {data.complianceStatus || 'Unknown'}
          </h3>
          <p className="text-sm text-gray-600">Compliance Status</p>
          <div className="mt-3 flex items-center text-xs">
            {data.onTrack ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">On Track</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-orange-500 mr-1" />
                <span className="text-orange-600">Needs Attention</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Relinquished Property */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <Home className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Relinquished Property</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{data.relinquishedAddress}</p>
                  <p className="text-sm text-gray-600">
                    {data.relinquishedCity}, {data.relinquishedState} {data.relinquishedZip}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Value</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.relinquishedValue)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">APN</p>
                <p className="text-sm text-gray-900">{data.relinquishedAPN || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Escrow #</p>
                <p className="text-sm text-gray-900">{data.relinquishedEscrowNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contract Date</p>
                <p className="text-sm text-gray-900">{formatDate(data.relinquishedContractDate)}</p>
              </div>
            </div>
            {data.buyerName && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Buyer</p>
                <p className="text-sm text-gray-900">{data.buyerName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Replacement Property */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <Building className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Replacement Property</h3>
            {data.identified && (
              <span title="Identified">
                <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
              </span>
            )}
          </div>
          <div className="space-y-4">
            {data.replacementAddress ? (
              <>
                <div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{data.replacementAddress}</p>
                      <p className="text-sm text-gray-600">
                        {data.replacementCity}, {data.replacementState} {data.replacementZip}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Value</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.replacementValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">APN</p>
                    <p className="text-sm text-gray-900">{data.replacementAPN || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Escrow #</p>
                    <p className="text-sm text-gray-900">{data.replacementEscrowNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contract Date</p>
                    <p className="text-sm text-gray-900">{formatDate(data.replacementContractDate)}</p>
                  </div>
                </div>
                {data.replacementSeller && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seller</p>
                    <p className="text-sm text-gray-900">{data.replacementSeller}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Replacement property not yet identified</p>
                {!data.identified && (
                  <p className="text-xs text-orange-600 mt-1">Property identification required</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client & Team Information */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client & Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-3">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-gray-900">Client Information</h4>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                <p className="text-sm text-gray-900">{data.clientName || 'N/A'}</p>
              </div>
              {data.clientVesting && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vesting</p>
                  <p className="text-sm text-gray-900">{data.clientVesting}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-3">
              <User className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-medium text-gray-900">Coordinator</h4>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                <p className="text-sm text-gray-900">{data.coordinatorName || 'Unassigned'}</p>
              </div>
              {data.coordinatorEmail && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-blue-600">{data.coordinatorEmail}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-3">
              <Activity className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-gray-900">Exchange Details</h4>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                <p className="text-sm text-gray-900">{data.exchangeType || 'Standard 1031'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  data.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                  data.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {data.priority}
                </span>
              </div>
              {data.bank && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank</p>
                  <p className="text-sm text-gray-900">{data.bank}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExchangeOverview;