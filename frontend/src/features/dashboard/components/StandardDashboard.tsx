import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRolePermissions } from '../../../hooks/useRolePermissions';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import {
  EnhancedStatCard,
  QuickAction,
  DashboardSkeleton,
  ErrorState
} from './SharedDashboardComponents';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,

  UsersIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ArrowPathIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Role-specific configuration
interface RoleConfig {
  title: string;
  subtitle: string;
  primaryColor: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
  availableTabs: string[];
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    action: string;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
    adminOnly?: boolean;
  }>;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  admin: {
    title: 'Admin Dashboard',
    subtitle: 'System overview and management',
    primaryColor: 'blue',
    availableTabs: ['overview', 'exchanges', 'tasks', 'users', 'documents', 'system'],
    quickActions: [
      {
        id: 'sync-pp',
        title: 'Sync PP Data',
        description: 'Update from PracticePanther',
        icon: ArrowPathIcon,
        action: 'sync',
        color: 'green'
      },
      {
        id: 'create-user',
        title: 'Create User',
        description: 'Add new platform user',
        icon: PlusIcon,
        action: 'create-user',
        color: 'blue'
      },
      {
        id: 'view-audit',
        title: 'View Audit Logs',
        description: 'System activity history',
        icon: EyeIcon,
        action: 'audit',
        color: 'purple'
      },
      {
        id: 'system-settings',
        title: 'System Settings',
        description: 'Configure platform',
        icon: CogIcon,
        action: 'settings',
        color: 'gray'
      }
    ]
  },
  client: {
    title: 'Client Dashboard',
    subtitle: 'Your 1031 exchange overview',
    primaryColor: 'blue',
    availableTabs: ['overview', 'my_exchanges', 'my_tasks', 'documents', 'messages'],
    quickActions: [
      {
        id: 'view-exchanges',
        title: 'My Exchanges',
        description: 'View your active exchanges',
        icon: ChartBarIcon,
        action: 'exchanges',
        color: 'blue'
      },
      {
        id: 'upload-doc',
        title: 'Upload Document',
        description: 'Add required documents',
        icon: DocumentTextIcon,
        action: 'upload',
        color: 'green'
      }
    ]
  },
  coordinator: {
    title: 'Coordinator Dashboard',
    subtitle: 'Exchange coordination and management',
    primaryColor: 'yellow',
    availableTabs: ['overview', 'exchanges', 'tasks', 'documents', 'team'],
    quickActions: [
      {
        id: 'create-exchange',
        title: 'New Exchange',
        description: 'Start new 1031 exchange',
        icon: PlusIcon,
        action: 'create-exchange',
        color: 'green'
      },
      {
        id: 'task-overview',
        title: 'Task Overview',
        description: 'Review pending tasks',
        icon: CheckCircleIcon,
        action: 'tasks',
        color: 'blue'
      }
    ]
  },
  agency: {
    title: 'Agency Dashboard',
    subtitle: 'Agency network management',
    primaryColor: 'purple',
    availableTabs: ['overview', 'exchanges', 'clients', 'performance'],
    quickActions: [
      {
        id: 'client-status',
        title: 'Client Status',
        description: 'Check client exchanges',
        icon: UsersIcon,
        action: 'clients',
        color: 'purple'
      }
    ]
  },
  third_party: {
    title: 'Third Party Dashboard',
    subtitle: 'Exchange participation overview',
    primaryColor: 'gray',
    availableTabs: ['overview', 'exchanges', 'documents'],
    quickActions: []
  }
};

interface StandardDashboardProps {
  role: string;
  customContent?: React.ReactNode;
}

const StandardDashboard: React.FC<StandardDashboardProps> = ({
  role,
  customContent
}) => {
  const { user } = useAuth();
  const { canView } = useRolePermissions();
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.client;
  
  
  const {
    stats,
    exchanges,
    tasks,
    documents,
    messages,
    users,
    loading,
    error,
    refreshData,
    syncPracticePanther,
    syncing
  } = useDashboardData({ 
    role, 
    autoRefresh: true, 
    refreshInterval: 300000 // 5 minutes
  });

  const handleQuickAction = async (actionId: string, action: string) => {
    try {
      switch (action) {
        case 'sync':
          await syncPracticePanther();
          break;
        case 'create-user':
          window.location.href = '/admin/users';
          break;
        case 'audit':
          window.location.href = '/admin/audit';
          break;
        case 'settings':
          window.location.href = '/admin/system';
          break;
        case 'exchanges':
        case 'my_exchanges':
          window.location.href = '/exchanges';
          break;
        case 'tasks':
          window.location.href = '/tasks';
          break;
        case 'upload':
          window.location.href = '/documents';
          break;
        case 'clients':
          window.location.href = '/contacts';
          break;
        default:
          
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  };

  const renderOverviewContent = () => {
    if (loading) {
      return <DashboardSkeleton cards={role === 'admin' ? 6 : 4} />;
    }

    if (error) {
      return (
        <ErrorState
          message={error}
          onRetry={refreshData}
        />
      );
    }

    if (!stats) {
      return (
        <ErrorState
          title="No Data Available"
          message="Unable to load dashboard statistics"
          onRetry={refreshData}
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            title="Total Exchanges"
            value={stats.exchanges.total}
            subtitle={`${stats.exchanges.active} active`}
            icon={ChartBarIcon}
            color={config.primaryColor}
            trend={stats.exchanges.total > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.exchanges.completed} completed`}
            onClick={() => window.location.href = '/exchanges'}
          />

          <EnhancedStatCard
            title={role === 'client' ? 'My Tasks' : 'Tasks'}
            value={stats.tasks.pending}
            subtitle={`${stats.tasks.total} total`}
            icon={CheckCircleIcon}
            color={stats.tasks.overdue > 0 ? 'red' : 'green'}
            urgent={stats.tasks.overdue > 0}
            trend={stats.tasks.overdue > 0 ? 'down' : 'up'}
            trendValue={stats.tasks.overdue > 0 ? `${stats.tasks.overdue} overdue` : `${stats.tasks.completed} completed`}
            onClick={() => window.location.href = '/tasks'}
          />

          {stats.documents && (
            <EnhancedStatCard
              title="Documents"
              value={stats.documents.total}
              subtitle={stats.documents.requireSignature ? `${stats.documents.requireSignature} need signature` : undefined}
              icon={DocumentTextIcon}
              color="purple"
              trend="neutral"
              trendValue={`${stats.documents.recent} recent`}
              onClick={() => window.location.href = '/documents'}
            />
          )}

          {stats.messages && (
            <EnhancedStatCard
              title="Messages"
              value={stats.messages.unread}
              subtitle="Unread messages"
              icon={ChatBubbleLeftRightIcon}
              color={stats.messages.unread > 0 ? 'yellow' : 'gray'}
              urgent={stats.messages.unread > 5}
              onClick={() => window.location.href = '/messages'}
            />
          )}

          {stats.users && role === 'admin' && (
            <>
              <EnhancedStatCard
                title="Users"
                value={stats.users.active}
                subtitle={`${stats.users.total} total`}
                icon={UsersIcon}
                color="indigo"
                trend="up"
                trendValue={`${stats.users.admins} admins`}
                onClick={() => window.location.href = '/admin/users'}
              />

              {stats.system && (
                <EnhancedStatCard
                  title="System Health"
                  value={stats.system.systemHealth}
                  subtitle={stats.system.lastSync ? `Last sync: ${new Date(stats.system.lastSync).toLocaleDateString()}` : 'No recent sync'}
                  icon={CogIcon}
                  color={stats.system.systemHealth === 'healthy' ? 'green' : stats.system.systemHealth === 'warning' ? 'yellow' : 'red'}
                  onClick={() => window.location.href = '/admin/system'}
                />
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        {config.quickActions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.quickActions
                .filter(action => !action.adminOnly || role === 'admin')
                .map((action) => (
                  <QuickAction
                    key={action.id}
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    color={action.color}
                    onClick={() => handleQuickAction(action.id, action.action)}
                    loading={action.action === 'sync' && syncing}
                    disabled={action.action === 'sync' && syncing}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Custom Content */}
        {customContent}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, {user?.first_name || 'User'}. {config.subtitle}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Overview Only - No Tabs */}
      {renderOverviewContent()}
    </div>
  );
};

export default StandardDashboard;