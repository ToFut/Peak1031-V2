import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExchanges } from '../hooks/useExchanges';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../hooks/usePermissions';
import Layout from '../../../components/Layout';
import UnifiedChatInterface from '../../messages/components/UnifiedChatInterface';
import { ExchangeDocuments } from '../components/ExchangeDocuments';
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
  Gauge
} from 'lucide-react';

// Tab Components
import { ExchangeOverview } from '../components/ExchangeOverview';
import EnhancedTaskManager from '../../tasks/components/EnhancedTaskManager';
import EnhancedInvitationManager from '../components/EnhancedInvitationManager';
import { DocumentUploader } from '../../../components/shared';

interface TabProps {
  exchange: Exchange;
  onUpdate?: () => void;
}

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

  const metrics = [
    {
      label: '45-Day Deadline',
      value: getDaysUntil(exchange.identificationDeadline || getFieldValue('identificationDeadline')),
      type: 'days',
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      urgent: true
    },
    {
      label: '180-Day Deadline',
      value: getDaysUntil(exchange.completionDeadline || getFieldValue('completionDeadline') || exchange.exchangeDeadline || getFieldValue('exchangeDeadline')),
      type: 'days',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      urgent: false
    },
    {
      label: 'Exchange Value',
      value: getExchangeValue(),
      type: 'currency',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      urgent: false
    },
    {
      label: 'Progress',
      value: exchange.progress || getFieldValue('completionPercentage') || 0,
      type: 'percentage',
      icon: Gauge,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      urgent: false
    }
  ];

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
                {exchange.relinquishedPropertyAddress || 'Not specified'}
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
                {exchange.client.firstName || (exchange.client as any).first_name} {exchange.client.lastName || (exchange.client as any).last_name}
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
                {exchange.coordinator.first_name} {exchange.coordinator.last_name}
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

const ExchangeDetailEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getExchange } = useExchanges();
  const { isAdmin, isCoordinator } = usePermissions();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<any[]>([]);
  // Tasks are now managed by EnhancedTaskManager component
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadExchange();
    }
  }, [id]);
  
  const loadExchange = async () => {
    try {
      setLoading(true);
      const data = await getExchange(id!);
      setExchange(data);
      // Load associated documents and tasks
      await loadDocuments();
    } catch (error) {
      console.error('Error loading exchange:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
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
  };


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
        { label: 'Name', value: ex.name, type: undefined },
        { label: 'Status', value: ex.status, type: undefined },
        { label: 'Exchange Type', value: ex.exchangeType || ex.exchange_type, type: undefined },
        { label: 'Priority', value: ex.priority, type: undefined },
        { label: 'Active', value: ex.isActive || ex.is_active ? 'Yes' : 'No', type: undefined }
      ],
      'Financial Information': [
        { label: 'Relinquished Property Value', value: ex.relinquishedPropertyValue || ex.relinquished_property_value, type: 'currency' },
        { label: 'Replacement Property Value', value: ex.replacementPropertyValue || ex.replacement_property_value, type: 'currency' },
        { label: 'Exchange Value', value: ex.relinquished_property_value || ex.relinquishedPropertyValue || 0, type: 'currency' },
        { label: 'Cash Boot', value: ex.cashBoot || ex.cash_boot, type: 'currency' },
        { label: 'Financing Amount', value: ex.financingAmount || ex.financing_amount, type: 'currency' },
        { label: 'Profitability', value: ex.profitability, type: 'currency' }
      ],
      'Important Dates': [
        { label: 'Sale Date', value: ex.saleDate || ex.sale_date, type: 'date' },
        { label: 'Identification Deadline (45-Day)', value: ex.identificationDeadline || ex.identification_deadline, type: 'date' },
        { label: 'Exchange Deadline (180-Day)', value: ex.exchangeDeadline || ex.exchange_deadline, type: 'date' },
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(canManageInvitations ? [{ id: 'invitations', label: 'Invitations', icon: Users }] : []),
    { id: 'all-details', label: 'All Details', icon: FileText }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
              
              <div className="flex items-center gap-2">
                <StatusIndicator status={exchange.status} daysRemaining={daysUntilClosing || undefined} />
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {exchange.name || `Exchange #${exchange.exchangeNumber}`}
                </h1>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {exchange.client?.firstName} {exchange.client?.lastName}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(exchange.createdAt || '').toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {exchange.exchangeValue 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(exchange.exchangeValue)
                      : 'Value TBD'
                    }
                  </span>
                </div>

                {/* Simple Progress Bar */}
                <div className="bg-gray-100 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exchange.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{exchange.progress || 0}% complete</p>
              </div>
            </div>
          </div>

          {/* Key Metrics - Simplified */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">45-Day Deadline</span>
                <Target className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {(() => {
                  const days = getDaysUntil(exchange.identificationDeadline);
                  return days === null ? 'N/A' : days < 0 ? 'Overdue' : `${days} days`;
                })()}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">180-Day Deadline</span>
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {(() => {
                  const days = getDaysUntil(exchange.completionDeadline);
                  return days === null ? 'N/A' : days < 0 ? 'Overdue' : `${days} days`;
                })()}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Exchange Value</span>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {exchange.exchangeValue
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(exchange.exchangeValue)
                  : 'N/A'
                }
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <Gauge className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">{exchange.progress || 0}%</p>
            </div>
          </div>

          {/* Simplified Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Property Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Relinquished Property</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="text-gray-900">{exchange.relinquishedPropertyAddress || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sale Price:</span>
                      <span className="text-gray-900 font-medium">
                        {exchange.relinquishedSalePrice 
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.relinquishedSalePrice)
                          : 'Not specified'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Closing Date:</span>
                      <span className="text-gray-900">
                        {exchange.relinquishedClosingDate 
                          ? new Date(exchange.relinquishedClosingDate).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Key Contacts
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Client</h4>
                  {exchange.client ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-gray-900">
                        {exchange.client.firstName} {exchange.client.lastName}
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
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No client information available</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Coordinator</h4>
                  {exchange.coordinator ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-gray-900">
                        {exchange.coordinator.first_name} {exchange.coordinator.last_name}
                      </p>
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <a href={`mailto:${exchange.coordinator.email}`} className="hover:text-blue-600">
                          {exchange.coordinator.email}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No coordinator assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Clean Tabs */}
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
            {activeTab === 'overview' && <ExchangeOverview exchange={exchange as any} participants={[]} tasks={[]} documents={documents} />}
            {activeTab === 'tasks' && (
              <EnhancedTaskManager 
                exchangeId={exchange.id}
              />
            )}
            {activeTab === 'all-details' && <AllDetailsView />}
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
                      <DocumentUploader 
                        exchangeId={exchange.id}
                        onUploadSuccess={handleDocumentUploadSuccess}
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
    </Layout>
  );
};

export default ExchangeDetailEnhanced;