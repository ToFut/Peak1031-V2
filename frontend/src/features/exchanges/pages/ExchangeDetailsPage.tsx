import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exchange, Task, Document, AuditLog } from '../types';
import { useAuth } from '@/shared/hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { apiService } from '@/shared/services/api';
import Layout from '@/shared/ui/organisms/Layout';
import { ExchangeChatBox } from '../components/ExchangeChatBox';
import EnterpriseParticipantsManager from '../components/EnterpriseParticipantsManager';
import {
  ArrowLeft,
  Eye,
  Users,
  FileText,
  MessageSquare,
  CheckSquare,
  BarChart3,
  AlertTriangle,
  Plus,
  MoreVertical,
  TrendingUp,
  Download,
  Upload,
  Search,
  Trash2,
  UserPlus,
  UserCheck,
  Clock,
  CheckCircle,
  Shield,
  Target,
  Activity,
  ChevronRight,
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';

interface ExchangeParticipant {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'pending' | 'inactive';
  permissions: {
    canView: boolean;
    canMessage: boolean;
    canUpload: boolean;
    canViewDocuments: boolean;
    canManage: boolean;
  };
  lastActive?: string;
  exchangeId: string;
}

// Enterprise Exchange interface
interface EnterpriseExchange extends Exchange {
  lifecycle_stage?: string;
  stage_progress?: number;
  compliance_status?: string;
  risk_level?: string;
  total_replacement_value?: number;
  financial_transactions?: any[];
  compliance_checks?: any[];
  exchange_milestones?: any[];
  exchange_analytics?: any[];
  days_in_current_stage?: number;
  on_track?: boolean;
}

// Lifecycle stages configuration
const LIFECYCLE_STAGES = {
  'INITIATION': { label: 'Initiation', color: 'bg-gray-500', textColor: 'text-gray-700', progress: 10 },
  'QUALIFICATION': { label: 'Qualification', color: 'bg-blue-500', textColor: 'text-blue-700', progress: 25 },
  'DOCUMENTATION': { label: 'Documentation', color: 'bg-purple-500', textColor: 'text-purple-700', progress: 40 },
  'RELINQUISHED_SALE': { label: 'Sale Complete', color: 'bg-orange-500', textColor: 'text-orange-700', progress: 55 },
  'IDENTIFICATION_PERIOD': { label: '45-Day Period', color: 'bg-yellow-500', textColor: 'text-yellow-700', progress: 70 },
  'REPLACEMENT_ACQUISITION': { label: '180-Day Period', color: 'bg-amber-500', textColor: 'text-amber-700', progress: 85 },
  'COMPLETION': { label: 'Completion', color: 'bg-green-500', textColor: 'text-green-700', progress: 100 }
};

const RISK_COLORS = {
  'LOW': 'text-green-700 bg-green-50 border-green-200',
  'MEDIUM': 'text-yellow-700 bg-yellow-50 border-yellow-200',  
  'HIGH': 'text-orange-700 bg-orange-50 border-orange-200',
  'CRITICAL': 'text-red-700 bg-red-50 border-red-200'
};

const COMPLIANCE_COLORS = {
  'COMPLIANT': 'text-green-700 bg-green-50 border-green-200',
  'AT_RISK': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'NON_COMPLIANT': 'text-red-700 bg-red-50 border-red-200',
  'PENDING': 'text-gray-700 bg-gray-50 border-gray-200'
};

interface ExchangeDetailsPageProps {}

const ExchangeDetailsPage: React.FC<ExchangeDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();

  // State management
  const [exchange, setExchange] = useState<EnterpriseExchange | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [advancingStage, setAdvancingStage] = useState(false);
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tasks' | 'documents' | 'financial' | 'compliance' | 'chat' | 'timeline' | 'audit'>('overview');

  // Member management
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Client');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load exchange data
  const loadExchangeData = useCallback(async () => {
    if (!id) {
      setError('No exchange ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Loading exchange details for ID:', id);

      // Try enterprise endpoints first, fallback to regular endpoints
      let exchangeData, participantsData, tasksData, documentsData, auditData, timelineData, complianceData;
      
      try {
        // Try enterprise endpoints
        [exchangeData, participantsData, tasksData, documentsData, auditData, timelineData, complianceData] = await Promise.all([
          apiService.get(`/enterprise-exchanges/${id}`).catch(() => apiService.get(`/exchanges/${id}`)),
          apiService.get(`/exchanges/${id}/participants`),
          apiService.get(`/exchanges/${id}/tasks`),
          apiService.get(`/documents/exchange/${id}`),
          apiService.get(`/exchanges/${id}/audit-logs`),
          apiService.get(`/enterprise-exchanges/${id}/timeline`).catch(() => []),
          apiService.get(`/enterprise-exchanges/${id}/compliance`).catch(() => null)
        ]);
      } catch (error) {
        // Fallback to regular endpoints
        [exchangeData, participantsData, tasksData, documentsData, auditData] = await Promise.all([
          apiService.get(`/exchanges/${id}`),
          apiService.get(`/exchanges/${id}/participants`),
          apiService.get(`/exchanges/${id}/tasks`),
          apiService.get(`/documents/exchange/${id}`),
          apiService.get(`/exchanges/${id}/audit-logs`)
        ]);
        timelineData = [];
        complianceData = null;
      }

      console.log('Exchange details loaded successfully:', exchangeData);

      setExchange(exchangeData);
      setParticipants(participantsData?.participants || participantsData || []);
      setTasks(tasksData?.tasks || tasksData || []);
      setDocuments(documentsData?.documents || documentsData || []);
      setAuditLogs(auditData?.auditLogs || auditData || []);
      setTimeline(timelineData || []);
      setCompliance(complianceData);

    } catch (err: any) {
      console.error('Error loading exchange details:', err);
      setError(err.message || 'Failed to load exchange details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExchangeData();
  }, [loadExchangeData]);

  // Exchange stage calculation
  const getExchangeStage = useMemo(() => {
    if (!exchange) return null;

    const today = new Date();
    const startDate = new Date(exchange.startDate || exchange.createdAt || '');
    const deadline45 = new Date(exchange.identificationDeadline || '');
    const deadline180 = new Date(exchange.exchangeDeadline || '');
    
    if (today < startDate) {
      return {
        stage: 'Before Initial',
        color: 'bg-gray-100 text-gray-800',
        borderColor: 'border-gray-300',
        progress: 0
      };
    } else if (today >= startDate && today <= deadline45) {
      const totalDays = (deadline45.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const progress = Math.min((daysElapsed / totalDays) * 100, 100);
      return {
        stage: '45 Days',
        color: 'bg-yellow-100 text-yellow-800',
        borderColor: 'border-yellow-300',
        progress: Math.round(progress)
      };
    } else if (today > deadline45 && today <= deadline180) {
      const totalDays = (deadline180.getTime() - deadline45.getTime()) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today.getTime() - deadline45.getTime()) / (1000 * 60 * 60 * 24);
      const progress = Math.min((daysElapsed / totalDays) * 100, 100);
      return {
        stage: '180 Days',
        color: 'bg-orange-100 text-orange-800',
        borderColor: 'border-orange-300',
        progress: Math.round(progress)
      };
    } else {
      return {
        stage: 'Closeup',
        color: 'bg-green-100 text-green-800',
        borderColor: 'border-green-300',
        progress: 100
      };
    }
  }, [exchange]);

  // Member management functions
  const handleAddMember = async () => {
    if (!newMemberEmail || !newMemberRole || !exchange) return;

    try {
      const response = await apiService.post(`/exchanges/${exchange.id}/participants`, {
        email: newMemberEmail,
        role: newMemberRole
      });

      if (response.success) {
        setParticipants(prev => [...prev, response.participant]);
        setNewMemberEmail('');
        setNewMemberRole('Client');
        setShowAddMemberModal(false);
      }
    } catch (err: any) {
      console.error('Error adding member:', err);
      alert('Failed to add member: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!exchange) return;

    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await apiService.delete(`/exchanges/${exchange.id}/participants/${memberId}`);
        setParticipants(prev => prev.filter(p => p.id !== memberId));
      } catch (err: any) {
        console.error('Error removing member:', err);
        alert('Failed to remove member: ' + err.message);
      }
    }
  };

  const handleDirectChat = (member: ExchangeParticipant) => {
    setActiveTab('chat');
  };

  // Role-based action handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !exchange) return;

    try {
      setUploading(true);
      setUploadError(null);

      const response = await apiService.uploadDocument(file, exchange.id, selectedCategory);
      
      if (response) {
        await loadExchangeData(); // Reload exchange data after successful upload
        setShowUploadModal(false);
        setSelectedCategory('general');
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewExchangeDetails = (role: string) => {
    if (!exchange) return;

    const details = {
      'admin': `Admin: View Full Exchange Details for ${exchange.name}\n- Exchange ID: ${exchange.id}\n- Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Value: $${exchange.exchangeValue?.toLocaleString()}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}`,
      'client': `Client: View My Exchange Details for ${exchange.name}\n- Your Exchange Progress: ${exchange.progress || 0}%\n- Next Deadline: ${exchange.identificationDeadline}\n- Documents Pending: ${Array.isArray(documents) ? documents.filter(d => d.category === 'pending').length : 0}\n- Payments Status: Up to date`,
      'coordinator': `Coordinator: Manage Exchange for ${exchange.name}\n- Exchange Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Team Members: ${Array.isArray(participants) ? participants.length : 0}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}`,
      'third_party': `Third Party: View Assigned Exchange for ${exchange.name}\n- Service Status: Active\n- Billing Information: Current\n- Service Level: Premium\n- Next Review: ${exchange.identificationDeadline}`
    };

    alert(details[role as keyof typeof details] || 'Exchange details not available');
  };

  // Enterprise Functions
  // Advance to next stage
  const handleAdvanceStage = async () => {
    if (!exchange) return;

    const stages = Object.keys(LIFECYCLE_STAGES);
    const currentIndex = stages.indexOf(exchange.lifecycle_stage || 'INITIATION');
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      alert('Exchange is already at the final stage');
      return;
    }

    if (!window.confirm(`Advance exchange to ${LIFECYCLE_STAGES[nextStage as keyof typeof LIFECYCLE_STAGES].label}?`)) {
      return;
    }

    try {
      setAdvancingStage(true);
      
      await apiService.post(`/enterprise-exchanges/${id}/advance-stage`, {
        new_stage: nextStage,
        reason: 'Manual advancement by user'
      });

      await loadExchangeData(); // Reload data
      
    } catch (err: any) {
      alert(`Failed to advance stage: ${err.message}`);
    } finally {
      setAdvancingStage(false);
    }
  };

  // Calculate days remaining for deadlines
  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !exchange) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Exchange</h3>
          <p className="text-gray-500 mb-4">{error || 'Exchange not found'}</p>
          <button
            onClick={() => navigate('/exchanges')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Exchanges
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/exchanges')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exchange.name}</h1>
              <p className="text-gray-600">Exchange Details</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleViewExchangeDetails(user?.role || 'client')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </button>
            
            {(isAdmin() || isCoordinator()) && (
              <div className="flex items-center space-x-2">
                {exchange?.lifecycle_stage && exchange.lifecycle_stage !== 'COMPLETION' && (
                  <button
                    onClick={handleAdvanceStage}
                    disabled={advancingStage}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>{advancingStage ? 'Advancing...' : 'Advance Stage'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowParticipantsManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Team Management</span>
                </button>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Quick Add</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Exchange Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-white rounded-2xl shadow p-8 border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold mb-2 text-blue-900">{exchange.name}</h2>
              
              <div className="flex flex-wrap gap-6 text-base text-gray-700 font-medium mb-4">
                <span>Status: <span className="font-semibold text-blue-700">{exchange.status}</span></span>
                <span>Value: ${exchange.exchangeValue?.toLocaleString()}</span>
                {getExchangeStage && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${getExchangeStage.color} ${getExchangeStage.borderColor}`}>
                    <span className="text-sm font-semibold">{getExchangeStage.stage}</span>
                  </div>
                )}
              </div>
              
              {/* Timeline */}
              {getExchangeStage && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Exchange Timeline</span>
                    <span className="text-xs text-blue-600 font-medium">
                      Today: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="relative bg-gray-200 rounded-full h-4 mb-3">
                    <div 
                      className={`h-4 rounded-full transition-all duration-300 ${
                        getExchangeStage.stage === 'Before Initial' ? 'bg-gray-400' : 
                        getExchangeStage.stage === '45 Days' ? 'bg-yellow-400' : 
                        getExchangeStage.stage === '180 Days' ? 'bg-orange-400' : 'bg-green-400'
                      }`} 
                      style={{ width: `${getExchangeStage.progress}%` }}
                    ></div>
                    <div 
                      className="absolute top-0 w-2 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" 
                      style={{ left: `${getExchangeStage.progress}%`, transform: 'translateX(-50%)' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <div className="text-center">
                      <div className="font-medium text-gray-800">Start</div>
                      <div>{exchange.startDate ? new Date(exchange.startDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-yellow-700">45-day</div>
                      <div>{exchange.identificationDeadline ? new Date(exchange.identificationDeadline).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-700">180-day</div>
                      <div>{exchange.exchangeDeadline ? new Date(exchange.exchangeDeadline).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              className="mt-4 md:mt-0 bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
              onClick={() => setActiveTab('chat')}
            >
              Open Chat
            </button>
          </div>
        </div>

        {/* Enterprise Status Cards */}
        {(exchange?.lifecycle_stage || exchange?.compliance_status || exchange?.risk_level) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Current Stage */}
            {exchange?.lifecycle_stage && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-3 h-3 rounded-full ${LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.color || 'bg-gray-500'}`}></div>
                  <span className="text-sm text-gray-500">Current Stage</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.label || exchange.lifecycle_stage}
                </h3>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{exchange.stage_progress || LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.color || 'bg-gray-500'}`}
                      style={{ width: `${exchange.stage_progress || LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Status */}
            {exchange?.compliance_status && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-500">Compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${COMPLIANCE_COLORS[exchange.compliance_status as keyof typeof COMPLIANCE_COLORS] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    {exchange.compliance_status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Score: {compliance?.score || 0}% ({compliance?.passed || 0}/{compliance?.total || 0})
                </p>
              </div>
            )}

            {/* Risk Level */}
            {exchange?.risk_level && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-gray-500">Risk Level</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${RISK_COLORS[exchange.risk_level as keyof typeof RISK_COLORS] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    {exchange.risk_level}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {exchange.on_track ? 'On track' : 'Needs attention'}
                </p>
              </div>
            )}

            {/* Critical Deadlines */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-500">Deadlines</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>45-day:</span>
                  <span className={exchange?.identificationDeadline && getDaysRemaining(exchange.identificationDeadline) < 0 ? 'text-red-600 font-medium' : 
                                   exchange?.identificationDeadline && getDaysRemaining(exchange.identificationDeadline) < 7 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                    {exchange?.identificationDeadline ? 
                      (getDaysRemaining(exchange.identificationDeadline) < 0 ? 'OVERDUE' : `${getDaysRemaining(exchange.identificationDeadline)}d left`) : 
                      'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>180-day:</span>
                  <span className={exchange?.exchangeDeadline && getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'text-red-600 font-medium' : 
                                   exchange?.exchangeDeadline && getDaysRemaining(exchange.exchangeDeadline) < 14 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                    {exchange?.exchangeDeadline ? 
                      (getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'OVERDUE' : `${getDaysRemaining(exchange.exchangeDeadline)}d left`) : 
                      'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lifecycle Timeline */}
        {exchange?.lifecycle_stage && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Exchange Lifecycle</h3>
            <div className="relative">
              <div className="flex items-center justify-between">
                {Object.entries(LIFECYCLE_STAGES).map(([stage, config], index) => {
                  const isActive = stage === exchange.lifecycle_stage;
                  const isCompleted = config.progress < (LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES]?.progress || 0);
                  const isNext = index === Object.keys(LIFECYCLE_STAGES).indexOf(exchange.lifecycle_stage || '') + 1;
                  
                  return (
                    <div key={stage} className="flex flex-col items-center relative flex-1">
                      {/* Timeline line */}
                      {index < Object.entries(LIFECYCLE_STAGES).length - 1 && (
                        <div className="absolute top-4 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                          <div 
                            className={`h-full ${isCompleted ? config.color : 'bg-gray-200'}`}
                            style={{ width: isCompleted ? '100%' : '0%' }}
                          ></div>
                        </div>
                      )}
                      
                      {/* Stage indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                        isActive ? config.color + ' text-white' :
                        isCompleted ? config.color + ' text-white' :
                        isNext ? 'bg-gray-200 text-gray-600 border-2 border-dashed border-gray-400' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isActive ? (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                      </div>
                      
                      {/* Stage label */}
                      <span className={`text-xs font-medium text-center ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                { id: 'documents', label: 'Documents', icon: FileText },
                ...(exchange?.financial_transactions ? [{ id: 'financial', label: 'Financial', icon: DollarSign }] : []),
                ...(exchange?.compliance_status ? [{ id: 'compliance', label: 'Compliance', icon: Shield }] : []),
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                ...(timeline?.length > 0 ? [{ id: 'timeline', label: 'Timeline', icon: Activity }] : []),
                { id: 'audit', label: 'Audit Log', icon: BarChart3 }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
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
                        <p className="text-sm font-medium text-green-600">Active Tasks</p>
                        <p className="text-2xl font-bold text-green-900">{Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}</p>
                      </div>
                      <CheckSquare className="w-8 h-8 text-green-600" />
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

                {/* Exchange Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exchange ID:</span>
                        <span className="font-medium">{exchange.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium">{exchange.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{exchange.exchangeType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="font-medium">${exchange.exchangeValue?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Dates</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">
                          {exchange.startDate ? new Date(exchange.startDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">45-Day Deadline:</span>
                        <span className="font-medium">
                          {exchange.identificationDeadline ? new Date(exchange.identificationDeadline).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">180-Day Deadline:</span>
                        <span className="font-medium">
                          {exchange.exchangeDeadline ? new Date(exchange.exchangeDeadline).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {exchange.createdAt ? new Date(exchange.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Members List */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Members</h3>
                  <div className="flex items-center space-x-3">
                    {(isAdmin() || isCoordinator()) && (
                      <>
                        <button
                          onClick={() => setShowParticipantsManager(true)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Team Management</span>
                        </button>
                        <button
                          onClick={() => setShowAddMemberModal(true)}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Quick Add</span>
                        </button>
                      </>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {participants
                    .filter(p => 
                      (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
                      (statusFilter === 'all' || p.status === statusFilter)
                    )
                    .map((participant) => (
                      <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">{participant.avatar}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{participant.name}</h4>
                              <p className="text-sm text-gray-600">{participant.email}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Role:</span>
                            <span className="text-sm font-medium text-gray-900">{participant.role}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              participant.status === 'active' ? 'bg-green-100 text-green-800' :
                              participant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {participant.status}
                            </span>
                          </div>
                          
                          {participant.lastActive && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Last Active:</span>
                              <span className="text-sm text-gray-900">
                                {new Date(participant.lastActive).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleDirectChat(participant)}
                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Chat</span>
                          </button>
                          
                          {(isAdmin() || isCoordinator()) && (
                            <button
                              onClick={() => handleRemoveMember(participant.id)}
                              className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                                  {(!Array.isArray(participants) || participants.length === 0) && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Members</h3>
                    <p className="text-gray-500 mb-4">No members have been added to this exchange yet.</p>
                    {(isAdmin() || isCoordinator()) && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowParticipantsManager(true)}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Enterprise Team Management</span>
                        </button>
                        <button
                          onClick={() => setShowAddMemberModal(true)}
                          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Quick Invite</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Tasks</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Task
                  </button>
                </div>
                
                <div className="space-y-4">
                  {Array.isArray(tasks) && tasks.map((task) => (
                    <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                            <span>Priority: {task.priority}</span>
                            <span>Status: {task.status}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!Array.isArray(tasks) || tasks.length === 0) && (
                    <div className="text-center py-12">
                      <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks</h3>
                      <p className="text-gray-500">No tasks have been created for this exchange yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Documents</h3>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload Document
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.isArray(documents) && documents.map((document) => (
                    <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <FileText className={`w-8 h-8 ${document.document_type === 'generated' ? 'text-green-600' : 'text-blue-600'}`} />
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {document.originalFilename || document.name}
                                {document.document_type === 'generated' && (
                                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Generated
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {document.mimeType || document.category}
                                {document.template_name && (
                                  <span className="ml-2 text-gray-500">• Template: {document.template_name}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span>{document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uploaded:</span>
                            <span>{document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              document.category === 'approved' ? 'bg-green-100 text-green-800' :
                              document.category === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {document.category || 'Uncategorized'}
                            </span>
                          </div>
                        </div>
                      
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => {
                            if (document.document_type === 'generated' && document.file_url) {
                              // For generated documents, download directly from URL
                              window.open(document.file_url, '_blank');
                            } else {
                              // For regular documents, use the download API
                              // apiService.downloadDocument(document.id);
                              console.log('Download regular document:', document.id);
                            }
                          }}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(!Array.isArray(documents) || documents.length === 0) && (
                    <div className="text-center py-12 col-span-full">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
                      <p className="text-gray-500">No documents have been uploaded for this exchange yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'financial' && exchange?.financial_transactions && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Financial Transactions</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                      <div>Date</div>
                      <div>Type</div>
                      <div>Amount</div>
                      <div>Status</div>
                      <div>Description</div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {exchange.financial_transactions?.map((transaction: any) => (
                      <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div className="text-gray-900">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </div>
                          <div className="text-gray-600">{transaction.transaction_type}</div>
                          <div className="font-medium text-gray-900">
                            ${transaction.amount?.toLocaleString()}
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                          <div className="text-gray-600">{transaction.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && exchange?.compliance_status && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Compliance Monitoring</h3>
                  <div className="text-sm text-gray-600">
                    Overall Score: <span className="font-semibold">{compliance?.score || 0}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{compliance?.passed || 0}</p>
                    <p className="text-sm text-green-600">Passed</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{compliance?.failed || 0}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{compliance?.warnings || 0}</p>
                    <p className="text-sm text-yellow-600">Warnings</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{compliance?.total || 0}</p>
                    <p className="text-sm text-blue-600">Total Checks</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {compliance?.checks?.map((check: any) => (
                    <div key={check.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{check.check_name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              check.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              check.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              check.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {check.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{check.check_type}</p>
                          {check.details && (
                            <p className="text-sm text-gray-700">{JSON.stringify(check.details)}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            check.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                            check.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {check.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && timeline.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Exchange Timeline</h3>
                
                <div className="flow-root">
                  <ul className="-mb-8">
                    {timeline.map((event: any, eventIdx: number) => (
                      <li key={event.id}>
                        <div className="relative pb-8">
                          {eventIdx !== timeline.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <Activity className="w-4 h-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">
                                  Advanced from <span className="font-medium">{event.from_stage}</span> to{' '}
                                  <span className="font-medium">{event.to_stage}</span>
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {event.automated ? 'Automated' : 'Manual'} • {event.reason}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time>{new Date(event.changed_at).toLocaleString()}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'chat' && exchange && (
              <div className="h-96">
                <ExchangeChatBox exchange={exchange} />
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search audit logs..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="all">All Actions</option>
                      <option value="create">Created</option>
                      <option value="update">Updated</option>
                      <option value="delete">Deleted</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {Array.isArray(auditLogs) && auditLogs.map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-gray-900">{log.userName}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700">{log.details}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>IP: {log.ip || log.ipAddress}</span>
                            <span>Severity: {log.severity}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            log.severity === 'error' || log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            log.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {log.severity || 'info'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!Array.isArray(auditLogs) || auditLogs.length === 0) && (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs</h3>
                      <p className="text-gray-500">No audit logs are available for this exchange.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Member to Exchange</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Client">Client</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Third Party">Third Party</option>
                    <option value="Real Estate Agent">Real Estate Agent</option>
                    <option value="Agency Manager">Agency Manager</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Document Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document to {exchange?.name}</h3>
              
              <div className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="contract">Contract</option>
                    <option value="financial">Financial</option>
                    <option value="legal">Legal</option>
                    <option value="identification">Identification</option>
                    <option value="deed">Deed</option>
                    <option value="appraisal">Appraisal</option>
                    <option value="inspection">Inspection</option>
                    <option value="title">Title</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>

                {/* File Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, Word, Excel, Images, Text, CSV, ZIP (max 50MB)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedCategory('general');
                    setUploadError(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Select File & Upload'}
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{uploadError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enterprise Participants Manager Modal */}
        {exchange && (
          <EnterpriseParticipantsManager
            exchangeId={exchange.id}
            isOpen={showParticipantsManager}
            onClose={() => setShowParticipantsManager(false)}
            onParticipantsChange={() => {
              // Refresh exchange data to update participant lists
              loadExchangeData();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default ExchangeDetailsPage; 