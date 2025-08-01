import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exchange, Task, Document, AuditLog } from '../types';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { apiService } from '../services/api';
import Layout from '../components/Layout';
import { ExchangeChatBox } from '../components/ExchangeChatBox';
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
  Trash2
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

interface ExchangeDetailsPageProps {}

const ExchangeDetailsPage: React.FC<ExchangeDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();

  // State management
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tasks' | 'documents' | 'chat' | 'audit'>('overview');

  // Member management
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Client');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load exchange data
  const loadExchangeData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [exchangeData, participantsData, tasksData, documentsData, auditData] = await Promise.all([
        apiService.get(`/exchanges/${id}`),
        apiService.get(`/exchanges/${id}/participants`),
        apiService.get(`/exchanges/${id}/tasks`),
        apiService.get(`/exchanges/${id}/documents`),
        apiService.get(`/exchanges/${id}/audit-logs`)
      ]);

      setExchange(exchangeData);
      setParticipants(participantsData || []);
      setTasks(tasksData || []);
      setDocuments(documentsData || []);
      setAuditLogs(auditData || []);

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
  const handleViewExchangeDetails = (role: string) => {
    if (!exchange) return;

    const details = {
      'admin': `Admin: View Full Exchange Details for ${exchange.name}\n- Exchange ID: ${exchange.id}\n- Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Value: $${exchange.exchangeValue?.toLocaleString()}\n- Active Tasks: ${tasks.filter(t => t.status === 'PENDING').length}`,
      'client': `Client: View My Exchange Details for ${exchange.name}\n- Your Exchange Progress: ${exchange.progress || 0}%\n- Next Deadline: ${exchange.identificationDeadline}\n- Documents Pending: ${documents.filter(d => d.category === 'pending').length}\n- Payments Status: Up to date`,
      'coordinator': `Coordinator: Manage Exchange for ${exchange.name}\n- Exchange Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Team Members: ${participants.length}\n- Active Tasks: ${tasks.filter(t => t.status === 'PENDING').length}`,
      'third_party': `Third Party: View Assigned Exchange for ${exchange.name}\n- Service Status: Active\n- Billing Information: Current\n- Service Level: Premium\n- Next Review: ${exchange.identificationDeadline}`
    };

    alert(details[role as keyof typeof details] || 'Exchange details not available');
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
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
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
                        <p className="text-2xl font-bold text-blue-900">{participants.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Active Tasks</p>
                        <p className="text-2xl font-bold text-green-900">{tasks.filter(t => t.status === 'PENDING').length}</p>
                      </div>
                      <CheckSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Documents</p>
                        <p className="text-2xl font-bold text-purple-900">{documents.length}</p>
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

                {participants.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Members</h3>
                    <p className="text-gray-500 mb-4">No members have been added to this exchange yet.</p>
                    {(isAdmin() || isCoordinator()) && (
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Add First Member
                      </button>
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
                  {tasks.map((task) => (
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
                  
                  {tasks.length === 0 && (
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
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload Document
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map((document) => (
                    <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <h4 className="font-semibold text-gray-900">{document.originalFilename}</h4>
                              <p className="text-sm text-gray-600">{document.mimeType}</p>
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
                        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {documents.length === 0 && (
                    <div className="text-center py-12 col-span-full">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
                      <p className="text-gray-500">No documents have been uploaded for this exchange yet.</p>
                    </div>
                  )}
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
                  {auditLogs.map((log) => (
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
                  
                  {auditLogs.length === 0 && (
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
      </div>
    </Layout>
  );
};

export default ExchangeDetailsPage; 