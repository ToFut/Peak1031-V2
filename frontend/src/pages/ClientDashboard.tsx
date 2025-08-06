import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { roleBasedApiService } from '../services/roleBasedApiService';
import { ExchangeCard } from '../components/ExchangeCard';
import RoleSpecificWidgets from '../components/dashboard/RoleSpecificWidgets';
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
  BellIcon
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

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { permissions, ui, canView, getSidebarItems, getPageTitle } = useRolePermissions();
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

  const [activeTab, setActiveTab] = useState(getSidebarItems()[0] || 'overview');

  useEffect(() => {
    if (user) {
      loadClientData();
    }
  }, [user]);

  const loadClientData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use role-based API service for automatic filtering
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role,
        company: user.company
      });
      
      const myExchanges = dashboardData.exchanges;
      const myTasks = dashboardData.tasks;
      
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{stats.exchanges.total}</span> exchanges
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-600">{stats.exchanges.active}</span> active
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-orange-600">{stats.tasks.urgent}</span> urgent tasks
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600">
          Welcome, {user?.firstName} {user?.lastName}
        </span>
      </div>
    </div>
  );

  return (
    <Layout headerContent={headerContent}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs - Role-based */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
              { id: 'my_exchanges', name: getPageTitle('exchanges') || 'My Exchanges', icon: DocumentTextIcon },
              { id: 'my_tasks', name: getPageTitle('tasks') || 'My Tasks', icon: CheckCircleIcon },
              { id: 'documents', name: getPageTitle('documents') || 'Documents', icon: DocumentArrowDownIcon },
              { id: 'messages', name: getPageTitle('messages') || 'Messages', icon: ChatBubbleLeftRightIcon }
            ].filter(tab => getSidebarItems().includes(tab.id)).map((tab) => (
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

            {/* Role-Specific Widgets */}
            <RoleSpecificWidgets 
              data={{
                exchanges,
                tasks,
                contacts: [],
                documents: []
              }}
            />

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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Documents</h2>
            <p className="text-gray-600">Document interface will be implemented here.</p>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
            <p className="text-gray-600">Messaging interface will be implemented here.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientDashboard;