import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ExchangeUserManagement } from '../admin/ExchangeUserManagement';
import {
  EyeIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface Exchange {
  id: string;
  exchange_name: string;
  status: string;
  day_45_deadline?: string;
  day_180_deadline?: string;
  created_at: string;
  client_id?: string;
  coordinator_id?: string;
}

interface ExchangePermissions {
  canViewOverview: boolean;
  canViewMessages: boolean;
  canSendMessages: boolean;
  canViewTasks: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canAssignTasks: boolean;
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canEditDocuments: boolean;
  canDeleteDocuments: boolean;
  canViewParticipants: boolean;
  canManageParticipants: boolean;
  canViewFinancial: boolean;
  canEditFinancial: boolean;
  canViewTimeline: boolean;
  canEditTimeline: boolean;
  canViewReports: boolean;
  isExchangeAdmin: boolean;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  permission: keyof ExchangePermissions;
  description: string;
}

export const ExchangePageWithPermissions: React.FC = () => {
  const { exchangeId } = useParams<{ exchangeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [permissions, setPermissions] = useState<ExchangePermissions | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Tab configuration
  const allTabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: EyeIcon,
      permission: 'canViewOverview',
      description: 'Exchange summary and key information'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: ChatBubbleLeftRightIcon,
      permission: 'canViewMessages',
      description: 'Exchange chat and communications'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: ClipboardDocumentListIcon,
      permission: 'canViewTasks',
      description: 'Task management and assignments'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: DocumentTextIcon,
      permission: 'canViewDocuments',
      description: 'File storage and document management'
    },
    {
      id: 'participants',
      label: 'Participants',
      icon: UserGroupIcon,
      permission: 'canViewParticipants',
      description: 'Exchange participants and roles'
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: ChartBarIcon,
      permission: 'canViewFinancial',
      description: 'Financial information and reporting'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: ChartBarIcon,
      permission: 'canViewReports',
      description: 'Analytics and reporting'
    }
  ];

  // Fetch exchange data and permissions
  useEffect(() => {
    const fetchData = async () => {
      if (!exchangeId) return;

      try {
        setLoading(true);

        // Fetch exchange permissions first
        const permissionsResponse = await fetch(`/api/exchanges/${exchangeId}/permissions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (permissionsResponse.status === 403) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          setPermissions(permissionsData);

          // Fetch exchange details if user has overview permission
          if (permissionsData.canViewOverview) {
            const exchangeResponse = await fetch(`/api/exchanges/${exchangeId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (exchangeResponse.ok) {
              const exchangeData = await exchangeResponse.json();
              setExchange(exchangeData);
            }
          }
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error('Error fetching exchange data:', error);
        setAccessDenied(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [exchangeId]);

  // Get available tabs based on permissions
  const getAvailableTabs = (): TabConfig[] => {
    if (!permissions) return [];
    
    return allTabs.filter(tab => permissions[tab.permission]);
  };

  // Set default active tab to first available tab
  useEffect(() => {
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [permissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <LockClosedIcon className="h-12 w-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this exchange.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!permissions || !exchange) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Exchange Not Found</h3>
        <p className="text-gray-600">The requested exchange could not be found.</p>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exchange.exchange_name}</h1>
            <div className="mt-2 flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                exchange.status === 'active' ? 'bg-green-100 text-green-800' :
                exchange.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {exchange.status}
              </span>
              <span className="text-sm text-gray-500">
                Created: {new Date(exchange.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Permission indicator */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Access Level:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                permissions.isExchangeAdmin ? 'bg-red-100 text-red-800' :
                permissions.canEditTasks || permissions.canUploadDocuments ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {permissions.isExchangeAdmin ? 'Admin' :
                 permissions.canEditTasks || permissions.canUploadDocuments ? 'Read & Write' : 'Read Only'}
              </span>
            </div>

            {/* Admin controls */}
            {permissions.isExchangeAdmin && (
              <button
                onClick={() => setShowUserManagement(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Cog6ToothIcon className="h-4 w-4" />
                <span>Manage Users</span>
              </button>
            )}
          </div>
        </div>

        {/* Exchange deadlines */}
        {(exchange.day_45_deadline || exchange.day_180_deadline) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {exchange.day_45_deadline && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <div>
                  <span className="text-sm font-medium text-yellow-800">45-Day Deadline</span>
                  <p className="text-xs text-yellow-600">
                    {new Date(exchange.day_45_deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {exchange.day_180_deadline && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="text-sm font-medium text-blue-800">180-Day Deadline</span>
                  <p className="text-xs text-blue-600">
                    {new Date(exchange.day_180_deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {availableTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  title={tab.description}
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
          {activeTab === 'overview' && permissions.canViewOverview && (
            <OverviewTab 
              exchange={exchange} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'messages' && permissions.canViewMessages && (
            <MessagesTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'tasks' && permissions.canViewTasks && (
            <TasksTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'documents' && permissions.canViewDocuments && (
            <DocumentsTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'participants' && permissions.canViewParticipants && (
            <ParticipantsTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'financial' && permissions.canViewFinancial && (
            <FinancialTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
          
          {activeTab === 'reports' && permissions.canViewReports && (
            <ReportsTab 
              exchangeId={exchangeId!} 
              permissions={permissions}
            />
          )}
        </div>
      </div>

      {/* Permission Legend */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Your Permissions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <PermissionIndicator 
            label="View Overview" 
            granted={permissions.canViewOverview} 
          />
          <PermissionIndicator 
            label="View Messages" 
            granted={permissions.canViewMessages} 
          />
          <PermissionIndicator 
            label="Send Messages" 
            granted={permissions.canSendMessages} 
          />
          <PermissionIndicator 
            label="View Tasks" 
            granted={permissions.canViewTasks} 
          />
          <PermissionIndicator 
            label="Create Tasks" 
            granted={permissions.canCreateTasks} 
          />
          <PermissionIndicator 
            label="Edit Tasks" 
            granted={permissions.canEditTasks} 
          />
          <PermissionIndicator 
            label="View Documents" 
            granted={permissions.canViewDocuments} 
          />
          <PermissionIndicator 
            label="Upload Documents" 
            granted={permissions.canUploadDocuments} 
          />
          <PermissionIndicator 
            label="Manage Participants" 
            granted={permissions.canManageParticipants} 
          />
          <PermissionIndicator 
            label="View Financial" 
            granted={permissions.canViewFinancial} 
          />
          <PermissionIndicator 
            label="View Reports" 
            granted={permissions.canViewReports} 
          />
          <PermissionIndicator 
            label="Exchange Admin" 
            granted={permissions.isExchangeAdmin} 
          />
        </div>
      </div>

      {/* User Management Modal */}
      {showUserManagement && (
        <ExchangeUserManagement
          exchangeId={exchangeId!}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </div>
  );
};

// Permission Indicator Component
const PermissionIndicator: React.FC<{ label: string; granted: boolean }> = ({ label, granted }) => (
  <div className="flex items-center space-x-2">
    {granted ? (
      <CheckCircleIcon className="h-4 w-4 text-green-500" />
    ) : (
      <XCircleIcon className="h-4 w-4 text-red-300" />
    )}
    <span className={granted ? 'text-green-700' : 'text-gray-400'}>{label}</span>
  </div>
);

// Tab Components (simplified versions)
const OverviewTab: React.FC<{ exchange: Exchange; permissions: ExchangePermissions }> = ({ exchange, permissions }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Exchange Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{exchange.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span>{new Date(exchange.created_at).toLocaleDateString()}</span>
          </div>
          {exchange.day_45_deadline && (
            <div className="flex justify-between">
              <span className="text-gray-600">45-Day Deadline:</span>
              <span>{new Date(exchange.day_45_deadline).toLocaleDateString()}</span>
            </div>
          )}
          {exchange.day_180_deadline && (
            <div className="flex justify-between">
              <span className="text-gray-600">180-Day Deadline:</span>
              <span>{new Date(exchange.day_180_deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <div className="space-y-2">
          {permissions.canViewTasks && (
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              View Tasks
            </button>
          )}
          {permissions.canViewDocuments && (
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              View Documents
            </button>
          )}
          {permissions.canViewMessages && (
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              Open Messages
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const MessagesTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Messages</h3>
      {permissions.canSendMessages && (
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          New Message
        </button>
      )}
    </div>
    
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-500 text-center py-8">
        {permissions.canSendMessages 
          ? "No messages yet. Start a conversation!" 
          : "You can view messages but cannot send new ones."}
      </p>
    </div>
  </div>
);

const TasksTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
      {permissions.canCreateTasks && (
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Create Task
        </button>
      )}
    </div>
    
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-500 text-center py-8">
        {permissions.canCreateTasks 
          ? "No tasks yet. Create your first task!" 
          : permissions.canEditTasks
          ? "You can view and edit tasks."
          : "You can view tasks but cannot create or edit them."}
      </p>
    </div>
  </div>
);

const DocumentsTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Documents</h3>
      {permissions.canUploadDocuments && (
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Upload Document
        </button>
      )}
    </div>
    
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-500 text-center py-8">
        {permissions.canUploadDocuments 
          ? "No documents yet. Upload your first document!" 
          : permissions.canEditDocuments
          ? "You can view and edit documents."
          : "You can view documents but cannot upload or edit them."}
      </p>
    </div>
  </div>
);

const ParticipantsTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Participants</h3>
      {permissions.canManageParticipants && (
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Participant
        </button>
      )}
    </div>
    
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-500 text-center py-8">
        {permissions.canManageParticipants 
          ? "Manage exchange participants and their roles." 
          : "You can view participants but cannot manage them."}
      </p>
    </div>
  </div>
);

const FinancialTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
      {permissions.canEditFinancial && (
        <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
          <PencilIcon className="h-4 w-4 inline mr-2" />
          Edit Financial
        </button>
      )}
    </div>
    
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-500 text-center py-8">
        {permissions.canEditFinancial 
          ? "View and edit financial information for this exchange." 
          : "View-only access to financial information."}
      </p>
    </div>
  </div>
);

const ReportsTab: React.FC<{ exchangeId: string; permissions: ExchangePermissions }> = ({ exchangeId, permissions }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Reports & Analytics</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Exchange Summary</h4>
        <p className="text-sm text-gray-600">Overview of exchange progress and key metrics.</p>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Task Progress</h4>
        <p className="text-sm text-gray-600">Track task completion and timeline.</p>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Document Activity</h4>
        <p className="text-sm text-gray-600">Document upload and access patterns.</p>
      </div>
    </div>
  </div>
);