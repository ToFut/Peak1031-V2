import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { roleBasedApiService } from '../services/roleBasedApiService';
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
  const [loading, setLoading] = useState(false);
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

  // Load data on component mount - only show loading for manual refresh
  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async (showLoader = false) => {
    if (!currentUser) return;
    
    if (showLoader) {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Use role-based API service for automatic filtering
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        company: currentUser.company
      });
      
      const exchangesData = dashboardData.exchanges || [];
      const contactsData = dashboardData.contacts || [];
      const tasksData = dashboardData.tasks || [];
      
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      
      // Check if using fallback data
      const usingFallback = [
        ...exchangesData,
        ...contactsData,
        ...tasksData
      ].some((item: any) => item._isFallback);
      
      if (usingFallback) {
        setError('Using cached Practice Partner data - backend connection unavailable');
      }
      
      // Set last sync time from PP data
      const ppItems = [...(Array.isArray(exchangesData) ? exchangesData : []), ...(Array.isArray(contactsData) ? contactsData : [])];
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
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // Dashboard statistics
  const dashboardStats = useMemo(() => {
    const userExchanges = ['admin', 'agency', 'coordinator'].includes(currentUser?.role || '') ? exchanges : 
      exchanges.filter(ex => {
        // Check if user is coordinator
        if (ex.coordinatorId === currentUser?.id) return true;
        
        // For client users, check if they are participants
        if (currentUser?.role === 'client' && ex.exchangeParticipants) {
          return ex.exchangeParticipants.some(participant => 
            participant.contact?.email === currentUser?.email || 
            participant.user?.id === currentUser?.id
          );
        }
        
        // Legacy check for clientId
        return ex.clientId === currentUser?.id;
      });

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
        completed: userTasks.filter(t => t.status === 'COMPLETED').length,
        overdue: userTasks.filter(t => {
          if (!t.dueDate || t.status === 'COMPLETED') return false;
          return new Date(t.dueDate) < new Date();
        }).length,
        ppSynced: userTasks.filter(t => (t as any).ppTaskId).length
      },
      contacts: {
        total: contacts.length,
        clients: contacts.filter(c => c.contactType === 'Client').length,
        thirdParties: contacts.filter(c => c.contactType === 'Other').length,
        ppSynced: contacts.filter(c => (c as any).ppContactId).length
      },
      integration: {
        totalPPItems: 
          userExchanges.filter(ex => ex.ppMatterId).length +
          userTasks.filter(t => (t as any).ppTaskId).length +
          contacts.filter(c => (c as any).ppContactId).length,
        lastSync: lastSyncTime
      }
    };
  }, [exchanges, contacts, tasks, currentUser, lastSyncTime]);

  // Filtered exchanges for display
  const filteredExchanges = useMemo(() => {
    let filtered = ['admin', 'agency', 'coordinator'].includes(currentUser?.role || '') ? exchanges :
      exchanges.filter(ex => {
        if (ex.coordinatorId === currentUser?.id) return true;
        if (currentUser?.role === 'client' && ex.exchangeParticipants) {
          return ex.exchangeParticipants.some(participant => 
            participant.contact?.email === currentUser?.email || 
            participant.user?.id === currentUser?.id
          );
        }
        return ex.clientId === currentUser?.id;
      });
    
    // Text search
    if (searchTerm) {
      filtered = filtered.filter(ex => 
        ex.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.exchangeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleSyncPPData = async () => {
    try {
      await apiService.triggerSync('full');
      await loadDashboardData(true); // Show loader for manual sync
    } catch (err) {
      console.error('Error syncing PP data:', err);
      setError('Failed to sync Practice Partner data');
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

  if (error && error.includes('authentication')) {
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
              onClick={() => loadDashboardData(true)}
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
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
              <a 
                href="/exchanges"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                View All
              </a>
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
                <p>Loading Practice Partner exchanges...</p>
                <p className="text-sm mt-2">Real data from your database</p>
              </div>
            )}
          </ModernCard>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModernCard>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Active Exchanges</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{dashboardStats.exchanges.active}</p>
                  <p className="text-sm text-gray-500 mt-1">In 45D or 180D period</p>
                </div>
                <DocumentTextIcon className="w-10 h-10 text-blue-200" />
              </div>
              <a href="/exchanges" className="block mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
                View Exchanges →
              </a>
            </ModernCard>

            <ModernCard>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Pending Tasks</h3>
                  <p className="text-2xl font-bold text-green-600 mt-1">{dashboardStats.tasks.pending}</p>
                  <p className="text-sm text-gray-500 mt-1">{dashboardStats.tasks.overdue} overdue</p>
                </div>
                <CheckCircleIcon className="w-10 h-10 text-green-200" />
              </div>
              <a href="/tasks" className="block mt-4 text-green-600 hover:text-green-800 font-medium text-sm">
                View Tasks →
              </a>
            </ModernCard>

            <ModernCard>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Total Contacts</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{dashboardStats.contacts.total}</p>
                  <p className="text-sm text-gray-500 mt-1">{dashboardStats.contacts.clients} clients</p>
                </div>
                <UsersIcon className="w-10 h-10 text-purple-200" />
              </div>
              <a href="/contacts" className="block mt-4 text-purple-600 hover:text-purple-800 font-medium text-sm">
                View Contacts →
              </a>
            </ModernCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPIntegratedDashboard;