import React, { useState } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard, QuickAction } from './SharedDashboardComponents';
import UnifiedChatInterface from '../../../components/UnifiedChatInterface';
import EnterpriseDocumentManager from '../../../components/EnterpriseDocumentManager';
import UserManagement from '../../../components/UserManagement';
import TemplateManager from '../../../components/TemplateManager';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import { TaskBoard } from '../../../components/TaskBoard';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  FolderIcon,
  ServerIcon,
  EyeIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AdminTabContentProps {
  activeTab: string;
  role: string;
}

const AdminTabContent: React.FC<AdminTabContentProps> = ({ activeTab, role }) => {
  const [userViewMode, setUserViewMode] = useState<'card' | 'table'>('card');
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchanges':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">All Exchanges</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage and monitor all 1031 exchanges in the system
                </p>
              </div>
              <div className="p-6">
                <ExchangeList />
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Task Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor and assign tasks across all exchanges
                </p>
              </div>
              <div className="p-6">
                <TaskBoard 
                  tasks={[]} 
                  showExchangeInfo={true}
                  showPPInfo={true}
                />
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            {/* User Management Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <div className="flex items-center space-x-3">
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setUserViewMode('card')}
                      className={`px-4 py-2 text-sm font-medium border ${
                        userViewMode === 'card'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      } rounded-l-md`}
                    >
                      Card View
                    </button>
                    <button
                      onClick={() => setUserViewMode('table')}
                      className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
                        userViewMode === 'table'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      } rounded-r-md`}
                    >
                      Table View
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* User Management Component */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <UserManagement />
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Enterprise Document Manager</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Advanced document management with templates and bulk operations
                </p>
              </div>
              <div className="p-6">
                <EnterpriseDocumentManager 
                  isOpen={true}
                  onClose={() => {}}
                />
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Unified Chat Interface</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor and participate in all system communications
                </p>
              </div>
              <div className="p-0">
                <UnifiedChatInterface />
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Template Manager</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage document templates and automated generation
                </p>
              </div>
              <div className="p-6">
                <TemplateManager />
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            {/* System Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EnhancedStatCard
                title="System Status"
                value="Healthy"
                subtitle="All services operational"
                icon={ShieldCheckIcon}
                color="green"
              />
              <EnhancedStatCard
                title="Database"
                value="Connected"
                subtitle="Response time: 45ms"
                icon={CircleStackIcon}
                color="blue"
              />
              <EnhancedStatCard
                title="API Health"
                value="Operational"
                subtitle="99.9% uptime"
                icon={ServerIcon}
                color="green"
              />
            </div>

            {/* System Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <QuickAction
                  title="View Audit Logs"
                  description="System activity history"
                  icon={EyeIcon}
                  onClick={() => console.log('View audit logs')}
                  color="purple"
                />
                <QuickAction
                  title="Backup System"
                  description="Create system backup"
                  icon={CircleStackIcon}
                  onClick={() => console.log('Backup system')}
                  color="blue"
                />
                <QuickAction
                  title="Refresh Cache"
                  description="Clear and refresh cache"
                  icon={ArrowPathIcon}
                  onClick={() => console.log('Refresh cache')}
                  color="green"
                />
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Server Details</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Environment:</dt>
                      <dd className="text-gray-900">Development</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Version:</dt>
                      <dd className="text-gray-900">V2.0.0</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Node Version:</dt>
                      <dd className="text-gray-900">18.17.0</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Database</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Type:</dt>
                      <dd className="text-gray-900">PostgreSQL + SQLite</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Status:</dt>
                      <dd className="text-green-600">Connected</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Last Backup:</dt>
                      <dd className="text-gray-900">2 hours ago</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content
            </h3>
            <p className="text-gray-600">
              Advanced {activeTab} management features coming soon.
            </p>
          </div>
        );
    }
  };

  return renderTabContent();
};

const StandardizedAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const customTabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: ChartBarIcon
    },
    {
      id: 'exchanges',
      name: 'Exchanges',
      icon: DocumentTextIcon
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: DocumentTextIcon
    },
    {
      id: 'users',
      name: 'Users',
      icon: UsersIcon
    },
    {
      id: 'documents',
      name: 'Documents',
      icon: FolderIcon
    },
    {
      id: 'chat',
      name: 'Chat',
      icon: ChatBubbleLeftRightIcon
    },
    {
      id: 'templates',
      name: 'Templates',
      icon: FolderIcon
    },
    {
      id: 'system',
      name: 'System',
      icon: CogIcon
    }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Advanced Admin Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EnhancedStatCard
            title="Active Sessions"
            value={12}
            subtitle="Users online now"
            icon={UsersIcon}
            color="green"
            trend="up"
            trendValue="+3 from yesterday"
          />
          <EnhancedStatCard
            title="API Requests"
            value="2.4K"
            subtitle="Last 24 hours"
            icon={ServerIcon}
            color="blue"
            trend="up"
            trendValue="+15% from yesterday"
          />
          <EnhancedStatCard
            title="Storage Used"
            value="47.2 GB"
            subtitle="of 100 GB allocated"
            icon={CircleStackIcon}
            color="yellow"
            trend="up"
            trendValue="+2.1 GB this week"
          />
        </div>
      </div>
    </div>
  );

  return (
    <StandardDashboard
      role="admin"
      customTabs={customTabs}
      onTabChange={handleTabChange}
      customContent={activeTab === 'overview' ? customOverviewContent : undefined}
    >
      {activeTab !== 'overview' && (
        <AdminTabContent activeTab={activeTab} role="admin" />
      )}
    </StandardDashboard>
  );
};

export default StandardizedAdminDashboard;