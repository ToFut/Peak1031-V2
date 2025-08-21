import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exchange, Task, Document, AuditLog } from '../types';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useExchangePermissions } from '../hooks/useExchangePermissions';
import { useRealTimeTasks } from '../hooks/useRealTimeTasks';
import { apiService } from '../services/api';
import UnifiedChatInterface from '../features/messages/components/UnifiedChatInterface';
import EnterpriseParticipantsManager from '../components/EnterpriseParticipantsManager';
import EnhancedInvitationManager from '../features/exchanges/components/EnhancedInvitationManager';
import { ExchangeTimeline } from '../features/exchanges/components/ExchangeTimeline';
import { EnhancedDocumentManager } from '../features/documents/components';
import TaskCreateModal from '../features/tasks/components/TaskCreateModal';
import { TaskBoard } from '../features/tasks/components/TaskBoard';
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
  Filter,
  Building2
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
  const exchangePermissions = useExchangePermissions(id);

  // State management
  const [exchange, setExchange] = useState<EnterpriseExchange | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [advancingStage, setAdvancingStage] = useState(false);
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'members' | 'tasks' | 'documents' | 'financial' | 'compliance' | 'chat' | 'audit'>('overview');

  // Member management
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Client');
  
  // Task management
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);

  // Real-time task updates
  useRealTimeTasks({
    exchangeId: id,
    onTaskCreated: (event) => {
      console.log('📋 New task created in exchange:', event);
      loadExchangeData(); // Reload tasks
    },
    onTaskUpdated: (event) => {
      console.log('📋 Task updated in exchange:', event);
      loadExchangeData(); // Reload tasks
    },
    onTaskDeleted: (event) => {
      console.log('📋 Task deleted in exchange:', event);
      loadExchangeData(); // Reload tasks
    }
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
        console.log('About to make API calls...');
        console.log('API base URL:', apiService.getBaseURL());

      // Try enterprise endpoints first, fallback to regular endpoints
      let exchangeData, participantsData, tasksData, auditData, timelineData, complianceData, usersData: any;
      
              try {
          console.log('Making API calls to:', apiService.getBaseURL());
          // Try enterprise endpoints
          [exchangeData, participantsData, tasksData, auditData, timelineData, complianceData] = await Promise.all([
            apiService.get(`/enterprise-exchanges/${id}`).catch((error) => {
              console.log('Enterprise exchange failed, falling back to regular:', error.message);
              return apiService.get(`/exchanges/${id}`);
            }),
            apiService.get(`/exchanges/${id}/participants`),
            apiService.getTasksByExchange(id),
            apiService.get(`/exchanges/${id}/audit-logs`),
            apiService.get(`/enterprise-exchanges/${id}/timeline`).catch(() => []),
            apiService.get(`/enterprise-exchanges/${id}/compliance`).catch(() => null)
          ]);
        } catch (error) {
          // Fallback to regular endpoints
          [exchangeData, participantsData, tasksData, auditData] = await Promise.all([
            apiService.get(`/exchanges/${id}`),
            apiService.get(`/exchanges/${id}/participants`),
            apiService.getTasksByExchange(id),
            apiService.get(`/exchanges/${id}/audit-logs`)
          ]);
          timelineData = [];
          complianceData = null;
        }

        // Load users separately to avoid blocking main data
        try {
          console.log('Loading users...');
          usersData = await apiService.getUsers();
          console.log('Users loaded successfully:', usersData?.data?.length || usersData?.length || 0);
        } catch (error) {
          console.warn('Failed to load users, continuing without user data:', error);
          usersData = [];
        }

      console.log('All API calls completed');
      console.log('Exchange details loaded successfully:', exchangeData);
      console.log('Tasks data received:', tasksData);
      console.log('Tasks data type:', typeof tasksData);
      console.log('Tasks data is array:', Array.isArray(tasksData));
      console.log('Tasks array length:', Array.isArray(tasksData) ? tasksData.length : 'N/A');

      setExchange(exchangeData);
      setParticipants(participantsData?.participants || participantsData || []);
      // Handle tasks data - getTasksByExchange returns array directly
      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      console.log('Final tasksArray:', tasksArray);
      console.log('Final tasksArray length:', tasksArray.length);
      console.log('Final tasksArray is array:', Array.isArray(tasksArray));
      console.log('Setting tasks state with:', tasksArray.length, 'tasks');
      console.log('About to set tasks state with:', tasksArray.length, 'tasks');
      setTasks(tasksArray);
      console.log('Tasks state set, should trigger re-render');
      
      // Add immediate verification
      setTimeout(() => {
        console.log('🔍 VERIFICATION: Tasks state after setState:', {
          tasksLength: tasks.length,
          isArray: Array.isArray(tasks),
          sample: tasks.length > 0 ? tasks[0]?.title : 'None'
        });
      }, 100);
      
      setAuditLogs(auditData?.auditLogs || auditData || []);
      setTimeline(timelineData || []);
      setCompliance(complianceData);
      // Handle both array and object responses for users
      const usersArray = Array.isArray(usersData) ? usersData : (Array.isArray(usersData?.data) ? usersData.data : []);
      console.log('Final usersArray:', usersArray);
      console.log('Final usersArray length:', usersArray.length);
      setUsers(usersArray);

    } catch (err: any) {
      console.error('Error loading exchange details:', err);
      console.error('Error details:', err);
      setError(err.message || 'Failed to load exchange details');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExchangeData();
  }, [loadExchangeData]);





  // Exchange stage and progress calculation
  const getExchangeStage = useMemo(() => {
    if (!exchange) return null;

    // Check if exchange is completed first
    const status = exchange.status as string;
    const isCompleted = status === 'COMPLETED' || status === 'Completed' || status === 'CLOSED';
    
    if (isCompleted) {
      return {
        stage: 'Completed',
        color: 'bg-green-100 text-green-800',
        borderColor: 'border-green-300',
        progress: 100,
        isCompleted: true
      };
    }

    const today = new Date();
    const startDate = new Date(exchange.startDate || exchange.createdAt || '');
    const deadline45 = new Date(exchange.identificationDeadline || '');
    const deadline180 = new Date(exchange.exchangeDeadline || exchange.completionDeadline || '');
    
    // Calculate overall progress based on timeline
    let progress = 0;
    let stage = '';
    let color = '';
    let borderColor = '';
    
    if (today < startDate) {
      stage = 'Not Started';
      color = 'bg-gray-100 text-gray-800';
      borderColor = 'border-gray-300';
      progress = 0;
    } else if (today > deadline180) {
      // Past 180-day deadline
      if (exchange.status === '45D' || exchange.status === '180D') {
        // Still active but overdue
        stage = 'Overdue';
        color = 'bg-red-100 text-red-800';
        borderColor = 'border-red-300';
        progress = 100; // Timeline complete but exchange not closed
      } else {
        stage = 'Completed';
        color = 'bg-green-100 text-green-800';
        borderColor = 'border-green-300';
        progress = 100;
      }
    } else {
      // Calculate progress within timeline
      const totalDays = (deadline180.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      progress = Math.min((daysElapsed / totalDays) * 100, 100);
      
      if (today <= deadline45) {
        stage = '45-Day Period';
        color = 'bg-yellow-100 text-yellow-800';
        borderColor = 'border-yellow-300';
      } else {
        stage = '180-Day Period';
        color = 'bg-orange-100 text-orange-800';
        borderColor = 'border-orange-300';
      }
    }
    
    return {
      stage,
      color,
      borderColor,
      progress: Math.round(progress),
      isCompleted
    };
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

  const handleViewExchangeDetails = (role: string) => {
    if (!exchange) return;

    const details = {
      'admin': `Admin: View Full Exchange Details for ${exchange.name}\n- Exchange ID: ${exchange.id}\n- Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Value: $${exchange.exchangeValue?.toLocaleString()}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING' || t.status === 'pending').length : 0}`,
      'client': `Client: View My Exchange Details for ${exchange.name}\n- Your Exchange Progress: ${exchange.progress || 0}%\n- Next Deadline: ${exchange.identificationDeadline}\n- Payments Status: Up to date`,
      'coordinator': `Coordinator: Manage Exchange for ${exchange.name}\n- Exchange Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Team Members: ${Array.isArray(participants) ? participants.length : 0}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING' || t.status === 'pending').length : 0}`,
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
      <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
      </div>
    );
  }

  if (error || !exchange) {
    return (
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
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
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

        {/* Enhanced Exchange Summary with Visual Appeal */}
        <div className={`rounded-2xl shadow-xl p-8 text-white overflow-hidden relative ${
          getExchangeStage?.isCompleted 
            ? 'bg-gradient-to-r from-green-600 to-emerald-700' 
            : getExchangeStage?.stage === 'Overdue'
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : 'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  {getExchangeStage?.isCompleted ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : (
                    <Building2 className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{exchange.name}</h2>
                  <p className={`text-sm ${
                    getExchangeStage?.isCompleted ? 'text-green-100' : 'text-blue-100'
                  }`}>
                    {getExchangeStage?.isCompleted && '✓ Completed Exchange • '}
                    Exchange #{exchange.exchangeNumber || exchange.id}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur rounded-lg">
                  <span className="text-sm text-blue-100 mr-2">Status:</span>
                  <span className="font-semibold">{exchange.status}</span>
                </div>
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur rounded-lg">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="font-semibold">${exchange.exchangeValue?.toLocaleString()}</span>
                </div>
                {getExchangeStage && (
                  <div className="inline-flex items-center px-4 py-2 bg-white/90 text-gray-800 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      getExchangeStage.stage === '45 Days' ? 'bg-yellow-500' : 
                      getExchangeStage.stage === '180 Days' ? 'bg-orange-500' : 
                      'bg-green-500'
                    }`}></div>
                    <span className="text-sm font-semibold">{getExchangeStage.stage}</span>
                  </div>
                )}
              </div>
              
              {/* Enhanced Timeline with Visual Progress */}
              {getExchangeStage && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">Timeline Progress</span>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      getExchangeStage?.isCompleted 
                        ? 'text-green-100 bg-green-800/30' 
                        : 'text-blue-100 bg-white/20'
                    }`}>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="relative bg-white/20 rounded-full h-6 mb-4 overflow-hidden">
                    <div 
                      className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                        getExchangeStage.stage === 'Before Initial' ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 
                        getExchangeStage.stage === '45 Days' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                        getExchangeStage.stage === '180 Days' ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 
                        'bg-gradient-to-r from-green-400 to-green-500'
                      }`} 
                      style={{ width: `${getExchangeStage.progress}%` }}
                    >
                      <span className="text-xs text-white font-bold drop-shadow">{getExchangeStage.progress}%</span>
                    </div>
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-600 shadow-lg animate-pulse" 
                      style={{ left: `${getExchangeStage.progress}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-xs font-semibold text-blue-100">Start</div>
                      <div className="text-sm text-white font-medium">
                        {exchange.startDate ? new Date(exchange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not Set'}
                      </div>
                      {exchange.startDate && (
                        <div className="text-[10px] text-blue-200 mt-1">
                          {new Date(exchange.startDate).getFullYear()}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-xs font-semibold text-yellow-200">45-Day Deadline</div>
                      <div className="text-sm text-white font-medium">
                        {exchange.identificationDeadline ? new Date(exchange.identificationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not Set'}
                      </div>
                      {exchange.identificationDeadline && (
                        <div className={`text-[10px] mt-1 font-medium ${
                          getDaysRemaining(exchange.identificationDeadline) < 0 ? 'text-red-300' :
                          getDaysRemaining(exchange.identificationDeadline) < 7 ? 'text-yellow-300' :
                          'text-blue-200'
                        }`}>
                          {getDaysRemaining(exchange.identificationDeadline) < 0 
                            ? `Passed ${Math.abs(getDaysRemaining(exchange.identificationDeadline))}d ago`
                            : `${getDaysRemaining(exchange.identificationDeadline)} days left`}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-xs font-semibold text-orange-200">180-Day Deadline</div>
                      <div className="text-sm text-white font-medium">
                        {exchange.exchangeDeadline ? new Date(exchange.exchangeDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not Set'}
                      </div>
                      {exchange.exchangeDeadline && (
                        <div className={`text-[10px] mt-1 font-medium ${
                          getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'text-red-300' :
                          getDaysRemaining(exchange.exchangeDeadline) < 14 ? 'text-yellow-300' :
                          'text-blue-200'
                        }`}>
                          {getDaysRemaining(exchange.exchangeDeadline) < 0 
                            ? `Passed ${Math.abs(getDaysRemaining(exchange.exchangeDeadline))}d ago`
                            : `${getDaysRemaining(exchange.exchangeDeadline)} days left`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 mt-4 md:mt-0">
              {/* Permission Badges */}
              {exchangePermissions.permissions && (
                <div className="flex flex-wrap gap-2">
                  {exchangePermissions.getPermissionSummary().map((perm, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2 py-1 bg-white/20 backdrop-blur text-white rounded-full border border-white/30"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex gap-3">
                {exchangePermissions.isTabVisible('chat') && (
                  <button
                    className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg shadow-lg hover:bg-white/30 transition flex items-center gap-2 font-medium"
                    onClick={() => setActiveTab('chat')}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Open Chat
                  </button>
                )}
                <button
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg shadow-lg hover:bg-gray-50 transition flex items-center gap-2 font-medium"
                  onClick={() => navigate('/exchanges')}
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
              </div>
            </div>
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

            {/* Critical Deadlines - Dynamic Agentic Countdown */}
            <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-red-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center animate-pulse">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Critical Exchange Deadlines</h3>
                    <p className="text-xs text-gray-400">Real-time countdown monitoring</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* 45-Day Deadline - Agentic Card */}
                  <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 backdrop-blur rounded-xl p-4 border border-yellow-700/50 relative group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-2 right-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        exchange?.identificationDeadline && getDaysRemaining(exchange.identificationDeadline) < 0 ? 'bg-red-500' :
                        exchange?.identificationDeadline && getDaysRemaining(exchange.identificationDeadline) < 7 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}></div>
                    </div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-yellow-400 font-bold text-sm mb-1 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          45-DAY IDENTIFICATION PERIOD
                        </h4>
                        <div className="text-gray-300 text-xs font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {exchange?.identificationDeadline ? 
                            new Date(exchange.identificationDeadline).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'Date not configured'}
                        </div>
                      </div>
                    </div>
                    
                    {exchange?.identificationDeadline && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Time Remaining</span>
                          <span className={`text-2xl font-bold tabular-nums ${
                            getDaysRemaining(exchange.identificationDeadline) < 0 ? 'text-red-400' :
                            getDaysRemaining(exchange.identificationDeadline) < 7 ? 'text-orange-400' :
                            'text-green-400'
                          }`}>
                            {Math.abs(getDaysRemaining(exchange.identificationDeadline))}
                            <span className="text-sm ml-1 text-gray-400">days</span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`absolute h-full rounded-full transition-all duration-500 ${
                              getDaysRemaining(exchange.identificationDeadline) < 0 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              getDaysRemaining(exchange.identificationDeadline) < 7 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                              'bg-gradient-to-r from-green-500 to-emerald-500'
                            }`}
                            style={{ 
                              width: `${Math.max(0, Math.min(100, (getDaysRemaining(exchange.identificationDeadline) / 45) * 100))}%` 
                            }}
                          >
                            <div className="absolute right-0 top-0 h-full w-1 bg-white/50 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-center">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            getDaysRemaining(exchange.identificationDeadline) < 0 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                              : getDaysRemaining(exchange.identificationDeadline) < 7 
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                              : 'bg-green-500/20 text-green-400 border border-green-500/50'
                          }`}>
                            {getDaysRemaining(exchange.identificationDeadline) < 0 
                              ? `⚠️ OVERDUE BY ${Math.abs(getDaysRemaining(exchange.identificationDeadline))} DAYS` 
                              : getDaysRemaining(exchange.identificationDeadline) < 7
                              ? `⚡ URGENT: ${getDaysRemaining(exchange.identificationDeadline)} DAYS LEFT`
                              : `✓ ON TRACK: ${getDaysRemaining(exchange.identificationDeadline)} DAYS REMAINING`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 180-Day Deadline - Agentic Card */}
                  <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 backdrop-blur rounded-xl p-4 border border-orange-700/50 relative group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-2 right-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        exchange?.exchangeDeadline && getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'bg-red-500' :
                        exchange?.exchangeDeadline && getDaysRemaining(exchange.exchangeDeadline) < 14 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}></div>
                    </div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-orange-400 font-bold text-sm mb-1 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          180-DAY EXCHANGE COMPLETION
                        </h4>
                        <div className="text-gray-300 text-xs font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {exchange?.exchangeDeadline ? 
                            new Date(exchange.exchangeDeadline).toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'Date not configured'}
                        </div>
                      </div>
                    </div>
                    
                    {exchange?.exchangeDeadline && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Time Remaining</span>
                          <span className={`text-2xl font-bold tabular-nums ${
                            getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'text-red-400' :
                            getDaysRemaining(exchange.exchangeDeadline) < 14 ? 'text-orange-400' :
                            'text-green-400'
                          }`}>
                            {Math.abs(getDaysRemaining(exchange.exchangeDeadline))}
                            <span className="text-sm ml-1 text-gray-400">days</span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`absolute h-full rounded-full transition-all duration-500 ${
                              getDaysRemaining(exchange.exchangeDeadline) < 0 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              getDaysRemaining(exchange.exchangeDeadline) < 14 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                              'bg-gradient-to-r from-green-500 to-emerald-500'
                            }`}
                            style={{ 
                              width: `${Math.max(0, Math.min(100, (getDaysRemaining(exchange.exchangeDeadline) / 180) * 100))}%` 
                            }}
                          >
                            <div className="absolute right-0 top-0 h-full w-1 bg-white/50 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-center">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            getDaysRemaining(exchange.exchangeDeadline) < 0 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                              : getDaysRemaining(exchange.exchangeDeadline) < 14 
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                              : 'bg-green-500/20 text-green-400 border border-green-500/50'
                          }`}>
                            {getDaysRemaining(exchange.exchangeDeadline) < 0 
                              ? `⚠️ OVERDUE BY ${Math.abs(getDaysRemaining(exchange.exchangeDeadline))} DAYS` 
                              : getDaysRemaining(exchange.exchangeDeadline) < 14
                              ? `⚡ URGENT: ${getDaysRemaining(exchange.exchangeDeadline)} DAYS LEFT`
                              : `✓ ON TRACK: ${getDaysRemaining(exchange.exchangeDeadline)} DAYS REMAINING`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Live Status Indicator */}
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live monitoring active • Updates in real-time</span>
                  </div>
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

        {/* Tabs - Permission Based Visibility */}
        <div className="bg-white rounded-lg shadow border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Eye, visible: exchangePermissions.isTabVisible('overview') },
                { id: 'members', label: 'Members', icon: Users, visible: exchangePermissions.isTabVisible('members') },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare, visible: exchangePermissions.isTabVisible('tasks') },
                { id: 'documents', label: 'Documents', icon: FileText, visible: exchangePermissions.isTabVisible('documents') },
                { id: 'financial', label: 'Financial', icon: DollarSign, visible: exchange?.financial_transactions && exchangePermissions.isTabVisible('financial') },
                { id: 'compliance', label: 'Compliance', icon: Shield, visible: exchange?.compliance_status && exchangePermissions.isTabVisible('compliance') },
                { id: 'chat', label: 'Chat', icon: MessageSquare, visible: exchangePermissions.isTabVisible('chat') },
                { id: 'timeline', label: 'Timeline', icon: Activity, visible: timeline?.length > 0 && exchangePermissions.isTabVisible('timeline') },
                { id: 'audit', label: 'Audit Log', icon: BarChart3, visible: exchangePermissions.isTabVisible('audit') }
              ].filter(tab => tab.visible).map((tab) => {
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
          <div className="p-8">
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
                        <p className="text-2xl font-bold text-green-900">
                          {Array.isArray(tasks) ? tasks.filter(t => {
                            const status = t.status?.toLowerCase();
                            return status === 'pending' || status === 'in_progress' || status === 'in progress';
                          }).length : 0}
                        </p>
                      </div>
                      <CheckSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Documents</p>
                        <p className="text-2xl font-bold text-purple-900">--</p>
                      </div>
                      <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Progress</p>
                        <p className="text-2xl font-bold text-orange-900">{getExchangeStage?.progress || exchange.progress || 0}%</p>
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
                <EnhancedInvitationManager
                  exchangeId={exchange.id}
                  exchangeName={exchange.name}
                  existingParticipants={participants}
                  onParticipantAdded={loadExchangeData}
                />
              </div>
            )}

            {activeTab === 'tasks' && exchangePermissions.isTabVisible('tasks') && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Tasks</h3>
                  {exchangePermissions.canAddTasks() ? (
                    <button 
                      onClick={() => setShowTaskCreateModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Task
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                      View Only
                    </div>
                  )}
                </div>
                
                {/* Modern TaskBoard Component */}
                <div className="min-h-[800px]">
  
                  
                  {Array.isArray(tasks) && tasks.length > 0 ? (
                    <TaskBoard 
                      tasks={tasks}
                      onTaskUpdate={async (taskId: string, updates: Partial<Task>) => {
                        try {
                          await apiService.updateTask(taskId, updates);
                          // Update local state optimistically
                          setTasks(prev => prev.map(task => 
                            task.id === taskId ? { ...task, ...updates } : task
                          ));
                        } catch (error) {
                          console.error('Failed to update task:', error);
                          // Reload data on error
                          loadExchangeData();
                        }
                      }}
                      onTaskSelect={(task: Task) => {
                        // TODO: Open task details modal or navigate to task page
                        console.log('Selected task:', task);
                      }}
                      showExchangeInfo={false}
                      compact={false}
                      users={users}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                      <CheckSquare className="h-16 w-16 mb-4 text-gray-300" />
                      <h3 className="text-xl font-medium text-gray-700 mb-2">No Tasks Yet</h3>
                      <p className="text-gray-500 text-center mb-6 max-w-md">
                        Create your first task for this exchange using the Add Task button above, 
                        or mention @TASK in the chat to create tasks automatically.
                      </p>
                      {exchangePermissions.canAddTasks() ? (
                        <div className="flex items-center space-x-4">
                          <button 
                            onClick={() => setShowTaskCreateModal(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Create First Task
                          </button>
                          <button 
                            onClick={() => setActiveTab('chat')}
                            className="bg-purple-100 text-purple-700 px-6 py-3 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                          >
                            Try @TASK in Chat
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
                          <Shield className="w-4 h-4 inline mr-2" />
                          You have view-only access to tasks
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && exchangePermissions.isTabVisible('documents') && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Documents</h3>
                  {!exchangePermissions.canUploadDocuments() && (
                    <span className="text-sm text-gray-500 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-200">
                      <Eye className="w-3 h-3 inline mr-1" />
                      View & Download Only
                    </span>
                  )}
                </div>
                <EnhancedDocumentManager 
                  exchangeId={exchange.id}
                />
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
                <UnifiedChatInterface 
                  exchangeId={exchange.id} 
                  hideExchangeList={true}
                />
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
                          <p className="text-gray-700">
                            {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)) : 'N/A'}
                          </p>
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
        
        {/* Task Create Modal */}
        <TaskCreateModal
          isOpen={showTaskCreateModal}
          onClose={() => setShowTaskCreateModal(false)}
          onTaskCreated={(task) => {
            console.log('Task created:', task);
            setShowTaskCreateModal(false);
            // Reload exchange data to refresh tasks
            loadExchangeData();
          }}
          exchangeId={id}
        />
    </div>
  );
};

export default ExchangeDetailsPage; 