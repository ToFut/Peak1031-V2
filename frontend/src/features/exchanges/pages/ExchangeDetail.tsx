import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExchanges } from '../hooks/useExchanges';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import Layout from '../../../components/Layout';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  MessageSquare,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Upload,
  Download,
  Send,
  MoreVertical,
  Star,
  Shield,
  Zap,
  Building2,
  Target,
  Briefcase,
  Banknote
} from 'lucide-react';

// Tab Components
import { ExchangeOverview } from '../components/ExchangeOverview';
import { TasksList } from '../components/TasksList';
import { DocumentsList } from '../components/DocumentsList';
import { ExchangeTimeline } from '../components/ExchangeTimeline';
import TaskCreateModal from '../../tasks/components/TaskCreateModal';

interface TabProps {
  exchange: Exchange;
  onUpdate?: () => void;
}

const TimelineTab: React.FC<TabProps> = ({ exchange }) => {
  // Helper function to get custom field value from PP data
  const getCustomFieldValue = (fieldLabel: string) => {
    // Check multiple possible locations for PP custom field data
    const exchangeAny = exchange as any; // Type assertion for dynamic API fields
    let customFields = null;
    
    if (exchangeAny.pp_custom_field_values) {
      customFields = exchangeAny.pp_custom_field_values;
    } else if (exchangeAny.pp_data?.custom_field_values) {
      customFields = exchangeAny.pp_data.custom_field_values;
    } else if (exchangeAny.ppData?.custom_field_values) {
      customFields = exchangeAny.ppData.custom_field_values;
    } else if (exchange.practicePartnerData?.customFields) {
      customFields = exchange.practicePartnerData.customFields;
    }
    
    if (!customFields || !Array.isArray(customFields)) {
      console.log('No custom fields found for', fieldLabel);
      console.log('Available exchange data keys:', Object.keys(exchange));
      return null;
    }
    
    const field = customFields.find((f: any) => 
      f.custom_field_ref?.label === fieldLabel || f.label === fieldLabel
    );
    
    if (field) {
      console.log('Found field', fieldLabel, ':', field);
      return field?.value_date_time || field?.value_string || field?.value_number || field?.value_boolean || field?.value || null;
    }
    
    console.log('Field not found:', fieldLabel, 'Available fields:', customFields.map((f: any) => f.custom_field_ref?.label || f.label));
    return null;
  };
  
  // Extract timeline dates from PP custom fields or backend data
  const exchangeAny = exchange as any;
  const dateProceedsReceived = exchangeAny.dateProceedsReceived || exchangeAny.date_proceeds_received || getCustomFieldValue('Date Proceeds Received');
  const closeOfEscrowDate = exchangeAny.closeOfEscrowDate || exchangeAny.close_of_escrow_date || exchangeAny.relinquishedProperty?.closeDate || getCustomFieldValue('Close of Escrow Date');
  const day45Date = exchangeAny.day45 || exchangeAny.day_45 || exchangeAny.keyDates?.day45 || getCustomFieldValue('Day 45');
  const day180Date = exchangeAny.day180 || exchangeAny.day_180 || exchangeAny.keyDates?.day180 || getCustomFieldValue('Day 180');
  const isIdentified = exchangeAny.identified || getCustomFieldValue('Identified?') || false;
  
  console.log('Timeline data extracted:', {
    dateProceedsReceived,
    closeOfEscrowDate, 
    day45Date,
    day180Date,
    isIdentified
  });
  
  const [propertiesIdentified, setPropertiesIdentified] = useState<boolean>(
    exchange.metadata?.propertiesIdentified || isIdentified
  );

  const handleIdentifiedToggle = async () => {
    try {
      const newValue = !propertiesIdentified;
      setPropertiesIdentified(newValue);
      
      // Update the exchange metadata in the backend
      await apiService.updateExchange(exchange.id, {
        metadata: {
          ...exchange.metadata,
          propertiesIdentified: newValue
        }
      });
    } catch (error) {
      console.error('Error updating properties identified status:', error);
      setPropertiesIdentified(!propertiesIdentified); // Revert on error
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Enhanced Timeline Component */}
      <ExchangeTimeline
        startDate={exchange.startDate}
        identificationDeadline={day45Date || exchange.identificationDeadline}
        completionDeadline={day180Date || exchange.completionDeadline}
        closeOfEscrowDate={closeOfEscrowDate || exchangeAny.closeOfEscrowDate}
        dateProceedsReceived={dateProceedsReceived || exchangeAny.dateProceedsReceived}
        status={exchange.status}
        propertiesIdentified={propertiesIdentified}
        showToday={true}
      />
      
      {/* Properties Identification Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Properties Status
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Replacement Properties</p>
            <p className="text-lg font-medium text-gray-900">
              {propertiesIdentified ? 'Identified' : 'Not Yet Identified'}
            </p>
          </div>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={propertiesIdentified}
              onChange={handleIdentifiedToggle}
              className="sr-only"
            />
            <div className={`
              w-14 h-7 rounded-full transition-colors duration-200 ease-in-out
              ${propertiesIdentified ? 'bg-green-500' : 'bg-gray-300'}
            `}>
              <div className={`
                w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
                ${propertiesIdentified ? 'translate-x-7' : 'translate-x-0.5'}
              `} />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              Mark as Identified
            </span>
          </label>
        </div>
        
        {propertiesIdentified && exchange.replacementProperties && exchange.replacementProperties.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Identified Properties:</p>
            <div className="space-y-2">
              {exchange.replacementProperties.map((prop: any, index: number) => (
                <div key={index} className="text-sm text-gray-600">
                  • {prop.address} - ${prop.purchasePrice?.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Exchange Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Exchange Progress
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{exchange.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${exchange.progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertiesTab: React.FC<TabProps> = ({ exchange }) => {
  // Helper function to get custom field value from PP data
  const getCustomFieldValue = (fieldLabel: string) => {
    // Check multiple possible locations for PP custom field data
    const exchangeAny = exchange as any; // Type assertion for dynamic API fields
    let customFields = null;
    
    if (exchangeAny.pp_custom_field_values) {
      customFields = exchangeAny.pp_custom_field_values;
    } else if (exchangeAny.pp_data?.custom_field_values) {
      customFields = exchangeAny.pp_data.custom_field_values;
    } else if (exchangeAny.ppData?.custom_field_values) {
      customFields = exchangeAny.ppData.custom_field_values;
    } else if (exchange.practicePartnerData?.customFields) {
      customFields = exchange.practicePartnerData.customFields;
    }
    
    if (!customFields || !Array.isArray(customFields)) {
      console.log('No custom fields found for', fieldLabel);
      console.log('Available exchange data keys:', Object.keys(exchange));
      return null;
    }
    
    const field = customFields.find((f: any) => 
      f.custom_field_ref?.label === fieldLabel || f.label === fieldLabel
    );
    
    if (field) {
      console.log('Found field', fieldLabel, ':', field);
      return field?.value_date_time || field?.value_string || field?.value_number || field?.value_boolean || field?.value || null;
    }
    
    console.log('Field not found:', fieldLabel, 'Available fields:', customFields.map((f: any) => f.custom_field_ref?.label || f.label));
    return null;
  };
  
  // Extract date variables for timeline - Updated to use correct PP field names
  const exchangeAny = exchange as any;
  const dateProceedsReceived = getCustomFieldValue('Date Proceeds Received') || exchangeAny?.dateProceedsReceived || exchangeAny?.date_proceeds_received;
  const closeOfEscrowDate = getCustomFieldValue('Close of Escrow Date') || exchangeAny?.closeOfEscrowDate || exchangeAny?.close_of_escrow_date || exchangeAny?.relinquishedProperty?.closeDate;
  const day45Date = getCustomFieldValue('Day 45') || exchangeAny?.day45 || exchangeAny?.day_45 || exchangeAny?.keyDates?.day45;
  const day180Date = getCustomFieldValue('Day 180') || exchangeAny?.day180 || exchangeAny?.day_180 || exchangeAny?.keyDates?.day180;
  
  const isIdentified = getCustomFieldValue('Identified?') || false;
  
  const [propertiesIdentified, setPropertiesIdentified] = useState<boolean>(
    exchange.metadata?.propertiesIdentified || isIdentified
  );

  const handleIdentifiedToggle = async () => {
    try {
      const newValue = !propertiesIdentified;
      setPropertiesIdentified(newValue);
      
      // Update the exchange metadata in the backend
      await apiService.updateExchange(exchange.id, {
        metadata: {
          ...exchange.metadata,
          propertiesIdentified: newValue
        }
      });
    } catch (error) {
      console.error('Error updating properties identified status:', error);
      setPropertiesIdentified(!propertiesIdentified); // Revert on error
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Relinquished Property */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-red-600" />
          Relinquished Property
        </h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Rel Property Address') || 
                 exchange.relinquishedPropertyAddress || 
                 exchange.rel_property_address || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Value</p>
              <p className="font-medium text-gray-900">
                ${(getCustomFieldValue('Rel Value (USD)') || 
                   exchange.relinquishedSalePrice || 
                   exchange.rel_value || 
                   exchange.relinquishedValue || 0).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">APN</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Rel APN') || exchange.rel_apn || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Settlement Agent</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Rel Settlement Agent') || exchange.rel_settlement_agent || 'Not specified'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Property Type</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Property Type') || exchange.rel_property_type || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contract Date</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Rel Contract Date') ? 
                  new Date(getCustomFieldValue('Rel Contract Date')).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Replacement Properties Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-green-600" />
            Replacement Properties
          </h3>
          
          {/* Identified Toggle */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={propertiesIdentified}
              onChange={handleIdentifiedToggle}
              className="sr-only"
            />
            <div className={`
              w-14 h-7 rounded-full transition-colors duration-200 ease-in-out
              ${propertiesIdentified ? 'bg-green-500' : 'bg-gray-300'}
            `}>
              <div className={`
                w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
                ${propertiesIdentified ? 'translate-x-7' : 'translate-x-0.5'}
              `} />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              Properties Identified
            </span>
          </label>
        </div>
        
        {propertiesIdentified ? (
          <div className="space-y-3">
            {exchange.replacementProperties && exchange.replacementProperties.length > 0 ? (
              exchange.replacementProperties.map((prop: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{prop.address}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Purchase Price: ${prop.purchasePrice?.toLocaleString()}
                      </p>
                      {prop.closingDate && (
                        <p className="text-sm text-gray-600">
                          Closing: {new Date(prop.closingDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Properties have been identified but details are not available yet.
                </p>
              </div>
            )}
            
            {/* Replacement Property Details from PP data */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Replacement Property Details:</p>
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <p className="font-medium text-gray-900">
                      {getCustomFieldValue('Rep 1 Property Address') || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                    <p className="font-medium text-gray-900">
                      ${(getCustomFieldValue('Rep 1 Value (USD)') || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">APN</p>
                    <p className="text-sm text-gray-700">
                      {getCustomFieldValue('Rep 1 APN') || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Settlement Agent</p>
                    <p className="text-sm text-gray-700">
                      {getCustomFieldValue('Rep 1 Settlement Agent') || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contract Date</p>
                    <p className="text-sm text-gray-700">
                      {getCustomFieldValue('Rep 1 Purchase Contract Date') ? 
                        new Date(getCustomFieldValue('Rep 1 Purchase Contract Date')).toLocaleDateString() : 
                        'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Escrow Number</p>
                    <p className="text-sm text-gray-700">
                      {getCustomFieldValue('Rep 1 Escrow Number') || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">
              Replacement properties have not yet been identified. The deadline is approaching.
            </p>
          </div>
        )}
      </div>
      
      {/* Financial Details Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Financial Details
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Proceeds & Banking */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Proceeds & Banking</h4>
            <div>
              <p className="text-sm text-gray-600">Bank</p>
              <p className="font-medium text-gray-900">
                {getCustomFieldValue('Bank') || exchange.bank || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Proceeds</p>
              <p className="text-lg font-bold text-green-600">
                ${(getCustomFieldValue('Proceeds (USD)') || exchange.proceeds || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date Proceeds Received</p>
              <p className="font-medium text-gray-900">
                {dateProceedsReceived ? 
                  new Date(dateProceedsReceived).toLocaleDateString() : 
                  'Not specified'}
              </p>
            </div>
          </div>
          
          {/* Key Dates */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Key Dates</h4>
            <div>
              <p className="text-sm text-gray-600">Close of Escrow</p>
              <p className="font-medium text-gray-900">
                {closeOfEscrowDate ? 
                  new Date(closeOfEscrowDate).toLocaleDateString() : 
                  'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Day 45</p>
              <p className="font-medium text-gray-900">
                {day45Date ? new Date(day45Date).toLocaleDateString() : 'Not calculated'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Day 180</p>
              <p className="font-medium text-gray-900">
                {day180Date ? new Date(day180Date).toLocaleDateString() : 'Not calculated'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Value Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Property Value Summary
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Relinquished</p>
            <p className="text-xl font-bold text-gray-900">
              ${(getCustomFieldValue('Rel Value (USD)') || exchange.relinquishedValue || exchange.rel_value || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Replacement</p>
            <p className="text-xl font-bold text-gray-900">
              ${(getCustomFieldValue('Rep 1 Value (USD)') || exchange.replacementValue || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Exchange Value</p>
            <p className="text-xl font-bold text-blue-600">
              ${(getCustomFieldValue('Rep 1 Value (USD)') || exchange.exchangeValue || exchange.exchange_value || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesTab: React.FC<TabProps> = ({ exchange }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    loadMessages();
  }, [exchange.id]);
  
  const loadMessages = async () => {
    try {
      const msgs = await apiService.getMessages(exchange.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await apiService.sendMessage(exchange.id, newMessage);
      setNewMessage('');
      loadMessages(); // Reload messages
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-xl"></div>;
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="h-[600px] flex flex-col">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg px-4 py-3 rounded-2xl ${
                    message.senderId === user?.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Message input */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExchangeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getExchange } = useExchanges();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ppData, setPpData] = useState<any>(null);
  const [loadingPpData, setLoadingPpData] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Helper function to get custom field value
  const getCustomFieldValue = (fieldLabel: string) => {
    if (!exchange) return null;
    const exchangeAny = exchange as any;
    
    // Check direct fields first - Updated with complete PP field mappings
    const fieldMap: Record<string, string> = {
      'Type of Exchange': 'type_of_exchange',
      'Property Type': 'property_type', 
      'Client 1 Signatory Title': 'client_signatory_title',
      'Bank': 'bank',
      'Proceeds (USD)': 'proceeds',
      'Date Proceeds Received': 'date_proceeds_received',
      'Close of Escrow Date': 'close_of_escrow_date',
      'Day 45': 'day_45',
      'Day 180': 'day_180',
      'Rel Settlement Agent': 'rel_settlement_agent',
      'Rel Escrow Number': 'rel_escrow_number',
      'Rel Property Address': 'rel_property_address',
      'Rel APN': 'rel_apn',
      'Rel Value (USD)': 'rel_value',
      'Rel Contract Date': 'rel_contract_date',
      'Expected Rel Closing Date': 'expected_rel_closing_date',
      'Rep 1 Settlement Agent': 'rep_1_settlement_agent',
      'Rep 1 Escrow Number': 'rep_1_escrow_number',
      'Rep 1 Property Address': 'rep_1_property_address',
      'Rep 1 Address': 'rep_1_property_address', // Alias
      'Rep 1 APN': 'rep_1_apn',
      'Rep 1 Value (USD)': 'rep_1_value',
      'Rep 1 Purchase Price': 'rep_1_value', // Alias
      'Rep 1 Purchase Contract Date': 'rep_1_purchase_contract_date',
      'Rep 1 Contract Date': 'rep_1_purchase_contract_date', // Alias
      'Referral Source': 'referral_source',
      'Referral Source Email': 'referral_source_email',
      'Internal Credit To': 'internal_credit_to',
      'Assigned To': 'assigned_to',
      'Buyer 1 Name': 'buyer_1_name',
      'Buyer 2 Name': 'buyer_2_name',
      'Buyer Vesting': 'buyer_vesting',
      'Rep 1 Seller 1 Name': 'rep_1_seller_1_name',
      'Rep 1 Seller 2 Name': 'rep_1_seller_2_name',
      'Rep 1 Seller Vesting': 'rep_1_seller_vesting',
      'Client Vesting': 'client_vesting',
      'Interest Check Sent': 'interest_check_sent',
      'Bank Referral?': 'bank_referral',
      'Identified?': 'identified',
      'Failed Exchange?': 'failed_exchange',
      'Matter Number': 'matter_number',
      'Receipt Drafted On': 'receipt_drafted_on',
      'Rep 1 Docs Drafted On': 'rep_1_docs_drafted_on',
      'Exchange Agreement Drafted On': 'exchange_agreement_drafted_on'
    };
    
    const directField = fieldMap[fieldLabel];
    if (directField && exchangeAny[directField]) {
      return exchangeAny[directField];
    }
    
    // Check PP custom fields - Enhanced to handle multiple data structures
    let customFields = null;
    
    if (exchangeAny.pp_custom_field_values) {
      customFields = exchangeAny.pp_custom_field_values;
    } else if (exchangeAny.pp_data?.custom_field_values) {
      customFields = exchangeAny.pp_data.custom_field_values;
    } else if (exchangeAny.ppData?.custom_field_values) {
      customFields = exchangeAny.ppData.custom_field_values;
    } else if (exchangeAny.practicePartnerData?.customFields) {
      customFields = exchangeAny.practicePartnerData.customFields;
    }
    
    if (customFields && Array.isArray(customFields)) {
      const field = customFields.find((f: any) => 
        f.custom_field_ref?.label === fieldLabel || 
        f.label === fieldLabel ||
        f.field_label === fieldLabel
      );
      
      if (field) {
        // Handle different value types from PP
        const value = field.value_date_time || 
                     field.value_string || 
                     field.value_number || 
                     field.value_boolean || 
                     field.value || 
                     field.contact_ref?.display_name ||
                     field.display_name;
        
        console.log(`Found PP field "${fieldLabel}":`, value);
        return value;
      }
    }
    
    return null;
  };
  
  // Determine exchange stage based on PP fields
  const determineStageFromPP = () => {
    if (!exchange) return 'pending';
    const exchangeAny = exchange as any;
    
    // Check for failed exchange
    const failedExchange = exchangeAny.failedExchange || getCustomFieldValue('Failed Exchange?');
    if (failedExchange === 'Yes' || failedExchange === true || failedExchange === 'true') {
      return 'CANCELLED';
    }
    
    // Get key dates from backend or PP custom fields
    const day180 = exchangeAny.day180 || exchangeAny.keyDates?.day180 || getCustomFieldValue('Day 180');
    const day45 = exchangeAny.day45 || exchangeAny.keyDates?.day45 || getCustomFieldValue('Day 45');
    const proceedsReceived = exchangeAny.dateProceedsReceived || getCustomFieldValue('Date Proceeds Received');
    const closeOfEscrow = exchangeAny.closeOfEscrowDate || exchangeAny.relinquishedProperty?.closeDate || getCustomFieldValue('Close of Escrow Date');
    const identified = exchangeAny.identified || getCustomFieldValue('Identified?');
    const rep1Docs = exchangeAny.rep1DocsDraftedOn || getCustomFieldValue('Rep 1 Docs Drafted on');
    const relContract = exchangeAny.relContractDate || exchangeAny.relinquishedProperty?.contractDate || getCustomFieldValue('Rel Contract Date');
    const exchangeAgreement = exchangeAny.exchangeAgreementDrafted || exchangeAny.relinquishedProperty?.exchangeAgreementDrafted || getCustomFieldValue('Exchange Agreement Drafted');
    
    const now = new Date();
    
    // Check stages in order
    if (day180 && new Date(day180) < now) {
      return 'COMPLETED';
    }
    
    if (rep1Docs) {
      return 'under_contract';
    }
    
    if (identified === 'Yes' || identified === true || identified === 'true') {
      return 'property_identified';
    }
    
    if (day45 && new Date(day45) < now) {
      return 'identification_open';
    }
    
    if (proceedsReceived) {
      return 'funds_received';
    }
    
    if (closeOfEscrow) {
      return 'exchange_created';
    }
    
    if (relContract) {
      return 'started';
    }
    
    return exchange?.status || 'PENDING';
  };
  
  // Extract all participants with correct roles
  const extractParticipants = () => {
    if (!exchange) return [];
    const participants: any[] = [];
    const exchangeAny = exchange as any;
    
    // Extract client from PP data
    const clientVesting = exchangeAny.clientVesting || exchangeAny.relinquishedProperty?.clientVesting || getCustomFieldValue('Client Vesting');
    if (clientVesting) {
      participants.push({
        display_name: clientVesting,
        role: 'Client',
        email: exchange.client?.email,
        signatory_title: exchangeAny.clientSignatoryTitle || getCustomFieldValue('Client 1 Signatory Title'),
        type: 'primary'
      });
    } else if (exchange.client) {
      participants.push({
        display_name: `${exchange.client.firstName} ${exchange.client.lastName}`,
        role: 'Client',
        email: exchange.client.email,
        type: 'primary'
      });
    }
    
    // Extract assigned user/coordinator - check email domain for Peak Exchange
    const assignedTo = exchangeAny.assignedTo || getCustomFieldValue('Assigned To');
    if (assignedTo) {
      const email = exchangeAny.practicePartnerData?.assignedUsers?.[0]?.email_address || 
                   exchangeAny.ppData?.assigned_to_users?.[0]?.email_address;
      const isCoordinator = email?.includes('@peakexchange.com');
      participants.push({
        display_name: assignedTo,
        role: isCoordinator ? 'Coordinator' : 'Assigned User',
        email: email,
        type: 'internal'
      });
    } else if (exchange.coordinator) {
      // Fall back to coordinator from backend
      const coord = exchange.coordinator as any;
      participants.push({
        display_name: `${coord.firstName || coord.first_name} ${coord.lastName || coord.last_name}`,
        role: 'Coordinator',
        email: coord.email,
        type: 'internal'
      });
    }
    
    // Extract referral source
    const referral = exchangeAny.referralSource || getCustomFieldValue('Referral Source');
    if (referral) {
      participants.push({
        display_name: referral,
        role: 'Referral',
        email: exchangeAny.referralSourceEmail || getCustomFieldValue('Referral Source Email'),
        type: 'referral'
      });
    }
    
    // Extract REL settlement agent
    const relAgent = exchangeAny.relSettlementAgent || exchangeAny.settlementAgent || 
                    exchangeAny.relinquishedProperty?.settlementAgent || getCustomFieldValue('Rel Settlement Agent');
    if (relAgent) {
      participants.push({
        display_name: relAgent,
        role: 'REL Escrow',
        escrow_number: exchangeAny.relEscrowNumber || exchangeAny.relinquishedProperty?.escrowNumber || getCustomFieldValue('Rel Escrow Number'),
        type: 'escrow'
      });
    }
    
    // Extract REP settlement agent
    const repAgent = exchangeAny.rep1SettlementAgent || getCustomFieldValue('Rep 1 Settlement Agent');
    if (repAgent) {
      participants.push({
        display_name: repAgent,
        role: 'REP Escrow',
        escrow_number: exchangeAny.rep1EscrowNumber || getCustomFieldValue('Rep 1 Escrow Number'),
        type: 'escrow'
      });
    }
    
    // Extract buyers from PP data
    const buyer1 = exchangeAny.buyer1Name || exchangeAny.relinquishedProperty?.buyer1Name || getCustomFieldValue('Buyer 1 Name');
    const buyer2 = exchangeAny.buyer2Name || exchangeAny.relinquishedProperty?.buyer2Name || getCustomFieldValue('Buyer 2 Name');
    
    if (buyer1) {
      participants.push({
        display_name: buyer1,
        role: 'Buyer',
        type: 'transaction'
      });
    }
    
    if (buyer2 && buyer2 !== buyer1) {
      participants.push({
        display_name: buyer2,
        role: 'Buyer',
        type: 'transaction'
      });
    }
    
    // Extract sellers
    const seller1 = exchangeAny.rep1Seller1Name || getCustomFieldValue('Rep 1 Seller 1 Name');
    const seller2 = exchangeAny.rep1Seller2Name || getCustomFieldValue('Rep 1 Seller 2 Name');
    
    if (seller1) {
      participants.push({
        display_name: seller1,
        role: 'Seller',
        type: 'transaction'
      });
    }
    
    if (seller2 && seller2 !== seller1) {
      participants.push({
        display_name: seller2,
        role: 'Seller',
        type: 'transaction'
      });
    }
    
    // Extract bank contact
    const bank = exchangeAny.bank || getCustomFieldValue('Bank');
    const bankReferral = exchangeAny.bankReferral || getCustomFieldValue('Bank Referral?');
    if (bank) {
      participants.push({
        display_name: bank,
        role: 'Bank',
        is_referral: bankReferral === 'Yes' || bankReferral === true,
        type: 'financial'
      });
    }
    
    // Extract internal credit
    const internalCredit = exchangeAny.internalCreditTo || getCustomFieldValue('Internal Credit To');
    if (internalCredit) {
      participants.push({
        display_name: internalCredit,
        role: 'Internal Credit',
        type: 'internal'
      });
    }
    
    return participants;
  };
  
  useEffect(() => {
    if (id) {
      loadExchange();
    }
  }, [id]);
  
  const loadExchange = async () => {
    try {
      setLoading(true);
      const data = await getExchange(id!);
      if (data) {
        console.log('🔍 Exchange Data Loaded:', data);
        console.log('🔍 PP Matter Number:', data.ppMatterNumber);
        console.log('🔍 Type of Exchange:', data.typeOfExchange);
        console.log('🔍 PP Data:', (data as any).ppData);
        console.log('🔍 Practice Partner Data:', (data as any).practicePartnerData);
        console.log('🔍 Relinquished Property:', data.relinquishedProperty);
        console.log('🔍 Key Dates:', data.keyDates);
        console.log('🔍 All Exchange Keys:', Object.keys(data));
        
        // Debug PP custom fields structure
        const exchangeAny = data as any;
        console.log('🔍 PP Custom Fields Debug:');
        console.log('  - pp_custom_field_values:', exchangeAny.pp_custom_field_values);
        console.log('  - pp_data?.custom_field_values:', exchangeAny.pp_data?.custom_field_values);
        console.log('  - ppData?.custom_field_values:', exchangeAny.ppData?.custom_field_values);
        console.log('  - practicePartnerData?.customFields:', exchangeAny.practicePartnerData?.customFields);
        
        // Sample a few fields to see structure
        if (exchangeAny.pp_data?.custom_field_values?.[0]) {
          console.log('🔍 Sample PP field structure:', exchangeAny.pp_data.custom_field_values[0]);
        }
        
        setExchange(data);
      }
      
      // Load tasks for this exchange
      loadTasks();
      
      // Load PP data in background (optional - remove if not using PP integration)
      // loadPPData();
    } catch (error) {
      console.error('Error loading exchange:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    
    try {
      setLoadingTasks(true);
      const response = await apiService.getTasksByExchange(id);
      console.log('📋 Exchange tasks loaded:', response);
      // The API returns the tasks array directly, not wrapped in a 'tasks' property
      setTasks(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading exchange tasks:', error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskCreated = (task: any) => {
    console.log('📋 Task created:', task);
    setShowTaskModal(false);
    loadTasks(); // Reload tasks to include the new one
  };
  
  const loadPPData = async () => {
    if (!id) return;
    
    setLoadingPpData(true);
    try {
      const response = await apiService.get(`/pp-data/exchange/${id}`);
      if (response.success) {
        setPpData(response.pp_data);
      }
    } catch (error) {
      console.log('Could not load PP data for exchange');
    } finally {
      setLoadingPpData(false);
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-gray-200 rounded-2xl h-96"></div>
        </div>
      </Layout>
    );
  }
  
  if (!exchange) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Exchange Not Found</h3>
          <button
            onClick={() => navigate('/exchanges')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Exchanges
          </button>
        </div>
      </Layout>
    );
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'properties', label: 'Properties', icon: MapPin },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];
  
  const getDaysUntilClosing = () => {
    if (!exchange.completionDeadline) return null;
    const closing = new Date(exchange.completionDeadline);
    const today = new Date();
    const diffTime = closing.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysUntilClosing = getDaysUntilClosing();
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Timeline */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/exchanges')}
                className="flex items-center text-blue-100 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Exchanges
              </button>
              
              {/* Display only PP Matter Number with Exchange Name */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                <span className="text-yellow-300">
                  {exchange.ppMatterNumber || (exchange as any).practicePartnerData?.matterNumber ? `#${exchange.ppMatterNumber || (exchange as any).practicePartnerData?.matterNumber} - ` : ''}
                  {exchange.ppDisplayName || (exchange as any).practicePartnerData?.matterName || exchange.name || `Exchange ${exchange.exchangeNumber}`}
                </span>
              </h1>
              {/* Remove duplicate exchange ID - keep only one */}
              {exchange.exchangeNumber && !exchange.ppMatterNumber && !(exchange as any).practicePartnerData?.matterNumber && (
                <p className="text-xs text-blue-200">ID: {exchange.exchangeNumber}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100">
                {/* Display Exchange Type */}
                {(exchange.typeOfExchange || getCustomFieldValue('Type of Exchange')) && (
                  <span className="flex items-center bg-blue-800/50 px-2 py-1 rounded">
                    <Building2 className="w-4 h-4 mr-1" />
                    {exchange.typeOfExchange || getCustomFieldValue('Type of Exchange')} Exchange
                  </span>
                )}
                {/* Display Property Type */}
                {(exchange.propertyType || exchange.relPropertyType || getCustomFieldValue('Property Type')) && (
                  <span className="flex items-center bg-indigo-800/50 px-2 py-1 rounded">
                    <MapPin className="w-4 h-4 mr-1" />
                    {exchange.propertyType || exchange.relPropertyType || getCustomFieldValue('Property Type')}
                  </span>
                )}
                {/* Display Client with Signatory Title */}
                <span className="flex items-center bg-purple-800/50 px-2 py-1 rounded">
                  <Users className="w-4 h-4 mr-1" />
                  {getCustomFieldValue('Client Vesting') || exchange.clientVesting || exchange.relinquishedProperty?.clientVesting || (exchange.client?.firstName && `${exchange.client.firstName} ${exchange.client.lastName}`) || 'Client Name'}
                  {getCustomFieldValue('Client 1 Signatory Title') && 
                    ` (${getCustomFieldValue('Client 1 Signatory Title')})`}
                </span>
                {/* Display Bank */}
                {getCustomFieldValue('Bank') && (
                  <span className="flex items-center bg-green-800/50 px-2 py-1 rounded">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {getCustomFieldValue('Bank')}
                  </span>
                )}
                {/* Display Proceeds prominently */}
                {getCustomFieldValue('Proceeds (USD)') && (
                  <span className="flex items-center bg-yellow-600/70 px-3 py-1 rounded font-semibold">
                    <Banknote className="w-4 h-4 mr-1" />
                    ${(getCustomFieldValue('Proceeds (USD)') || 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Status Badge - Auto-determined from PP fields */}
              <div className={`
                px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm
                ${(() => {
                  const stage = determineStageFromPP();
                  if (stage === 'COMPLETED' || stage === 'Completed') return 'bg-green-500 text-white';
                  if (stage === 'CANCELLED' || stage === 'Cancelled' || stage === 'TERMINATED') return 'bg-red-500 text-white';
                  if (stage.includes('property_identified') || stage.includes('under_contract')) return 'bg-blue-500 text-white';
                  if (stage.includes('funds_received') || stage.includes('identification_open')) return 'bg-indigo-500 text-white';
                  if (stage === 'PENDING' || stage === 'pending') return 'bg-yellow-500 text-white';
                  if (stage === '45D' || stage === '180D' || stage === 'In Progress') return 'bg-indigo-500 text-white';
                  return 'bg-gray-500 text-white';
                })()}
              `}>
                <Shield className="w-4 h-4" />
                <span>{determineStageFromPP().replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              
              {/* Days remaining - now using PP dates */}
              {(() => {
                const now = new Date();
                const day45 = exchange.day_45 ? new Date(exchange.day_45) : null;
                const day180 = exchange.day_180 ? new Date(exchange.day_180) : null;
                let daysLeft = null;
                let isUrgent = false;
                let label = '';
                
                if (day45 && day45 > now) {
                  daysLeft = Math.ceil((day45.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  isUrgent = daysLeft <= 10;
                  label = '45-Day';
                } else if (day180 && day180 > now) {
                  daysLeft = Math.ceil((day180.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  isUrgent = daysLeft <= 30;
                  label = '180-Day';
                }
                
                return daysLeft !== null ? (
                  <div className={`
                    px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm
                    ${isUrgent ? 'bg-red-500 text-white animate-pulse' :
                      daysLeft <= 60 ? 'bg-orange-500 text-white' :
                      'bg-blue-500 text-white'}
                  `}>
                    <Zap className="w-4 h-4" />
                    <span>{daysLeft} days to {label}</span>
                  </div>
                ) : null;
              })()}
              
              {/* Action Menu */}
              <button className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <MoreVertical className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
          </div>
          
          
          {/* Removed progress bar - redundant with timeline */}
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center border-b-2 font-medium text-xs sm:text-sm transition-all
                    flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-3 sm:p-6">
            {activeTab === 'overview' && <ExchangeOverview exchange={exchange as any} participants={extractParticipants()} tasks={tasks} documents={[]} />}
            {activeTab === 'timeline' && <TimelineTab exchange={exchange} />}
            {activeTab === 'properties' && <PropertiesTab exchange={exchange} />}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Exchange Tasks</h3>
                    <p className="text-sm text-gray-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
                {loadingTasks ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                ) : (
                  <TasksList tasks={tasks} />
                )}
              </div>
            )}
            {activeTab === 'documents' && <DocumentsList documents={[]} onUploadClick={() => {}} onDownload={() => {}} canUpload={true} canDelete={false} />}
            {activeTab === 'messages' && <MessagesTab exchange={exchange} />}
            
            {/* PP Data tab removed - data is now integrated into main tabs */}
            {false && activeTab === 'pp-data' && (
              <div className="space-y-6">
                {loadingPpData ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PracticePanther data...</p>
                  </div>
                ) : ppData ? (
                  <>
                    {/* PP Tasks */}
                    {ppData.tasks && ppData.tasks.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                          PracticePanther Tasks ({ppData.tasks.length})
                        </h3>
                        <div className="space-y-3">
                          {ppData.tasks.slice(0, 10).map((task: any) => (
                            <div key={task.pp_id} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-900">{task.subject}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                                  {task.due_date && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority || 'Normal'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* PP Invoices */}
                    {ppData.invoices && ppData.invoices.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                          PracticePanther Invoices ({ppData.invoices.length})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {ppData.invoices.slice(0, 10).map((invoice: any) => (
                                <tr key={invoice.pp_id}>
                                  <td className="px-4 py-2 text-sm">
                                    {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm">{invoice.account_ref_display_name || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-right font-medium">
                                    ${(invoice.total / 100).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right">
                                    {invoice.total_outstanding > 0 && (
                                      <span className="text-red-600 font-medium">
                                        ${(invoice.total_outstanding / 100).toLocaleString()}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* PP Expenses */}
                    {ppData.expenses && ppData.expenses.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                          PracticePanther Expenses ({ppData.expenses.length})
                        </h3>
                        <div className="grid gap-3">
                          {ppData.expenses.slice(0, 10).map((expense: any) => (
                            <div key={expense.pp_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{expense.description}</p>
                                <p className="text-xs text-gray-500">
                                  {expense.date ? new Date(expense.date).toLocaleDateString() : '-'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${(expense.amount / 100).toLocaleString()}</p>
                                {expense.is_billable && !expense.is_billed && (
                                  <span className="text-xs text-yellow-600">Unbilled</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!ppData.tasks?.length && !ppData.invoices?.length && !ppData.expenses?.length) && (
                      <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No PracticePanther data found for this exchange</p>
                        <p className="text-sm text-gray-500 mt-2">Data will appear after syncing from PracticePanther</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PracticePanther integration not configured</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onTaskCreated={handleTaskCreated}
        exchangeId={id}
      />
    </Layout>
  );
};

export default ExchangeDetail;