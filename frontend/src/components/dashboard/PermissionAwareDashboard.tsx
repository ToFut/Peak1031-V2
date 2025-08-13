import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ExchangeAccess {
  exchange_id: string;
  access_level: string;
  permissions: string[];
}

interface Exchange {
  id: string;
  exchange_name: string;
  status: string;
  day_45_deadline?: string;
  day_180_deadline?: string;
  created_at: string;
}

interface DashboardData {
  exchanges: Exchange[];
  tasks: any[];
  documents: any[];
  messages: any[];
  recentActivity: any[];
  stats: {
    totalExchanges: number;
    activeTasks: number;
    unreadMessages: number;
    documentsCount: number;
  };
}

interface UserPermissions {
  [exchangeId: string]: {
    canViewOverview: boolean;
    canViewMessages: boolean;
    canSendMessages: boolean;
    canViewTasks: boolean;
    canCreateTasks: boolean;
    canEditTasks: boolean;
    canViewDocuments: boolean;
    canUploadDocuments: boolean;
    canEditDocuments: boolean;
    canViewParticipants: boolean;
    canViewFinancial: boolean;
    canViewReports: boolean;
    isExchangeAdmin: boolean;
  };
}

export const PermissionAwareDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [accessibleExchanges, setAccessibleExchanges] = useState<ExchangeAccess[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch user's accessible exchanges and permissions
  const fetchAccessibleExchanges = async () => {
    try {
      const response = await fetch('/api/exchanges/user/accessible-exchanges', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const exchanges = await response.json();
        setAccessibleExchanges(exchanges);
        
        // Fetch detailed permissions for each exchange
        const permissionsPromises = exchanges.map(async (exchange: ExchangeAccess) => {
          const permResponse = await fetch(`/api/exchanges/${exchange.exchange_id}/permissions`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (permResponse.ok) {
            const permissions = await permResponse.json();
            return { exchangeId: exchange.exchange_id, permissions };
          }
          return { exchangeId: exchange.exchange_id, permissions: {} };
        });

        const permissionsResults = await Promise.all(permissionsPromises);
        const permissionsMap: UserPermissions = {};
        
        permissionsResults.forEach(({ exchangeId, permissions }) => {
          permissionsMap[exchangeId] = permissions;
        });
        
        setUserPermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Error fetching accessible exchanges:', error);
    }
  };

  // Fetch dashboard data filtered by permissions
  const fetchDashboardData = async () => {
    if (accessibleExchanges.length === 0) {
      setDashboardData({
        exchanges: [],
        tasks: [],
        documents: [],
        messages: [],
        recentActivity: [],
        stats: {
          totalExchanges: 0,
          activeTasks: 0,
          unreadMessages: 0,
          documentsCount: 0
        }
      });
      return;
    }

    try {
      const exchangeIds = accessibleExchanges.map(e => e.exchange_id);
      
      // Fetch exchanges
      const exchangesResponse = await fetch('/api/exchanges', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      let exchanges: Exchange[] = [];
      if (exchangesResponse.ok) {
        const exchangesData = await exchangesResponse.json();
        // Filter to only accessible exchanges
        exchanges = exchangesData.filter((exchange: Exchange) => 
          exchangeIds.includes(exchange.id)
        );
      }

      // Fetch tasks from accessible exchanges
      const tasksPromises = exchangeIds.map(async (exchangeId) => {
        const permissions = userPermissions[exchangeId];
        if (!permissions?.canViewTasks) return [];

        try {
          const response = await fetch(`/api/exchanges/${exchangeId}/tasks`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const tasks = await response.json();
            return tasks.map((task: any) => ({ ...task, exchange_id: exchangeId }));
          }
        } catch (error) {
          console.error(`Error fetching tasks for exchange ${exchangeId}:`, error);
        }
        return [];
      });

      const tasksResults = await Promise.all(tasksPromises);
      const allTasks = tasksResults.flat();

      // Fetch documents from accessible exchanges
      const documentsPromises = exchangeIds.map(async (exchangeId) => {
        const permissions = userPermissions[exchangeId];
        if (!permissions?.canViewDocuments) return [];

        try {
          const response = await fetch(`/api/exchanges/${exchangeId}/documents`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const documents = await response.json();
            return documents.map((doc: any) => ({ ...doc, exchange_id: exchangeId }));
          }
        } catch (error) {
          console.error(`Error fetching documents for exchange ${exchangeId}:`, error);
        }
        return [];
      });

      const documentsResults = await Promise.all(documentsPromises);
      const allDocuments = documentsResults.flat();

      // Fetch messages from accessible exchanges
      const messagesPromises = exchangeIds.map(async (exchangeId) => {
        const permissions = userPermissions[exchangeId];
        if (!permissions?.canViewMessages) return [];

        try {
          const response = await fetch(`/api/exchanges/${exchangeId}/messages`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const messages = await response.json();
            return messages.map((msg: any) => ({ ...msg, exchange_id: exchangeId }));
          }
        } catch (error) {
          console.error(`Error fetching messages for exchange ${exchangeId}:`, error);
        }
        return [];
      });

      const messagesResults = await Promise.all(messagesPromises);
      const allMessages = messagesResults.flat();

      // Calculate stats
      const stats = {
        totalExchanges: exchanges.length,
        activeTasks: allTasks.filter(task => task.status !== 'completed').length,
        unreadMessages: allMessages.filter(msg => !msg.read).length,
        documentsCount: allDocuments.length
      };

      // Generate recent activity
      const recentActivity = [
        ...allTasks.map(task => ({
          type: 'task',
          title: `Task: ${task.title}`,
          exchange_name: exchanges.find(e => e.id === task.exchange_id)?.exchange_name,
          timestamp: task.updated_at || task.created_at,
          status: task.status
        })),
        ...allDocuments.map(doc => ({
          type: 'document',
          title: `Document: ${doc.filename}`,
          exchange_name: exchanges.find(e => e.id === doc.exchange_id)?.exchange_name,
          timestamp: doc.created_at
        })),
        ...allMessages.map(msg => ({
          type: 'message',
          title: `Message in ${exchanges.find(e => e.id === msg.exchange_id)?.exchange_name}`,
          exchange_name: exchanges.find(e => e.id === msg.exchange_id)?.exchange_name,
          timestamp: msg.created_at
        }))
      ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

      setDashboardData({
        exchanges,
        tasks: allTasks,
        documents: allDocuments,
        messages: allMessages,
        recentActivity,
        stats
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAccessibleExchanges();
    };
    
    loadData();
  }, [user]);

  useEffect(() => {
    if (accessibleExchanges.length > 0 && Object.keys(userPermissions).length > 0) {
      fetchDashboardData().finally(() => setLoading(false));
    } else if (accessibleExchanges.length === 0) {
      setLoading(false);
    }
  }, [accessibleExchanges, userPermissions]);

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: HomeIcon, available: true }
    ];

    const hasAnyTaskPermission = Object.values(userPermissions).some(p => p.canViewTasks);
    const hasAnyDocumentPermission = Object.values(userPermissions).some(p => p.canViewDocuments);
    const hasAnyMessagePermission = Object.values(userPermissions).some(p => p.canViewMessages);
    const hasAnyReportPermission = Object.values(userPermissions).some(p => p.canViewReports);

    if (hasAnyTaskPermission) {
      tabs.push({ id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon, available: true });
    }

    if (hasAnyDocumentPermission) {
      tabs.push({ id: 'documents', label: 'Documents', icon: DocumentTextIcon, available: true });
    }

    if (hasAnyMessagePermission) {
      tabs.push({ id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon, available: true });
    }

    if (hasAnyReportPermission) {
      tabs.push({ id: 'reports', label: 'Reports', icon: ChartBarIcon, available: true });
    }

    return tabs;
  };

  // Check if user has any meaningful access
  const hasAnyAccess = () => {
    return accessibleExchanges.length > 0 && Object.keys(userPermissions).length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAnyAccess()) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchange Access</h3>
        <p className="text-gray-600 mb-6">
          You don't have access to any exchanges yet. Contact your administrator to get access.
        </p>
        {user?.role === 'admin' && (
          <p className="text-sm text-blue-600">
            As an admin, you can manage user access in the Admin → Users section.
          </p>
        )}
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <HomeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{dashboardData?.stats.totalExchanges || 0}</h3>
              <p className="text-sm text-gray-600">Accessible Exchanges</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{dashboardData?.stats.activeTasks || 0}</h3>
              <p className="text-sm text-gray-600">Active Tasks</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{dashboardData?.stats.documentsCount || 0}</h3>
              <p className="text-sm text-gray-600">Documents</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{dashboardData?.stats.unreadMessages || 0}</h3>
              <p className="text-sm text-gray-600">Unread Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {availableTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {selectedTab === 'overview' && (
            <OverviewTab 
              exchanges={dashboardData?.exchanges || []} 
              recentActivity={dashboardData?.recentActivity || []}
              userPermissions={userPermissions}
            />
          )}
          
          {selectedTab === 'tasks' && (
            <TasksTab 
              tasks={dashboardData?.tasks || []} 
              exchanges={dashboardData?.exchanges || []}
              userPermissions={userPermissions}
            />
          )}
          
          {selectedTab === 'documents' && (
            <DocumentsTab 
              documents={dashboardData?.documents || []} 
              exchanges={dashboardData?.exchanges || []}
              userPermissions={userPermissions}
            />
          )}
          
          {selectedTab === 'messages' && (
            <MessagesTab 
              messages={dashboardData?.messages || []} 
              exchanges={dashboardData?.exchanges || []}
              userPermissions={userPermissions}
            />
          )}
          
          {selectedTab === 'reports' && (
            <ReportsTab 
              dashboardData={dashboardData}
              exchanges={dashboardData?.exchanges || []}
              userPermissions={userPermissions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  exchanges: Exchange[]; 
  recentActivity: any[];
  userPermissions: UserPermissions;
}> = ({ exchanges, recentActivity, userPermissions }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Exchanges */}
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Your Exchanges</h3>
      <div className="space-y-3">
        {exchanges.slice(0, 5).map(exchange => {
          const permissions = userPermissions[exchange.id];
          return (
            <div key={exchange.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{exchange.exchange_name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  exchange.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {exchange.status}
                </span>
              </div>
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                {permissions?.canViewOverview && <span>✓ Overview</span>}
                {permissions?.canViewTasks && <span>✓ Tasks</span>}
                {permissions?.canViewDocuments && <span>✓ Documents</span>}
                {permissions?.canViewMessages && <span>✓ Messages</span>}
                {permissions?.isExchangeAdmin && <span>✓ Admin</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Recent Activity */}
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentActivity.slice(0, 8).map((activity, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              activity.type === 'task' ? 'bg-green-100' :
              activity.type === 'document' ? 'bg-purple-100' : 'bg-yellow-100'
            }`}>
              {activity.type === 'task' && <ClipboardDocumentListIcon className="h-4 w-4 text-green-600" />}
              {activity.type === 'document' && <DocumentTextIcon className="h-4 w-4 text-purple-600" />}
              {activity.type === 'message' && <ChatBubbleLeftRightIcon className="h-4 w-4 text-yellow-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.exchange_name}</p>
            </div>
            <div className="flex items-center text-xs text-gray-400">
              <ClockIcon className="h-3 w-3 mr-1" />
              {new Date(activity.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Tasks Tab Component
const TasksTab: React.FC<{ 
  tasks: any[]; 
  exchanges: Exchange[];
  userPermissions: UserPermissions;
}> = ({ tasks, exchanges, userPermissions }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Tasks</h3>
    {tasks.length === 0 ? (
      <p className="text-gray-500">No tasks available with your current permissions.</p>
    ) : (
      <div className="space-y-3">
        {tasks.map(task => {
          const exchange = exchanges.find(e => e.id === task.exchange_id);
          const permissions = userPermissions[task.exchange_id];
          return (
            <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Exchange: {exchange?.exchange_name}</span>
                <div className="flex items-center space-x-2">
                  {permissions?.canEditTasks && <span className="text-blue-600">Can Edit</span>}
                  {task.due_date && (
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// Documents Tab Component
const DocumentsTab: React.FC<{ 
  documents: any[]; 
  exchanges: Exchange[];
  userPermissions: UserPermissions;
}> = ({ documents, exchanges, userPermissions }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Documents</h3>
    {documents.length === 0 ? (
      <p className="text-gray-500">No documents available with your current permissions.</p>
    ) : (
      <div className="space-y-3">
        {documents.map(document => {
          const exchange = exchanges.find(e => e.id === document.exchange_id);
          const permissions = userPermissions[document.exchange_id];
          return (
            <div key={document.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{document.filename}</h4>
                <span className="text-xs text-gray-500">{document.file_type}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Exchange: {exchange?.exchange_name}</span>
                <div className="flex items-center space-x-2">
                  {permissions?.canEditDocuments && <span className="text-blue-600">Can Edit</span>}
                  {permissions?.canUploadDocuments && <span className="text-green-600">Can Upload</span>}
                  <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// Messages Tab Component
const MessagesTab: React.FC<{ 
  messages: any[]; 
  exchanges: Exchange[];
  userPermissions: UserPermissions;
}> = ({ messages, exchanges, userPermissions }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Messages</h3>
    {messages.length === 0 ? (
      <p className="text-gray-500">No messages available with your current permissions.</p>
    ) : (
      <div className="space-y-3">
        {messages.slice(0, 10).map(message => {
          const exchange = exchanges.find(e => e.id === message.exchange_id);
          const permissions = userPermissions[message.exchange_id];
          return (
            <div key={message.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Message in {exchange?.exchange_name}
                </h4>
                {!message.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 truncate">{message.content}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>From: {message.sender_name || 'Unknown'}</span>
                <div className="flex items-center space-x-2">
                  {permissions?.canSendMessages && <span className="text-blue-600">Can Reply</span>}
                  <span>{new Date(message.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// Reports Tab Component
const ReportsTab: React.FC<{ 
  dashboardData: DashboardData | null;
  exchanges: Exchange[];
  userPermissions: UserPermissions;
}> = ({ dashboardData, exchanges, userPermissions }) => {
  const hasReportAccess = Object.values(userPermissions).some(p => p.canViewReports);

  if (!hasReportAccess) {
    return (
      <div className="text-center py-8">
        <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">You don't have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Reports & Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Exchange Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Exchanges:</span>
              <span>{exchanges.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span>{exchanges.filter(e => e.status === 'active').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{exchanges.filter(e => e.status === 'completed').length}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Task Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Tasks:</span>
              <span>{dashboardData?.tasks.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span>{dashboardData?.tasks.filter(t => t.status !== 'completed').length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{dashboardData?.tasks.filter(t => t.status === 'completed').length || 0}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Document Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Documents:</span>
              <span>{dashboardData?.documents.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Recent (7 days):</span>
              <span>
                {dashboardData?.documents.filter(d => 
                  new Date(d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};