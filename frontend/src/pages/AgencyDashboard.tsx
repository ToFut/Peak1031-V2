import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  CheckSquare,
  FileText, 
  Lock, 
  MessageSquare, 
  Search, 
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
  MessageSquare as MessageSquareIcon,
  Building,
  PieChart,
  TrendingDown,
  DollarSign as DollarSignIcon,
  Users as UsersIcon,
  FileText as FileTextIcon2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { apiService } from '../services/api';

interface MockExchange {
  id: string;
  pp_matter_id: string;
  name: string;
  exchange_name?: string;
  status: 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  client_id: string;
  coordinator_id: string;
  start_date: string;
  exchange_value: number;
  identification_deadline: string;
  completion_deadline?: string;
  completion_date?: string;
  notes: string;
  pp_data: any;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

interface MockTask {
  id: string;
  exchange_id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to: string;
  due_date: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
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

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  exchange_count: number;
  total_value?: number;
}

const AgencyDashboard: React.FC = () => {
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [exchanges, setExchanges] = useState<MockExchange[]>([]);
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'exchanges' | 'tasks' | 'documents' | 'summary'>('summary');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [exchangesData, tasksData, documentsData] = await Promise.all([
        apiService.getExchanges(),
        apiService.getTasks(),
        apiService.getDocuments()
      ]);

      setExchanges(exchangesData as any);
      setTasks(tasksData as any);
      setDocuments(documentsData as any);
      
      // Extract unique clients from exchanges
      const clientMap = new Map<string, Client>();
      exchangesData.forEach((exchange: any) => {
        if (exchange.client) {
          const clientId = exchange.client_id;
          if (!clientMap.has(clientId)) {
            clientMap.set(clientId, {
              id: clientId,
              first_name: exchange.client.first_name,
              last_name: exchange.client.last_name,
              email: exchange.client.email,
              company: exchange.client.company,
              exchange_count: 1
            });
          } else {
            const existing = clientMap.get(clientId)!;
            existing.exchange_count += 1;
          }
        }
      });
      setClients(Array.from(clientMap.values()));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleExport = async () => {
    try {
      // This would call the export service
      console.log(`Exporting ${exportType} data...`);
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getExchangeStatusColor = (status: string) => {
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
    const matchesSearch = (exchange.exchange_name || exchange.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exchange.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const clientExchanges = selectedClient ? exchanges.filter(e => e.client_id === selectedClient.id) : [];
  const clientTasks = selectedClient ? tasks.filter(t => clientExchanges.some(e => e.id === t.exchange_id)) : [];
  const clientDocuments = selectedClient ? documents.filter(d => clientExchanges.some(e => e.id === d.exchange_id)) : [];

  // Agency statistics
  const totalExchanges = exchanges.length;
  const totalClients = clients.length;
  const totalTasks = tasks.length;
  const totalDocuments = documents.length;
  const pendingExchanges = exchanges.filter(e => e.status === 'Draft').length;
  const activeExchanges = exchanges.filter(e => e.status === 'In Progress').length;
  const completedExchanges = exchanges.filter(e => e.status === 'Completed').length;
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
              <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
              <p className="text-sm text-gray-600">Multi-client overview and management</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
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
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'exchanges', label: 'Exchanges', icon: FileText },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare },
              { id: 'documents', label: 'Documents', icon: Download },
              { id: 'reports', label: 'Reports', icon: PieChart }
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
            {/* Agency Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Building className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalClients}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

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
                      <Download className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalDocuments}</dd>
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

            {/* Top Clients */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Clients by Exchange Count</h3>
                <div className="space-y-4">
                  {clients
                    .sort((a, b) => b.exchange_count - a.exchange_count)
                    .slice(0, 5)
                    .map((client) => (
                      <div key={client.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{client.email}</p>
                            {client.company && (
                              <p className="text-xs text-gray-400">{client.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{client.exchange_count}</p>
                          <p className="text-xs text-gray-500">exchanges</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Client List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Clients</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                        selectedClient?.id === client.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <h4 className="font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </h4>
                            <p className="text-sm text-gray-500">{client.email}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {client.exchange_count} exchanges
                        </span>
                      </div>
                      
                      {client.company && (
                        <p className="text-sm text-gray-600 mb-2">
                          <Building className="w-4 h-4 inline mr-1" />
                          {client.company}
                        </p>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        <p>Active exchanges: {exchanges.filter(e => e.client_id === client.id && e.status !== 'Completed').length}</p>
                        <p>Completed exchanges: {exchanges.filter(e => e.client_id === client.id && e.status === 'Completed').length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Client Details */}
            {selectedClient && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Client Details: {selectedClient.first_name} {selectedClient.last_name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Name: {selectedClient.first_name} {selectedClient.last_name}</p>
                      <p>Email: {selectedClient.email}</p>
                      {selectedClient.company && <p>Company: {selectedClient.company}</p>}
                      <p>Total Exchanges: {selectedClient.exchange_count}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Exchange Summary</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Active: {clientExchanges.filter(e => e.status !== 'Completed').length}</p>
                      <p>Completed: {clientExchanges.filter(e => e.status === 'Completed').length}</p>
                      <p>Pending Tasks: {clientTasks.filter(t => t.status === 'PENDING').length}</p>
                      <p>Documents: {clientDocuments.length}</p>
                    </div>
                  </div>
                </div>

                {/* Client Exchanges */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Client Exchanges</h4>
                  <div className="space-y-3">
                    {clientExchanges.map((exchange) => (
                      <div key={exchange.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-gray-900">{exchange.name}</h5>
                            <p className="text-sm text-gray-500">
                              Started: {new Date(exchange.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getExchangeStatusColor(exchange.status)}`}>
                            {exchange.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'exchanges' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
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
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Filter
                  </label>
                  <select
                    id="client"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="all">All Clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Exchanges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map((exchange) => (
                <div key={exchange.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{exchange.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExchangeStatusColor(exchange.status)}`}>
                      {exchange.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <span>
                        Client ID: {exchange.client_id}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Tasks</h3>
              
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
                      <span>Client ID: {task.exchange_id}</span>
                      <span>Assigned: {task.assigned_to}</span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Documents</h3>
              
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
                      <span>Exchange ID: {document.exchange_id}</span>
                    </div>
                    
                    <button
                      onClick={() => apiService.downloadDocument(document.id, document.original_filename)}
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

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agency Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Exchange Status Report</h4>
                  <p className="text-sm text-gray-600 mb-3">Generate a comprehensive report of all exchange statuses across clients.</p>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Client Performance Report</h4>
                  <p className="text-sm text-gray-600 mb-3">Analyze client performance and exchange completion rates.</p>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Task Completion Report</h4>
                  <p className="text-sm text-gray-600 mb-3">Track task completion rates and identify bottlenecks.</p>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Document Activity Report</h4>
                  <p className="text-sm text-gray-600 mb-3">Monitor document upload and download activity.</p>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Report</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="summary">Agency Summary</option>
                    <option value="exchanges">Exchange Details</option>
                    <option value="tasks">Task Report</option>
                    <option value="documents">Document Report</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard; 