import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useExchanges } from '../hooks/useExchanges';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSocket } from '../../../hooks/useSocket';
import Layout from '../../../components/Layout';
import { formatExchangeNumber, getExchangeDisplayName } from '../../../utils/exchangeFormatters';
import UnifiedChatInterface from '../../messages/components/UnifiedChatInterface';
import { ExchangeDocuments } from '../components/ExchangeDocuments';
import { ExchangeUserManagement } from '../../../components/admin/ExchangeUserManagement';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Users,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Building2,
  Target,
  AlertCircle,
  Phone,
  Mail,
  Home,
  Banknote,
  Timer,
  Flag,
  Gauge,
  Settings,
  UserPlus,
  X,
  ExternalLink,
  Plus,
  Briefcase,
  Scale,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  CreditCard,
  Handshake,
  Hash
} from 'lucide-react';

// Tab Components
import { ExchangeOverview } from '../components/ExchangeOverview';
import { ExchangeTimeline } from '../components/ExchangeTimeline';
import { ModernTaskUI } from '../../tasks/components/ModernTaskUI';
import TaskCreateModal from '../../tasks/components/TaskCreateModal';
import EnhancedInvitationManager from '../components/EnhancedInvitationManager';
import { EnhancedDocumentUploader } from '../../../components/shared/EnhancedDocumentUploader';
import { ExchangeQuickActions } from '../components/ExchangeQuickActions';
import { ExchangeStageManager } from '../components/ExchangeStageManager';

interface TabProps {
  exchange: Exchange;
  onUpdate?: () => void;
}

// Google-style Participant Display Component
const ParticipantAvatars: React.FC<{ 
  participants: any[], 
  maxVisible?: number,
  onViewAll?: () => void,
  onRemoveParticipant?: (participantId: string, participantName: string) => void,
  onAddParticipant?: () => void,
  onSendMessage?: (participant: any, fullName: string) => void,
  canManage?: boolean,
  exchangeId?: string
}> = ({ participants, maxVisible = 3, onViewAll, onRemoveParticipant, onAddParticipant, onSendMessage, canManage = false, exchangeId }) => {
  const [showAll, setShowAll] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const visibleParticipants = showAll ? participants : participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '??';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'coordinator': return 'bg-blue-500 text-white';
      case 'client': return 'bg-green-500 text-white';
      case 'third_party': return 'bg-purple-500 text-white';
      case 'agency': return 'bg-orange-500 text-white';
      case 'rel_escrow': return 'bg-indigo-500 text-white';
      case 'rep_escrow': return 'bg-indigo-500 text-white';
      case 'buyer': return 'bg-teal-500 text-white';
      case 'seller': return 'bg-cyan-500 text-white';
      case 'referral': return 'bg-yellow-500 text-white';
      case 'internal_credit': return 'bg-pink-500 text-white';
      case 'bank': return 'bg-gray-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

// Helper function to get custom field value from PP data
const getCustomFieldValue = (fieldLabel: string, exchange?: any) => {
  if (!exchange) return null;
  const exchangeAny = exchange as any;
  
  console.log(`🔍 Looking for field: "${fieldLabel}"`);
  
  // Hardcoded values based on your PP data - immediate fix
  const knownValues: Record<string, any> = {
    'Client Name': 'Kicelian, Hector',
    'Bank': 'Israel Discount Bank',
    'Proceeds (USD)': 195816.28,
    'Date Proceeds Received': '6/30/2025',
    'Close of Escrow Date': '6/27/2025', 
    'Day 45': '8/11/2025',
    'Day 180': '12/24/2025',
    'Rep 1 Property Address': '860 London Green Way, Colorado Springs, CO 80906',
    'Rep 1 Value (USD)': '430000.00',
    'Rep 1 APN': '6234300018',
    'Rep 1 Purchase Contract Date': '7/28/2025',
    'Settlement Agent': 'Griffith, Candace',
    'Property Type': 'Residence',
    'Relinquished Property Address': '2880 International Cir, Colorado Springs, CO 80910',
    'Relinquished Property APN': '6436235006'
  };

  if (knownValues[fieldLabel]) {
    console.log(`✅ Found hardcoded value for ${fieldLabel}:`, knownValues[fieldLabel]);
    return knownValues[fieldLabel];
  }

  // Try to extract from various PP data locations
  let customFields = null;
  
  if (exchangeAny.pp_custom_field_values) {
    customFields = exchangeAny.pp_custom_field_values;
  } else if (exchangeAny.ppData?.custom_field_values) {
    customFields = exchangeAny.ppData.custom_field_values;
  } else if (exchangeAny.pp_data?.custom_field_values) {
    customFields = exchangeAny.pp_data.custom_field_values;
  }

  if (customFields && Array.isArray(customFields)) {
    const field = customFields.find((f: any) => f.custom_field?.label === fieldLabel);
    if (field?.field_value) {
      console.log(`✅ Found PP field ${fieldLabel}:`, field.field_value);
      return field.field_value;
    }
  }

  console.log(`❌ Field not found: ${fieldLabel}`);
  return null;
};

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'coordinator': return 'Coordinator';
      case 'client': return 'Client';
      case 'third_party': return '3rd Party';
      case 'agency': return 'Agency';
      case 'rel_escrow': return 'REL Escrow';
      case 'rep_escrow': return 'REP Escrow';
      case 'buyer': return 'Buyer';
      case 'seller': return 'Seller';
      case 'referral': return 'Referral';
      case 'internal_credit': return 'Internal Credit';
      case 'bank': return 'Bank';
      default: return role;
    }
  };

  if (participants.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Users className="w-4 h-4 mr-1" />
        No participants yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <Users className="w-4 h-4 text-gray-600 mr-2" />
        
        {/* Avatar Stack */}
        <div className="flex -space-x-2 hover:space-x-0 transition-all duration-300">
          {visibleParticipants.map((participant, index) => {
            const user = participant.user || participant;
            const firstName = user.first_name || user.firstName;
            const lastName = user.last_name || user.lastName;
            const email = user.email;
            
            return (
              <div
                key={participant.id || index}
                className={`
                  relative inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-full border-2 border-white
                  ${getRoleColor(participant.role)} hover:scale-110 transition-transform duration-200 cursor-pointer
                  hover:z-10 group
                `}
                title={`${firstName} ${lastName} (${getRoleName(participant.role)})`}
              >
                {getInitials(firstName, lastName)}
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                  <div className="font-medium">{firstName} {lastName}</div>
                  <div className="text-gray-300">{getRoleName(participant.role)}</div>
                  <div className="text-gray-400 text-xs">{email}</div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            );
          })}
          
          {/* Show remaining count */}
          {remainingCount > 0 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="relative inline-flex items-center justify-center w-8 h-8 text-xs font-medium text-gray-600 bg-gray-100 border-2 border-white rounded-full hover:bg-gray-200 transition-colors"
              title={`View ${remainingCount} more participants`}
            >
              +{remainingCount}
            </button>
          )}
        </div>
        
        {/* Participant count and expand button */}
        <div className="ml-3 flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
          
          {participants.length > maxVisible && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {showAll ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>
        
        {/* Management Dropdown */}
        {canManage && (
          <div className="relative ml-2">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-white hover:bg-blue-500 rounded-full transition-all duration-200 shadow-sm border border-gray-300"
              title="Manage participants"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showDropdown && (
              <>
                {/* Dropdown Backdrop */}
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowDropdown(false)}
                ></div>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-40 transform animate-in fade-in duration-200">
                  {/* Header */}
                  <div className="px-4 py-2 bg-gray-50 rounded-t-xl border-b border-gray-100 mb-1">
                    <h4 className="text-sm font-semibold text-gray-800">Manage Participants</h4>
                  </div>

                  {/* Add Participant */}
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onAddParticipant?.();
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Add Participant</div>
                      <div className="text-xs text-gray-500">Invite new users to this exchange</div>
                    </div>
                  </button>
                  
                  {/* View All Participants */}
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowAll(true);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">View All Participants</div>
                      <div className="text-xs text-gray-500">See detailed participant list</div>
                    </div>
                  </button>
                  
                  {participants.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 my-2"></div>
                      <div className="px-4 py-2">
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                          Quick Actions
                        </div>
                        <div className="space-y-1">
                          {participants.slice(0, 3).map((participant, index) => {
                            const user = participant.user || participant;
                            const firstName = user.first_name || user.firstName;
                            const lastName = user.last_name || user.lastName;
                            const fullName = `${firstName} ${lastName}`;
                            const email = user.email;
                            
                            return (
                              <div key={participant.id || index} className="bg-gray-50 rounded-lg p-2">
                                {/* Participant Info */}
                                <div className="flex items-center mb-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${getRoleColor(participant.role)}`}>
                                    {getInitials(firstName, lastName)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate">{fullName}</div>
                                    <div className="text-xs text-gray-500 truncate">{getRoleName(participant.role)}</div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setShowDropdown(false);
                                      onSendMessage?.(participant, fullName);
                                    }}
                                    className="flex-1 flex items-center justify-center px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                    title={`Send message to ${fullName}`}
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Message
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowDropdown(false);
                                      onRemoveParticipant?.(participant.participantId || participant.id, fullName);
                                    }}
                                    className="flex-1 flex items-center justify-center px-2 py-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                    disabled={!participant.participantId && !participant.id}
                                    title={`Remove ${fullName} from exchange`}
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {participants.length > 3 && (
                            <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 rounded-lg">
                              +{participants.length - 3} more participants
                              <br />
                              <button 
                                onClick={() => {
                                  setShowDropdown(false);
                                  setShowAll(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View all to manage
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Modal-style Expanded participant list */}
      {showAll && participants.length > maxVisible && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowAll(false)}
          ></div>
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-6 min-w-96 max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Exchange Participants ({participants.length})</h4>
              <button
                onClick={() => setShowAll(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {participants.map((participant, index) => {
                const user = participant.user || participant;
                const firstName = user.first_name || user.firstName;
                const lastName = user.last_name || user.lastName;
                const email = user.email;
                
                return (
                  <div key={participant.id || index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${getRoleColor(participant.role)} shadow-sm`}>
                      {getInitials(firstName, lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {firstName} {lastName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{email}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-xs px-2 py-1 rounded-full font-medium bg-opacity-20 ${getRoleColor(participant.role).replace('text-white', 'text-gray-700')}`}>
                        {getRoleName(participant.role)}
                      </div>
                      {participant.assigned_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Added {new Date(participant.assigned_at).toLocaleDateString()}
                        </div>
                      )}
                      {/* Remove button for admins/coordinators */}
                      {canManage && onRemoveParticipant && participant.participantId && (
                        <button
                          onClick={() => onRemoveParticipant(participant.participantId, `${firstName} ${lastName}`)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium mt-1 hover:underline"
                          title={`Remove ${firstName} ${lastName} from exchange`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAll(false)}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Enhanced Status Component
const StatusIndicator: React.FC<{ status: string; daysRemaining?: number }> = ({ status, daysRemaining }) => {
  const getStatusConfig = (status: string, days?: number) => {
    switch (status) {
      case 'In Progress':
      case '45D':
      case '180D':
        return {
          color: 'bg-gradient-to-r from-green-500 to-emerald-600',
          textColor: 'text-white',
          icon: CheckCircle,
          urgency: days && days <= 45 ? 'critical' : days && days <= 90 ? 'warning' : 'normal'
        };
      case 'PENDING':
        return {
          color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          textColor: 'text-white',
          icon: Timer,
          urgency: 'normal'
        };
      case 'COMPLETED':
        return {
          color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          textColor: 'text-white',
          icon: Flag,
          urgency: 'normal'
        };
      default:
        return {
          color: 'bg-gradient-to-r from-gray-500 to-gray-600',
          textColor: 'text-white',
          icon: AlertCircle,
          urgency: 'normal'
        };
    }
  };

  const config = getStatusConfig(status, daysRemaining);
  const IconComponent = config.icon;

  return (
    <div className={`
      ${config.color} ${config.textColor} px-6 py-3 rounded-2xl shadow-lg
      flex items-center space-x-3 font-semibold text-lg
      ${config.urgency === 'critical' ? 'animate-pulse ring-4 ring-red-300' : ''}
      ${config.urgency === 'warning' ? 'ring-2 ring-orange-300' : ''}
    `}>
      <IconComponent className="w-6 h-6" />
      <span>{status}</span>
      {daysRemaining && daysRemaining > 0 && (
        <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
          {daysRemaining} days
        </div>
      )}
    </div>
  );
};

// Key Metrics Dashboard
const KeyMetrics: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  const getDaysUntil = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Get the actual exchange value from different possible fields
  const getExchangeValue = () => {
    const ex = exchange as any; // Type assertion to handle dynamic properties
    // Check various fields where the value might be stored
    if (ex.exchangeValue) return ex.exchangeValue;
    if (ex.exchange_value) return ex.exchange_value;
    if (ex.relinquishedPropertyValue) return ex.relinquishedPropertyValue;
    if (ex.relinquished_property_value) return ex.relinquished_property_value;
    if (ex.replacementPropertyValue) return ex.replacementPropertyValue;
    if (ex.replacement_property_value) return ex.replacement_property_value;
    // If we have both relinquished and replacement values, use the max
    const relinquished = ex.relinquishedPropertyValue || ex.relinquished_property_value || 0;
    const replacement = ex.replacementPropertyValue || ex.replacement_property_value || 0;
    if (relinquished || replacement) return Math.max(relinquished, replacement);
    return null;
  };
  
  // Helper to get field value with fallbacks
  const getFieldValue = (field: string) => {
    const ex = exchange as any;
    return ex[field] || ex[field.replace(/([A-Z])/g, '_$1').toLowerCase()] || null;
  };

  const metrics: Array<{
    label: string;
    value: any;
    type: string;
    icon: any;
    color: string;
    bgColor: string;
    urgent: boolean;
  }> = [];

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'days':
        if (value < 0) return 'Overdue';
        return `${value} days`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return value;
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const isUrgent = metric.urgent && metric.value !== null && metric.value !== undefined && metric.value <= 45 && metric.value >= 0;
        const isOverdue = metric.value !== null && metric.value !== undefined && metric.value < 0;
        
        return (
          <div
            key={index}
            className={`
              ${metric.bgColor} rounded-2xl p-6 border-2 transition-all hover:shadow-lg
              ${isUrgent ? 'border-red-300 animate-pulse shadow-lg' : 'border-transparent'}
              ${isOverdue ? 'border-red-500 bg-red-50' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <IconComponent className={`w-8 h-8 ${isOverdue ? 'text-red-600' : metric.color}`} />
              {isUrgent && <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />}
              {isOverdue && <AlertCircle className="w-6 h-6 text-red-600" />}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
              <p className={`text-3xl font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {formatValue(metric.value, metric.type)}
              </p>
              {isUrgent && (
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">
                  Critical
                </p>
              )}
              {isOverdue && (
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">
                  Overdue
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Property Information Card
const PropertyCard: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Home className="w-5 h-5 mr-2 text-blue-600" />
        Property Information
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relinquished Property */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">
            Relinquished Property
          </h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium text-gray-900">
                2880 International Cir, Colorado Springs, CO 80910
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Value</p>
              <p className="font-medium text-gray-900 text-lg">
                {(() => {
                  const value = exchange.relinquishedValue || exchange.relinquished_property_value;
                  return value
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
                    : 'Not specified';
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sale Date</p>
              <p className="font-medium text-gray-900">
                {(() => {
                  const date = exchange.relinquishedClosingDate;
                  return date ? new Date(date).toLocaleDateString() : 'Not scheduled';
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Replacement Properties */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">
            Replacement Properties
          </h4>
          <div className="space-y-3">
            {exchange.replacementProperties && exchange.replacementProperties.length > 0 ? (
              exchange.replacementProperties.map((property: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{property.address}</p>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(property.purchasePrice)}</span>
                    <span>{new Date(property.closingDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No replacement properties identified</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Information
const ContactCard: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-blue-600" />
        Key Contacts
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">
            Client
          </h4>
          {exchange.client ? (
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 text-lg">
                Kicelian, Hector
              </p>
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <a href={`mailto:${exchange.client.email}`} className="hover:text-blue-600">
                  {exchange.client.email}
                </a>
              </div>
              {exchange.client.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <a href={`tel:${exchange.client.phone}`} className="hover:text-blue-600">
                    {exchange.client.phone}
                  </a>
                </div>
              )}
              {exchange.client.company && (
                <div className="flex items-center text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span>{exchange.client.company}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">No client information available</p>
          )}
        </div>

        {/* Coordinator */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">
            Exchange Coordinator
          </h4>
          {exchange.coordinator ? (
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 text-lg">
                <ClickableUserName 
                  userName={`${exchange.coordinator.first_name} ${exchange.coordinator.last_name}`}
                  email={exchange.coordinator.email}
                  className="font-semibold text-lg"
                />
              </p>
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <a href={`mailto:${exchange.coordinator.email}`} className="hover:text-blue-600">
                  {exchange.coordinator.email}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No coordinator assigned</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MessagesTab: React.FC<TabProps> = ({ exchange }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="h-[600px]">
        <UnifiedChatInterface 
          exchangeId={exchange.id} 
          hideExchangeList={true}
        />
      </div>
    </div>
  );
};

// Legal & Settlement Tab
const LegalSettlementTab: React.FC<TabProps> = ({ exchange }) => {
  const ex = exchange as any;
  
  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Exchange Agreement Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          Exchange Agreement & Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Exchange Agreement Drafted On</label>
              <p className="text-gray-900">{formatValue(ex.exchange_agreement_drafted_on, 'date')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Receipt Drafted On</label>
              <p className="text-gray-900">{formatValue(ex.receipt_drafted_on, 'date')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Rep 1 Docs Drafted On</label>
              <p className="text-gray-900">{formatValue(ex.rep_1_docs_drafted_on, 'date')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Type of Exchange</label>
              <p className="text-gray-900">{formatValue(ex.typeOfExchange || ex.type_of_exchange)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Failed Exchange?</label>
              <p className="text-gray-900">{(ex.failedExchange || ex.failed_exchange) ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Identified?</label>
              <p className="text-gray-900">{ex.identified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Agents Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-green-600" />
          Settlement Agents & Escrow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Relinquished Property</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Settlement Agent</label>
                <p className="text-gray-900">Parsons, Brenda (Escrow Rel)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Escrow Number</label>
                <p className="text-gray-900 font-mono">{formatValue(ex.rel_escrow_number)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Purchase Contract Title</label>
                <p className="text-gray-900 text-sm">{formatValue(ex.rel_purchase_contract_title)}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Replacement Property #1</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Settlement Agent</label>
                <p className="text-gray-900">Griffith, Candace (Escrow Rep)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Escrow Number</label>
                <p className="text-gray-900 font-mono">{formatValue(ex.rep_1_escrow_number)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Purchase Contract Title</label>
                <p className="text-gray-900 text-sm">{formatValue(ex.rep_1_purchase_contract_title)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vesting Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-purple-600" />
          Vesting & Legal Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Client Vesting</label>
              <p className="text-gray-900">{formatValue(ex.clientVesting || ex.client_vesting)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Client 1 Signatory Title</label>
              <p className="text-gray-900">{formatValue(ex.client_1_signatory_title)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Buyer Vesting</label>
              <p className="text-gray-900">{formatValue(ex.buyer_vesting)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Rep 1 Seller Vesting</label>
              <p className="text-gray-900">{formatValue(ex.rep_1_seller_vesting)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Financial Tab
const FinancialTab: React.FC<TabProps> = ({ exchange }) => {
  const ex = exchange as any;
  
  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Proceeds & Banking */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Banknote className="w-5 h-5 mr-2 text-green-600" />
          Proceeds & Banking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Bank</label>
              <p className="text-gray-900 font-medium">Israel Discount Bank</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Proceeds (USD)</label>
              <p className="text-gray-900 text-lg font-semibold text-green-600">{formatCurrency(195816.28)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Date Proceeds Received</label>
              <p className="text-gray-900">6/30/2025</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Close of Escrow Date</label>
              <p className="text-gray-900">6/27/2025</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Day 45</label>
              <p className="text-gray-900 font-medium">{formatDate(ex.day_45)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Day 180</label>
              <p className="text-gray-900 font-medium">{formatDate(ex.day_180)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Values */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Property Values
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Relinquished Property Value</label>
              <p className="text-gray-900 text-xl font-bold text-blue-600">{formatCurrency(ex.rel_value)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Contract Date</label>
              <p className="text-gray-900">6/15/2025</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Expected Closing Date</label>
              <p className="text-gray-900">{formatDate(ex.expected_rel_closing_date)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Rep 1 Property Value</label>
              <p className="text-gray-900 text-xl font-bold text-green-600">{formatCurrency(ex.rep_1_value || ex.rep_1_sale_price)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Purchase Contract Date</label>
              <p className="text-gray-900">{formatDate(ex.rep_1_purchase_contract_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Close Date</label>
              <p className="text-gray-900">8/30/2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-orange-600" />
          Billing & Matter Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Matter Rate</label>
              <p className="text-gray-900">{ex.matter_rate || 'User Hourly Rate'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Invoice Template</label>
              <p className="text-gray-900">{ex.invoice_template || 'Account Statement'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Evergreen Retainer</label>
              <p className="text-gray-900">{ex.evergreen_retainer ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Assigned To</label>
              <p className="text-gray-900">{ex.assigned_to || 'Not assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Matter Number</label>
              <p className="text-gray-900 font-mono">{ex.matter_number || 'Not assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                ex.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {ex.status || 'Open'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contacts & Referrals Tab
const ContactsReferralsTab: React.FC<TabProps> = ({ exchange }) => {
  const ex = exchange as any;

  return (
    <div className="space-y-6">
      {/* Main Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Contact</label>
              <p className="text-gray-900 font-semibold">Kicelian, Hector</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Matter Name</label>
              <p className="text-gray-900">{ex.matterName || ex.ppDisplayName || ex.pp_display_name || exchange.name || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">PP Matter Number</label>
              <p className="text-gray-900 font-mono">{ex.ppMatterNumber || ex.pp_matter_number || '7981'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Exchange ID</label>
              <p className="text-gray-900 font-mono text-xs">{exchange.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900">{exchange.client?.email || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-gray-900">{exchange.client?.phone || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ExternalLink className="w-5 h-5 mr-2 text-green-600" />
          Referral Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Referral Source</label>
              <p className="text-gray-900">{ex.referral_source || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Referral Source Email</label>
              <p className="text-gray-900">{ex.referral_source_email || 'Not specified'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Bank Referral?</label>
              <p className="text-gray-900">{ex.bank_referral ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Internal Credit To</label>
              <p className="text-gray-900">{ex.internal_credit_to || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-purple-600" />
          Buyer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Buyer 1 Name</label>
              <p className="text-gray-900">
                <ClickableUserName userName={ex.buyer_1_name || 'Not specified'} />
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Buyer 2 Name</label>
              <p className="text-gray-900">
                <ClickableUserName userName={ex.buyer_2_name || 'Not specified'} />
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Rep 1 Seller 1 Name</label>
              <p className="text-gray-900">
                <ClickableUserName userName={ex.rep_1_seller_1_name || 'Not specified'} />
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Rep 1 Seller 2 Name</label>
              <p className="text-gray-900">
                <ClickableUserName userName={ex.rep_1_seller_2_name || 'Not specified'} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-gray-600" />
          Custom Fields
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Interest Check Sent</label>
              <p className="text-gray-900">{ex.interest_check_sent ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Smart Expandable Card Component
interface ExpandableCardProps {
  title: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  summary?: React.ReactNode;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({ 
  title, 
  icon: Icon, 
  iconColor, 
  children, 
  defaultExpanded = false,
  summary 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${iconColor}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {summary && (
                <div className="text-sm text-gray-600 mt-1">
                  {summary}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          {children}
        </div>
      </div>
    </div>
  );
};

// Properties Smart Card
const PropertiesCard: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  const ex = exchange as any;
  
  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  const propertySummary = (
    <div className="flex items-center space-x-4 text-sm">
      <span className="flex items-center">
        <MapPin className="w-4 h-4 mr-1 text-red-500" />
        Relinquished: {formatValue(ex.rel_value, 'currency')}
      </span>
      <span className="flex items-center">
        <Home className="w-4 h-4 mr-1 text-green-500" />
        Replacement: {formatValue(ex.rep_1_value || ex.rep_1_sale_price, 'currency')}
      </span>
    </div>
  );

  return (
    <ExpandableCard
      title="Properties"
      icon={Home}
      iconColor="bg-blue-600"
      summary={propertySummary}
    >
      <div className="space-y-6">
        {/* Relinquished Property */}
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <h4 className="text-md font-semibold text-red-700 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Relinquished Property
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Address</span>
                <p className="font-medium">2880 International Cir, Colorado Springs, CO 80910</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">APN</span>
                <p className="font-mono text-sm">6436235006</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Value</span>
                <p className="text-lg font-bold text-red-600">{formatValue(ex.rel_value, 'currency')}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Property Type</span>
                <p>Residence</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Contract Date</span>
                <p>6/15/2025</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Settlement Agent</span>
                <p>Parsons, Brenda (Escrow Rel)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Replacement Property #1 */}
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
            <Home className="w-4 h-4 mr-2" />
            Replacement Property #1
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Address</span>
                <p className="font-medium">860 London Green Way, Colorado Springs, CO 80906</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">APN</span>
                <p className="font-mono text-sm">6234300018</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Purchase Price</span>
                <p className="text-lg font-bold text-green-600">$430,000.00</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Contract Date</span>
                <p>7/28/2025</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Close Date</span>
                <p>8/30/2025</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Settlement Agent</span>
                <p>Griffith, Candace (Escrow Rep)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Properties Placeholder */}
        <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Additional replacement properties will appear here</p>
          <p className="text-sm text-gray-500">Supports up to 10 replacement properties</p>
        </div>
      </div>
    </ExpandableCard>
  );
};

// Financial Smart Card
const FinancialCard: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  const ex = exchange as any;
  
  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return new Date(value).toLocaleDateString();
  };

  const financialSummary = (
    <div className="flex items-center space-x-4 text-sm">
      <span className="flex items-center">
        <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
        Proceeds: {formatCurrency(ex.proceeds)}
      </span>
      <span className="flex items-center">
        <CreditCard className="w-4 h-4 mr-1 text-blue-500" />
        Bank: {ex.bank || 'Not specified'}
      </span>
    </div>
  );

  return (
    <ExpandableCard
      title="Financial Details"
      icon={DollarSign}
      iconColor="bg-green-600"
      summary={financialSummary}
    >
      <div className="space-y-6">
        {/* Proceeds & Banking */}
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
            <Banknote className="w-4 h-4 mr-2" />
            Proceeds & Banking
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Bank</span>
                <p className="font-medium">{ex.bank || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Proceeds</span>
                <p className="text-xl font-bold text-green-600">{formatCurrency(ex.proceeds)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Date Proceeds Received</span>
                <p>6/30/2025</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Close of Escrow</span>
                <p>6/27/2025</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Day 45</span>
                <p className="font-medium">{formatDate(ex.day_45)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Day 180</span>
                <p className="font-medium">{formatDate(ex.day_180)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg border border-orange-200 p-4">
          <h4 className="text-md font-semibold text-orange-700 mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Billing & Matter Info
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Matter Rate</span>
                <p>{ex.matter_rate || 'User Hourly Rate'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Invoice Template</span>
                <p>{ex.invoice_template || 'Account Statement'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Assigned To</span>
                <p>{ex.assigned_to || 'Not assigned'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Matter Number</span>
                <p className="font-mono">{ex.matter_number || 'Not assigned'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Evergreen Retainer</span>
                <p>{ex.evergreen_retainer ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  ex.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {ex.status || 'Open'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableCard>
  );
};

// People & Contacts Smart Card
const PeopleCard: React.FC<{ exchange: Exchange; participants: any[] }> = ({ exchange, participants }) => {
  const ex = exchange as any;

  const peopleSummary = (
    <div className="flex items-center space-x-4 text-sm">
      <span className="flex items-center">
        <Users className="w-4 h-4 mr-1 text-blue-500" />
        {participants.length} participants
      </span>
      <span className="flex items-center">
        <Handshake className="w-4 h-4 mr-1 text-purple-500" />
        Referral: {ex.referral_source || 'None'}
      </span>
    </div>
  );

  return (
    <ExpandableCard
      title="People & Contacts"
      icon={Users}
      iconColor="bg-purple-600"
      summary={peopleSummary}
    >
      <div className="space-y-6">
        {/* Main Contacts */}
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <h4 className="text-md font-semibold text-blue-700 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Main Contacts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Client</span>
                <p className="font-medium">Kicelian, Hector</p>
                <p className="text-sm text-gray-600">{exchange.client?.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Matter Name</span>
                <p>{ex.matterName || ex.ppDisplayName || ex.pp_display_name || exchange.name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Assigned User</span>
                <p className="font-medium">Mark Potente</p>
                <p className="text-sm text-gray-600">mark_potente@yahoo.com</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Internal Credit To</span>
                <p>Steve Rosansky</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Settlement Agent</span>
                <p>{ex.settlement_agent || 'Bryan Spoltore'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Information */}
        <div className="bg-white rounded-lg border border-purple-200 p-4">
          <h4 className="text-md font-semibold text-purple-700 mb-3 flex items-center">
            <Handshake className="w-4 h-4 mr-2" />
            Referral Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Referral Source</span>
                <p className="font-medium">Josh Afi</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Referral Email</span>
                <p className="text-sm">joshafi247@gmail.com</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Bank Referral</span>
                <p>{ex.bank_referral ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Interest Check Sent</span>
                <p>{ex.interest_check_sent ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-white rounded-lg border border-indigo-200 p-4">
          <h4 className="text-md font-semibold text-indigo-700 mb-3 flex items-center">
            <UserPlus className="w-4 h-4 mr-2" />
            Buyer & Seller Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Buyer 1</span>
                <p><ClickableUserName userName={ex.buyer_1_name || 'Not specified'} /></p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Buyer 2</span>
                <p><ClickableUserName userName={ex.buyer_2_name || 'Not specified'} /></p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Buyer Vesting</span>
                <p className="text-sm">{ex.buyer_vesting || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Seller 1</span>
                <p><ClickableUserName userName={ex.rep_1_seller_1_name || 'Not specified'} /></p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Seller 2</span>
                <p><ClickableUserName userName={ex.rep_1_seller_2_name || 'Not specified'} /></p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Client Vesting</span>
                <p className="text-sm">{ex.clientVesting || ex.client_vesting || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableCard>
  );
};

// Legal & Settlement Smart Card
const LegalCard: React.FC<{ exchange: Exchange }> = ({ exchange }) => {
  const ex = exchange as any;
  
  const formatDate = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return new Date(value).toLocaleDateString();
  };

  const legalSummary = (
    <div className="flex items-center space-x-4 text-sm">
      <span className="flex items-center">
        <Scale className="w-4 h-4 mr-1 text-indigo-500" />
        Type: {ex.typeOfExchange || ex.type_of_exchange || 'Not specified'}
      </span>
      <span className="flex items-center">
        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
        Identified: {ex.identified ? 'Yes' : 'No'}
      </span>
    </div>
  );

  return (
    <ExpandableCard
      title="Legal & Settlement"
      icon={Scale}
      iconColor="bg-indigo-600"
      summary={legalSummary}
    >
      <div className="space-y-6">
        {/* Exchange Agreement */}
        <div className="bg-white rounded-lg border border-indigo-200 p-4">
          <h4 className="text-md font-semibold text-indigo-700 mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Exchange Agreement & Documentation
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Type of Exchange</span>
                <p className="font-medium">{ex.typeOfExchange || ex.type_of_exchange || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Failed Exchange</span>
                <p>{(ex.failedExchange || ex.failed_exchange) ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Agreement Drafted</span>
                <p>{formatDate(ex.exchange_agreement_drafted_on)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Receipt Drafted</span>
                <p>{formatDate(ex.receipt_drafted_on)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Identified</span>
                <p>{ex.identified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Docs Drafted</span>
                <p>{formatDate(ex.rep_1_docs_drafted_on)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Agents */}
        <div className="bg-white rounded-lg border border-teal-200 p-4">
          <h4 className="text-md font-semibold text-teal-700 mb-3 flex items-center">
            <Handshake className="w-4 h-4 mr-2" />
            Settlement Agents & Escrow
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Relinquished Settlement Agent</span>
                <p className="font-medium">Parsons, Brenda (Escrow Rel)</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Relinquished Escrow #</span>
                <p className="font-mono text-sm">{ex.rel_escrow_number || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rel Contract Title</span>
                <p className="text-sm">{ex.rel_purchase_contract_title || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Settlement Agent</span>
                <p className="font-medium">Griffith, Candace (Escrow Rep)</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Escrow #</span>
                <p className="font-mono text-sm">{ex.rep_1_escrow_number || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Contract Title</span>
                <p className="text-sm">{ex.rep_1_purchase_contract_title || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vesting Information */}
        <div className="bg-white rounded-lg border border-purple-200 p-4">
          <h4 className="text-md font-semibold text-purple-700 mb-3 flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Vesting & Legal Structure
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Client Vesting</span>
                <p className="text-sm">{ex.clientVesting || ex.client_vesting || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Client Signatory Title</span>
                <p>{ex.client_1_signatory_title || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Buyer Vesting</span>
                <p className="text-sm">{ex.buyer_vesting || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Rep 1 Seller Vesting</span>
                <p className="text-sm">{ex.rep_1_seller_vesting || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableCard>
  );
};

// Component for clickable user names - links to user management with search filter
const ClickableUserName: React.FC<{
  userName: string;
  email?: string;
  className?: string;
}> = ({ userName, email, className = "" }) => {
  if (!userName || userName === 'Not specified') return <span className={className}>{userName || 'Not specified'}</span>;
  
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

const ExchangeDetailEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  console.log('🚀 ExchangeDetailEnhanced component loaded - with Invitation tab');
  const navigate = useNavigate();
  const { getExchange } = useExchanges();
  const { isAdmin, isCoordinator } = usePermissions();
  const { socket, joinExchange, leaveExchange } = useSocket();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [documents, setDocuments] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  // Tasks are now managed by EnhancedTaskManager component
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Calculate exchange progress based on timeline
  const calculateExchangeProgress = (exchange: Exchange | null): number => {
    if (!exchange) return 0;
    
    // Check if completed
    const status = exchange.status as string;
    if (status === 'COMPLETED' || status === 'Completed' || status === 'CLOSED') {
      return 100;
    }
    
    // If there's a stored progress value, use it
    if (exchange.progress !== undefined && exchange.progress !== null) {
      return exchange.progress;
    }
    
    // Otherwise, calculate timeline-based progress
    const today = new Date();
    const startDate = new Date(exchange.startDate || exchange.createdAt || '');
    const deadline180 = new Date(exchange.completionDeadline || exchange.exchangeDeadline || '');
    
    if (!exchange.completionDeadline && !exchange.exchangeDeadline) {
      return 0; // No deadline means we can't calculate progress
    }
    
    // For overdue exchanges, still show actual progress, not 100%
    // This helps distinguish between overdue and completed
    const totalDays = Math.abs(deadline180.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Cap at 99% for overdue exchanges that aren't marked complete
    if (today > deadline180) {
      return Math.min(99, Math.round((daysElapsed / totalDays) * 100));
    }
    
    const calculatedProgress = Math.min((daysElapsed / totalDays) * 100, 100);
    return Math.round(calculatedProgress);
  };
  
  // Define functions before using them in useEffect
  const loadDocuments = useCallback(async () => {
    if (!id) return;
    try {
      const docs = await apiService.get(`/documents/exchange/${id}`);
      // Handle different response formats
      const documentsList = Array.isArray(docs) ? docs : (docs.documents || docs.data || []);
      setDocuments(documentsList);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  }, [id]);

  // Extract participants from PP fields
  const extractParticipantsFromPP = (exchange: Exchange) => {
    const ppParticipants: any[] = [];
    const ex = exchange as any;
    
    // Extract Client from PP fields
    if (ex.clientVesting || ex.client_vesting) {
      ppParticipants.push({
        firstName: ex.clientVesting || ex.client_vesting,
        lastName: '',
        role: 'client',
        email: '',
        title: ex.clientSignatoryTitle || ex.client_signatory_title || '',
        fromPP: true
      });
    }
    
    // Extract REL Settlement Agent with escrow number
    if (ex.relSettlementAgent || ex.rel_settlement_agent || ex.settlementAgent || ex.settlement_agent) {
      ppParticipants.push({
        firstName: ex.relSettlementAgent || ex.rel_settlement_agent || ex.settlementAgent || ex.settlement_agent,
        lastName: `(Escrow: ${ex.relEscrowNumber || ex.rel_escrow_number || 'N/A'})`,
        role: 'rel_escrow',
        email: '',
        fromPP: true
      });
    }
    
    // Extract REP Settlement Agent with escrow number
    if (ex.rep1SettlementAgent || ex.rep_1_settlement_agent) {
      ppParticipants.push({
        firstName: ex.rep1SettlementAgent || ex.rep_1_settlement_agent,
        lastName: `(Escrow: ${ex.rep1EscrowNumber || ex.rep_1_escrow_number || 'N/A'})`,
        role: 'rep_escrow',
        email: '',
        fromPP: true
      });
    }
    
    // Extract Buyers
    if (ex.buyer1Name || ex.buyer_1_name) {
      ppParticipants.push({
        firstName: ex.buyer1Name || ex.buyer_1_name,
        lastName: '',
        role: 'buyer',
        fromPP: true
      });
    }
    
    if (ex.buyer2Name || ex.buyer_2_name) {
      ppParticipants.push({
        firstName: ex.buyer2Name || ex.buyer_2_name,
        lastName: '',
        role: 'buyer',
        fromPP: true
      });
    }
    
    // Extract Sellers
    if (ex.rep1Seller1Name || ex.rep_1_seller_1_name) {
      ppParticipants.push({
        firstName: ex.rep1Seller1Name || ex.rep_1_seller_1_name,
        lastName: '',
        role: 'seller',
        fromPP: true
      });
    }
    
    if (ex.rep1Seller2Name || ex.rep_1_seller_2_name) {
      ppParticipants.push({
        firstName: ex.rep1Seller2Name || ex.rep_1_seller_2_name,
        lastName: '',
        role: 'seller',
        fromPP: true
      });
    }
    
    // Extract Referral Source
    if (ex.referralSource || ex.referral_source) {
      ppParticipants.push({
        firstName: ex.referralSource || ex.referral_source,
        lastName: '',
        role: 'referral',
        email: ex.referralSourceEmail || ex.referral_source_email || '',
        fromPP: true
      });
    }
    
    // Extract Internal Credit
    if (ex.internalCreditTo || ex.internal_credit_to) {
      ppParticipants.push({
        firstName: ex.internalCreditTo || ex.internal_credit_to,
        lastName: '',
        role: 'internal_credit',
        fromPP: true
      });
    }
    
    // Extract Bank
    if (ex.bank) {
      ppParticipants.push({
        firstName: ex.bank,
        lastName: '',
        role: 'bank',
        fromPP: true
      });
    }
    
    return ppParticipants;
  };
  
  // Auto-determine stage from PP fields
  const determineStageFromPP = (exchange: Exchange): string => {
    const ex = exchange as any;
    
    // Check if exchange is completed
    if (ex.status === 'COMPLETED' || ex.status === 'Completed') {
      return 'COMPLETED';
    }
    
    // Check if 180-day deadline has passed
    const day180 = ex.day180 || ex.day_180;
    if (day180) {
      const deadline180 = new Date(day180);
      if (new Date() > deadline180) {
        return 'TERMINATED';
      }
    }
    
    // Check if properties have been identified
    if (ex.identified === true || ex.identified === 'true' || ex.identified === 'Yes') {
      // Check if we're past 45-day deadline
      const day45 = ex.day45 || ex.day_45;
      if (day45) {
        const deadline45 = new Date(day45);
        if (new Date() > deadline45) {
          return '180D'; // In 180-day period
        } else {
          return '45D'; // Still in 45-day identification period
        }
      }
      return '180D'; // Properties identified, assume in 180-day period
    }
    
    // Check if exchange has started (proceeds received)
    if (ex.dateProceedsReceived || ex.date_proceeds_received) {
      return '45D'; // Started but not yet identified
    }
    
    // Default to pending
    return 'PENDING';
  };
  
  const loadParticipants = useCallback(async (exchangeData?: Exchange | null) => {
    if (!id) return;
    try {
      console.log('📥 Loading participants for exchange:', id);
      const response = await apiService.get(`/exchanges/${id}/participants`);
      let participantsList = Array.isArray(response) ? response : (response.participants || response.data || []);
      
      // Check for coordinator by @peakexchange.com email
      participantsList = participantsList.map((p: any) => {
        if (p.email && p.email.includes('@peakexchange.com')) {
          return { ...p, role: 'coordinator' };
        }
        return p;
      });
      
      // If exchange data is provided or available in state, extract PP participants
      const exchangeToUse = exchangeData || exchange;
      if (exchangeToUse) {
        const ppParticipants = extractParticipantsFromPP(exchangeToUse);
        // Merge PP participants with API participants
        const mergedParticipants = [...participantsList, ...ppParticipants];
        console.log('✅ Loaded participants with PP data:', mergedParticipants);
        setParticipants(mergedParticipants);
      } else {
        console.log('✅ Loaded participants:', participantsList);
        setParticipants(participantsList);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
    }
  }, [id]);

  const loadExchange = useCallback(async () => {
    if (!id) {
      console.error('No exchange ID provided');
      setError('Invalid exchange ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load exchange data with validation
      const data = await getExchange(id);
      if (!data) {
        throw new Error('Exchange not found');
      }

      // Validate required fields
      if (!data.exchangeNumber && !data.id) {
        throw new Error('Invalid exchange data: Missing exchange number or ID');
      }

      // Process and validate dates while maintaining string format
      const validatedData = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        completionDeadline: data.completionDeadline || undefined,
        identificationDeadline: data.identificationDeadline || undefined,
        day_45: data.day_45 ? (new Date(data.day_45).toString() !== 'Invalid Date' ? data.day_45 : undefined) : undefined,
        day_180: data.day_180 ? (new Date(data.day_180).toString() !== 'Invalid Date' ? data.day_180 : undefined) : undefined
      };

      // Validate date strings
      const dateFields = ['createdAt', 'updatedAt', 'completionDeadline', 'identificationDeadline', 'day_45', 'day_180'] as const;
      type DateField = typeof dateFields[number];
      
      dateFields.forEach((field: DateField) => {
        const value = validatedData[field];
        if (value && new Date(value).toString() === 'Invalid Date') {
          console.warn(`Invalid date for field: ${field}, setting to undefined`);
          validatedData[field as keyof typeof validatedData] = undefined;
        }
      });

      setExchange(validatedData);

      // Load associated data in parallel with error handling
      await Promise.allSettled([
        loadDocuments().catch(err => {
          console.error('Error loading documents:', err);
          setDocuments([]);
        }),
        loadParticipants(validatedData).catch(err => {
          console.error('Error loading participants:', err);
          setParticipants([]);
        })
      ]);

    } catch (error: any) {
      console.error('Error loading exchange:', error);
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.error('Exchange does not exist:', id);
      }
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.error('Authentication required. Please log in.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, getExchange, loadDocuments, loadParticipants]);
  
  useEffect(() => {
    if (id) {
      loadExchange();
      // Join the exchange room for real-time updates
      joinExchange(id);
    }
    
    // Cleanup when component unmounts or exchange changes
    return () => {
      if (id) {
        leaveExchange(id);
      }
    };
  }, [id, joinExchange, leaveExchange, loadExchange]);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleParticipantAdded = (data: any) => {
      console.log('🔥 Participant added:', data);
      if (data.exchangeId === id) {
        loadParticipants(exchange || undefined); // Reload participants
      }
    };

    const handleParticipantRemoved = (data: any) => {
      console.log('🔥 Participant removed:', data);
      if (data.exchangeId === id) {
        loadParticipants(exchange || undefined); // Reload participants
      }
    };

    const handleDocumentUploaded = (data: any) => {
      console.log('🔥 Document uploaded:', data);
      if (data.exchangeId === id) {
        loadDocuments(); // Reload documents
      }
    };

    const handleTaskCreated = (data: any) => {
      console.log('🔥 Task created:', data);
      if (data.exchangeId === id) {
        // The EnhancedTaskManager will handle its own real-time updates
        // but we could trigger a refresh here if needed
      }
    };

    const handleTaskUpdated = (data: any) => {
      console.log('🔥 Task updated:', data);
      if (data.exchangeId === id) {
        // The EnhancedTaskManager will handle its own real-time updates
        // but we could trigger a refresh here if needed
      }
    };

    const handleTaskDeleted = (data: any) => {
      console.log('🔥 Task deleted:', data);
      if (data.exchangeId === id) {
        // The EnhancedTaskManager will handle its own real-time updates
        // but we could trigger a refresh here if needed
      }
    };

    // Listen for real-time events
    socket.on('participant_added', handleParticipantAdded);
    socket.on('participant_removed', handleParticipantRemoved);
    socket.on('document_uploaded', handleDocumentUploaded);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('exchange_updated', () => {
      console.log('🔥 Exchange updated, reloading...');
      loadExchange();
    });

    // Cleanup event listeners
    return () => {
      socket.off('participant_added', handleParticipantAdded);
      socket.off('participant_removed', handleParticipantRemoved);
      socket.off('document_uploaded', handleDocumentUploaded);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('exchange_updated');
    };
  }, [socket, id, loadParticipants, loadDocuments, loadExchange]);


  const handleDocumentUploadSuccess = async () => {
    await loadDocuments();
    setShowUploadModal(false);
  };

  const handleDocumentDownload = async (doc: any) => {
    try {
      const blob = await apiService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = doc.original_filename || doc.originalFilename || doc.filename || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!id || !(isAdmin() || isCoordinator())) {
      alert('You do not have permission to remove participants from this exchange.');
      return;
    }
    
    // Enhanced confirmation dialog for coordinators and admins
    const userRole = isAdmin() ? 'Administrator' : 'Coordinator';
    const confirmMessage = `⚠️ REMOVE PARTICIPANT CONFIRMATION ⚠️\n\n` +
      `You are about to remove "${participantName}" from this exchange.\n\n` +
      `This action will:\n` +
      `• Remove their access to exchange documents\n` +
      `• Remove their access to exchange messages\n` +
      `• Remove their ability to participate in this exchange\n\n` +
      `Acting as: ${userRole}\n\n` +
      `This action cannot be undone. Are you sure you want to proceed?`;
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      console.log(`🗑️ Removing participant ${participantId} (${participantName}) from exchange ${id}`);
      
      const response = await apiService.delete(`/exchanges/${id}/participants/${participantId}`);
      
      if (response.success) {
        console.log(`✅ Successfully removed ${participantName} from exchange`);
        // Reload participants to update the list
        await loadParticipants(exchange || undefined);
        // Show success message
        alert(`Successfully removed ${participantName} from the exchange`);
      } else {
        throw new Error(response.message || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('❌ Error removing participant:', error);
      alert(`Failed to remove ${participantName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddParticipant = () => {
    // Switch to the invitations tab to add participants
    setActiveTab('invitations');
  };

  const handleSendMessage = (participant: any, fullName: string) => {
    // Switch to messages tab and pre-fill message
    setActiveTab('messages');
    // You could add logic here to focus on the message input and pre-fill @mention
    console.log(`📨 Opening message to ${fullName}:`, participant);
  };

  
  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </Layout>
    );
  }
  
  if (!exchange) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Exchange Not Found</h3>
          <p className="text-gray-600 mb-6">The exchange you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/exchanges')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Back to Exchanges
          </button>
        </div>
      </Layout>
    );
  }

  const getDaysUntilClosing = () => {
    if (!exchange.completionDeadline && !exchange.expectedClosingDate) return null;
    const closingDate = exchange.completionDeadline || exchange.expectedClosingDate;
    const closing = new Date(closingDate!);
    const today = new Date();
    const diffTime = closing.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntil = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilClosing = getDaysUntilClosing();
  const canManageInvitations = isAdmin() || isCoordinator();
  
  // Component to display all exchange fields
  const AllDetailsView = () => {
    const ex = exchange as any;
    
    // Define field type
    type FieldItem = {
      label: string;
      value: any;
      type?: string;
    };
    
    // Group fields by category
    const fieldGroups: Record<string, FieldItem[]> = {
      'Basic Information': [
        { label: 'Exchange ID', value: ex.id, type: undefined },
        { label: 'Exchange Number', value: ex.exchangeNumber || ex.exchange_number, type: undefined },
        { label: 'Name', value: ex.ppDisplayName || ex.pp_display_name || ex.name, type: undefined },
        { label: 'Status', value: ex.status, type: undefined },
        { label: 'Type of Exchange', value: ex.typeOfExchange || ex.type_of_exchange || ex.exchangeType || ex.exchange_type, type: undefined },
        { label: 'Bank', value: ex.bank, type: undefined },
        { label: 'Priority', value: ex.priority, type: undefined },
        { label: 'Active', value: ex.isActive || ex.is_active ? 'Yes' : 'No', type: undefined }
      ],
      'Financial Information': [
        { label: 'Proceeds', value: ex.proceeds, type: 'currency' },
        { label: 'Relinquished Property Value', value: ex.rel_value || ex.relinquishedPropertyValue || ex.relinquished_property_value, type: 'currency' },
        { label: 'Replacement Property Value', value: ex.rep_1_sale_price || ex.replacementPropertyValue || ex.replacement_property_value, type: 'currency' },
        { label: 'Exchange Value', value: ex.relinquished_property_value || ex.relinquishedPropertyValue || 0, type: 'currency' },
        { label: 'Cash Boot', value: ex.cashBoot || ex.cash_boot, type: 'currency' },
        { label: 'Financing Amount', value: ex.financingAmount || ex.financing_amount, type: 'currency' },
        { label: 'Profitability', value: ex.profitability, type: 'currency' }
      ],
      'Important Dates': [
        { label: 'Close of Escrow Date', value: ex.close_of_escrow_date, type: 'date' },
        { label: 'Date Proceeds Received', value: ex.date_proceeds_received, type: 'date' },
        { label: 'Day 45', value: ex.day_45, type: 'date' },
        { label: 'Day 180', value: ex.day_180, type: 'date' },
        { label: 'Relinquished Contract Date', value: ex.rel_contract_date, type: 'date' },
        { label: 'Replacement Close Date', value: ex.rep_1_close_date, type: 'date' },
        { label: 'Sale Date', value: ex.saleDate || ex.sale_date, type: 'date' },
        { label: 'Identification Deadline (45-Day)', value: ex.identificationDeadline || ex.identification_deadline || ex.day_45, type: 'date' },
        { label: 'Exchange Deadline (180-Day)', value: ex.exchangeDeadline || ex.exchange_deadline || ex.day_180, type: 'date' },
        { label: 'Created At', value: ex.createdAt || ex.created_at, type: 'datetime' },
        { label: 'Updated At', value: ex.updatedAt || ex.updated_at, type: 'datetime' }
      ],
      'Compliance & Risk': [
        { label: 'Compliance Status', value: ex.complianceStatus || ex.compliance_status, type: undefined },
        { label: 'Risk Level', value: ex.riskLevel || ex.risk_level, type: undefined },
        { label: 'On Track', value: ex.onTrack || ex.on_track ? 'Yes' : 'No', type: undefined },
        { label: 'Lifecycle Stage', value: ex.lifecycleStage || ex.lifecycle_stage, type: undefined },
        { label: 'Workflow Stage', value: ex.workflowStage || ex.workflow_stage, type: undefined },
        { label: 'Stage Progress', value: ex.stageProgress || ex.stage_progress, type: 'percentage' },
        { label: 'Days in Current Stage', value: ex.daysInCurrentStage || ex.days_in_current_stage, type: undefined },
        { label: 'Completion Percentage', value: ex.completionPercentage || ex.completion_percentage, type: 'percentage' }
      ],
      'Relinquished Property': [
        { label: 'Address', value: ex.rel_property_address, type: undefined },
        { label: 'City', value: ex.rel_property_city, type: undefined },
        { label: 'State', value: ex.rel_property_state, type: undefined },
        { label: 'ZIP', value: ex.rel_property_zip, type: undefined },
        { label: 'APN', value: ex.rel_apn, type: undefined },
        { label: 'Escrow Number', value: ex.rel_escrow_number, type: undefined },
        { label: 'Value', value: ex.rel_value, type: 'currency' },
        { label: 'Contract Date', value: ex.rel_contract_date, type: 'date' }
      ],
      'Replacement Property #1': [
        { label: 'Address', value: ex.rep_1_address, type: undefined },
        { label: 'City', value: ex.rep_1_city, type: undefined },
        { label: 'State', value: ex.rep_1_state, type: undefined },
        { label: 'ZIP', value: ex.rep_1_zip, type: undefined },
        { label: 'APN', value: ex.rep_1_apn, type: undefined },
        { label: 'Escrow Number', value: ex.rep_1_escrow_number, type: undefined },
        { label: 'Sale Price', value: ex.rep_1_sale_price, type: 'currency' },
        { label: 'Close Date', value: ex.rep_1_close_date, type: 'date' }
      ],
      'Buyer Information': [
        { label: 'Buyer 1 Name', value: ex.buyer_1_name, type: undefined },
        { label: 'Buyer 2 Name', value: ex.buyer_2_name, type: undefined },
        { label: 'Client Vesting', value: ex.clientVesting || ex.client_vesting, type: undefined }
      ],
      'Communication': [
        { label: 'Chat Enabled', value: ex.chatEnabled || ex.chat_enabled ? 'Yes' : 'No', type: undefined },
        { label: 'Exchange Chat ID', value: ex.exchangeChatId || ex.exchange_chat_id, type: undefined },
        { label: 'Notifications Enabled', value: ex.notificationsEnabled || ex.notifications_enabled ? 'Yes' : 'No', type: undefined }
      ],
      'Additional Information': [
        { label: 'Notes', value: ex.notes, type: undefined },
        { label: 'Tags', value: Array.isArray(ex.tags) ? ex.tags.join(', ') : ex.tags, type: undefined },
        { label: 'Property Types', value: Array.isArray(ex.propertyTypes || ex.property_types) ? (ex.propertyTypes || ex.property_types).join(', ') : '', type: undefined },
        { label: 'Client ID', value: ex.clientId || ex.client_id, type: undefined },
        { label: 'Coordinator ID', value: ex.coordinatorId || ex.coordinator_id, type: undefined }
      ]
    };
    
    const formatFieldValue = (value: any, type?: string | undefined) => {
      if (value === null || value === undefined || value === '') return 'Not specified';
      
      switch (type) {
        case 'currency':
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        case 'date':
          return new Date(value).toLocaleDateString();
        case 'datetime':
          return new Date(value).toLocaleString();
        case 'percentage':
          return `${value}%`;
        default:
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
      }
    };
    
    return (
      <div className="space-y-6">
        {Object.entries(fieldGroups).map(([groupName, fields]) => (
          <div key={groupName} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{groupName}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field, index) => (
                <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">{field.label}:</span>
                  <span className="text-sm text-gray-900 text-right">
                    {formatFieldValue(field.value, field.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Essential tabs only - most info is now in smart cards
  const tabs = [
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(canManageInvitations ? [{ id: 'invitations', label: 'Invitations', icon: UserPlus }] : [])
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Enhanced Version Indicator - This confirms you're using the right component */}          
          {/* Clean Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/exchanges')}
                className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Exchanges
              </button>
              
              <div className="flex items-center gap-3">
                <StatusIndicator status={determineStageFromPP(exchange)} daysRemaining={daysUntilClosing || undefined} />
                
                {/* Open in New Tab Button */}
                <button
                  onClick={() => window.open(`/exchanges/${exchange.id}`, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                  title="Open this exchange in a new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </button>

                {/* Manage Users Button - Only visible to admin/coordinator */}
                {(isAdmin() || isCoordinator()) && (
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    title="Manage user permissions for this exchange"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Manage Users</span>
                  </button>
                )}
                
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Prominent Exchange Number Display */}
                <div className="flex items-start gap-4 mb-3">
                  {/* Only show PP Matter Number when available */}
                  {(exchange.ppMatterNumber || exchange.pp_matter_number) && (
                    <div className="text-white px-4 py-2 rounded-lg bg-blue-600">
                      <span className="text-2xl font-bold">
                        #{exchange.ppMatterNumber || exchange.pp_matter_number}
                      </span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      <span className="text-yellow-500">
                        {exchange.ppDisplayName || exchange.pp_display_name || exchange.name || getExchangeDisplayName(exchange)}
                      </span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      {((exchange.status as string) === 'COMPLETED' || (exchange.status as string) === 'Completed') && <span>✓ Completed Exchange</span>}
                      {/* Only show exchange ID if no PP Matter Number exists */}
                      {!(exchange.ppMatterNumber || exchange.pp_matter_number) && exchange.exchangeNumber && (
                        <span className="font-mono text-gray-400">ID: {exchange.exchangeNumber}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  {/* Google-style Participant Display */}
                  <div className="relative">
                    <ParticipantAvatars 
                      participants={participants} 
                      maxVisible={4} 
                      canManage={isAdmin() || isCoordinator()}
                      exchangeId={id}
                      onRemoveParticipant={handleRemoveParticipant}
                      onAddParticipant={handleAddParticipant}
                      onSendMessage={handleSendMessage}
                    />
                  </div>
                  
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(exchange.createdAt || '').toLocaleDateString()}
                  </span>
                  
                  {/* Exchange Type Badge */}
                  {(exchange.typeOfExchange || exchange.type_of_exchange) && (
                    <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      <Briefcase className="w-4 h-4 mr-1" />
                      {exchange.typeOfExchange || exchange.type_of_exchange}
                    </span>
                  )}
                  
                  {/* Property Type Badge */}
                  {(exchange.propertyType || exchange.property_type || exchange.relPropertyType) && (
                    <span className="flex items-center bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      <MapPin className="w-4 h-4 mr-1" />
                      {exchange.propertyType || exchange.property_type || exchange.relPropertyType}
                    </span>
                  )}
                  
                  {/* Exchange Value - Use actual proceeds */}
                  <span className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {(exchange as any).proceeds || (exchange as any).relValue || exchange.exchangeValue 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
                          (exchange as any).proceeds || (exchange as any).relValue || exchange.exchangeValue
                        )
                      : 'Value TBD'
                    }
                  </span>
                  
                  {/* Client Signatory Title */}
                  {(exchange.clientSignatoryTitle || exchange.client_signatory_title) && (
                    <span className="flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      <Users className="w-4 h-4 mr-1" />
                      {exchange.clientVesting || exchange.client_vesting || 
                       'Kicelian, Hector'}
                      {' - '}
                      {exchange.clientSignatoryTitle || exchange.client_signatory_title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

      

          {/* Key Metrics - Simplified */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrics removed as requested */}
          </div>

          {/* Full Timeline Display - FIRST for clear deadline visibility */}
          <div className="mb-6">
            <ExchangeTimeline
              startDate={(exchange as any).dateProceedsReceived || (exchange as any).date_proceeds_received || exchange.startDate || exchange.createdAt}
              identificationDeadline={(exchange as any).day45 || (exchange as any).day_45 || exchange.identificationDeadline}
              completionDeadline={(exchange as any).day180 || (exchange as any).day_180 || exchange.completionDeadline || exchange.exchangeDeadline}
              closeOfEscrowDate={(exchange as any).closeOfEscrowDate || (exchange as any).close_of_escrow_date}
              dateProceedsReceived={(exchange as any).dateProceedsReceived || (exchange as any).date_proceeds_received}
              propertiesIdentified={(exchange as any).identified === true || (exchange as any).identified === 'true' || (exchange as any).identified === 'Yes'}
              status={exchange.status}
              compact={false}
              showToday={true}
            />
          </div>

          {/* Exchange Stage Management - Collapsible stage progression */}
          <div className="mb-6">
            <ExchangeStageManager
              exchange={exchange}
              onRefresh={loadExchange}
              onStageChange={(newStage) => {
                console.log('Stage changed to:', newStage);
                loadExchange(); // Reload exchange data when stage changes
              }}
            />
          </div>

          {/* Quick Actions - Context-aware buttons based on status */}
          {exchange.status !== 'COMPLETED' && exchange.status !== 'Completed' && (
            <ExchangeQuickActions
              exchange={exchange}
              participants={participants}
              onRefresh={loadExchange}
              onShowUpload={() => setShowUploadModal(true)}
              onCreateTask={() => setShowCreateTaskModal(true)}
            />
          )}

          {/* Smart Expandable Cards */}
          <div className="space-y-4">
            <PropertiesCard exchange={exchange} />
            <FinancialCard exchange={exchange} />
            <PeopleCard exchange={exchange} participants={participants} />
            {/* Legal & Settlement removed per requirements */}
            {/* <LegalCard exchange={exchange} /> */}
          </div>

          {/* Essential Tabs Only */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 py-3 px-4 text-center font-medium text-sm transition-all
                      flex items-center justify-center space-x-2
                      ${activeTab === tab.id
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-6">
            {activeTab === 'tasks' && (
              <ModernTaskUI 
                exchangeId={exchange.id}
                initialView="list"
                onCreateClick={() => setShowCreateTaskModal(true)}
              />
            )}
            {activeTab === 'documents' && (
              <>
                <ExchangeDocuments 
                  exchangeId={exchange.id}
                  documents={documents} 
                  onUploadClick={() => setShowUploadModal(true)} 
                  onDownload={handleDocumentDownload}
                  onRefresh={loadDocuments}
                />
                {showUploadModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Upload Document</h3>
                        <button 
                          onClick={() => setShowUploadModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <EnhancedDocumentUploader 
                        exchangeId={exchange.id}
                        onUploadSuccess={handleDocumentUploadSuccess}
                        showPinProtection={true}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === 'messages' && <MessagesTab exchange={exchange} />}
            {activeTab === 'invitations' && canManageInvitations && (
              <EnhancedInvitationManager
                exchangeId={exchange.id}
                exchangeName={exchange.name || exchange.exchangeNumber}
                existingParticipants={[]}
                onParticipantAdded={() => {
                  // Refresh exchange data when new participants are added
                  loadExchange();
                }}
              />
            )}
            </div>
          </div>
        </div>
      </div>

      {/* User Management Modal */}
      {showUserManagement && (
        <ExchangeUserManagement
          exchangeId={id!}
          onClose={() => {
            setShowUserManagement(false);
            // Refresh participants when closing the modal
            loadParticipants(exchange || undefined);
          }}
        />
      )}

      {/* Task Creation Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
              <button 
                onClick={() => setShowCreateTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <TaskCreateModal 
                isOpen={showCreateTaskModal}
                exchangeId={exchange.id}
                onClose={() => setShowCreateTaskModal(false)}
                onTaskCreated={(task) => {
                  setShowCreateTaskModal(false);
                  // The ModernTaskUI component will automatically refresh
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ExchangeDetailEnhanced;