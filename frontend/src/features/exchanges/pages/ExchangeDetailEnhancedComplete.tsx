import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import Layout from '../../../components/Layout';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  MessageSquare,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Upload,
  Download,
  Send,
  MoreVertical,
  Star,
  Shield,
  Zap,
  Building2,
  Target,
  Briefcase,
  Home,
  Phone,
  Mail,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Bell,
  BellRing,
  UserPlus,
  FileCheck,
  PlusCircle,
  Settings,
  CheckSquare,
  X,
  Eye,
  Save,
  Filter,
  Search,
  BookOpen,
  Calculator,
  CreditCard,
  Banknote,
  Timer,
  Flag,
  Gauge,
  Globe,
  Database,
  Workflow,
  TrendingDown
} from 'lucide-react';

// Enhanced Exchange interface with all database fields
interface EnhancedExchange {
  // Core fields
  id: string;
  pp_matter_id?: string;
  name: string;
  status: string;
  client_id?: string;
  coordinator_id?: string;
  start_date?: string;
  completion_date?: string;
  pp_data?: any;
  metadata?: any;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;

  // Enhanced schema fields
  relinquished_property_address?: string;
  relinquished_sale_price?: number;
  relinquished_closing_date?: string;
  exchange_coordinator_name?: string;
  attorney_or_cpa?: string;
  bank_account_escrow?: string;
  documents?: any[];
  exchange_name?: string;

  // PracticePanther fields
  rate?: string;
  tags?: string[];
  assigned_to_users?: any[];
  statute_of_limitation_date?: string;
  pp_created_at?: string;
  pp_updated_at?: string;

  // Custom PP fields
  bank?: string;
  rel_property_city?: string;
  rel_property_state?: string;
  rel_property_zip?: string;
  rel_property_address?: string;
  rel_apn?: string;
  rel_escrow_number?: string;
  rel_value?: number;
  rel_contract_date?: string;
  close_of_escrow_date?: string;
  day_45?: string;
  day_180?: string;
  proceeds?: number;
  client_vesting?: string;
  type_of_exchange?: string;
  buyer_1_name?: string;
  buyer_2_name?: string;
  rep_1_city?: string;
  rep_1_state?: string;
  rep_1_zip?: string;
  rep_1_property_address?: string;
  rep_1_apn?: string;
  rep_1_escrow_number?: string;
  rep_1_value?: number;
  rep_1_contract_date?: string;
  rep_1_seller_name?: string;

  // Legacy/computed fields
  exchangeValue?: number;
  progress?: number;
  client?: any;
  coordinator?: any;
  identificationDeadline?: string;
  exchangeDeadline?: string;
  completionDeadline?: string;
}

interface ExchangeParticipant {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'pending' | 'inactive';
  permissions?: any;
  last_active?: string;
}

interface ExchangeTask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  created_at: string;
  exchange_id: string;
}

interface ExchangeDocument {
  id: string;
  name: string;
  originalFilename?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  category: string;
  exchange_id: string;
  uploaded_by?: string;
  pin_required?: boolean;
  document_type?: 'uploaded' | 'generated';
  template_name?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  read: boolean;
  created_at: string;
}

// Enhanced Status Component with more field data
const StatusIndicator: React.FC<{ exchange: EnhancedExchange }> = ({ exchange }) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
      case '45D':
        return {
          color: 'bg-gradient-to-r from-green-500 to-emerald-600',
          textColor: 'text-white',
          icon: CheckCircle,
          label: status
        };
      case 'PENDING':
        return {
          color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          textColor: 'text-white',
          icon: Timer,
          label: 'Pending'
        };
      case 'COMPLETED':
        return {
          color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          textColor: 'text-white',
          icon: Flag,
          label: 'Completed'
        };
      case '180D':
        return {
          color: 'bg-gradient-to-r from-orange-500 to-red-500',
          textColor: 'text-white',
          icon: AlertTriangle,
          label: '180-Day Period'
        };
      default:
        return {
          color: 'bg-gradient-to-r from-gray-500 to-gray-600',
          textColor: 'text-white',
          icon: AlertCircle,
          label: status || 'Unknown'
        };
    }
  };

  const config = getStatusConfig(exchange.status);
  const IconComponent = config.icon;

  return (
    <div className={`${config.color} ${config.textColor} px-6 py-3 rounded-2xl shadow-lg flex items-center space-x-3 font-semibold`}>
      <IconComponent className="w-6 h-6" />
      <span>{config.label}</span>
      {exchange.type_of_exchange && (
        <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
          {exchange.type_of_exchange}
        </div>
      )}
    </div>
  );
};

// Enhanced Key Metrics with all database fields - Mobile Responsive
const EnhancedKeyMetrics: React.FC<{ exchange: EnhancedExchange }> = ({ exchange }) => {
  const getDaysUntil = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const metrics = [
    {
      label: '45-Day Deadline',
      value: getDaysUntil(exchange.day_45),
      type: 'days',
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      urgent: true,
      actualDate: exchange.day_45
    },
    {
      label: '180-Day Deadline', 
      value: getDaysUntil(exchange.day_180),
      type: 'days',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      urgent: false,
      actualDate: exchange.day_180
    },
    {
      label: 'Relinquished Value',
      value: exchange.rel_value || exchange.relinquished_sale_price,
      type: 'currency',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      urgent: false
    },
    {
      label: 'Replacement Value',
      value: exchange.rep_1_value,
      type: 'currency',
      icon: Home,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      urgent: false
    },
    {
      label: 'Exchange Proceeds',
      value: exchange.proceeds,
      type: 'currency',
      icon: Banknote,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      urgent: false
    },
    {
      label: 'Rate',
      value: exchange.rate,
      type: 'text',
      icon: Calculator,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      urgent: false
    }
  ];

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'days':
        if (value < 0) return 'OVERDUE';
        return `${value} days`;
      case 'currency':
        return formatCurrency(value);
      case 'text':
        return value.toString();
      default:
        return value;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const isUrgent = metric.urgent && metric.value !== null && metric.value !== undefined && metric.value <= 45 && metric.value >= 0;
        const isOverdue = metric.value !== null && metric.value !== undefined && metric.value < 0;
        
        return (
          <div
            key={index}
            className={`
              ${metric.bgColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 transition-all hover:shadow-lg
              ${isUrgent ? 'border-red-300 animate-pulse shadow-lg' : 'border-transparent'}
              ${isOverdue ? 'border-red-500 bg-red-50' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${isOverdue ? 'text-red-600' : metric.color}`} />
              {isUrgent && <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 animate-bounce" />}
              {isOverdue && <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />}
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{metric.label}</p>
              <p className={`text-lg sm:text-2xl font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {formatValue(metric.value, metric.type)}
              </p>
              {metric.actualDate && (
                <p className="text-xs text-gray-500">
                  {new Date(metric.actualDate).toLocaleDateString()}
                </p>
              )}
              {isUrgent && (
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">
                  Critical
                </p>
              )}
              {isOverdue && (
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">
                  Overdue
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Enhanced Property Information with all database fields
const EnhancedPropertyCard: React.FC<{ exchange: EnhancedExchange }> = ({ exchange }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Home className="w-5 h-5 mr-2 text-blue-600" />
        Property Information
      </h3>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Relinquished Property */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2 text-lg">
            Relinquished Property
          </h4>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <p className="font-medium text-gray-900">
                {exchange.relinquished_property_address || exchange.rel_property_address || 'Not specified'}
              </p>
              {exchange.rel_property_city && (
                <p className="text-sm text-gray-600">
                  {exchange.rel_property_city}, {exchange.rel_property_state} {exchange.rel_property_zip}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Sale Price</p>
                <p className="font-bold text-green-600 text-lg">
                  {exchange.relinquished_sale_price || exchange.rel_value
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.relinquished_sale_price || exchange.rel_value || 0)
                    : 'Not specified'
                  }
                </p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Closing Date</p>
                <p className="font-medium text-blue-600">
                  {exchange.relinquished_closing_date || exchange.close_of_escrow_date
                    ? new Date(exchange.relinquished_closing_date || exchange.close_of_escrow_date!).toLocaleDateString()
                    : 'Not scheduled'
                  }
                </p>
              </div>
            </div>

            {/* Additional Relinquished Property Details */}
            <div className="grid grid-cols-1 gap-3">
              {exchange.rel_apn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">APN:</span>
                  <span className="font-medium">{exchange.rel_apn}</span>
                </div>
              )}
              {exchange.rel_escrow_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Escrow #:</span>
                  <span className="font-medium">{exchange.rel_escrow_number}</span>
                </div>
              )}
              {exchange.rel_contract_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Contract Date:</span>
                  <span className="font-medium">{new Date(exchange.rel_contract_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replacement Property */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2 text-lg">
            Replacement Property #1
          </h4>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <p className="font-medium text-gray-900">
                {exchange.rep_1_property_address || 'Not identified yet'}
              </p>
              {exchange.rep_1_city && (
                <p className="text-sm text-gray-600">
                  {exchange.rep_1_city}, {exchange.rep_1_state} {exchange.rep_1_zip}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Purchase Price</p>
                <p className="font-bold text-purple-600 text-lg">
                  {exchange.rep_1_value
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.rep_1_value)
                    : 'TBD'
                  }
                </p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Contract Date</p>
                <p className="font-medium text-orange-600">
                  {exchange.rep_1_contract_date
                    ? new Date(exchange.rep_1_contract_date).toLocaleDateString()
                    : 'Not signed'
                  }
                </p>
              </div>
            </div>

            {/* Additional Replacement Property Details */}
            <div className="grid grid-cols-1 gap-3">
              {exchange.rep_1_apn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">APN:</span>
                  <span className="font-medium">{exchange.rep_1_apn}</span>
                </div>
              )}
              {exchange.rep_1_escrow_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Escrow #:</span>
                  <span className="font-medium">{exchange.rep_1_escrow_number}</span>
                </div>
              )}
              {exchange.rep_1_seller_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seller:</span>
                  <span className="font-medium">{exchange.rep_1_seller_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Summary */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Exchange Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Net Proceeds</p>
            <p className="text-xl font-bold text-gray-900">
              {exchange.proceeds ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.proceeds) : 'TBD'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Client Vesting</p>
            <p className="text-sm font-medium text-gray-900">{exchange.client_vesting || 'TBD'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Exchange Type</p>
            <p className="text-sm font-medium text-gray-900">{exchange.type_of_exchange || 'Standard'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Rate</p>
            <p className="text-sm font-medium text-gray-900">{exchange.rate || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Financial Information
const FinancialCard: React.FC<{ exchange: EnhancedExchange }> = ({ exchange }) => {
  const calculateExchangeBalance = () => {
    const relinquishedValue = exchange.rel_value || exchange.relinquished_sale_price || 0;
    const replacementValue = exchange.rep_1_value || 0;
    return relinquishedValue - replacementValue;
  };

  const exchangeBalance = calculateExchangeBalance();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <CreditCard className="w-5 h-5 mr-2 text-green-600" />
        Financial Overview
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <Calculator className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">Proceeds Available</p>
          <p className="text-2xl font-bold text-green-600">
            {exchange.proceeds ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.proceeds) : '$0'}
          </p>
        </div>

        <div className={`rounded-xl p-6 text-center ${exchangeBalance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <TrendingUp className={`w-8 h-8 mx-auto mb-3 ${exchangeBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
          <p className="text-sm text-gray-600 mb-1">Exchange Balance</p>
          <p className={`text-2xl font-bold ${exchangeBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(exchangeBalance))}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {exchangeBalance >= 0 ? 'Surplus' : 'Additional needed'}
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <Banknote className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">Bank/Escrow</p>
          <p className="text-lg font-semibold text-purple-600">
            {exchange.bank || 'Not assigned'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {exchange.bank_account_escrow || 'Account TBD'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Admin Task Management Component
const TaskManagement: React.FC<{ 
  exchange: EnhancedExchange; 
  participants: ExchangeParticipant[];
  tasks: ExchangeTask[];
  onTaskUpdate: () => void;
}> = ({ exchange, participants, tasks, onTaskUpdate }) => {
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    assigned_to: '',
    due_date: ''
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await apiService.post('/tasks', {
        ...newTask,
        exchange_id: exchange.id,
        status: 'PENDING'
      });
      
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigned_to: '',
        due_date: ''
      });
      setShowAddTask(false);
      onTaskUpdate();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await apiService.put(`/tasks/${taskId}`, { status: newStatus });
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-blue-600';
      case 'LOW': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
          Task Management
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Assigned to: {task.assigned_to_name || 'Unassigned'}</span>
                {task.due_date && (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  {task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleTaskStatusUpdate(task.id, 'COMPLETED')}
                      className="text-green-600 hover:text-green-800"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tasks assigned to this exchange</p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Task description"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select participant</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name} ({participant.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setShowAddTask(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Document Generation Component
const DocumentGeneration: React.FC<{ 
  exchange: EnhancedExchange;
  onDocumentGenerated: () => void;
}> = ({ exchange, onDocumentGenerated }) => {
  const { user } = useAuth();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generating, setGenerating] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  const [documentTemplates, setDocumentTemplates] = useState<any[]>([]);

  // Load templates from API
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await apiService.getDocumentTemplates();
        setDocumentTemplates(Array.isArray(templates) ? templates : []);
      } catch (error) {
        console.error('Failed to load templates:', error);
        // Fallback to basic templates if API fails
        setDocumentTemplates([
          { id: 'exchange_agreement', name: 'Exchange Agreement', description: 'Standard 1031 exchange agreement' },
          { id: 'identification_letter', name: 'Identification Letter', description: '45-day identification notice' },
          { id: 'escrow_instructions', name: 'Escrow Instructions', description: 'Instructions for escrow company' },
          { id: 'assignment_agreement', name: 'Assignment Agreement', description: 'Rights assignment document' },
          { id: 'tax_deferral_notice', name: 'Tax Deferral Notice', description: 'IRS compliance notice' }
        ]);
      }
    };
    
    loadTemplates();
  }, []);

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    try {
      setGenerating(true);
      await apiService.post(`/exchanges/${exchange.id}/generate-document`, {
        template: selectedTemplate
      });
      
      setShowGenerateModal(false);
      setSelectedTemplate('');
      onDocumentGenerated();
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-green-800">Document Generation</h4>
          <p className="text-sm text-green-600">Generate exchange documents automatically</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <FileCheck className="w-4 h-4" />
          <span>Generate</span>
        </button>
      </div>

      {/* Generate Document Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Generate Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                <div className="space-y-2">
                  {documentTemplates.map((template) => (
                    <label key={template.id} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplate === template.id}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDocument}
                disabled={!selectedTemplate || generating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Notifications Component
const NotificationsPanel: React.FC<{ 
  exchange: EnhancedExchange;
  notifications: Notification[];
}> = ({ exchange, notifications }) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          Notifications
        </h3>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No notifications</p>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <div 
              key={notification.id} 
              className={`p-3 rounded-lg ${notification.read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                  <p className="text-gray-600 text-xs mt-1">{notification.message}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(notification.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main Enhanced Exchange Detail Component
const ExchangeDetailEnhancedComplete: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [exchange, setExchange] = useState<EnhancedExchange | null>(null);
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [tasks, setTasks] = useState<ExchangeTask[]>([]);
  const [documents, setDocuments] = useState<ExchangeDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  const loadExchangeData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      const [
        exchangeData,
        participantsData,
        tasksData,
        documentsData,
        notificationsData
      ] = await Promise.all([
        apiService.get(`/exchanges/${id}`),
        apiService.get(`/exchanges/${id}/participants`),
        apiService.get(`/exchanges/${id}/tasks`),
        apiService.get(`/documents/exchange/${id}`),
        apiService.get(`/notifications?exchange_id=${id}`)
      ]);

      setExchange(exchangeData);
      setParticipants(participantsData?.participants || []);
      setTasks(tasksData?.tasks || []);
      setDocuments(documentsData?.documents || []);
      setNotifications(notificationsData?.notifications || []);
      
    } catch (error) {
      console.error('Error loading exchange data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExchangeData();
  }, [loadExchangeData]);

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </Layout>
    );
  }

  if (!exchange) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Exchange Not Found</h3>
          <p className="text-gray-600 mb-6">The exchange you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/exchanges')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Back to Exchanges
          </button>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => navigate('/exchanges')}
              className="flex items-center text-blue-100 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Exchanges
            </button>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                  {exchange.name || exchange.exchange_name || `Exchange #${exchange.id}`}
                </h1>
                
                <div className="flex flex-wrap gap-2 sm:gap-4 text-blue-100 mb-4 sm:mb-6">
                  <span className="flex items-center bg-white/10 rounded-lg px-2 sm:px-3 py-1 text-sm">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{participants.length} participants</span>
                    <span className="sm:hidden">{participants.length}</span>
                  </span>
                  <span className="flex items-center bg-white/10 rounded-lg px-2 sm:px-3 py-1 text-sm">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Created {new Date(exchange.created_at).toLocaleDateString()}</span>
                    <span className="sm:hidden">{new Date(exchange.created_at).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center bg-white/10 rounded-lg px-2 sm:px-3 py-1 text-sm">
                    <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    PP: {exchange.pp_matter_id || 'N/A'}
                  </span>
                  {exchange.tags && exchange.tags.length > 0 && (
                    <span className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                      <Star className="w-4 h-4 mr-2" />
                      {exchange.tags.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <StatusIndicator exchange={exchange} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <EnhancedKeyMetrics exchange={exchange} />

        {/* Admin Tools */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-purple-600" />
              Admin Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DocumentGeneration 
                exchange={exchange} 
                onDocumentGenerated={loadExchangeData} 
              />
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800">Member Management</h4>
                    <p className="text-sm text-blue-600">Add/remove exchange participants</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-purple-800">Auto Notifications</h4>
                    <p className="text-sm text-purple-600">Deadline alerts & reminders</p>
                  </div>
                  <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                    <BellRing className="w-4 h-4" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 py-3 sm:py-6 px-3 sm:px-6 text-center border-b-3 font-semibold text-xs sm:text-sm transition-all
                    flex items-center justify-center space-x-2 sm:space-x-3 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-white shadow-sm'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                  {tab.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 sm:p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exchange ID:</span>
                        <span className="font-medium">{exchange.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">PP Matter ID:</span>
                        <span className="font-medium">{exchange.pp_matter_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium">{exchange.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coordinator:</span>
                        <span className="font-medium">{exchange.exchange_coordinator_name || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Attorney/CPA:</span>
                        <span className="font-medium">{exchange.attorney_or_cpa || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-medium">{exchange.rate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Dates</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">
                          {exchange.start_date ? new Date(exchange.start_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">45-Day Deadline:</span>
                        <span className="font-medium">
                          {exchange.day_45 ? new Date(exchange.day_45).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">180-Day Deadline:</span>
                        <span className="font-medium">
                          {exchange.day_180 ? new Date(exchange.day_180).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Escrow Close:</span>
                        <span className="font-medium">
                          {exchange.close_of_escrow_date ? new Date(exchange.close_of_escrow_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last PP Sync:</span>
                        <span className="font-medium">
                          {exchange.last_sync_at ? new Date(exchange.last_sync_at).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'properties' && <EnhancedPropertyCard exchange={exchange} />}
            
            {activeTab === 'financial' && <FinancialCard exchange={exchange} />}
            
            {activeTab === 'tasks' && (
              <TaskManagement 
                exchange={exchange}
                participants={participants}
                tasks={tasks}
                onTaskUpdate={loadExchangeData}
              />
            )}
            
            {activeTab === 'documents' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Exchange Documents ({documents.length})
                  </h3>
                  {isAdmin && (
                    <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map((document) => (
                    <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <FileText className={`w-8 h-8 ${document.document_type === 'generated' ? 'text-green-600' : 'text-blue-600'}`} />
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {document.originalFilename || document.name}
                              {document.document_type === 'generated' && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Generated
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {document.mime_type || document.category}
                              {document.template_name && (
                                <span className="ml-2 text-gray-500">• {document.template_name}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{document.file_size ? `${Math.round(document.file_size / 1024)} KB` : 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uploaded:</span>
                          <span>{new Date(document.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            if (document.document_type === 'generated' && document.file_url) {
                              window.open(document.file_url, '_blank');
                            } else {
                              console.log('Download document:', document.id);
                            }
                          }}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
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
            
            {activeTab === 'notifications' && (
              <NotificationsPanel exchange={exchange} notifications={notifications} />
            )}
            
            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                  Exchange Messages
                </h3>
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Message functionality will be implemented here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExchangeDetailEnhancedComplete;