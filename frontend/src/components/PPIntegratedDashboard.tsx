import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ContactCard } from './ContactCard';
import { ExchangeCard } from './ExchangeCard';
import { TaskBoard } from './TaskBoard';
import UnifiedChatInterface from './UnifiedChatInterface';
import ModernCard from './ui/ModernCard';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import {
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ChartBarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { User, Exchange, Contact, Task, Message } from '../types';

interface PPIntegratedDashboardProps {
  role?: string;
}

const PPIntegratedDashboard: React.FC<PPIntegratedDashboardProps> = ({ role }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showPPOnly, setShowPPOnly] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const currentUser = user || role ? { role } as User : null;

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from API, but timeout quickly
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 2000)
      );
      
      const [exchangesRes, contactsRes, tasksRes] = await Promise.race([
        Promise.all([
          apiService.getExchanges(),
          apiService.getContacts(),
          apiService.getTasks()
        ]),
        timeout
      ]) as any;
      
      setExchanges(Array.isArray(exchangesRes) ? exchangesRes : []);
      setContacts(Array.isArray(contactsRes) ? contactsRes : []);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      
      // Set last sync time from PP data
      const ppItems = [...(Array.isArray(exchangesRes) ? exchangesRes : []), ...(Array.isArray(contactsRes) ? contactsRes : [])];
      const syncTimes = ppItems
        .filter(item => (item as any).lastSyncAt)
        .map(item => new Date((item as any).lastSyncAt).getTime());
      
      if (syncTimes.length > 0) {
        setLastSyncTime(new Date(Math.max(...syncTimes)).toLocaleString());
      }
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load data from API. Please check authentication.');
      setExchanges([]);
      setContacts([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard statistics
  const dashboardStats = useMemo(() => {
    const userExchanges = ['admin', 'agency', 'coordinator'].includes(currentUser?.role || '') ? exchanges : 
      exchanges.filter(ex => 
        ex.clientId === currentUser?.id || 
        ex.coordinatorId === currentUser?.id
      );

    const userTasks = ['admin', 'agency', 'coordinator'].includes(currentUser?.role || '') ? tasks :
      tasks.filter(task => 
        task.assignedTo === currentUser?.id ||
        userExchanges.some(ex => ex.id === task.exchangeId)
      );

    return {
      exchanges: {
        total: userExchanges.length,
        pending: userExchanges.filter(ex => ex.status === 'PENDING').length,
        active: userExchanges.filter(ex => ['45D', '180D'].includes(ex.status)).length,
        completed: userExchanges.filter(ex => ex.status === 'COMPLETED').length,
        ppSynced: userExchanges.filter(ex => ex.ppMatterId).length
      },
      tasks: {
        total: userTasks.length,
        pending: userTasks.filter(t => t.status === 'PENDING').length,
        inProgress: userTasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: userTasks.filter(t => t.status === 'COMPLETED').length,
        overdue: userTasks.filter(t => 
          t.dueDate && 
          new Date(t.dueDate) < new Date() && 
          t.status !== 'COMPLETED'
        ).length,
        ppSynced: userTasks.filter(t => t.ppTaskId).length
      },
      contacts: {
        total: contacts.length,
        ppSynced: contacts.filter(c => (c as any).ppContactId).length
      },
      integration: {
        lastSync: lastSyncTime,
        totalPPItems: exchanges.filter(e => e.ppMatterId).length + 
                     contacts.filter(c => (c as any).ppContactId).length + 
                     tasks.filter(t => t.ppTaskId).length
      }
    };
  }, [exchanges, contacts, tasks, currentUser, lastSyncTime]);

  // Filtered data
  const filteredExchanges = useMemo(() => {
    let filtered = exchanges;
    
    // Role-based filtering
    if (currentUser?.role === 'client') {
      filtered = filtered.filter(ex => ex.clientId === currentUser.id);
    } else if (currentUser?.role === 'third_party') {
      filtered = filtered.filter(ex => (ex as any).assignedTo === currentUser.id);
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ex => 
        ex.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.client?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.client?.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(ex => ex.status === statusFilter);
    }
    
    // PP filter
    if (showPPOnly) {
      filtered = filtered.filter(ex => ex.ppMatterId);
    }
    
    return filtered;
  }, [exchanges, currentUser, searchTerm, statusFilter, showPPOnly]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (showPPOnly) {
      filtered = filtered.filter(c => (c as any).ppContactId);
    }
    
    return filtered;
  }, [contacts, searchTerm, showPPOnly]);

  const getTabsForRole = (userRole: string) => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: ChartBarIcon },
      { id: 'exchanges', label: 'Exchanges', icon: DocumentTextIcon },
      { id: 'tasks', label: 'Tasks', icon: CheckCircleIcon },
      { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon }
    ];

    if (userRole === 'admin') {
      baseTabs.push(
        { id: 'contacts', label: 'Contacts', icon: UsersIcon },
        { id: 'settings', label: 'Settings', icon: CogIcon }
      );
    } else if (userRole === 'coordinator') {
      baseTabs.push(
        { id: 'contacts', label: 'Contacts', icon: UsersIcon }
      );
    } else if (userRole === 'agency') {
      baseTabs.push(
        { id: 'contacts', label: 'Contacts', icon: UsersIcon }
      );
    }

    return baseTabs;
  };

  const tabs = currentUser ? getTabsForRole(currentUser.role) : [];

  const handleSyncPPData = async () => {
    setLoading(true);
    try {
      // await apiService.triggerSync();
      await loadDashboardData();
    } catch (err) {
      console.error('Error syncing PP data:', err);
      setError('Failed to sync Practice Partner data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900">Loading Dashboard...</h3>
          <p className="text-gray-500">Loading your data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Authentication Required</h3>
          <p className="text-gray-500 mb-4">Please login to view your Practice Partner data</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
            <button 
              onClick={loadDashboardData}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Peak 1031 Platform</h1>
              {dashboardStats.integration.totalPPItems > 0 && (
                <div className="ml-4 flex items-center text-sm text-green-600">
                  <StarIcon className="w-4 h-4 mr-1" />
                  <span>Practice Partner Integrated</span>
                  {lastSyncTime && (
                    <span className="ml-2 text-xs text-gray-500">
                      Last sync: {lastSyncTime}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleSyncPPData}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Sync PP</span>
              </button>
              <span className="text-sm text-gray-600">
                Welcome, {currentUser?.first_name} {currentUser?.last_name}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {currentUser?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        {['exchanges', 'contacts', 'tasks'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {activeTab === 'exchanges' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="45D">45-Day Period</option>
                  <option value="180D">180-Day Period</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              )}
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showPPOnly}
                  onChange={(e) => setShowPPOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">PP Data Only</span>
                <StarIcon className="w-4 h-4 text-green-500" />
              </label>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Exchanges"
                value={dashboardStats.exchanges.total}
                subtitle={`${dashboardStats.exchanges.ppSynced} from Practice Partner`}
                icon={DocumentTextIcon}
                color="blue"
              />
              <StatCard
                title="Total Tasks"
                value={dashboardStats.tasks.total}
                subtitle={`${dashboardStats.tasks.overdue} overdue • ${dashboardStats.tasks.ppSynced} from PP`}
                icon={CheckCircleIcon}
                color="green"
              />
              <StatCard
                title="Total Contacts"
                value={dashboardStats.contacts.total}
                subtitle={`${dashboardStats.contacts.ppSynced} from Practice Partner`}
                icon={UsersIcon}
                color="purple"
              />
              <StatCard
                title="PP Integration"
                value={dashboardStats.integration.totalPPItems}
                subtitle={`Items synced • ${lastSyncTime ? 'Last: ' + new Date(lastSyncTime).toLocaleDateString() : 'Never'}`}
                icon={StarIcon}
                color="yellow"
              />
            </div>

            {/* Recent Exchanges */}
            <ModernCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Exchanges</h2>
                <button 
                  onClick={() => setActiveTab('exchanges')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExchanges.slice(0, 4).map(exchange => (
                  <ExchangeCard
                    key={exchange.id}
                    exchange={exchange}
                    onClick={() => {
                      setSelectedExchange(exchange);
                    }}
                    compact={true}
                    showProgress={true}
                  />
                ))}
              </div>
              {filteredExchanges.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No exchanges found
                </div>
              )}
            </ModernCard>
          </div>
        )}
        
        {activeTab === 'exchanges' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map(exchange => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  onClick={() => {
                    setSelectedExchange(exchange);
                  }}
                  selected={selectedExchange?.id === exchange.id}
                  showProgress={true}
                />
              ))}
            </div>
            {filteredExchanges.length === 0 && (
              <ModernCard>
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No exchanges found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              </ModernCard>
            )}
          </div>
        )}
        
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  showPPInfo={true}
                />
              ))}
            </div>
            {filteredContacts.length === 0 && (
              <ModernCard>
                <div className="text-center py-12">
                  <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              </ModernCard>
            )}
          </div>
        )}
        
        {activeTab === 'tasks' && (
          <ModernCard>
            <TaskBoard
              tasks={tasks.filter(task => {
                if (['admin', 'agency', 'coordinator'].includes(currentUser?.role || '')) return true;
                return task.assignedTo === currentUser?.id ||
                       filteredExchanges.some(ex => ex.id === task.exchangeId);
              })}
              onTaskUpdate={(taskId, updates) => {
                // Handle task updates
                console.log('Update task:', taskId, updates);
              }}
              showExchangeInfo={true}
              showPPInfo={true}
            />
          </ModernCard>
        )}
        
        {activeTab === 'messages' && selectedExchange && (
          <ModernCard>
            <UnifiedChatInterface />
          </ModernCard>
        )}
        
        {activeTab === 'messages' && !selectedExchange && (
          <ModernCard>
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an exchange</h3>
              <p className="text-gray-500">Choose an exchange to view and send messages</p>
            </div>
          </ModernCard>
        )}
      </div>
    </div>
  );
};

export default PPIntegratedDashboard;