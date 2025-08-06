import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import Layout from '../components/Layout';
import { ExchangeChatBox } from '../features/messages/components/ExchangeChatBox';
import {
  ArrowLeft, Clock, AlertCircle, CheckCircle, TrendingUp,
  Users, FileText, MessageSquare, BarChart3, Settings,
  Calendar, DollarSign, Shield, Target, Activity,
  ChevronRight, ExternalLink, Plus, Filter
} from 'lucide-react';

interface EnterpriseExchange {
  id: string;
  name: string;
  status: string;
  lifecycle_stage: string;
  stage_progress: number;
  identification_deadline: string;
  exchange_deadline: string;
  compliance_status: string;
  risk_level: string;
  total_replacement_value: number;
  exchange_participants: any[];
  financial_transactions: any[];
  compliance_checks: any[];
  exchange_milestones: any[];
  exchange_analytics: any[];
  tasks: any[];
  documents: any[];
  messages: any[];
}

const LIFECYCLE_STAGES = {
  'INITIATION': { label: 'Initiation', color: 'bg-gray-500', progress: 10 },
  'QUALIFICATION': { label: 'Qualification', color: 'bg-blue-500', progress: 25 },
  'DOCUMENTATION': { label: 'Documentation', color: 'bg-purple-500', progress: 40 },
  'RELINQUISHED_SALE': { label: 'Sale Complete', color: 'bg-orange-500', progress: 55 },
  'IDENTIFICATION_PERIOD': { label: '45-Day Period', color: 'bg-yellow-500', progress: 70 },
  'REPLACEMENT_ACQUISITION': { label: '180-Day Period', color: 'bg-amber-500', progress: 85 },
  'COMPLETION': { label: 'Completion', color: 'bg-green-500', progress: 100 }
};

const RISK_COLORS = {
  'LOW': 'text-green-700 bg-green-100',
  'MEDIUM': 'text-yellow-700 bg-yellow-100', 
  'HIGH': 'text-orange-700 bg-orange-100',
  'CRITICAL': 'text-red-700 bg-red-100'
};

const COMPLIANCE_COLORS = {
  'COMPLIANT': 'text-green-700 bg-green-100',
  'AT_RISK': 'text-yellow-700 bg-yellow-100',
  'NON_COMPLIANT': 'text-red-700 bg-red-100',
  'PENDING': 'text-gray-700 bg-gray-100'
};

const EnterpriseExchangeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [exchange, setExchange] = useState<EnterpriseExchange | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [advancingStage, setAdvancingStage] = useState(false);

  // Load exchange data
  const loadExchangeData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [exchangeData, timelineData, complianceData] = await Promise.all([
        apiService.get(`/enterprise-exchanges/${id}`),
        apiService.get(`/enterprise-exchanges/${id}/timeline`),
        apiService.get(`/enterprise-exchanges/${id}/compliance`)
      ]);

      setExchange(exchangeData);
      setTimeline(timelineData);
      setCompliance(complianceData);

    } catch (err: any) {
      console.error('Error loading exchange:', err);
      setError(err.message || 'Failed to load exchange data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExchangeData();
  }, [loadExchangeData]);

  // Advance to next stage
  const handleAdvanceStage = async () => {
    if (!exchange) return;

    const stages = Object.keys(LIFECYCLE_STAGES);
    const currentIndex = stages.indexOf(exchange.lifecycle_stage);
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
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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

  const analytics = exchange.exchange_analytics?.[0] || {};
  const currentStage = LIFECYCLE_STAGES[exchange.lifecycle_stage as keyof typeof LIFECYCLE_STAGES] || LIFECYCLE_STAGES.INITIATION;
  const identificationDays = getDaysRemaining(exchange.identification_deadline);
  const exchangeDays = getDaysRemaining(exchange.exchange_deadline);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/exchanges')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exchange.name}</h1>
              <p className="text-gray-600">Exchange ID: {exchange.id}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {(user?.role === 'admin' || user?.role === 'coordinator') && (
              <button
                onClick={handleAdvanceStage}
                disabled={advancingStage || exchange.lifecycle_stage === 'COMPLETION'}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <ChevronRight className="w-4 h-4" />
                <span>{advancingStage ? 'Advancing...' : 'Advance Stage'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Current Stage */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-3 h-3 rounded-full ${currentStage.color}`}></div>
              <span className="text-sm text-gray-500">Current Stage</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{currentStage.label}</h3>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{exchange.stage_progress || currentStage.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${currentStage.color}`}
                  style={{ width: `${exchange.stage_progress || currentStage.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-500">Compliance</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${COMPLIANCE_COLORS[exchange.compliance_status as keyof typeof COMPLIANCE_COLORS]}`}>
                {exchange.compliance_status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Score: {compliance?.score || 0}% ({compliance?.passed || 0}/{compliance?.total || 0})
            </p>
          </div>

          {/* Risk Level */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-500">Risk Level</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${RISK_COLORS[exchange.risk_level as keyof typeof RISK_COLORS]}`}>
                {exchange.risk_level}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {analytics.on_track ? 'On track' : 'Needs attention'}
            </p>
          </div>

          {/* Critical Deadlines */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-500">Deadlines</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>45-day:</span>
                <span className={identificationDays < 0 ? 'text-red-600 font-medium' : identificationDays < 7 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                  {identificationDays < 0 ? 'OVERDUE' : `${identificationDays}d left`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>180-day:</span>
                <span className={exchangeDays < 0 ? 'text-red-600 font-medium' : exchangeDays < 14 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                  {exchangeDays < 0 ? 'OVERDUE' : `${exchangeDays}d left`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle Timeline */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Exchange Lifecycle</h3>
          <div className="relative">
            <div className="flex items-center justify-between">
              {Object.entries(LIFECYCLE_STAGES).map(([stage, config], index) => {
                const isActive = stage === exchange.lifecycle_stage;
                const isCompleted = config.progress < currentStage.progress;
                const isNext = index === Object.keys(LIFECYCLE_STAGES).indexOf(exchange.lifecycle_stage) + 1;
                
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

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'participants', label: 'Participants', icon: Users },
                { id: 'tasks', label: 'Tasks', icon: CheckCircle },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'financial', label: 'Financial', icon: DollarSign },
                { id: 'compliance', label: 'Compliance', icon: Shield },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'timeline', label: 'Timeline', icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Days in Stage</p>
                        <p className="text-2xl font-bold text-blue-900">{analytics.days_in_current_stage || 0}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Tasks Complete</p>
                        <p className="text-2xl font-bold text-green-900">
                          {analytics.tasks_completed || 0}/{(analytics.tasks_completed || 0) + (analytics.tasks_remaining || 0)}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Exchange Value</p>
                        <p className="text-2xl font-bold text-purple-900">
                          ${(exchange.total_replacement_value || 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Milestones</h3>
                  <div className="space-y-3">
                    {exchange.exchange_milestones?.slice(0, 5).map((milestone: any) => (
                      <div key={milestone.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{milestone.milestone_name}</p>
                          <p className="text-sm text-gray-600">{milestone.milestone_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(milestone.due_date).toLocaleDateString()}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            milestone.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            milestone.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {milestone.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exchange Participants</h3>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span>Add Participant</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exchange.exchange_participants?.map((participant: any) => (
                    <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {participant.contacts.first_name} {participant.contacts.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{participant.contacts.email}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          participant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Permissions: {participant.permissions?.join(', ')}</p>
                        <p>Added: {new Date(participant.assigned_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
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
                            ${transaction.amount.toLocaleString()}
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

            {activeTab === 'compliance' && (
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

            {activeTab === 'chat' && exchange && (
              <div className="h-96">
                <ExchangeChatBox exchange={exchange as any} />
              </div>
            )}

            {activeTab === 'timeline' && (
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

            {/* Additional tabs content can be added here */}
            {activeTab === 'tasks' && (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tasks Management</h3>
                <p className="text-gray-500">Task management interface coming soon</p>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management</h3>
                <p className="text-gray-500">Document management interface coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EnterpriseExchangeDetailsPage;