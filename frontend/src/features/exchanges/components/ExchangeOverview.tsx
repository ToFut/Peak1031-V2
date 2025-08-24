import React from 'react';
import { 
  Users, CheckSquare, FileText, TrendingUp, Calendar, DollarSign, 
  Target, Shield, MapPin, Home, Building2, Banknote, Clock,
  User, Phone, Mail, Hash, FileCheck, AlertCircle
} from 'lucide-react';
import { EnterpriseExchange, ExchangeParticipant } from '../types';
import { Task, Document } from '../../../types';
import { formatDate, formatDateTime, getDaysUntil } from '../../../utils/date.utils';
import { formatExchangeValue, getExchangeStage, getRiskColorClass, getComplianceColorClass } from '../../../utils/exchange.utils';

interface ExchangeOverviewProps {
  exchange: EnterpriseExchange & {
    // PP Fields
    pp_display_name?: string;
    pp_matter_status?: string;
    pp_responsible_attorney?: string;
    type_of_exchange?: string;
    client_vesting?: string;
    bank?: string;
    proceeds?: number;
    // Relinquished Property
    rel_property_address?: string;
    rel_property_city?: string;
    rel_property_state?: string;
    rel_property_zip?: string;
    rel_apn?: string;
    rel_escrow_number?: string;
    rel_value?: number;
    rel_contract_date?: string;
    close_of_escrow_date?: string;
    // Replacement Property
    rep_1_property_address?: string;
    rep_1_city?: string;
    rep_1_state?: string;
    rep_1_zip?: string;
    rep_1_apn?: string;
    rep_1_escrow_number?: string;
    rep_1_value?: number;
    rep_1_contract_date?: string;
    rep_1_seller_name?: string;
    // Buyers
    buyer_1_name?: string;
    buyer_2_name?: string;
    // Key Dates
    day_45?: string;
    day_180?: string;
  };
  participants: ExchangeParticipant[];
  tasks: Task[];
  documents: Document[];
  exchangeStage?: {
    stage: string;
    color: string;
    progress: number;
  };
}

export const ExchangeOverview: React.FC<ExchangeOverviewProps> = ({
  exchange,
  participants,
  tasks,
  documents,
  exchangeStage
}) => {
  const defaultExchangeStage = {
    stage: getExchangeStage(exchange),
    color: getRiskColorClass(exchange.risk_level),
    progress: exchange.progress || 0
  };
  const stage = exchangeStage || defaultExchangeStage;
  const activeTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED').length : 0;
  
  // Use PP dates if available, otherwise fall back to existing dates
  const day45 = exchange.day_45 || exchange.identificationDeadline;
  const day180 = exchange.day_180 || exchange.exchangeDeadline;
  const daysUntil45 = getDaysUntil(day45 || '');
  const daysUntil180 = getDaysUntil(day180 || '');

  // Format currency
  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format US date
  const formatUSDate = (date: string | undefined) => {
    if (!date) return 'Not specified';
    try {
      return new Date(date).toLocaleDateString('en-US');
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats - Enhanced with PP data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Members</p>
              <p className="text-2xl font-bold text-blue-900">{Array.isArray(participants) ? participants.length : 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Proceeds</p>
              <p className="text-xl font-bold text-green-900">
                {formatCurrency(exchange.proceeds)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Documents</p>
              <p className="text-2xl font-bold text-purple-900">{Array.isArray(documents) ? documents.length : 0}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Progress</p>
              <p className="text-2xl font-bold text-orange-900">{exchange.progress || 0}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Main Exchange Information - Enhanced with PP data */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-blue-600" />
          Exchange Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-500">Matter Name</h4>
            <p className="mt-1 text-sm text-gray-900 font-medium">
              {exchange.pp_display_name || exchange.name || `Exchange #${(exchange as any).exchangeNumber || exchange.id}`}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Exchange Type</h4>
            <p className="mt-1 text-sm text-gray-900">
              {exchange.type_of_exchange || exchange.exchangeType || 'Standard Exchange'}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Status</h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              exchange.status === 'Completed' || exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              exchange.status === 'In Progress' || exchange.status === '45D' || exchange.status === '180D' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {exchange.pp_matter_status || exchange.status}
            </span>
          </div>

          {/* Client & Banking Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-500">Client Vesting</h4>
            <p className="mt-1 text-sm text-gray-900">
              {exchange.client_vesting || 
               ((exchange as any).client ? `${(exchange as any).client.firstName || (exchange as any).client.first_name} ${(exchange as any).client.lastName || (exchange as any).client.last_name}` : 'Not specified')}
            </p>
          </div>
          
          {exchange.bank && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Banking Institution</h4>
              <p className="mt-1 text-sm text-gray-900 flex items-center">
                <Banknote className="w-4 h-4 mr-1 text-gray-400" />
                {exchange.bank}
              </p>
            </div>
          )}
          
          {exchange.pp_responsible_attorney && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Responsible Attorney</h4>
              <p className="mt-1 text-sm text-gray-900 flex items-center">
                <User className="w-4 h-4 mr-1 text-gray-400" />
                {exchange.pp_responsible_attorney}
              </p>
            </div>
          )}

          {/* Critical Dates */}
          <div>
            <h4 className="text-sm font-medium text-gray-500">45-Day Deadline</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatUSDate(day45)}
              {day45 && (
                <span className={`ml-2 text-xs font-medium ${
                  daysUntil45 < 0 ? 'text-red-600' : 
                  daysUntil45 <= 10 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {daysUntil45 < 0 ? `${Math.abs(daysUntil45)} days overdue` : 
                   daysUntil45 === 0 ? 'TODAY' : `${daysUntil45} days left`}
                </span>
              )}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">180-Day Deadline</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatUSDate(day180)}
              {day180 && (
                <span className={`ml-2 text-xs font-medium ${
                  daysUntil180 < 0 ? 'text-red-600' : 
                  daysUntil180 <= 30 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {daysUntil180 < 0 ? `${Math.abs(daysUntil180)} days overdue` : 
                   daysUntil180 === 0 ? 'TODAY' : `${daysUntil180} days left`}
                </span>
              )}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Close of Escrow</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatUSDate(exchange.close_of_escrow_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Relinquished Property Details */}
      {(exchange.rel_property_address || exchange.rel_value) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2 text-red-600" />
            Relinquished Property
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchange.rel_property_address && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Property Address</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-start">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400 mt-0.5" />
                  <span>
                    {exchange.rel_property_address}
                    {(exchange.rel_property_city || exchange.rel_property_state || exchange.rel_property_zip) && (
                      <><br />{[exchange.rel_property_city, exchange.rel_property_state, exchange.rel_property_zip]
                        .filter(Boolean).join(', ')}</>
                    )}
                  </span>
                </p>
              </div>
            )}
            
            {exchange.rel_value && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Property Value</h4>
                <p className="mt-1 text-sm text-gray-900 font-semibold">
                  {formatCurrency(exchange.rel_value)}
                </p>
              </div>
            )}
            
            {exchange.rel_apn && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">APN</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Hash className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rel_apn}
                </p>
              </div>
            )}
            
            {exchange.rel_escrow_number && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Escrow Number</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rel_escrow_number}
                </p>
              </div>
            )}
            
            {exchange.rel_contract_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Contract Date</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {formatUSDate(exchange.rel_contract_date)}
                </p>
              </div>
            )}
            
            {(exchange.buyer_1_name || exchange.buyer_2_name) && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Buyer(s)</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-1 text-gray-400" />
                  {[exchange.buyer_1_name, exchange.buyer_2_name].filter(Boolean).join(' & ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Replacement Property Details */}
      {(exchange.rep_1_property_address || exchange.rep_1_value) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-600" />
            Replacement Property 1
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchange.rep_1_property_address && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Property Address</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-start">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400 mt-0.5" />
                  <span>
                    {exchange.rep_1_property_address}
                    {(exchange.rep_1_city || exchange.rep_1_state || exchange.rep_1_zip) && (
                      <><br />{[exchange.rep_1_city, exchange.rep_1_state, exchange.rep_1_zip]
                        .filter(Boolean).join(', ')}</>
                    )}
                  </span>
                </p>
              </div>
            )}
            
            {exchange.rep_1_value && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Property Value</h4>
                <p className="mt-1 text-sm text-gray-900 font-semibold">
                  {formatCurrency(exchange.rep_1_value)}
                </p>
              </div>
            )}
            
            {exchange.rep_1_apn && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">APN</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Hash className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rep_1_apn}
                </p>
              </div>
            )}
            
            {exchange.rep_1_escrow_number && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Escrow Number</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rep_1_escrow_number}
                </p>
              </div>
            )}
            
            {exchange.rep_1_contract_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Contract Date</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {formatUSDate(exchange.rep_1_contract_date)}
                </p>
              </div>
            )}
            
            {exchange.rep_1_seller_name && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Seller</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rep_1_seller_name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      {(exchange.rel_value || exchange.proceeds || exchange.rep_1_value) && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Financial Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Relinquished Value</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(exchange.rel_value)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Proceeds Available</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(exchange.proceeds)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Replacement Value</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(exchange.rep_1_value || exchange.total_replacement_value)}
              </div>
            </div>
          </div>
          
          {/* Compliance Check */}
          {exchange.rel_value && exchange.rep_1_value && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Equal/Greater Value Rule</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                  exchange.rep_1_value >= exchange.rel_value ? 
                  'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {exchange.rep_1_value >= exchange.rel_value ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      COMPLIANT
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      NON-COMPLIANT
                    </>
                  )}
                </span>
              </div>
              {exchange.rep_1_value < exchange.rel_value && (
                <p className="text-xs text-red-600 mt-2">
                  Warning: Replacement value is ${(exchange.rel_value - exchange.rep_1_value).toLocaleString()} 
                  less than relinquished value. This may result in tax consequences.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Task Summary - Keep existing */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
          Task Summary
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Tasks</span>
            <span className="font-medium">{Array.isArray(tasks) ? tasks.length : 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Completed</span>
            <span className="font-medium text-green-600">{completedTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">In Progress</span>
            <span className="font-medium text-blue-600">{activeTasks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};