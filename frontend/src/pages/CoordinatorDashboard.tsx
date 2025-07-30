import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BellIcon,
  DocumentIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UserPlusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

import { Exchange, Task, Document, User } from '../services/supabase';
import { usePermissions } from '../hooks/usePermissions';

interface CoordinatorStats {
  exchanges: {
    total: number;
    active: number;
    pending: number;
    completed: number;
    totalValue: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    myTasks: number;
  };
  team: {
    total: number;
    active: number;
  };
  documents: {
    total: number;
    recent: number;
  };
}

const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<CoordinatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [totalExchanges, setTotalExchanges] = useState(0);
  const [activeExchanges, setActiveExchanges] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [pendingExchanges, setPendingExchanges] = useState(0);
  const [completedExchanges, setCompletedExchanges] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    due_date: '',
    assigned_to: ''
  });

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [exchangesData, tasksData, documentsData, usersData] = await Promise.all([
        apiService.getExchanges(),
        apiService.getTasks(),
        apiService.getDocuments(),
        apiService.getUsers()
      ]);

      setExchanges(exchangesData);
      setTasks(tasksData);
      setDocuments(documentsData);
      setUsers(usersData.filter((u: User) => u.is_active));
      
      // Calculate coordinator-specific stats
      const coordinatorStats: CoordinatorStats = {
        exchanges: {
          total: exchangesData.length,
          active: exchangesData.filter(e => e.status === 'In Progress').length,
          pending: exchangesData.filter(e => e.status === 'Draft').length,
          completed: exchangesData.filter(e => e.status === 'Completed').length,
          totalValue: exchangesData.reduce((sum, e) => sum + (e.exchange_value || 0), 0)
        },
        tasks: {
          total: tasksData.length,
          pending: tasksData.filter(t => t.status === 'PENDING').length,
          inProgress: tasksData.filter(t => t.status === 'IN_PROGRESS').length,
          completed: tasksData.filter(t => t.status === 'COMPLETED').length,
          overdue: tasksData.filter(t => 
            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED'
          ).length,
          myTasks: tasksData.filter(t => t.assigned_to === user?.id).length
        },
        team: {
          total: usersData.length,
          active: usersData.filter(u => u.is_active).length
        },
        documents: {
          total: documentsData.length,
          recent: documentsData.filter(d => 
            new Date(d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        }
      };
      
      setStats(coordinatorStats);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeSelect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
  };

  const handleTaskStatusUpdate = async (taskId: string, status: string) => {
    try {
      await apiService.updateTaskStatus(taskId, status as Task['status']);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError('Failed to update task status');
    }
  };

  const handleCreateTask = async () => {
    if (!selectedExchange || !newTask.title || !newTask.due_date) return;

    try {
      await apiService.createTask({
        ...newTask,
        exchange_id: selectedExchange.id
      });
      setShowTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        assigned_to: ''
      });
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to create task:', error);
      setError('Failed to create task');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'ON_HOLD': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = (exchange.exchange_name || exchange.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchange.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchange.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exchange.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const downloadDocument = async (documentItem: Document, pin?: string) => {
    try {
      if (documentItem.pin_required && !pin) {
        // Show PIN input modal
        return;
      }
      
      const blob = await apiService.downloadDocument(documentItem.id, pin);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = documentItem.original_filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
              <p className="text-sm text-gray-600">Manage multiple exchanges and coordinate teams</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <BellIcon className="w-4 h-4 mr-2" />
                Notifications
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'exchanges', label: 'Exchanges', icon: DocumentIcon },
              { id: 'tasks', label: 'Task Management', icon: CheckIcon },
              { id: 'documents', label: 'Documents', icon: ArrowDownTrayIcon },
              { id: 'team', label: 'Team Management', icon: UserGroupIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
    <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Exchanges</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalExchanges}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Exchanges</dt>
                        <dd className="text-lg font-medium text-gray-900">{activeExchanges}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalTasks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Overdue Tasks</dt>
                        <dd className="text-lg font-medium text-gray-900">{overdueTasks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Status Overview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Exchange Status Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{pendingExchanges}</div>
                    <div className="text-sm text-gray-500">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{activeExchanges}</div>
                    <div className="text-sm text-gray-500">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completedExchanges}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
                    <div className="text-sm text-gray-500">Overdue Tasks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckIcon className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-500">
                            {exchanges.find(e => e.id === task.exchange_id)?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Recent Exchanges */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Exchanges</h3>
          <div className="flex space-x-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search exchanges..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExchanges.slice(0, 6).map((exchange) => (
            <div
              key={exchange.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedExchange?.id === exchange.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleExchangeSelect(exchange)}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900 truncate text-sm">{exchange.exchange_name || exchange.name}</h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(exchange.status)}`}>
                  {exchange.status}
                </span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <UserIcon className="h-3 w-3 mr-1" />
                  <span>{exchange.client?.first_name} {exchange.client?.last_name}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  <span>Started: {exchange.start_date ? formatDateTime(exchange.start_date).split(',')[0] : 'N/A'}</span>
                </div>
                {exchange.exchange_value && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                    <span>{formatCurrency(exchange.exchange_value)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tasks: {tasks.filter(task => task.exchange_id === exchange.id).length}</span>
                  <span>Docs: {documents.filter(doc => doc.exchange_id === exchange.id).length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredExchanges.length === 0 && (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No exchanges found</p>
          </div>
        )}
      </div>

      {/* Selected Exchange Details */}
      {selectedExchange && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Exchange Details: {selectedExchange.exchange_name || selectedExchange.name}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Assign User
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Task
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Name: {selectedExchange.client?.first_name} {selectedExchange.client?.last_name}</p>
                <p>Email: {selectedExchange.client?.email}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Exchange Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Status: <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedExchange.status)}`}>
                  {selectedExchange.status}
                </span></p>
                <p>Start Date: {selectedExchange.start_date ? formatDateTime(selectedExchange.start_date).split(',')[0] : 'N/A'}</p>
                {selectedExchange.exchange_value && (
                  <p>Value: {formatCurrency(selectedExchange.exchange_value)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Assign User Modal */}
      {showAssignModal && selectedExchange && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign User to Exchange</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="client">Client</option>
                    <option value="intermediary">Intermediary</option>
                    <option value="qualified_intermediary">Qualified Intermediary</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && selectedExchange && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Task description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setNewTask({
                      title: '',
                      description: '',
                      priority: 'MEDIUM',
                      due_date: '',
                      assigned_to: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboard; 