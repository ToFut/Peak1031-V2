import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import Layout from '../components/Layout';
import { ExchangeChatBox } from '../features/messages/components/ExchangeChatBox';
import EnterpriseParticipantsManager from '../components/EnterpriseParticipantsManager';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Document } from '../types';

// New imports for refactored architecture
import { useExchangeDetails } from '../hooks/useExchangeDetails';
import { useExchangeParticipants } from '../hooks/useExchangeParticipants';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { useExchangeTimeline } from '../hooks/useExchangeTimeline';
import { ExchangeHeader } from '../components/exchange/ExchangeHeader';
import { ExchangeTabs, TabId } from '../components/exchange/ExchangeTabs';
import { ExchangeOverview } from '../components/exchange/ExchangeOverview';
import { DocumentsList } from '../components/exchange/DocumentsList';
import { TasksList } from '../components/exchange/TasksList';
import { LIFECYCLE_STAGES } from '../types/lifecycle.types';
import { getExchangeStage } from '../utils/exchange.utils';
import { canManageExchange, canUploadDocuments, canManageParticipants } from '../utils/permission.utils';
import { formatDateTime } from '../utils/date.utils';

interface ExchangeDetailsPageProps {}

const ExchangeDetailsPageRefactored: React.FC<ExchangeDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use custom hooks
  const { 
    exchange, 
    participants: initialParticipants, 
    tasks, 
    documents, 
    auditLogs: initialAuditLogs,
    timeline: initialTimeline,
    compliance,
    loading, 
    error, 
    reload: loadExchangeData 
  } = useExchangeDetails(id);

  const {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    showAddMemberModal,
    setShowAddMemberModal,
    newMemberEmail,
    setNewMemberEmail,
    newMemberRole,
    setNewMemberRole
  } = useExchangeParticipants(id, initialParticipants);

  const {
    uploading,
    uploadError,
    showUploadModal,
    setShowUploadModal,
    selectedCategory,
    setSelectedCategory,
    fileInputRef,
    uploadDocument
  } = useDocumentUpload(id, loadExchangeData);

  const {
    timeline,
    auditLogs,
    refreshTimeline
  } = useExchangeTimeline(id, initialTimeline, initialAuditLogs);

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);
  const [advancingStage, setAdvancingStage] = useState(false);

  // Sync participants when initial data changes
  React.useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants, setParticipants]);

  // Calculate exchange stage
  const exchangeStage = getExchangeStage(exchange);

  // Handlers
  const handleViewExchangeDetails = useCallback(() => {
    if (!exchange || !user) return;

    const details = {
      'admin': `Admin: View Full Exchange Details for ${exchange.name}\n- Exchange ID: ${exchange.id}\n- Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Value: $${exchange.exchangeValue?.toLocaleString()}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}`,
      'client': `Client: View My Exchange Details for ${exchange.name}\n- Your Exchange Progress: ${exchange.progress || 0}%\n- Next Deadline: ${exchange.identificationDeadline}\n- Documents Pending: ${Array.isArray(documents) ? documents.filter(d => d.category === 'pending').length : 0}\n- Payments Status: Up to date`,
      'coordinator': `Coordinator: Manage Exchange for ${exchange.name}\n- Exchange Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Team Members: ${Array.isArray(participants) ? participants.length : 0}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}`,
      'third_party': `Third Party: View Assigned Exchange for ${exchange.name}\n- Service Status: Active\n- Billing Information: Current\n- Service Level: Premium\n- Next Review: ${exchange.identificationDeadline}`,
      'agency': `Agency: Manage Exchange for ${exchange.name}\n- Exchange Status: ${exchange.status}\n- Progress: ${exchange.progress || 0}%\n- Team Members: ${Array.isArray(participants) ? participants.length : 0}\n- Active Tasks: ${Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0}`
    };

    alert(details[user.role] || 'Exchange details not available');
  }, [exchange, user, tasks, documents, participants]);

  const handleAdvanceStage = useCallback(async () => {
    if (!exchange) return;

    const stages = Object.keys(LIFECYCLE_STAGES);
    const currentIndex = stages.indexOf(exchange.lifecycle_stage || 'INITIATION');
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      alert('Exchange is already at the final stage');
      return;
    }

    if (window.confirm(`Advance exchange to ${LIFECYCLE_STAGES[nextStage as keyof typeof LIFECYCLE_STAGES].label} stage?`)) {
      try {
        setAdvancingStage(true);
        await apiService.post(`/enterprise-exchanges/${exchange.id}/advance-stage`, {
          nextStage
        });
        await loadExchangeData();
        alert('Stage advanced successfully');
      } catch (err: any) {
        console.error('Error advancing stage:', err);
        alert('Failed to advance stage: ' + err.message);
      } finally {
        setAdvancingStage(false);
      }
    }
  }, [exchange, loadExchangeData]);

  const handleAddMember = useCallback(async () => {
    const success = await addParticipant(newMemberEmail, newMemberRole);
    if (success) {
      await loadExchangeData();
    }
  }, [addParticipant, newMemberEmail, newMemberRole, loadExchangeData]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    const success = await removeParticipant(memberId);
    if (success) {
      await loadExchangeData();
    }
  }, [removeParticipant, loadExchangeData]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadDocument(file);
    }
  }, [uploadDocument]);

  const handleDocumentDownload = useCallback(async (document: Document) => {
    try {
      const response = await apiService.downloadDocument(document.id);
      // Handle download response
      console.log('Document downloaded:', document.filename);
    } catch (err: any) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
    }
  }, []);

  // Loading state
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

  // Error state
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
        <ExchangeHeader
          exchange={exchange}
          user={user}
          onViewDetails={handleViewExchangeDetails}
          onAdvanceStage={handleAdvanceStage}
          onShowParticipantsManager={() => setShowParticipantsManager(true)}
          onShowAddMemberModal={() => setShowAddMemberModal(true)}
          advancingStage={advancingStage}
        />

        {/* Enterprise Lifecycle Progress (if applicable) */}
        {exchange.lifecycle_stage && (
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Lifecycle</h3>
            <div className="flex items-center justify-between space-x-2">
              {Object.entries(LIFECYCLE_STAGES).map(([stage, config], index) => {
                const currentIndex = Object.keys(LIFECYCLE_STAGES).indexOf(exchange.lifecycle_stage || 'INITIATION');
                const isActive = stage === exchange.lifecycle_stage;
                const isCompleted = index < currentIndex;
                const isNext = index === currentIndex + 1;
                
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
        )}

        {/* Tabs */}
        <ExchangeTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showEnterpriseFeatures={!!exchange.lifecycle_stage}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow border p-6">
          {activeTab === 'overview' && (
            <ExchangeOverview
              exchange={exchange}
              participants={participants}
              tasks={tasks}
              documents={documents}
              exchangeStage={exchangeStage}
            />
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              {participants.map((member) => (
                <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`}
                        alt={member.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-500">{member.email} • {member.role}</p>
                      </div>
                    </div>
                    {canManageParticipants(user) && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <TasksList
              tasks={tasks}
              onTaskClick={(task) => console.log('Task clicked:', task)}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsList
              documents={documents}
              onUploadClick={() => setShowUploadModal(true)}
              onDownload={handleDocumentDownload}
              canUpload={canUploadDocuments(user)}
              canDelete={canManageExchange(user)}
            />
          )}

          {activeTab === 'chat' && (
            <ExchangeChatBox exchange={exchange} />
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Timeline & Activity</h3>
              {timeline.length === 0 && auditLogs.length === 0 ? (
                <p className="text-gray-500">No activity recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {[...timeline, ...auditLogs]
                    .sort((a, b) => {
                      const dateA = new Date((a as any).timestamp || (a as any).createdAt || '').getTime();
                      const dateB = new Date((b as any).timestamp || (b as any).createdAt || '').getTime();
                      return dateB - dateA;
                    })
                    .map((entry, index) => (
                      <div key={`${(entry as any).id}-${index}`} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{(entry as any).action}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime((entry as any).timestamp || (entry as any).createdAt)} 
                              {(entry as any).userName && ` by ${(entry as any).userName}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
              {auditLogs.length === 0 ? (
                <p className="text-gray-500">No audit logs recorded</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(log.createdAt)} • {log.userName || log.user?.first_name || 'System'}
                          </p>
                        </div>
                        {log.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            log.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            log.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.severity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Client">Client</option>
                  <option value="Agent">Agent</option>
                  <option value="Attorney">Attorney</option>
                  <option value="Third Party">Third Party</option>
                </select>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddMember}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Member
                  </button>
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
              <div className="space-y-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="general">General</option>
                  <option value="contract">Contract</option>
                  <option value="identification">Identification</option>
                  <option value="financial">Financial</option>
                  <option value="legal">Legal</option>
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full"
                />
                {uploadError && (
                  <p className="text-red-600 text-sm">{uploadError}</p>
                )}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showParticipantsManager && (
          <EnterpriseParticipantsManager
            exchangeId={exchange.id}
            isOpen={showParticipantsManager}
            onClose={() => {
              setShowParticipantsManager(false);
              loadExchangeData();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default ExchangeDetailsPageRefactored;