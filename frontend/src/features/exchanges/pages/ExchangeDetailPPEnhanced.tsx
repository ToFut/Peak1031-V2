import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExchanges } from '../hooks/useExchanges';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
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
  AlertCircle,
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
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  CalendarDays,
  Home,
  Banknote,
  Timer,
  BarChart3
} from 'lucide-react';

// Enhanced Components
import { PPDataDisplay } from '../components/PPDataDisplay';
import { ReplacementPropertiesDisplay } from '../components/ReplacementPropertiesDisplay';
import TaskCreateModal from '../../tasks/components/TaskCreateModal';

interface TimelineEvent {
  date: Date;
  title: string;
  type: 'deadline' | 'milestone' | 'completed';
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
  isUrgent?: boolean;
}

interface PPExchange extends Exchange {
  // PP Basic Fields
  pp_display_name?: string;
  pp_matter_status?: string;
  pp_responsible_attorney?: string;
  pp_opened_date?: string;
  pp_closed_date?: string;
  
  // Exchange Type & Client Info
  type_of_exchange?: string;
  client_vesting?: string;
  bank?: string;
  rate?: string;
  
  // Relinquished Property
  rel_property_address?: string;
  rel_property_city?: string;
  rel_property_state?: string;
  rel_property_zip?: string;
  rel_apn?: string;
  rel_escrow_number?: string;
  rel_value?: number;
  rel_contract_date?: string;
  
  // Key Dates
  close_of_escrow_date?: string;
  day_45?: string;
  day_180?: string;
  
  // Financial
  proceeds?: number;
  
  // Buyers
  buyer_1_name?: string;
  buyer_2_name?: string;
  
  // Replacement Properties (we'll handle multiple later)
  rep_1_property_address?: string;
  rep_1_city?: string;
  rep_1_state?: string;
  rep_1_zip?: string;
  rep_1_apn?: string;
  rep_1_escrow_number?: string;
  rep_1_value?: number;
  rep_1_contract_date?: string;
  rep_1_seller_name?: string;
}

// Enhanced Header with Timeline
const EnhancedExchangeHeader: React.FC<{ exchange: PPExchange }> = ({ exchange }) => {
  const navigate = useNavigate();
  
  // Calculate timeline progress and deadlines
  const getTimelineData = () => {
    const events: TimelineEvent[] = [];
    const now = new Date();
    
    // Add key dates
    if (exchange.close_of_escrow_date) {
      events.push({
        date: new Date(exchange.close_of_escrow_date),
        title: 'Sale Closed',
        type: 'completed',
        icon: CheckCircle,
        color: 'bg-green-500',
        description: 'Relinquished property sold'
      });
    }
    
    if (exchange.day_45) {
      const date45 = new Date(exchange.day_45);
      const daysTo45 = Math.ceil((date45.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      events.push({
        date: date45,
        title: '45-Day ID',
        type: daysTo45 > 0 ? 'deadline' : 'completed',
        icon: Target,
        color: daysTo45 > 0 ? (daysTo45 <= 10 ? 'bg-red-500' : 'bg-yellow-500') : 'bg-green-500',
        description: `${daysTo45 > 0 ? `${daysTo45} days left` : 'Completed'}`,
        isUrgent: daysTo45 > 0 && daysTo45 <= 10
      });
    }
    
    if (exchange.day_180) {
      const date180 = new Date(exchange.day_180);
      const daysTo180 = Math.ceil((date180.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      events.push({
        date: date180,
        title: '180-Day Close',
        type: daysTo180 > 0 ? 'deadline' : 'completed',
        icon: Clock,
        color: daysTo180 > 0 ? (daysTo180 <= 30 ? 'bg-red-500' : 'bg-blue-500') : 'bg-green-500',
        description: `${daysTo180 > 0 ? `${daysTo180} days left` : 'Completed'}`,
        isUrgent: daysTo180 > 0 && daysTo180 <= 30
      });
    }
    
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  
  const timelineEvents = getTimelineData();
  const urgentDeadlines = timelineEvents.filter(e => e.isUrgent);
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-xl p-6 text-white">
      {/* Header Controls */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/exchanges')}
            className="flex items-center text-blue-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exchanges
          </button>
          
          <h1 className="text-3xl font-bold mb-2">
            {exchange.pp_display_name || exchange.name || `Exchange #${exchange.exchangeNumber}`}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {exchange.client?.firstName} {exchange.client?.lastName}
            </span>
            <span className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {exchange.type_of_exchange || exchange.exchangeType || 'Exchange'}
            </span>
            {exchange.bank && (
              <span className="flex items-center">
                <Banknote className="w-4 h-4 mr-1" />
                {exchange.bank}
              </span>
            )}
            {exchange.pp_responsible_attorney && (
              <span className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {exchange.pp_responsible_attorney}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`
            px-4 py-2 rounded-full font-medium flex items-center gap-2 text-sm
            ${exchange.status === 'In Progress' ? 'bg-green-500 text-white' :
              exchange.status === 'PENDING' ? 'bg-yellow-500 text-white' :
              exchange.status === 'COMPLETED' ? 'bg-blue-500 text-white' :
              'bg-gray-500 text-white'}
          `}>
            <Shield className="w-4 h-4" />
            <span>{exchange.status?.toUpperCase()}</span>
          </div>
          
          {/* Urgent Indicator */}
          {urgentDeadlines.length > 0 && (
            <div className="px-4 py-2 bg-red-500 text-white rounded-full font-medium flex items-center gap-2 text-sm animate-pulse">
              <AlertCircle className="w-4 h-4" />
              <span>{urgentDeadlines.length} Urgent</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Timeline Progress Bar */}
      <div className="bg-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Exchange Timeline</h3>
          <span className="text-sm text-blue-100">Progress Overview</span>
        </div>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="flex items-center justify-between">
            {timelineEvents.map((event, index) => {
              const isCompleted = event.type === 'completed';
              const isUrgent = event.isUrgent;
              
              return (
                <div key={index} className="flex flex-col items-center text-center min-w-0 flex-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                    ${isCompleted ? 'bg-green-500' : 
                      isUrgent ? 'bg-red-500 animate-pulse' : event.color}
                  `}>
                    <event.icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-medium mb-1">{event.title}</div>
                  <div className="text-xs text-blue-200">
                    {event.date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-blue-100 mt-1">{event.description}</div>
                </div>
              );
            })}
          </div>
          
          {/* Connecting line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-white/30 -z-10"></div>
        </div>
      </div>
      
      {/* Financial Summary */}
      {(exchange.rel_value || exchange.proceeds) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {exchange.rel_value && (
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Relinquished Value</div>
              <div className="text-lg font-bold">
                ${exchange.rel_value.toLocaleString()}
              </div>
            </div>
          )}
          {exchange.proceeds && (
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Proceeds</div>
              <div className="text-lg font-bold">
                ${exchange.proceeds.toLocaleString()}
              </div>
            </div>
          )}
          {exchange.rep_1_value && (
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Replacement Value</div>
              <div className="text-lg font-bold">
                ${exchange.rep_1_value.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Property Overview
const PropertyOverview: React.FC<{ exchange: PPExchange }> = ({ exchange }) => {
  const [showAddProperty, setShowAddProperty] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Relinquished Property */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Home className="w-5 h-5 mr-2 text-red-600" />
            Relinquished Property
          </h3>
          <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <CheckCircle className="w-4 h-4 mr-1" />
            CLOSED
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Property Address</label>
              <p className="text-gray-900 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                {exchange.rel_property_address || 'Not specified'}
              </p>
            </div>
            
            {(exchange.rel_property_city || exchange.rel_property_state) && (
              <div>
                <label className="text-sm font-medium text-gray-500">City, State, ZIP</label>
                <p className="text-gray-900">
                  {[exchange.rel_property_city, exchange.rel_property_state, exchange.rel_property_zip]
                    .filter(Boolean).join(', ')}
                </p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">APN</label>
              <p className="text-gray-900">{exchange.rel_apn || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Property Value</label>
              <p className="text-gray-900 flex items-center mt-1">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                {exchange.rel_value ? `$${exchange.rel_value.toLocaleString()}` : 'Not specified'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Escrow Number</label>
              <p className="text-gray-900">{exchange.rel_escrow_number || 'Not specified'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Contract Date</label>
              <p className="text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                {exchange.rel_contract_date ? 
                  new Date(exchange.rel_contract_date).toLocaleDateString('en-US') : 
                  'Not specified'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Close of Escrow</label>
              <p className="text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                {exchange.close_of_escrow_date ? 
                  new Date(exchange.close_of_escrow_date).toLocaleDateString('en-US') : 
                  'Not specified'}
              </p>
            </div>
          </div>
        </div>
        
        {exchange.buyer_1_name && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="text-sm font-medium text-gray-500">Buyer Information</label>
            <p className="text-gray-900 flex items-center mt-1">
              <Users className="w-4 h-4 mr-2 text-gray-400" />
              {exchange.buyer_1_name}
              {exchange.buyer_2_name && ` & ${exchange.buyer_2_name}`}
            </p>
          </div>
        )}
      </div>
      
      {/* Replacement Properties */}
      <ReplacementPropertiesDisplay exchange={exchange} />
      
      {/* Financial Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Financial Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-500">Relinquished Value</div>
            <div className="text-2xl font-bold text-gray-900">
              {exchange.rel_value ? `$${exchange.rel_value.toLocaleString()}` : '$0'}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-500">Proceeds Available</div>
            <div className="text-2xl font-bold text-green-600">
              {exchange.proceeds ? `$${exchange.proceeds.toLocaleString()}` : '$0'}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-500">Replacement Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {exchange.rep_1_value ? `$${exchange.rep_1_value.toLocaleString()}` : '$0'}
            </div>
          </div>
        </div>
        
        {exchange.rel_value && exchange.rep_1_value && (
          <div className="mt-4 p-4 bg-white rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Equal/Greater Value Rule</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                exchange.rep_1_value >= exchange.rel_value ? 
                'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {exchange.rep_1_value >= exchange.rel_value ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Team Section
const ExchangeTeam: React.FC<{ exchange: PPExchange }> = ({ exchange }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-blue-600" />
        Exchange Team
      </h3>
      
      <div className="space-y-6">
        {/* Client Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">CLIENT</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {exchange.client?.firstName} {exchange.client?.lastName}
                </p>
                {exchange.client_vesting && (
                  <p className="text-sm text-gray-600 mt-1">
                    {exchange.client_vesting}
                  </p>
                )}
                {exchange.client?.email && (
                  <p className="text-sm text-gray-600 mt-1">
                    {exchange.client.email}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Coordination Team */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">COORDINATION TEAM</h4>
          <div className="space-y-3">
            {exchange.coordinator && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">
                      {exchange.coordinator.first_name} {exchange.coordinator.last_name}
                    </p>
                    <p className="text-sm text-blue-700">Lead Coordinator</p>
                    <p className="text-sm text-blue-600">{exchange.coordinator.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-400 hover:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-400 hover:text-blue-600 transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {exchange.pp_responsible_attorney && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-purple-900">{exchange.pp_responsible_attorney}</p>
                    <p className="text-sm text-purple-700">Responsible Attorney</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-purple-400 hover:text-purple-600 transition-colors">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-purple-400 hover:text-purple-600 transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {exchange.bank && (
              <div className="bg-green-50 rounded-lg p-4">
                <div>
                  <p className="font-medium text-green-900">{exchange.bank}</p>
                  <p className="text-sm text-green-700">Banking Institution</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Email Team
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Schedule Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Enhanced Exchange Detail Component
const ExchangeDetailPPEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getExchange } = useExchanges();
  
  const [exchange, setExchange] = useState<PPExchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadExchange();
    }
  }, [id]);
  
  const loadExchange = async () => {
    try {
      setLoading(true);
      const data = await getExchange(id!);
      setExchange(data as PPExchange);
      loadTasks();
    } catch (error) {
      console.error('Error loading exchange:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    
    try {
      setLoadingTasks(true);
      const response = await apiService.getTasksByExchange(id);
      setTasks(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading exchange tasks:', error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskCreated = (task: any) => {
    setShowTaskModal(false);
    loadTasks();
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </Layout>
    );
  }
  
  if (!exchange) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Exchange Not Found</h3>
          <button
            onClick={() => navigate('/exchanges')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Exchanges
          </button>
        </div>
      </Layout>
    );
  }
  
  const tabs = [
    { id: 'overview', label: 'Property Details', icon: Home },
    { id: 'team', label: 'Team & Coordination', icon: Users },
    { id: 'timeline', label: 'Timeline & Deadlines', icon: Clock },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <EnhancedExchangeHeader exchange={exchange} />
        
        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all
                    flex items-center justify-center gap-2 whitespace-nowrap min-w-max
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && <PropertyOverview exchange={exchange} />}
            {activeTab === 'team' && <ExchangeTeam exchange={exchange} />}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <PPDataDisplay exchange={exchange} variant="detailed" />
                {/* Timeline content here */}
              </div>
            )}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Exchange Tasks</h3>
                    <p className="text-sm text-gray-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
                {/* Task list content */}
              </div>
            )}
            {activeTab === 'documents' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Documents</h3>
                {/* Documents content */}
              </div>
            )}
            {activeTab === 'messages' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Messages</h3>
                {/* Messages content */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onTaskCreated={handleTaskCreated}
        exchangeId={id}
      />
    </Layout>
  );
};

export default ExchangeDetailPPEnhanced;