import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  CheckSquare,
  Clock,
  FileText, 
  Lock, 
  Plus, 
  Search, 
  Settings, 
  Shield, 
  Upload, 
  User, 
  Users, 
  AlertTriangle,
  Download,
  Send,
  Paperclip,
  BarChart3,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  MapPin,
  DollarSign,
  MoreVertical,
  Filter,
  Grid,
  List,
  Edit,
  Trash2,
  Key,
  Globe,
  Shield as ShieldIcon,
  UserCheck,
  UserX,
  UserPlus,
  Archive,
  RotateCcw,
  Copy,
  ExternalLink,
  Info,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  Activity,
  Database,
  Server,
  HardDrive,
  Wifi,
  Zap,
  Target,
  Award,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  MessageSquare as MessageSquareIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { 
  exchangeService, 
  documentService, 
  taskService, 
  messageService,
  userService
} from '../services/api';

interface Exchange {
  id: string;
  name: string;
  status: 'PENDING' | '45D' | '180D' | 'COMPLETED';
  client_id: string;
  coordinator_id: string;
  start_date: string;
  completion_date: string;
  created_at: string;
  updated_at: string;
  client?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  coordinator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  participants?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  exchange_id: string;
  assigned_to: string;
  due_date: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  exchange_id: string;
  uploaded_by: string;
  category: string;
  pin_required: boolean;
  created_at: string;
  updated_at: string;
  uploader?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const CoordinatorDashboard: React.FC = () => {
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    due_date: '',
    assigned_to: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [exchangesData, tasksData, documentsData, usersData] = await Promise.all([
        exchangeService.getExchanges(),
        taskService.getTasks(),
        documentService.getDocuments(),
        userService.getUsers()
      ]);

      setExchanges(exchangesData);
      setTasks(tasksData);
      setDocuments(documentsData);
      setUsers(usersData.filter((u: User) => u.is_active));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeSelect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
  };

  const handleTaskStatusUpdate = async (taskId: string, status: string) => {
    try {
      await taskService.updateTask(taskId, { status });
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedExchange || !newTask.title || !newTask.due_date) return;

    try {
      await taskService.createTask({
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
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case '45D': return 'bg-blue-100 text-blue-800';
      case '180D': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = exchange.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchange.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchange.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exchange.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Dashboard statistics
  const totalExchanges = exchanges.length;
  const pendingExchanges = exchanges.filter(e => e.status === 'PENDING').length;
  const activeExchanges = exchanges.filter(e => e.status === '45D' || e.status === '180D').length;
  const completedExchanges = exchanges.filter(e => e.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  const overdueTasks = tasks.filter(t => {
    const dueDate = new Date(t.due_date);
    const today = new Date();
    return t.status !== 'COMPLETED' && dueDate < today;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                <Bell className="w-4 h-4 mr-2" />
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
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'exchanges', label: 'Exchanges', icon: FileText },
              { id: 'tasks', label: 'Task Management', icon: CheckSquare },
              { id: 'documents', label: 'Documents', icon: Download },
              { id: 'team', label: 'Team Management', icon: Users }
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
                      <FileText className="h-6 w-6 text-gray-400" />
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
                      <Clock className="h-6 w-6 text-gray-400" />
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
                      <CheckSquare className="h-6 w-6 text-gray-400" />
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
                      <AlertTriangle className="h-6 w-6 text-gray-400" />
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
                        <CheckSquare className="w-4 h-4 text-gray-400 mr-3" />
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

        {activeTab === 'exchanges' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Exchanges
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search by name or client..."
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="45D">45 Day</option>
                    <option value="180D">180 Day</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exchanges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map((exchange) => (
                <div
                  key={exchange.id}
                  className={`bg-white shadow rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedExchange?.id === exchange.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleExchangeSelect(exchange)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{exchange.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exchange.status)}`}>
                      {exchange.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <span>
                        {exchange.client?.first_name} {exchange.client?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Started: {new Date(exchange.start_date).toLocaleDateString()}</span>
                    </div>
                    {exchange.completion_date && (
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Due: {new Date(exchange.completion_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tasks</span>
                      <span className="font-medium">
                        {tasks.filter(task => task.exchange_id === exchange.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Documents</span>
                      <span className="font-medium">
                        {documents.filter(doc => doc.exchange_id === exchange.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Participants</span>
                      <span className="font-medium">
                        {exchange.participants?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Exchange Details */}
            {selectedExchange && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Exchange Details: {selectedExchange.name}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign User
                    </button>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
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
                      <p>Start Date: {new Date(selectedExchange.start_date).toLocaleDateString()}</p>
                      {selectedExchange.completion_date && (
                        <p>Completion Date: {new Date(selectedExchange.completion_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Participants */}
                {selectedExchange.participants && selectedExchange.participants.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Participants</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedExchange.participants.map((participant) => (
                        <div key={participant.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant.first_name} {participant.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{participant.email}</p>
                              <p className="text-xs text-gray-400 capitalize">{participant.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Task Management</h3>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </button>
              </div>
              
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      <span>Exchange: {exchanges.find(e => e.id === task.exchange_id)?.name}</span>
                      <span>Assigned: {task.assigned_user ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}` : 'Unassigned'}</span>
                    </div>

                    <div className="mt-3 flex space-x-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No tasks found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((document) => (
                  <div key={document.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <h4 className="font-medium text-gray-900 truncate">{document.original_filename}</h4>
                          <p className="text-sm text-gray-500">{document.category}</p>
                        </div>
                      </div>
                      {document.pin_required && (
                        <Lock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>Exchange: {exchanges.find(e => e.id === document.exchange_id)?.name}</span>
                      <span>By: {document.uploader ? `${document.uploader.first_name} ${document.uploader.last_name}` : 'Unknown'}</span>
                    </div>
                    
                    <button
                      onClick={() => documentService.downloadDocument(document.id, document.original_filename)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                ))}
                
                {documents.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-full">No documents found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
    <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      <p>Exchanges: {exchanges.filter(e => e.participants?.some(p => p.id === user.id)).length}</p>
                      <p>Tasks: {tasks.filter(t => t.assigned_to === user.id).length}</p>
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-full">No team members found.</p>
                )}
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