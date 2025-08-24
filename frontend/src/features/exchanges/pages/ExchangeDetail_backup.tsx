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
  Briefcase
} from 'lucide-react';

// Tab Components
import { ExchangeOverview } from '../components/ExchangeOverview';
import { TasksList } from '../components/TasksList';
import { DocumentsList } from '../components/DocumentsList';
import TaskCreateModal from '../../tasks/components/TaskCreateModal';

interface TabProps {
  exchange: Exchange;
  onUpdate?: () => void;
}

const TimelineTab: React.FC<TabProps> = ({ exchange }) => {
  const getTimelineEvents = () => {
    const events = [];
    
    // Key dates
    if (exchange.identificationDeadline) {
      events.push({
        date: new Date(exchange.identificationDeadline),
        title: 'Identification Deadline',
        type: 'deadline',
        icon: Target,
        color: 'text-yellow-600 bg-yellow-100'
      });
    }
    
    if (exchange.exchangeDeadline) {
      events.push({
        date: new Date(exchange.exchangeDeadline),
        title: 'Exchange Deadline',
        type: 'deadline',
        icon: Clock,
        color: 'text-red-600 bg-red-100'
      });
    }
    
    if (exchange.completionDeadline) {
      events.push({
        date: new Date(exchange.completionDeadline),
        title: 'Expected Closing',
        type: 'milestone',
        icon: CheckCircle,
        color: 'text-green-600 bg-green-100'
      });
    }
    
    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  
  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const events = getTimelineEvents();
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          Exchange Timeline
        </h3>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          
          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const days = getDaysUntil(event.date);
              const isPast = days < 0;
              const isUrgent = days >= 0 && days <= 7;
              
              return (
                <div key={index} className="relative flex items-start">
                  <div className={`
                    absolute left-4 w-8 h-8 rounded-full flex items-center justify-center
                    ${isPast ? 'bg-gray-200' : event.color}
                    ${isUrgent ? 'animate-pulse' : ''}
                  `}>
                    <event.icon className="w-4 h-4" />
                  </div>
                  
                  <div className="ml-16 flex-1">
                    <div className={`
                      p-4 rounded-xl border-2
                      ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}
                      ${isUrgent ? 'border-red-300 shadow-lg' : ''}
                    `}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`font-semibold ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                            {event.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {event.date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        
                        <div className={`
                          px-3 py-1 rounded-full text-sm font-medium
                          ${isPast ? 'bg-gray-100 text-gray-500' : 
                            isUrgent ? 'bg-red-100 text-red-700' : 
                            'bg-blue-100 text-blue-700'}
                        `}>
                          {isPast ? 'Past' : `${days} days`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Exchange Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Exchange Progress
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{exchange.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${exchange.progress || 0}%` }}
              ></div>
            </div>
          </div>
          
          {/* Stage Progress */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Documents</span>
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">85%</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Tasks</span>
                <CheckCircle className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">67%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesTab: React.FC<TabProps> = ({ exchange }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    loadMessages();
  }, [exchange.id]);
  
  const loadMessages = async () => {
    try {
      const msgs = await apiService.getMessages(exchange.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await apiService.sendMessage(exchange.id, newMessage);
      setNewMessage('');
      loadMessages(); // Reload messages
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-xl"></div>;
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="h-[600px] flex flex-col">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg px-4 py-3 rounded-2xl ${
                    message.senderId === user?.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Message input */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExchangeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getExchange } = useExchanges();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ppData, setPpData] = useState<any>(null);
  const [loadingPpData, setLoadingPpData] = useState(false);
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
      setExchange(data);
      
      // Load tasks for this exchange
      loadTasks();
      
      // Load PP data in background (optional - remove if not using PP integration)
      // loadPPData();
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
      console.log('📋 Exchange tasks loaded:', response);
      // The API returns the tasks array directly, not wrapped in a 'tasks' property
      setTasks(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading exchange tasks:', error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskCreated = (task: any) => {
    console.log('📋 Task created:', task);
    setShowTaskModal(false);
    loadTasks(); // Reload tasks to include the new one
  };
  
  const loadPPData = async () => {
    if (!id) return;
    
    setLoadingPpData(true);
    try {
      const response = await apiService.get(`/pp-data/exchange/${id}`);
      if (response.success) {
        setPpData(response.pp_data);
      }
    } catch (error) {
      console.log('Could not load PP data for exchange');
    } finally {
      setLoadingPpData(false);
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-gray-200 rounded-2xl h-96"></div>
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
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];
  
  const getDaysUntilClosing = () => {
    if (!exchange.completionDeadline) return null;
    const closing = new Date(exchange.completionDeadline);
    const today = new Date();
    const diffTime = closing.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysUntilClosing = getDaysUntilClosing();
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/exchanges')}
                className="flex items-center text-blue-100 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Exchanges
              </button>
              
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{exchange.name || `Exchange #${exchange.exchangeNumber}`}</h1>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {exchange.client?.firstName} {exchange.client?.lastName}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Created {new Date(exchange.createdAt || '').toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  ${((exchange.exchangeValue || 0) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Status Badge */}
              <div className={`
                px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm
                ${(exchange.status === 'In Progress' || exchange.status === '45D' || exchange.status === '180D') ? 'bg-green-500 text-white' :
                  exchange.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                  exchange.status === 'COMPLETED' ? 'bg-blue-500 text-white' :
                  'bg-gray-500 text-white'}
              `}>
                <Shield className="w-4 h-4" />
                <span>{exchange.status}</span>
              </div>
              
              {/* Days remaining */}
              {daysUntilClosing !== null && daysUntilClosing > 0 && (
                <div className={`
                  px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm
                  ${daysUntilClosing <= 45 ? 'bg-red-500 text-white animate-pulse' :
                    daysUntilClosing <= 180 ? 'bg-orange-500 text-white' :
                    'bg-blue-500 text-white'}
                `}>
                  <Zap className="w-4 h-4" />
                  <span>{daysUntilClosing} days left</span>
                </div>
              )}
              
              {/* Action Menu */}
              <button className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <MoreVertical className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-100">Exchange Progress</span>
              <span className="text-sm font-semibold">{exchange.progress || 0}%</span>
            </div>
            <div className="w-full bg-blue-800/30 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${exchange.progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center border-b-2 font-medium text-xs sm:text-sm transition-all
                    flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap
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
          <div className="p-3 sm:p-6">
            {activeTab === 'overview' && <ExchangeOverview exchange={exchange as any} participants={[]} tasks={tasks} documents={[]} />}
            {activeTab === 'timeline' && <TimelineTab exchange={exchange} />}
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
                {loadingTasks ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                ) : (
                  <TasksList tasks={tasks} />
                )}
              </div>
            )}
            {activeTab === 'documents' && <DocumentsList documents={[]} onUploadClick={() => {}} onDownload={() => {}} canUpload={true} canDelete={false} />}
            {activeTab === 'messages' && <MessagesTab exchange={exchange} />}
            
            {/* PP Data tab removed - data is now integrated into main tabs */}
            {false && activeTab === 'pp-data' && (
              <div className="space-y-6">
                {loadingPpData ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PracticePanther data...</p>
                  </div>
                ) : ppData ? (
                  <>
                    {/* PP Tasks */}
                    {ppData.tasks && ppData.tasks.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                          PracticePanther Tasks ({ppData.tasks.length})
                        </h3>
                        <div className="space-y-3">
                          {ppData.tasks.slice(0, 10).map((task: any) => (
                            <div key={task.pp_id} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-900">{task.subject}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                                  {task.due_date && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority || 'Normal'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* PP Invoices */}
                    {ppData.invoices && ppData.invoices.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                          PracticePanther Invoices ({ppData.invoices.length})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {ppData.invoices.slice(0, 10).map((invoice: any) => (
                                <tr key={invoice.pp_id}>
                                  <td className="px-4 py-2 text-sm">
                                    {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm">{invoice.account_ref_display_name || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-right font-medium">
                                    ${(invoice.total / 100).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right">
                                    {invoice.total_outstanding > 0 && (
                                      <span className="text-red-600 font-medium">
                                        ${(invoice.total_outstanding / 100).toLocaleString()}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* PP Expenses */}
                    {ppData.expenses && ppData.expenses.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                          PracticePanther Expenses ({ppData.expenses.length})
                        </h3>
                        <div className="grid gap-3">
                          {ppData.expenses.slice(0, 10).map((expense: any) => (
                            <div key={expense.pp_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{expense.description}</p>
                                <p className="text-xs text-gray-500">
                                  {expense.date ? new Date(expense.date).toLocaleDateString() : '-'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${(expense.amount / 100).toLocaleString()}</p>
                                {expense.is_billable && !expense.is_billed && (
                                  <span className="text-xs text-yellow-600">Unbilled</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!ppData.tasks?.length && !ppData.invoices?.length && !ppData.expenses?.length) && (
                      <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No PracticePanther data found for this exchange</p>
                        <p className="text-sm text-gray-500 mt-2">Data will appear after syncing from PracticePanther</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PracticePanther integration not configured</p>
                  </div>
                )}
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

export default ExchangeDetail;