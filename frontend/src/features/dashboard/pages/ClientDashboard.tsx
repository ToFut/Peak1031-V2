import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { smartApi } from '@/shared/services/smartApi';
import { ExchangeCard } from '../../exchanges/components/ExchangeCard';
import {
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  BellIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ClientStats {
  exchanges: {
    total: number;
    active: number;
    completed: number;
    pending: number;
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

const EnhancedClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    exchanges: { total: 0, active: 0, completed: 0, pending: 0 },
    tasks: { total: 0, urgent: 0, thisWeek: 0, completed: 0 },
    documents: { total: 0, requireSignature: 0, recent: 0 },
    messages: { unread: 0, recent: 0 }
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'exchanges' | 'tasks' | 'documents' | 'messages'>('overview');

  useEffect(() => {
    if (user) {
      loadClientData();
    }
  }, [user]);

  const loadClientData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [exchangesRes, tasksRes] = await Promise.all([
        smartApi.getExchanges(),
        smartApi.getTasks()
      ]);
      
      const allExchanges = exchangesRes.exchanges || exchangesRes || [];
      const allTasks = tasksRes.tasks || tasksRes || [];
      
      // Filter for client's exchanges
      const myExchanges = allExchanges.filter((ex: any) => {
        if (ex.clientId === user.id) return true;
        if (ex.coordinatorId === user.id) return true;
        if (ex.exchangeParticipants) {
          return ex.exchangeParticipants.some((p: any) => 
            p.contact?.email === user.email || p.user?.id === user.id
          );
        }
        return false;
      });
      
      // Filter for client's tasks
      const myTasks = allTasks.filter((task: any) => 
        task.assignedTo === user.id || 
        myExchanges.some((ex: any) => ex.id === task.exchangeId)
      );
      
      setExchanges(myExchanges);
      setTasks(myTasks);
      
      const now = new Date();
      const thisWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      setStats({
        exchanges: {
          total: myExchanges.length,
          active: myExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
          completed: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length,
          pending: myExchanges.filter((ex: any) => ex.status === 'PENDING').length
        },
        tasks: {
          total: myTasks.length,
          urgent: myTasks.filter((task: any) => {
            if (!task.dueDate || task.status === 'COMPLETED') return false;
            return new Date(task.dueDate) < now;
          }).length,
          thisWeek: myTasks.filter((task: any) => {
            if (!task.dueDate || task.status === 'COMPLETED') return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= now && dueDate <= thisWeekEnd;
          }).length,
          completed: myTasks.filter((task: any) => task.status === 'COMPLETED').length
        },
        documents: {
          total: 0, // Would need documents API
          requireSignature: 0,
          recent: 0
        },
        messages: {
          unread: 0, // Would need messages API
          recent: 0
        }
      });
      
    } catch (err) {
      console.error('Failed to load client data:', err);
      setError('Failed to load your exchange data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    urgent?: boolean;
  }> = ({ title, value, subtitle, icon: Icon, color, urgent = false }) => (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${urgent ? 'text-red-700' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`w-12 h-12 text-${color}-200`} />
      </div>
    </div>
  );

  const TaskCard: React.FC<{ task: any }> = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isUrgent = task.dueDate && new Date(task.dueDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    
    return (
      <div className={`border rounded-lg p-4 ${isOverdue ? 'border-red-200 bg-red-50' : isUrgent ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-medium ${isOverdue ? 'text-red-900' : isUrgent ? 'text-orange-900' : 'text-gray-900'}`}>
              {task.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            {task.dueDate && (
              <p className={`text-xs mt-2 ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-500'}`}>
                Due: {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {isOverdue && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
            {task.status === 'COMPLETED' && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 mt-2">Loading your dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar Navigation */}
      <div className="w-80 bg-white shadow-lg">
        {/* Client Header with Blue Theme */}
        <div className="bg-gradient-to-r from-blue-600 to-sky-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Client Dashboard</h1>
              <p className="text-sm text-blue-100">{user?.company || user?.email || 'My Exchange Portal'}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 space-y-4 mt-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.exchanges.active}</p>
                <p className="text-sm opacity-90">Active Exchanges</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.tasks.urgent}</p>
                <p className="text-sm opacity-90">Urgent Tasks</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.messages.unread}</p>
                <p className="text-sm opacity-90">Unread Messages</p>
              </div>
              <ChatBubbleLeftRightIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-6 space-y-2 mt-6">
          {[
            { name: 'Overview', id: 'overview', icon: DocumentTextIcon },
            { name: 'My Exchanges', id: 'exchanges', icon: DocumentTextIcon },
            { name: 'My Tasks', id: 'tasks', icon: CheckCircleIcon },
            { name: 'Documents', id: 'documents', icon: DocumentArrowDownIcon },
            { name: 'Messages', id: 'messages', icon: ChatBubbleLeftRightIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>

        {/* Notifications */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center text-xs text-orange-700">
              <BellIcon className="w-4 h-4 mr-2" />
              <span>{stats.messages.unread} new notifications</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Unified Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                {activeTab === 'overview' && <><DocumentTextIcon className="w-6 h-6 mr-2" /> My Dashboard</>}
                {activeTab === 'exchanges' && <><DocumentTextIcon className="w-6 h-6 mr-2" /> My Exchanges</>}
                {activeTab === 'tasks' && <><CheckCircleIcon className="w-6 h-6 mr-2" /> My Tasks</>}
                {activeTab === 'documents' && <><DocumentArrowDownIcon className="w-6 h-6 mr-2" /> My Documents</>}
                {activeTab === 'messages' && <><ChatBubbleLeftRightIcon className="w-6 h-6 mr-2" /> Messages</>}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'overview' && 'View your exchange activity and important updates'}
                {activeTab === 'exchanges' && 'Track and manage your 1031 exchanges'}
                {activeTab === 'tasks' && 'View and complete your assigned tasks'}
                {activeTab === 'documents' && 'Access and manage your exchange documents'}
                {activeTab === 'messages' && 'Communicate with your exchange team'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="My Exchanges"
                value={stats.exchanges.total}
                subtitle={`${stats.exchanges.active} active, ${stats.exchanges.completed} completed`}
                icon={DocumentTextIcon}
                color="blue"
              />
              <StatCard
                title="Urgent Tasks"
                value={stats.tasks.urgent}
                subtitle="Require immediate attention"
                icon={ExclamationTriangleIcon}
                color="red"
                urgent={stats.tasks.urgent > 0}
              />
              <StatCard
                title="This Week"
                value={stats.tasks.thisWeek}
                subtitle="Tasks due this week"
                icon={CalendarIcon}
                color="orange"
              />
              <StatCard
                title="Progress"
                value={Math.round((stats.tasks.completed / Math.max(stats.tasks.total, 1)) * 100)}
                subtitle={`${stats.tasks.completed}/${stats.tasks.total} tasks completed`}
                icon={CheckCircleIcon}
                color="green"
              />
            </div>

            {/* Urgent Actions */}
            {stats.tasks.urgent > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
                  <h2 className="text-lg font-semibold text-red-900">Urgent Actions Required</h2>
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter(task => {
                      if (!task.dueDate || task.status === 'COMPLETED') return false;
                      return new Date(task.dueDate) < new Date();
                    })
                    .slice(0, 3)
                    .map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                </div>
              </div>
            )}

            {/* My Active Exchanges */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Active Exchanges</h2>
                <button
                  onClick={() => setActiveTab('exchanges')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exchanges
                  .filter(ex => ['45D', '180D', 'PENDING'].includes(ex.status))
                  .slice(0, 4)
                  .map(exchange => (
                    <ExchangeCard
                      key={exchange.id}
                      exchange={exchange}
                      onClick={() => {}}
                      compact={true}
                      showProgress={true}
                    />
                  ))}
              </div>
              {exchanges.filter(ex => ['45D', '180D', 'PENDING'].includes(ex.status)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No active exchanges found</p>
                  <p className="text-sm mt-2">Your completed exchanges will appear here when available</p>
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Next Steps</h2>
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status !== 'COMPLETED')
                  .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
                  .slice(0, 5)
                  .map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                {tasks.filter(task => task.status !== 'COMPLETED').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    <p>All caught up!</p>
                    <p className="text-sm mt-2">No pending tasks at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholders */}
        {activeTab === 'exchanges' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Exchanges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exchanges.map(exchange => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  onClick={() => {}}
                  showProgress={true}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h2>
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Document Categories */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
                <div className="flex items-center space-x-2">
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Document Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <DocumentTextIcon className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">24</p>
                  <p className="text-sm text-gray-600">Total Documents</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <PencilSquareIcon className="w-8 h-8 text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">3</p>
                  <p className="text-sm text-gray-600">Require Signature</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">18</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <DocumentArrowDownIcon className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">6</p>
                  <p className="text-sm text-gray-600">Recent (30 days)</p>
                </div>
              </div>

              {/* Document Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <select className="border-gray-300 rounded-md text-sm">
                  <option>All Exchanges</option>
                  <option>Exchange #1234</option>
                  <option>Exchange #1235</option>
                </select>
                <select className="border-gray-300 rounded-md text-sm">
                  <option>All Types</option>
                  <option>Purchase Agreement</option>
                  <option>Assignment</option>
                  <option>Identification</option>
                  <option>45 Day Notice</option>
                  <option>180 Day Notice</option>
                </select>
                <select className="border-gray-300 rounded-md text-sm">
                  <option>All Status</option>
                  <option>Pending Signature</option>
                  <option>Signed</option>
                  <option>Draft</option>
                </select>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    id: 1,
                    name: 'Relinquished Property Sale Agreement',
                    type: 'Purchase Agreement',
                    exchange: '#1234',
                    status: 'signed',
                    date: '2024-01-10',
                    size: '2.4 MB',
                    requiresSignature: false
                  },
                  {
                    id: 2,
                    name: '45 Day Identification Notice',
                    type: '45 Day Notice',
                    exchange: '#1234',
                    status: 'pending',
                    date: '2024-01-15',
                    size: '156 KB',
                    requiresSignature: true
                  },
                  {
                    id: 3,
                    name: 'Exchange Agreement',
                    type: 'Agreement',
                    exchange: '#1234',
                    status: 'signed',
                    date: '2024-01-05',
                    size: '3.1 MB',
                    requiresSignature: false
                  },
                  {
                    id: 4,
                    name: 'Property Identification Form',
                    type: 'Identification',
                    exchange: '#1235',
                    status: 'draft',
                    date: '2024-01-14',
                    size: '89 KB',
                    requiresSignature: true
                  },
                  {
                    id: 5,
                    name: 'Assignment of Rights',
                    type: 'Assignment',
                    exchange: '#1234',
                    status: 'signed',
                    date: '2024-01-08',
                    size: '1.8 MB',
                    requiresSignature: false
                  },
                  {
                    id: 6,
                    name: 'Replacement Property Purchase',
                    type: 'Purchase Agreement',
                    exchange: '#1235',
                    status: 'pending',
                    date: '2024-01-16',
                    size: '2.9 MB',
                    requiresSignature: true
                  }
                ].map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <DocumentTextIcon className="w-10 h-10 text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{doc.name}</h3>
                          <p className="text-xs text-gray-500">{doc.type}</p>
                        </div>
                      </div>
                      {doc.requiresSignature && (
                        <span className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          <PencilSquareIcon className="w-3 h-3 mr-1" />
                          Sign
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Exchange:</span>
                        <span className="font-medium">{doc.exchange}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === 'signed' ? 'bg-green-100 text-green-800' :
                          doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status === 'signed' && '✓ '}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Date:</span>
                        <span>{new Date(doc.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Size:</span>
                        <span>{doc.size}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
                      <button className="flex-1 flex items-center justify-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-xs font-medium">
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 text-xs font-medium">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      {doc.requiresSignature && (
                        <button className="flex-1 flex items-center justify-center px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100 text-xs font-medium">
                          <PencilSquareIcon className="w-4 h-4 mr-1" />
                          Sign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Document Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'Document signed', doc: '45 Day Identification Notice', time: '2 hours ago', icon: CheckCircleIcon, color: 'green' },
                  { action: 'Document uploaded', doc: 'Property Inspection Report', time: '5 hours ago', icon: DocumentArrowDownIcon, color: 'blue' },
                  { action: 'Signature requested', doc: 'Exchange Agreement Amendment', time: '1 day ago', icon: PencilSquareIcon, color: 'yellow' },
                  { action: 'Document viewed', doc: 'Relinquished Property Sale Agreement', time: '2 days ago', icon: EyeIcon, color: 'gray' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
                      <activity.icon className={`w-5 h-5 text-${activity.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.doc}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Message Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-red-600">5</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Unread Messages</p>
                <p className="text-xs text-gray-500 mt-1">Requires your attention</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <ClockIcon className="w-8 h-8 text-yellow-600" />
                  <span className="text-2xl font-bold text-gray-900">3</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Awaiting Response</p>
                <p className="text-xs text-gray-500 mt-1">From your coordinator</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900">28</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Total Conversations</p>
                <p className="text-xs text-gray-500 mt-1">Across all exchanges</p>
              </div>
            </div>

            {/* Messages Interface */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex h-[600px]">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <div className="overflow-y-auto h-[520px]">
                    {[
                      {
                        id: 1,
                        name: 'Sarah Johnson',
                        role: 'Exchange Coordinator',
                        lastMessage: "I've reviewed the property identification...",
                        time: '10 min ago',
                        unread: 2,
                        exchange: '#1234',
                        avatar: 'SJ'
                      },
                      {
                        id: 2,
                        name: 'Peak 1031 Support',
                        role: 'Support Team',
                        lastMessage: 'Your document has been approved',
                        time: '1 hour ago',
                        unread: 0,
                        exchange: 'General',
                        avatar: 'PS'
                      },
                      {
                        id: 3,
                        name: 'Michael Chen',
                        role: 'Title Agent',
                        lastMessage: 'The title search is complete',
                        time: '2 hours ago',
                        unread: 1,
                        exchange: '#1235',
                        avatar: 'MC'
                      },
                      {
                        id: 4,
                        name: 'Emily Rodriguez',
                        role: 'Exchange Coordinator',
                        lastMessage: 'Please review and sign the 45-day notice',
                        time: 'Yesterday',
                        unread: 0,
                        exchange: '#1236',
                        avatar: 'ER'
                      },
                      {
                        id: 5,
                        name: 'David Thompson',
                        role: 'Attorney',
                        lastMessage: 'The contract looks good',
                        time: '2 days ago',
                        unread: 0,
                        exchange: '#1234',
                        avatar: 'DT'
                      }
                    ].map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                          conversation.id === 1 ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {conversation.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">{conversation.name}</p>
                              <span className="text-xs text-gray-500">{conversation.time}</span>
                            </div>
                            <p className="text-xs text-gray-500">{conversation.role} • {conversation.exchange}</p>
                            <p className="text-sm text-gray-600 truncate mt-1">{conversation.lastMessage}</p>
                          </div>
                          {conversation.unread > 0 && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full">
                                {conversation.unread}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Thread */}
                <div className="flex-1 flex flex-col">
                  {/* Thread Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          SJ
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Sarah Johnson</p>
                          <p className="text-sm text-gray-500">Exchange Coordinator • Exchange #1234</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <BellIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        SJ
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-gray-900">Hi! I've reviewed the property identification documents you submitted. Everything looks good, but I need clarification on one of the replacement properties.</p>
                          <p className="text-xs text-gray-500 mt-2">Sarah Johnson • 10:30 AM</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 justify-end">
                      <div className="flex-1 max-w-lg">
                        <div className="bg-blue-600 rounded-lg p-4">
                          <p className="text-sm text-white">Sure! Which property do you need clarification on?</p>
                          <p className="text-xs text-blue-200 mt-2">You • 10:35 AM</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                        Me
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        SJ
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-gray-900">The property at 123 Oak Street - I need to verify if this is intended as your primary replacement property or as a backup option.</p>
                          <p className="text-xs text-gray-500 mt-2">Sarah Johnson • 10:38 AM</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        SJ
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-gray-900">Also, please remember that you have until February 28th to finalize your property identification. We're currently on day 32 of your 45-day window.</p>
                          <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                            <p className="text-sm font-medium text-yellow-800">⏰ 13 days remaining</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Sarah Johnson • 10:40 AM</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">New messages</span>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        SJ
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-gray-900">I've attached the property comparison sheet for your review. This should help you make the final decision.</p>
                          <div className="mt-3 p-3 bg-gray-50 rounded-md flex items-center space-x-3 cursor-pointer hover:bg-gray-100">
                            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Property_Comparison_Sheet.pdf</p>
                              <p className="text-xs text-gray-500">256 KB</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Sarah Johnson • Just now</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-end space-x-3">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <DocumentArrowDownIcon className="w-5 h-5" />
                      </button>
                      <div className="flex-1">
                        <textarea
                          placeholder="Type your message..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                          rows={2}
                        />
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm">
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">New Message</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <BellIcon className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <DocumentTextIcon className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Message History</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Report Issue</p>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedClientDashboard;