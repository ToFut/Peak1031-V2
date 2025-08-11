import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExchanges } from '../hooks/useExchanges';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import Layout from '../../../components/Layout';
import UnifiedChatInterface from '../../messages/components/UnifiedChatInterface';
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
  TrendingUp,
  Activity,
  Send,
  MoreVertical,
  Shield,
  Zap,
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
import { TasksList } from '../components/TasksList';
import { DocumentsList } from '../components/DocumentsList';
import InvitationManager from '../components/InvitationManager';
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

  const metrics = [
    {
      label: '45-Day Deadline',
      value: getDaysUntil(exchange.identificationDeadline),
      type: 'days',
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      urgent: true
    },
    {
      label: '180-Day Deadline',
      value: getDaysUntil(exchange.completionDeadline),
      type: 'days',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      urgent: false
    },
    {
      label: 'Exchange Value',
      value: exchange.exchangeValue,
      type: 'currency',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      urgent: false
    },
    {
      label: 'Progress',
      value: exchange.progress || 0,
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
              <p className="text-sm text-gray-500">Sale Price</p>
              <p className="font-medium text-gray-900 text-lg">
                {exchange.relinquishedSalePrice 
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.relinquishedSalePrice)
                  : 'Not specified'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Closing Date</p>
              <p className="font-medium text-gray-900">
                {exchange.relinquishedClosingDate 
                  ? new Date(exchange.relinquishedClosingDate).toLocaleDateString()
                  : 'Not scheduled'
                }
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
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
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
      await Promise.all([
        loadDocuments(),
        loadTasks()
      ]);
    } catch (error) {
      console.error('Error loading exchange:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!id) return;
    try {
      setLoadingDocuments(true);
      const docs = await apiService.get(`/documents/exchange/${id}`);
      // Handle different response formats
      const documentsList = Array.isArray(docs) ? docs : (docs.documents || docs.data || []);
      setDocuments(documentsList);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    try {
      const tasks = await apiService.get(`/tasks/exchange/${id}`);
      const tasksList = Array.isArray(tasks) ? tasks : (tasks.tasks || tasks.data || []);
      setTasks(tasksList);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
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

  const handleDocumentDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiService.delete(`/documents/${documentId}`);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
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

  const daysUntilClosing = getDaysUntilClosing();
  const canManageInvitations = isAdmin() || isCoordinator();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(canManageInvitations ? [{ id: 'invitations', label: 'Invitations', icon: Users }] : [])
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => navigate('/exchanges')}
              className="flex items-center text-blue-100 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Exchanges
            </button>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4 leading-tight">
                  {exchange.name || `Exchange #${exchange.exchangeNumber}`}
                </h1>
                
                <div className="flex flex-wrap gap-4 text-blue-100 mb-6">
                  <span className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                    <Users className="w-4 h-4 mr-2" />
                    {exchange.client?.firstName} {exchange.client?.lastName}
                  </span>
                  <span className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(exchange.createdAt || '').toLocaleDateString()}
                  </span>
                  <span className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                    <Banknote className="w-4 h-4 mr-2" />
                    {exchange.exchangeValue 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(exchange.exchangeValue)
                      : 'Value TBD'
                    }
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-100">Exchange Progress</span>
                    <span className="text-lg font-bold">{exchange.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${exchange.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <StatusIndicator status={exchange.status} daysRemaining={daysUntilClosing || undefined} />
                
                <button className="flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl p-3 transition-all">
                  <MoreVertical className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <KeyMetrics exchange={exchange} />

        {/* Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PropertyCard exchange={exchange} />
          <ContactCard exchange={exchange} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-6 px-6 text-center border-b-3 font-semibold text-sm transition-all
                    flex items-center justify-center space-x-3
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-white shadow-sm'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-8">
            {activeTab === 'overview' && <ExchangeOverview exchange={exchange as any} participants={[]} tasks={tasks} documents={documents} />}
            {activeTab === 'tasks' && <TasksList tasks={tasks} />}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <DocumentsList 
                  documents={documents} 
                  onUploadClick={() => setShowUploadModal(true)} 
                  onDownload={handleDocumentDownload} 
                  onDelete={handleDocumentDelete}
                  canUpload={true} 
                  canDelete={isAdmin() || isCoordinator()} 
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
              </div>
            )}
            {activeTab === 'messages' && <MessagesTab exchange={exchange} />}
            {activeTab === 'invitations' && canManageInvitations && (
              <InvitationManager
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
    </Layout>
  );
};

export default ExchangeDetailEnhanced;