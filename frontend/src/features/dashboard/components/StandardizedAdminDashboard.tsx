import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard, QuickAction } from './SharedDashboardComponents';
import { useAnalytics } from '../../../hooks/useAnalytics';
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

// Lazy load heavy components
const UnifiedChatInterface = lazy(() => import('../../messages/components/UnifiedChatInterface'));
const EnterpriseDocumentManager = lazy(() => import('../../documents/components/EnterpriseDocumentManager'));
const UserManagement = lazy(() => import('../../users/components/UserManagement'));
const TemplateManager = lazy(() => import('../../documents/components/TemplateManager'));
const ExchangeList = lazy(() => import('../../exchanges/components/ExchangeList').then(module => ({ default: module.ExchangeList })));
const TaskBoard = lazy(() => import('../../tasks/components/TaskBoard').then(module => ({ default: module.TaskBoard })));

// Loading component for lazy-loaded tabs
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

interface AdminTabContentProps {
  activeTab: string;
  role: string;
}

// Memoized tab content component
const AdminTabContent: React.FC<AdminTabContentProps> = React.memo(({ activeTab, role }) => {
  const [userViewMode, setUserViewMode] = useState<'card' | 'table'>('card');
  
  // Memoize tab content to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
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
                <Suspense fallback={<TabLoadingFallback />}>
                  <ExchangeList />
                </Suspense>
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
                <Suspense fallback={<TabLoadingFallback />}>
                  <TaskBoard 
                    tasks={[]} 
                    showExchangeInfo={true}
                    showPPInfo={true}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
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
                             <Suspense fallback={<TabLoadingFallback />}>
                 <UserManagement />
               </Suspense>
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
                  Manage documents with advanced security and collaboration features
                </p>
              </div>
              <div className="p-6">
                               <Suspense fallback={<TabLoadingFallback />}>
                 <EnterpriseDocumentManager 
                   isOpen={true}
                   onClose={() => {}}
                 />
               </Suspense>
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
                  Real-time messaging and collaboration across all exchanges
                </p>
              </div>
              <div className="p-6">
                <Suspense fallback={<TabLoadingFallback />}>
                  <UnifiedChatInterface />
                </Suspense>
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
                  Create and manage document templates for consistent workflows
                </p>
              </div>
              <div className="p-6">
                <Suspense fallback={<TabLoadingFallback />}>
                  <TemplateManager />
                </Suspense>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EnhancedStatCard
                title="System Status"
                value="Healthy"
                subtitle="All systems operational"
                icon={ShieldCheckIcon}
                color="green"
                trend="up"
                trendValue="99.9% uptime"
              />
              <EnhancedStatCard
                title="Active Sessions"
                value="12"
                subtitle="Users online now"
                icon={UsersIcon}
                color="blue"
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
  }, [activeTab, userViewMode]);

  return tabContent;
});

AdminTabContent.displayName = 'AdminTabContent';

const StandardizedAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiMode, setAiMode] = useState(false);
  
  // Optimize analytics hook - only enable auto-refresh when needed
  const analytics = useAnalytics({
    enableAutoRefresh: aiMode && activeTab === 'overview', // Only auto-refresh in AI mode on overview
    refreshInterval: 300000
  });

  // Memoize tabs configuration
  const customTabs = useMemo(() => [
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
  ], []);

  // Memoize tab change handler
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Memoize AI mode toggle handlers
  const handleSetClassicMode = useCallback(() => setAiMode(false), []);
  const handleSetAiMode = useCallback(() => setAiMode(true), []);

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Dashboard Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600 mt-1">
              {aiMode ? 'AI-powered insights and predictions' : 'Classic system monitoring and management'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={handleSetClassicMode}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !aiMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ChartBarIcon className="h-4 w-4" />
                Classic
              </button>
              <button
                onClick={handleSetAiMode}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  aiMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">🤖</div>
                AI Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode-specific Overview Content */}
      {aiMode ? (
        /* AI Mode Overview */
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">🤖 AI-Powered System Intelligence</h2>
                <p className="text-sm text-gray-600">Advanced analytics with predictive insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              AI Active
            </div>
          </div>
        
          {/* AI Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-blue-200">
              <div className="text-xl font-bold text-blue-900 mb-1">🧠 AI Insights</div>
              <div className="text-sm text-blue-700">
                {analytics.loading ? 'Analyzing...' : '"System efficiency up 15% this month"'}
              </div>
              <div className="text-xs text-blue-600 mt-1">Machine learning analysis</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-700 mb-1">8.7/10</div>
              <div className="text-sm text-green-600">Efficiency Score</div>
              <div className="text-xs text-green-500 mt-1">Industry avg: 6.2/10</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-700 mb-1">
                {analytics.loading ? '...' : (analytics.financialOverview?.riskAnalysis?.high || '5')}
              </div>
              <div className="text-sm text-red-600">High Risk Predicted</div>
              <div className="text-xs text-red-500 mt-1">ML confidence: 94%</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-purple-200">
              <div className="text-xl font-bold text-purple-700 mb-1">🔔 Smart Alert</div>
              <div className="text-sm text-purple-600">"Review workload distribution"</div>
              <div className="text-xs text-purple-500 mt-1">AI optimization suggestion</div>
            </div>
          </div>

          {/* AI Advanced Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-indigo-200">
              <div className="text-xl font-bold text-indigo-700 mb-1">📈 Trend</div>
              <div className="text-sm text-indigo-600">"31% increase expected Q4"</div>
              <div className="text-xs text-indigo-500 mt-1">Based on ML patterns</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700 mb-1">23</div>
              <div className="text-sm text-yellow-600">Auto-Optimizations</div>
              <div className="text-xs text-yellow-500 mt-1">Savings: $2.3M</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-teal-200">
              <div className="text-2xl font-bold text-teal-700 mb-1">340ms</div>
              <div className="text-sm text-teal-600">Response Improvement</div>
              <div className="text-xs text-teal-500 mt-1">AI optimization</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-pink-200">
              <div className="text-xl font-bold text-pink-700 mb-1">📱 Peak Hours</div>
              <div className="text-sm text-pink-600">9AM-11AM, 2PM-4PM</div>
              <div className="text-xs text-pink-500 mt-1">User behavior AI</div>
            </div>
          </div>

          {/* AI Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <button 
              onClick={() => setActiveTab('exchanges')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              🤖 Ask AI Anything
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              🎯 Smart Optimization
            </button>
            <button 
              onClick={() => setActiveTab('exchanges')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              📈 Predictive Analytics
            </button>
            <button 
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              🔮 Risk Forecasting
            </button>
            <button 
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              ⚡ Auto-Suggestions
            </button>
            <button 
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              🧠 AI Dashboard
            </button>
          </div>
        </div>
      ) : (
        /* Classic Mode Overview */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 System Overview</h2>
            
            {/* Classic Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-gray-900 mb-1">🟢 99.8%</div>
                <div className="text-sm text-gray-600">System Health</div>
                <div className="text-xs text-gray-500 mt-1">All systems normal</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-gray-900 mb-1">47</div>
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="text-xs text-gray-500 mt-1">2 admins, 45 clients</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-green-600 mb-1">12</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
                <div className="text-xs text-gray-500 mt-1">Last hour activity</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-blue-600 mb-1">23%</div>
                <div className="text-sm text-gray-600">Storage Used</div>
                <div className="text-xs text-gray-500 mt-1">2.3GB / 10GB</div>
              </div>
            </div>

            {/* Second Row - Business Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.loading ? '...' : (
                    analytics.financialOverview?.performanceMetrics?.totalExchanges ? 
                    analytics.financialOverview.performanceMetrics.totalExchanges.toLocaleString() : 
                    (analytics.error ? 'Error' : 'Loading...')
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Exchanges</div>
                <div className="text-xs text-gray-500 mt-1">
                  {analytics.error ? `Error: ${analytics.error}` : '1,731 active, 577 completed'}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-green-600 mb-1">+23</div>
                <div className="text-sm text-gray-600">This Month</div>
                <div className="text-xs text-gray-500 mt-1">+5 completed</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-orange-600 mb-1">3</div>
                <div className="text-sm text-gray-600">System Alerts</div>
                <div className="text-xs text-gray-500 mt-1">1 critical, 2 warnings</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-2xl font-bold text-gray-900 mb-1">✅ 2hrs ago</div>
                <div className="text-sm text-gray-600">Last Backup</div>
                <div className="text-xs text-gray-500 mt-1">Next: Tonight</div>
              </div>
            </div>

            {/* Classic Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button 
                onClick={() => setActiveTab('users')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                👥 User Management
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                📊 System Reports
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                ⚙️ Settings
              </button>
              <button 
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                🔍 Audit Logs
              </button>
              <button 
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                📂 Data Backup
              </button>
              <button 
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                🔄 Sync Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Admin Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Analytics</h2>
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
      customContent={customOverviewContent}
    />
  );
};

export default StandardizedAdminDashboard;