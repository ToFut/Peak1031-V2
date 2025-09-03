import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { smartApi } from '@/shared/services/smartApi';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface UrgentExchange {
  id: string;
  title: string;
  client_name: string;
  deadline: string;
  days_remaining: number;
  priority: 'urgent' | 'high' | 'medium';
  status: string;
}

interface PendingTask {
  id: string;
  title: string;
  exchange_title: string;
  due_date: string;
  days_overdue?: number;
  type: 'document' | 'client_communication' | 'escrow' | 'review';
  priority: 'urgent' | 'high' | 'medium';
}

interface RecentMessage {
  id: string;
  sender_name: string;
  preview: string;
  timestamp: string;
  type: 'email' | 'text' | 'chat';
  is_urgent: boolean;
  exchange_title?: string;
}

interface DashboardData {
  urgentExchanges: UrgentExchange[];
  pendingTasks: PendingTask[];
  recentMessages: RecentMessage[];
  stats: {
    totalActiveExchanges: number;
    overdueItems: number;
    unreadMessages: number;
  };
}

const PriorityBadge: React.FC<{ priority: 'urgent' | 'high' | 'medium' }> = ({ priority }) => {
  const colors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
};

const MessageTypeIcon: React.FC<{ type: 'email' | 'text' | 'chat', isUrgent?: boolean }> = ({ type, isUrgent }) => {
  const iconClass = `w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-gray-500'}`;
  
  switch (type) {
    case 'email': return <EnvelopeIcon className={iconClass} />;
    case 'text': return <PhoneIcon className={iconClass} />;
    case 'chat': return <ChatBubbleLeftRightIcon className={iconClass} />;
  }
};

const ImprovedAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    urgentExchanges: [],
    pendingTasks: [],
    recentMessages: [],
    stats: { totalActiveExchanges: 0, overdueItems: 0, unreadMessages: 0 }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API calls
      const mockData: DashboardData = {
        urgentExchanges: [
          {
            id: '1',
            title: 'Johnson Property Exchange',
            client_name: 'Robert Johnson',
            deadline: '2025-08-20',
            days_remaining: 2,
            priority: 'urgent',
            status: 'pending_documents'
          },
          {
            id: '2',
            title: 'Smith Commercial Exchange',
            client_name: 'Sarah Smith',
            deadline: '2025-08-19',
            days_remaining: 1,
            priority: 'urgent',
            status: 'escrow_review'
          }
        ],
        pendingTasks: [
          {
            id: '1',
            title: 'Review and send purchase agreement',
            exchange_title: 'Johnson Property Exchange',
            due_date: '2025-08-18',
            days_overdue: 0,
            type: 'document',
            priority: 'urgent'
          },
          {
            id: '2',
            title: 'Client signature required on 1031 forms',
            exchange_title: 'Smith Commercial Exchange',
            due_date: '2025-08-17',
            days_overdue: 1,
            type: 'client_communication',
            priority: 'urgent'
          }
        ],
        recentMessages: [
          {
            id: '1',
            sender_name: 'Robert Johnson',
            preview: 'Urgent: Need clarification on property deed requirements...',
            timestamp: '2025-08-18T10:30:00Z',
            type: 'email',
            is_urgent: true,
            exchange_title: 'Johnson Property Exchange'
          },
          {
            id: '2',
            sender_name: 'Escrow Officer',
            preview: 'Documents ready for review, please confirm...',
            timestamp: '2025-08-18T09:15:00Z',
            type: 'email',
            is_urgent: true
          }
        ],
        stats: {
          totalActiveExchanges: 24,
          overdueItems: 3,
          unreadMessages: 7
        }
      };
      
      setDashboardData(mockData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDaysRemaining = (days: number): string => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Dashboard Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Action Dashboard</h1>
          <p className="text-gray-600 mt-2">Focus on what needs immediate attention</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Key Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboardData.stats.overdueItems}</p>
                <p className="text-sm text-gray-600">Overdue Items</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.urgentExchanges.length}</p>
                <p className="text-sm text-gray-600">Urgent Exchanges</p>
              </div>
              <ClockIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.stats.unreadMessages}</p>
                <p className="text-sm text-gray-600">Unread Messages</p>
              </div>
              <InboxIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Urgent Matters Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                Urgent Matters (1-2 Days)
              </h2>
              <span className="text-sm text-red-600 font-medium">
                {dashboardData.urgentExchanges.length} exchanges need attention
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {dashboardData.urgentExchanges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No urgent exchanges at this time</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.urgentExchanges.map((exchange) => (
                  <div key={exchange.id} className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{exchange.title}</h3>
                          <PriorityBadge priority={exchange.priority} />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Client: {exchange.client_name}</p>
                        <div className="flex items-center text-sm text-red-700 mt-2">
                          <CalendarDaysIcon className="w-4 h-4 mr-1" />
                          {formatDaysRemaining(exchange.days_remaining)} • {exchange.status.replace('_', ' ')}
                        </div>
                      </div>
                      <button className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        View Details <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Finishing Documents/Tasks Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <DocumentTextIcon className="w-5 h-5 text-orange-500 mr-2" />
                Documents & Tasks Requiring Action
              </h2>
              <button 
                onClick={() => window.location.href = '/tasks'}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                View All Tasks
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {dashboardData.pendingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pending tasks</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.pendingTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <PriorityBadge priority={task.priority} />
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded capitalize">
                            {task.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Exchange: {task.exchange_title}</p>
                        <div className="flex items-center text-sm text-gray-700 mt-2">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                          {task.days_overdue && task.days_overdue > 0 && (
                            <span className="ml-2 text-red-600 font-medium">
                              ({task.days_overdue} days overdue)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
                          Complete
                        </button>
                        <button className="flex items-center text-sm text-indigo-600 hover:text-indigo-800">
                          View <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ImprovedAdminDashboard;