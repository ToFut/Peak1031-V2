import React from 'react';
import { Link } from 'react-router-dom';
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
    pp_matter_number?: number; // PP Matter Number: 7981
    pp_matter_status?: string;
    pp_responsible_attorney?: string;
    type_of_exchange?: string;
    client_vesting?: string;
    bank?: string;
    proceeds?: number;
    // PP Data structure for accessing unmapped fields
    pp_data?: {
      id?: string;
      number?: number;
      display_name?: string;
      status?: string;
      account_ref?: {
        id?: string;
        display_name?: string;
      };
      assigned_to_users?: Array<{
        id?: string;
        display_name?: string;
        email_address?: string;
      }>;
      custom_field_values?: Array<{
        custom_field_ref: {
          label: string;
          value_type?: string;
        };
        value_string?: string;
        value_number?: number;
        value_date_time?: string;
        value_boolean?: boolean;
        contact_ref?: {
          display_name?: string;
        };
      }>;
    };
    // Relinquished Property
    rel_property_address?: string;
    rel_property_city?: string;
    rel_property_state?: string;
    rel_property_zip?: string;
    rel_property_type?: string; // Type: Residential
    rel_apn?: string; // APN: 4363-007-106
    rel_escrow_number?: string; // Escrow Number: CA-25-26225
    rel_value?: number; // Value: $588,000
    rel_contract_date?: string;
    rel_purchase_contract_title?: string;
    close_of_escrow_date?: string;
    contract_type?: string; // Contract Type: Residential Purchase Agreement
    expected_closing?: string; // Expected Closing: September 17, 2025
    exchange_agreement_drafted?: string; // August 29, 2025
    settlement_agent?: string; // Settlement Agent: Bryan Spoltore
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
    rep_1_seller_1_name?: string;
    rep_1_seller_2_name?: string;
    rep_1_purchase_contract_title?: string;
    // Buyers
    buyer_vesting?: string; // Buyer Vesting: Sanjeev Subherwal and Aarush Subherwal
    buyer_1_name?: string; // Buyer 1: Sanjeev Subherwal
    buyer_2_name?: string; // Buyer 2: Aarush Subherwal
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
  
  // Component for clickable user names - links to user management with search filter
  const ClickableUserName: React.FC<{
    userName: string;
    email?: string;
    className?: string;
  }> = ({ userName, email, className = "" }) => {
    if (!userName) return null;
    
    // Create search params to filter user management by name
    const searchParams = new URLSearchParams();
    if (email) {
      searchParams.set('search', email);
    } else {
      // Extract first name from full name for better search results
      const firstName = userName.split(' ')[0];
      searchParams.set('search', firstName);
    }
    searchParams.set('type', 'all'); // Search both users and contacts
    
    return (
      <Link
        to={`/users?${searchParams.toString()}`}
        className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
        title={`View user profile for ${userName}${email ? ` (${email})` : ''}`}
      >
        {userName}
      </Link>
    );
  };
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

  // Helper function to get PP custom field value - returns JSX for contacts
  const getPPValue = (label: string): React.ReactNode => {
    if (!exchange.pp_data?.custom_field_values) return null;
    const field = exchange.pp_data.custom_field_values.find(f => f.custom_field_ref.label === label);
    if (!field) return null;
    
    // Handle each type explicitly to avoid type issues
    if (field.value_string) return field.value_string;
    if (field.value_number) return field.value_number;
    if (field.value_date_time) return field.value_date_time;
    if (field.contact_ref?.display_name) {
      return <ClickableUserName userName={field.contact_ref.display_name} />;
    }
    if (field.value_boolean !== undefined) return field.value_boolean ? 'Yes' : 'No';
    
    return null;
  };

  // Get complete PP field values (database field OR pp_data field)
  const getPPField = (dbField: any, ppLabel: string): string => {
    const dbValue = dbField;
    const ppValue = getPPValue(ppLabel);
    return dbValue || ppValue || 'Not specified';
  };

  // PP Matter GUID for reference
  const ppMatterGuid = exchange.pp_data?.id;
  const ppAccountName = exchange.pp_data?.account_ref?.display_name;
  const ppResponsibleAttorneyEmail = exchange.pp_data?.assigned_to_users?.[0]?.email_address;

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
              <p className="text-sm font-medium text-green-600">Proceeds Holding</p>
              <p className="text-xl font-bold text-green-900">
                {formatCurrency(exchange.proceeds || exchange.rel_value || (exchange as any).relinquishedValue || 0)}
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

          {/* PP Matter Number */}
          {exchange.pp_matter_number && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">PP Matter Number</h4>
              <p className="mt-1 text-sm text-gray-900 flex items-center">
                <Hash className="w-4 h-4 mr-1 text-gray-400" />
                {exchange.pp_matter_number}
              </p>
            </div>
          )}

          {/* Exchange ID - always visible for search */}
          <div>
            <h4 className="text-sm font-medium text-gray-500">Exchange ID</h4>
            <p className="mt-1 text-xs text-gray-600 font-mono">
              {exchange.id}
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
                <ClickableUserName 
                  userName={exchange.pp_responsible_attorney}
                  email={ppResponsibleAttorneyEmail}
                  className="font-medium"
                />
              </p>
              {ppResponsibleAttorneyEmail && (
                <p className="mt-1 text-xs text-gray-600 flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-gray-400" />
                  <a 
                    href={`mailto:${ppResponsibleAttorneyEmail}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {ppResponsibleAttorneyEmail}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Account Information from PP */}
          {ppAccountName && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Account Name</h4>
              <p className="mt-1 text-sm text-gray-900">
                {ppAccountName}
              </p>
            </div>
          )}

          {/* PP Matter GUID for reference */}
          {ppMatterGuid && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Matter GUID</h4>
              <p className="mt-1 text-xs text-gray-600 font-mono">
                {ppMatterGuid}
              </p>
            </div>
          )}

          {/* Referral Information */}
          {getPPValue('Referral Source') && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Referral Source</h4>
              <p className="mt-1 text-sm text-gray-900">
                {getPPValue('Referral Source')}
              </p>
              {getPPValue('Referral Source Email') && (
                <p className="mt-1 text-xs text-gray-600 flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-gray-400" />
                  {getPPValue('Referral Source Email')}
                </p>
              )}
            </div>
          )}

          {/* Internal Credit Information */}
          {getPPValue('Internal Credit To') && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Internal Credit To</h4>
              <p className="mt-1 text-sm text-gray-900">
                {getPPValue('Internal Credit To')}
              </p>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Close of Escrow</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatUSDate(exchange.close_of_escrow_date)}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">Contract Value</h4>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {formatCurrency(exchange.proceeds || exchange.rel_value || (exchange as any).relinquishedValue || 0)}
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
                <h4 className="text-sm font-medium text-gray-500">Contract Value</h4>
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
            
            {/* Property Type from PP data */}
            {(exchange.rel_property_type || getPPValue('Property Type')) && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Property Type</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Home className="w-4 h-4 mr-1 text-gray-400" />
                  {getPPField(exchange.rel_property_type, 'Property Type')}
                </p>
              </div>
            )}
            
            {exchange.rel_contract_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Contract Date</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(exchange.rel_contract_date)}
                </p>
              </div>
            )}
            
            {exchange.contract_type && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Contract Type</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {exchange.contract_type}
                </p>
              </div>
            )}
            
            {exchange.expected_closing && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Expected Closing</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(exchange.expected_closing)}
                </p>
              </div>
            )}
            
            {exchange.exchange_agreement_drafted && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Exchange Agreement Drafted</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(exchange.exchange_agreement_drafted)}
                </p>
              </div>
            )}
            
            {/* Settlement Agent from PP data */}
            {(exchange.settlement_agent || getPPValue('Rel Settlement Agent')) && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Settlement Agent</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" />
                  {getPPField(exchange.settlement_agent, 'Rel Settlement Agent')}
                </p>
              </div>
            )}
            
            {/* Purchase Contract Title from PP data */}
            {(exchange.rel_purchase_contract_title || getPPValue('Rel Purchase Contract Title')) && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Purchase Contract</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-gray-400" />
                  {getPPField(exchange.rel_purchase_contract_title, 'Rel Purchase Contract Title')}
                </p>
              </div>
            )}
            
            {/* Client Signatory Title */}
            {getPPValue('Client 1 Signatory Title') && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Client Signatory Title</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {getPPValue('Client 1 Signatory Title')}
                </p>
              </div>
            )}
            
            {/* Date Proceeds Received */}
            {getPPValue('Date Proceeds Received') && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date Proceeds Received</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(getPPValue('Date Proceeds Received')?.toString())}
                </p>
              </div>
            )}
            
            {/* Receipt Drafted On */}
            {getPPValue('Receipt Drafted On') && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Receipt Drafted</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(getPPValue('Receipt Drafted On')?.toString())}
                </p>
              </div>
            )}
            
            {(exchange.buyer_1_name || exchange.buyer_2_name || exchange.buyer_vesting) && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Buyer(s)</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.buyer_vesting ? (
                    // Handle buyer vesting which may contain multiple names
                    exchange.buyer_vesting.split(' and ').map((name, index, arr) => (
                      <span key={index}>
                        <ClickableUserName userName={name.trim()} />
                        {index < arr.length - 1 && ' and '}
                      </span>
                    ))
                  ) : (
                    // Handle individual buyer names
                    [exchange.buyer_1_name, exchange.buyer_2_name].filter(Boolean).map((name, index, arr) => (
                      <span key={index}>
                        <ClickableUserName userName={name || ''} />
                        {index < arr.length - 1 && ' & '}
                      </span>
                    ))
                  )}
                </p>
                {(exchange.buyer_1_name || exchange.buyer_2_name) && exchange.buyer_vesting && (
                  <p className="mt-1 text-xs text-gray-600">
                    Individual: {[exchange.buyer_1_name, exchange.buyer_2_name].filter(Boolean).map((name, index, arr) => (
                      <span key={index}>
                        <ClickableUserName userName={name || ''} />
                        {index < arr.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                )}
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
                <h4 className="text-sm font-medium text-gray-500">Contract Value</h4>
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
            
            {/* Seller Information - Combined */}
            {(exchange.rep_1_seller_name || exchange.rep_1_seller_1_name || exchange.rep_1_seller_2_name) && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Seller(s)</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" />
                  {exchange.rep_1_seller_name ? (
                    <ClickableUserName userName={exchange.rep_1_seller_name} />
                  ) : (
                    [exchange.rep_1_seller_1_name, exchange.rep_1_seller_2_name].filter(Boolean).map((name, index, arr) => (
                      <span key={index}>
                        <ClickableUserName userName={name || ''} />
                        {index < arr.length - 1 && ' & '}
                      </span>
                    ))
                  )}
                </p>
              </div>
            )}
            
            {/* Rep Settlement Agent from PP data */}
            {getPPValue('Rep 1 Settlement Agent') && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Rep Settlement Agent</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" />
                  {getPPValue('Rep 1 Settlement Agent')}
                </p>
              </div>
            )}
            
            {/* Rep Purchase Contract Title */}
            {(exchange.rep_1_purchase_contract_title || getPPValue('Rep 1 Purchase Contract Title')) && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Rep Purchase Contract</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-gray-400" />
                  {getPPField(exchange.rep_1_purchase_contract_title, 'Rep 1 Purchase Contract Title')}
                </p>
              </div>
            )}
            
            {/* Rep Seller Vesting */}
            {getPPValue('Rep 1 Seller Vesting') && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Rep Seller Vesting</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {getPPValue('Rep 1 Seller Vesting')}
                </p>
              </div>
            )}
            
            {/* Rep Docs Drafted On */}
            {getPPValue('Rep 1 Docs Drafted on') && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Rep Docs Drafted</h4>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  {formatUSDate(getPPValue('Rep 1 Docs Drafted on')?.toString())}
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
              <div className="text-sm text-gray-500">Proceeds Holding</div>
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