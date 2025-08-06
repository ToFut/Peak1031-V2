import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { roleBasedApiService } from '../../services/roleBasedApiService';
import {
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface ClientStats {
  exchanges: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    urgent: number;
    thisWeek: number;
    completed: number;
  };
  documents: {
    total: number;
    requireSignature: number;
    recent: number;
  };
  messages: {
    unread: number;
    recent: number;
  };
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'my_exchanges' | 'my_tasks' | 'documents' | 'messages'>('overview');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    exchanges: { total: 0, active: 0, completed: 0 },
    tasks: { total: 0, urgent: 0, thisWeek: 0, completed: 0 },
    documents: { total: 0, requireSignature: 0, recent: 0 },
    messages: { unread: 0, recent: 0 }
  });

  useEffect(() => {
    if (user?.role === 'client') {
      loadClientData();
    }
  }, [user]);

  const loadClientData = async () => {
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
      const myTasks = dashboardData.tasks || [];
      const myDocuments = dashboardData.documents || [];

      setExchanges(myExchanges);
      setTasks(myTasks);
      setDocuments(myDocuments);

      // Calculate stats
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      setStats({
        exchanges: {
          total: myExchanges.length,
          active: myExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
          completed: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length
        },
        tasks: {
          total: myTasks.length,
          urgent: myTasks.filter((t: any) => new Date(t.dueDate) < now && t.status !== 'COMPLETED').length,
          thisWeek: myTasks.filter((t: any) => new Date(t.dueDate) <= weekFromNow && t.status !== 'COMPLETED').length,
          completed: myTasks.filter((t: any) => t.status === 'COMPLETED').length
        },
        documents: {
          total: myDocuments.length,
          requireSignature: myDocuments.filter((d: any) => d.requiresSignature).length,
          recent: myDocuments.filter((d: any) => new Date(d.createdAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length
        },
        messages: {
          unread: 7, // Mock data
          recent: 23
        }
      });

    } catch (err) {
      console.error('Failed to load client data:', err);
      setError('Failed to load your dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'client') {
    return (
      <Layout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the client dashboard.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your dashboard...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Client Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">👋 Welcome back, {user.first_name} {user.last_name}</h1>
              <p className="text-blue-100 mt-1">
                Your personal 1031 exchange dashboard - Track your progress and stay updated
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">🕐 Last login: 2h</div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="font-medium">All exchanges on track</span>
              </div>
            </div>
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
              { id: 'my_exchanges', name: 'My Exchanges', icon: DocumentTextIcon },
              { id: 'my_tasks', name: 'My Tasks', icon: CheckCircleIcon },
              { id: 'documents', name: 'Documents', icon: DocumentArrowDownIcon },
              { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.exchanges.total}</p>
                    <p className="text-sm font-medium text-gray-600">My Exchanges</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.exchanges.active} active, {stats.exchanges.completed} completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-red-100">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.tasks.urgent}</p>
                    <p className="text-sm font-medium text-gray-600">Urgent Tasks</p>
                    <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <CalendarIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.tasks.thisWeek}</p>
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-xs text-gray-500 mt-1">Tasks due this week</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{Math.round((stats.tasks.completed / Math.max(stats.tasks.total, 1)) * 100)}</p>
                    <p className="text-sm font-medium text-gray-600">Progress</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.tasks.completed}/{stats.tasks.total} tasks completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Alerts */}
            {stats.tasks.urgent > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
                  <h2 className="text-lg font-semibold text-red-900">⚠️ Urgent Actions Required</h2>
                  <span className="ml-auto text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[View All]</span>
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter(task => new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED')
                    .slice(0, 3)
                    .map((task, index) => (
                      <div key={task.id || index} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-red-900">{task.title || 'Exchange EX-2024-001 approaching 45-day deadline'}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description || 'Review and sign required documents'}</p>
                            <p className="text-xs text-red-600 mt-2">
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '5 days remaining'} (Overdue)
                            </p>
                          </div>
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* My Exchanges Quick View */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-blue-900">📊 My Exchanges Overview</h2>
                <span className="text-sm text-gray-600">Total: {stats.exchanges.total}</span>
              </div>
              <div className="space-y-4">
                {exchanges.slice(0, 3).map((exchange, index) => {
                  const statuses = ['🟡 45D Phase', '🟠 180D Phase', '🟢 COMPLETED'];
                  const progress = [80, 60, 100];
                  const nextActions = ['Review', 'Upload', 'Done'];
                  const dueDays = [5, 12, 0];
                  
                  return (
                    <div key={exchange.id || index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-blue-900">📁 {exchange.name || `EX-${String(index + 1).padStart(3, '0')}`}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {statuses[index]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Progress: {progress[index]}%</p>
                        <p className="text-xs mt-1">Next: {nextActions[index]}</p>
                        {dueDays[index] > 0 && <p className="text-xs text-red-600">Due: {dueDays[index]} days remaining</p>}
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">[👁️ View]</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">[💬 Messages]</button>
                        <button className="text-purple-600 hover:text-purple-800 text-sm">[📄 Docs]</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* My Exchanges Tab */}
        {activeTab === 'my_exchanges' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">📊 My Exchanges</h2>
                <div className="flex space-x-3">
                  <input 
                    type="text" 
                    placeholder="🔍 Search my exchanges..." 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Status ▼</option>
                    <option>45D Phase</option>
                    <option>180D Phase</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        📁 EX-2024-{String(i).padStart(3, '0')} - {['Smith 1031 Exchange', 'Johnson Properties', 'Miller Exchange'][i-1]}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        i === 1 ? 'bg-yellow-100 text-yellow-800' :
                        i === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {['🟡 45D PHASE', '🟠 180D PHASE', '🟢 COMPLETED'][i-1]}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">🏢 Property: {['123 Main St, Springfield', '456 Oak Ave, Downtown', '789 Pine St, Uptown'][i-1]}</p>
                        <p className="text-sm text-gray-600">📅 Start Date: {['Jan 15, 2024', 'Dec 3, 2023', 'Oct 10, 2023'][i-1]}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">👥 Coordinator: {['Sarah Johnson', 'Mike Chen', 'Lisa Wang'][i-1]}</p>
                        <p className="text-sm text-gray-600">🏢 Agency: {['ABC Realty', 'XYZ Properties', 'Elite Exchange'][i-1]}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">📊 Progress</span>
                        <span className="text-sm text-gray-600">{[80, 60, 100][i-1]}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            i === 1 ? 'bg-yellow-500' :
                            i === 2 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{width: `${[80, 60, 100][i-1]}%`}}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                      <div>✅ Tasks: {[8, 6, 12][i-1]}/{[10, 10, 12][i-1]} Complete</div>
                      <div>📄 Documents: {[12, 8, 15][i-1]}</div>
                      <div>💬 Messages: {[23, 15, 8][i-1]}</div>
                    </div>

                    <div className="flex space-x-3">
                      <button className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm">
                        <EyeIcon className="w-4 h-4 mr-2" />
                        👁️ View Details
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                        💬 Messages
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 text-sm">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        📄 Documents
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 text-sm">
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        ✅ Tasks
                      </button>
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
                <h2 className="text-lg font-semibold text-gray-900">📁 My Documents</h2>
                <div className="flex space-x-3">
                  <input 
                    type="text" 
                    placeholder="🔍 Search documents..." 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Exchange ▼</option>
                  </select>
                  <div className="flex space-x-2">
                    <button className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">[📋 List View]</button>
                    <button className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm">[🎯 Grid View]</button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">📁 EX-2024-001: Smith 1031 Exchange</h3>
                  <div className="space-y-2">
                    {[
                      { name: 'Purchase Agreement.pdf', date: 'Jan 20', author: 'S.Johnson', access: '📥' },
                      { name: 'Property Inspection.pdf', date: 'Jan 22', author: 'You', access: '📥' },
                      { name: 'Title Report.pdf (PIN)', date: 'Jan 25', author: 'Legal', access: '🔐' },
                      { name: 'Insurance Policy.pdf', date: 'Jan 28', author: 'Agent', access: '📥' }
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <DocumentArrowDownIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">📅 {doc.date} 👤 {doc.author}</p>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">{doc.access}</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">📋 Document Access Guide</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>📥 Download - View and download documents for your exchanges</p>
                    <p>👁️ Preview - Quick preview without downloading</p>
                    <p>🔒 PIN Required - Enter PIN to access restricted documents</p>
                    <p>🆕 New - Documents added in the last 7 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientDashboard;