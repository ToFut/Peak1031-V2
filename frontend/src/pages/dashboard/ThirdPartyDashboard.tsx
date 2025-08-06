import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { roleBasedApiService } from '../../services/roleBasedApiService';
import PinProtectedAccess from '../../components/documents/PinProtectedAccess';
import {
  DocumentTextIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ThirdPartyStats {
  assignments: {
    total: number;
    active: number;
    completed: number;
  };
  documents: {
    available: number;
    pinRequired: number;
    viewedToday: number;
  };
  messages: {
    unread: number;
    updates: number;
  };
}

const ThirdPartyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'my_assignments' | 'documents' | 'messages' | 'reports'>('overview');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<ThirdPartyStats>({
    assignments: { total: 0, active: 0, completed: 0 },
    documents: { available: 0, pinRequired: 0, viewedToday: 0 },
    messages: { unread: 0, updates: 0 }
  });

  useEffect(() => {
    if (user?.role === 'third_party') {
      loadThirdPartyData();
    }
  }, [user]);

  const loadThirdPartyData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role as any,
        company: user.company || ''
      });

      const myExchanges = dashboardData.exchanges || [];
      const myDocuments = dashboardData.documents || [];

      setExchanges(myExchanges);
      setDocuments(myDocuments);

      setStats({
        assignments: {
          total: myExchanges.length,
          active: myExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
          completed: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length
        },
        documents: {
          available: myDocuments.length,
          pinRequired: myDocuments.filter((d: any) => d.pinProtected).length,
          viewedToday: 6 // Mock data
        },
        messages: {
          unread: 3,
          updates: 2
        }
      });

    } catch (err) {
      console.error('Failed to load third party data:', err);
      setError('Failed to load your assignment data');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'third_party') {
    return (
      <Layout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the third party dashboard.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
          <span className="ml-3 text-gray-600">Loading your assignments...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Third Party Header */}
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">👋 Welcome, {user.first_name} {user.last_name} (Third Party Legal)</h1>
              <p className="text-gray-100 mt-1">
                🔒 Read-Only Access - Your assigned exchange roles and documents
              </p>
            </div>
            <div className="text-right">
              <div className="text-gray-100 text-sm">🔒 Read-Only View</div>
              <div className="flex items-center mt-1">
                <ShieldCheckIcon className="w-4 h-4 text-blue-400 mr-2" />
                <span className="font-medium">Secure Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              <span className="font-medium">Third-Party Access:</span> You have read-only access to assigned exchanges for security. All document access is logged for audit purposes.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
              { id: 'my_assignments', name: 'My Assignments', icon: DocumentTextIcon },
              { id: 'documents', name: 'Documents', icon: DocumentArrowDownIcon },
              { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon },
              { id: 'reports', name: 'Reports', icon: CheckCircleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-gray-500 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <DocumentTextIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.assignments.total}</p>
                    <p className="text-sm font-medium text-gray-600">My Assignments</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.assignments.active} active, {stats.assignments.completed} completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.documents.available}</p>
                    <p className="text-sm font-medium text-gray-600">Available Docs</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.documents.pinRequired} PIN required</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.messages.unread}</p>
                    <p className="text-sm font-medium text-gray-600">New Messages</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.messages.updates} updates</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <EyeIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.documents.viewedToday}</p>
                    <p className="text-sm font-medium text-gray-600">Viewed Today</p>
                    <p className="text-xs text-gray-500 mt-1">⏰ Last activity: 2h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">📢 Notifications</h2>
                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[View All]</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <DocumentArrowDownIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">📄 New document available in Smith 1031 Exchange</p>
                    <p className="text-xs text-blue-700 mt-1">Added 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">💬 Coordinator message in Johnson Properties</p>
                    <p className="text-xs text-green-700 mt-1">Requires your attention</p>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-gray-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">📊 Exchange EX-001 status updated to 45D Phase</p>
                    <p className="text-xs text-gray-700 mt-1">Status change notification</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Role Assignments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">📋 My Role Assignments</h2>
                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[View Details]</span>
              </div>
              <div className="space-y-4">
                {[
                  { id: 'EX-001', status: '🟡 45D Phase', role: 'Legal Review', exchange: 'Smith 1031' },
                  { id: 'EX-087', status: '🟠 180D Phase', role: 'Title Review', exchange: 'Johnson Props' },
                  { id: 'EX-043', status: '🟢 COMPLETED', role: 'Legal Counsel', exchange: 'Miller Exchange' }
                ].map((assignment, index) => (
                  <div key={assignment.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">📁 {assignment.id}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>👤 Role: {assignment.role}</p>
                      <p>📊 Status: {index === 2 ? 'Done ✓' : 'Active'}</p>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">[👁️ View]</button>
                      <button className="text-green-600 hover:text-green-800 text-sm">[📄 Documents]</button>
                      {index === 2 ? (
                        <button className="text-purple-600 hover:text-purple-800 text-sm">[📊 Summary]</button>
                      ) : (
                        <button className="text-orange-600 hover:text-orange-800 text-sm">[💬 Messages]</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My Assignments Tab */}
        {activeTab === 'my_assignments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">📋 My Exchange Assignments</h2>
                <div className="flex space-x-3">
                  <input 
                    type="text" 
                    placeholder="🔍 Search assignments..." 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Status ▼</option>
                    <option>Active</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  🔒 <span className="font-medium">Note:</span> Third-party access is read-only for security. You can view exchange details and documents but cannot make changes.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    id: 'EX-2024-001',
                    name: 'Smith 1031 Exchange',
                    status: '🟡 45D PHASE',
                    role: 'Legal Counsel',
                    property: '123 Main St, Springfield',
                    startDate: 'Jan 15, 2024',
                    deadline: '3 days left',
                    coordinator: 'Sarah Johnson',
                    agency: 'ABC Realty',
                    progress: 80,
                    documents: 8,
                    messages: 12,
                    pinDocs: 2
                  },
                  {
                    id: 'EX-2024-087',
                    name: 'Johnson Properties',
                    status: '🟠 180D PHASE',
                    role: 'Title Examiner',
                    property: '456 Oak Ave, Downtown',
                    startDate: 'Dec 3, 2023',
                    deadline: '12 days left',
                    coordinator: 'Mike Chen',
                    agency: 'XYZ Properties',
                    progress: 60,
                    documents: 5,
                    messages: 8,
                    pinDocs: 1
                  }
                ].map((assignment) => (
                  <div key={assignment.id} className="border rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        📁 {assignment.id} - {assignment.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assignment.status.includes('45D') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">👤 My Role: {assignment.role}</p>
                        <p className="text-sm text-gray-600">🏢 Property: {assignment.property}</p>
                        <p className="text-sm text-gray-600">📅 Assignment Date: {assignment.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">⏰ Deadline: {assignment.deadline}</p>
                        <p className="text-sm text-gray-600">👥 Coordinator: {assignment.coordinator}</p>
                        <p className="text-sm text-gray-600">🏢 Agency: {assignment.agency}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">📊 Overall Progress (View Only)</span>
                        <span className="text-sm text-gray-600">{assignment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            assignment.status.includes('45D') ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{width: `${assignment.progress}%`}}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                      <div>📄 Documents Available: {assignment.documents}</div>
                      <div>💬 Messages: {assignment.messages}</div>
                      <div>🔒 PIN Docs: {assignment.pinDocs}</div>
                    </div>

                    <div className="flex space-x-3">
                      <button className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm">
                        <EyeIcon className="w-4 h-4 mr-2" />
                        👁️ View Details
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        📄 View Documents
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 text-sm">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                        💬 View Messages
                      </button>
                    </div>

                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⚠️ Read-only access - No editing capabilities
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">📁 Available Documents (View Only)</h2>
                <div className="flex space-x-3">
                  <input 
                    type="text" 
                    placeholder="🔍 Search documents..." 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Exchange ▼</option>
                  </select>
                  <button className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm">🔒 PIN Docs</button>
                </div>
              </div>

              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ <span className="font-medium">Third-party users cannot upload documents.</span> You have view and download access only.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">📁 EX-2024-001: Smith 1031 Exchange</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Purchase Agreement.pdf', date: 'Jan 20', viewable: true, pinRequired: false },
                      { name: 'Property Inspection.pdf', date: 'Jan 22', viewable: true, pinRequired: false },
                      { name: 'Title Report.pdf (PIN)', date: 'Jan 25', viewable: false, pinRequired: true },
                      { name: 'Legal Review Draft.pdf', date: 'Jan 28', viewable: true, pinRequired: false }
                    ].map((doc, i) => (
                      <PinProtectedAccess
                        key={i}
                        document={{
                          id: `doc-${i}`,
                          name: doc.name,
                          uploadedAt: doc.date,
                          uploadedBy: 'System',
                          pinProtected: doc.pinRequired,
                          accessed: false
                        }}
                        onPinVerified={(docId) => console.log('PIN verified for', docId)}
                        onDownload={(docId) => console.log('Download', docId)}
                      />
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">📁 EX-2024-087: Johnson Properties</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Property Deed.pdf', date: 'Dec 5', viewable: true, pinRequired: false },
                      { name: 'Financial Records.pdf (PIN)', date: 'Dec 10', viewable: false, pinRequired: true },
                      { name: 'Title Search Results.pdf', date: 'Today', viewable: true, pinRequired: false }
                    ].map((doc, i) => (
                      <PinProtectedAccess
                        key={i}
                        document={{
                          id: `doc-087-${i}`,
                          name: doc.name,
                          uploadedAt: doc.date,
                          uploadedBy: 'System',
                          pinProtected: doc.pinRequired,
                          accessed: false
                        }}
                        onPinVerified={(docId) => console.log('PIN verified for', docId)}
                        onDownload={(docId) => console.log('Download', docId)}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">📋 Access Controls</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>👁️ <span className="font-medium">View & Download Only</span> - No upload permissions</p>
                    <p>🔐 <span className="font-medium">PIN Access:</span> Enter PIN for restricted documents</p>
                    <p>📊 <span className="font-medium">Activity Logged:</span> All document access is tracked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Message Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-600" />
                  <span className="text-2xl font-bold text-red-600">3</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Unread Messages</p>
                <p className="text-xs text-gray-500 mt-1">From coordinators</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">8</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Total Conversations</p>
                <p className="text-xs text-gray-500 mt-1">Across assignments</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900">5</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Resolved Queries</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </div>

            {/* Messages Interface */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-700">
                  <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
                  <span className="font-medium">Read-Only Access:</span> You can view messages but cannot send new messages. Contact your coordinator through approved channels.
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {[
                  {
                    from: 'Sarah Johnson',
                    role: 'Exchange Coordinator',
                    exchange: 'EX-001',
                    subject: 'Document Review Complete',
                    message: 'The legal review for the property has been completed. Please review the attached findings.',
                    time: '10 minutes ago',
                    unread: true
                  },
                  {
                    from: 'Michael Chen',
                    role: 'Exchange Coordinator',
                    exchange: 'EX-087',
                    subject: 'Title Search Update',
                    message: 'The preliminary title search has been completed. No issues found.',
                    time: '2 hours ago',
                    unread: true
                  },
                  {
                    from: 'Emily Rodriguez',
                    role: 'Admin',
                    exchange: 'General',
                    subject: 'Access Permissions Updated',
                    message: 'Your access permissions for EX-043 have been updated as requested.',
                    time: '1 day ago',
                    unread: true
                  },
                  {
                    from: 'Sarah Johnson',
                    role: 'Exchange Coordinator',
                    exchange: 'EX-001',
                    subject: 'New Documents Available',
                    message: 'Three new documents have been uploaded to the exchange folder.',
                    time: '2 days ago',
                    unread: false
                  },
                  {
                    from: 'System',
                    role: 'Automated',
                    exchange: 'All',
                    subject: 'Monthly Access Report',
                    message: 'Your monthly document access report is now available.',
                    time: '3 days ago',
                    unread: false
                  }
                ].map((msg, index) => (
                  <div key={index} className={`p-6 hover:bg-gray-50 cursor-pointer ${msg.unread ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium">
                          {msg.from.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {msg.from} 
                              <span className="text-gray-500 font-normal"> • {msg.role}</span>
                            </p>
                            <p className="text-xs text-gray-500">Exchange: {msg.exchange}</p>
                          </div>
                          <span className="text-xs text-gray-500">{msg.time}</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mt-2">
                          {msg.unread && <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>}
                          {msg.subject}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{msg.message}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <button className="text-xs text-blue-600 hover:text-blue-800">View Details</button>
                          <button className="text-xs text-gray-600 hover:text-gray-800">Mark as Read</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Communication Guidelines */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📞 Communication Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Approved Contact Methods</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>✅ View coordinator messages in this portal</p>
                    <p>✅ Email designated coordinators directly</p>
                    <p>✅ Phone during business hours (9 AM - 5 PM)</p>
                    <p>✅ Schedule virtual meetings through coordinators</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Response Times</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>⏱️ Urgent matters: Within 2 hours</p>
                    <p>⏱️ General queries: Within 24 hours</p>
                    <p>⏱️ Document reviews: 2-3 business days</p>
                    <p>⏱️ Legal opinions: 3-5 business days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">📊 Reports & Activity Logs</h2>
                <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export My Activity
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: '📄 Document Access Log',
                    description: 'Complete history of all documents you have viewed or downloaded',
                    lastGenerated: '2024-01-15',
                    type: 'Activity',
                    items: 47
                  },
                  {
                    title: '⏱️ Time Tracking Report',
                    description: 'Summary of time spent on each exchange assignment',
                    lastGenerated: '2024-01-14',
                    type: 'Time',
                    items: 'This Month'
                  },
                  {
                    title: '📊 Assignment Summary',
                    description: 'Overview of all your exchange assignments and their status',
                    lastGenerated: '2024-01-13',
                    type: 'Summary',
                    items: 12
                  },
                  {
                    title: '🔒 Security Audit Trail',
                    description: 'All login attempts and security-related activities',
                    lastGenerated: '2024-01-12',
                    type: 'Security',
                    items: 'Last 30 days'
                  }
                ].map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        {report.type}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>📅 Last Generated: {report.lastGenerated}</p>
                      <p>📊 Coverage: {report.items}</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4">
                      <button className="flex-1 text-sm bg-gray-100 text-gray-800 py-2 rounded hover:bg-gray-200">
                        👁️ View Report
                      </button>
                      <button className="flex-1 text-sm bg-blue-100 text-blue-800 py-2 rounded hover:bg-blue-200">
                        📤 Export PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Activity Summary (Last 30 Days)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">47</p>
                  <p className="text-sm text-gray-600">Documents Viewed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">12</p>
                  <p className="text-sm text-gray-600">Documents Downloaded</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">28</p>
                  <p className="text-sm text-gray-600">Login Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">156</p>
                  <p className="text-sm text-gray-600">Total Hours</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🕐 Recent Activity Log</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { time: '10 minutes ago', activity: 'Document Viewed', exchange: 'EX-001', details: 'Legal Review Draft.pdf' },
                      { time: '2 hours ago', activity: 'Login', exchange: 'System', details: 'Successful authentication' },
                      { time: '3 hours ago', activity: 'Document Downloaded', exchange: 'EX-087', details: 'Title Search Results.pdf' },
                      { time: 'Yesterday', activity: 'Message Viewed', exchange: 'EX-001', details: 'From Sarah Johnson' },
                      { time: '2 days ago', activity: 'Report Generated', exchange: 'All', details: 'Monthly Activity Summary' }
                    ].map((log, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.activity.includes('Login') ? 'bg-green-100 text-green-800' :
                            log.activity.includes('Downloaded') ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.activity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.exchange}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ThirdPartyDashboard;