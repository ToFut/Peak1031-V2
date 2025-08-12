import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StandardDashboard from './StandardDashboard';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  FolderIcon,
  EyeIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Remove unused lazy loading components since we're using StandardDashboard

// Remove AdminTabContent since we're using StandardDashboard for navigation

const StandardizedAdminDashboard: React.FC = () => {
  const [aiMode, setAiMode] = useState(false);
  
  // Get dashboard data for correct RBAC-filtered totals
  const { stats: dashboardStats } = useDashboardData({ 
    role: 'admin', 
    autoRefresh: true, 
    refreshInterval: 300000 
  });
  
  // Optimize analytics hook - only enable auto-refresh when needed
  const analytics = useAnalytics({
    enableAutoRefresh: aiMode, // Always enable in AI mode since we're on overview
    refreshInterval: 300000
  });

  // AI mode handlers
  const handleSetClassicMode = useCallback(() => setAiMode(false), []);
  const handleSetAiMode = useCallback(() => setAiMode(true), []);


  const customOverviewContent = (
    <div className="space-y-6">
      {/* Admin Control Center Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
              <p className="text-gray-600 mt-1">System management and monitoring dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={handleSetClassicMode}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    !aiMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={handleSetAiMode}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    aiMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AI Insights
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts & Actions */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <button className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <div className="text-left">
                <div className="text-sm font-semibold text-red-900">3 Critical Issues</div>
                <div className="text-xs text-red-600">Require immediate attention</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <div className="text-left">
                <div className="text-sm font-semibold text-yellow-900">5 Pending Tasks</div>
                <div className="text-xs text-yellow-600">Admin review needed</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              <ArrowPathIcon className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="text-sm font-semibold text-blue-900">Sync Available</div>
                <div className="text-xs text-blue-600">Last: 2 hours ago</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
              <UsersIcon className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="text-sm font-semibold text-green-900">2 New Users</div>
                <div className="text-xs text-green-600">Awaiting activation</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {aiMode ? (
        /* AI Insights Mode */
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI System Analysis</h3>
              <p className="text-sm text-blue-700">Intelligent insights and recommendations</p>
            </div>
          </div>
        
          {/* AI-Powered Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">Performance Alert</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {analytics.loading ? 'Analyzing system performance...' : 'Database queries taking 23% longer than baseline'}
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">Investigate →</button>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Optimization Found</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                User workflow patterns suggest 15% efficiency improvement possible
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">Apply Changes →</button>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Resource Usage</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Storage will reach 80% capacity in approximately 14 days
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">Plan Upgrade →</button>
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

          {/* AI Actions */}
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Run Full Analysis
            </button>
            <button className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
              Export Report
            </button>
            <button className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
              Schedule Analysis
            </button>
          </div>
        </div>
      ) : (
        /* System Status & Monitoring */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                <p className="text-sm text-gray-600">Real-time system monitoring and health</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                All Systems Operational
              </div>
            </div>
          </div>
          <div className="p-6">
            
            {/* System Metrics - Actionable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="group cursor-pointer">
                <div className="bg-white border-2 border-green-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">HEALTHY</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">99.8%</div>
                  <div className="text-sm text-gray-600">System Uptime</div>
                  <div className="text-xs text-green-600 mt-1 group-hover:text-green-700">View details →</div>
                </div>
              </div>
              
              <div className="group cursor-pointer">
                <div className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-900">{dashboardStats ? dashboardStats.exchanges.total : '...'}</div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">EXCHANGES</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Total Exchanges</div>
                  <div className="text-xs text-blue-600 group-hover:text-blue-700">
                    {dashboardStats ? `${dashboardStats.exchanges.active} active` : 'Loading...'} →
                  </div>
                </div>
              </div>
              
              <div className="group cursor-pointer">
                <div className="bg-white border-2 border-purple-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-900">12</div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">ONLINE</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Active Users</div>
                  <div className="text-xs text-purple-600 group-hover:text-purple-700">Manage users →</div>
                </div>
              </div>
              
              <div className="group cursor-pointer">
                <div className="bg-white border-2 border-amber-200 rounded-lg p-4 hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-900">5</div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">PENDING</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Tasks Waiting</div>
                  <div className="text-xs text-amber-600 group-hover:text-amber-700">Review tasks →</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">User Management</h4>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <button 
              onClick={() => window.location.href = '/users'}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="font-medium text-gray-900">Active Users (47)</div>
                <div className="text-sm text-gray-600">2 admins, 45 clients</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Pending Approvals (2)</div>
                <div className="text-sm text-amber-600">New user registrations</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Role Assignments</div>
                <div className="text-sm text-gray-600">Manage permissions</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
          </div>
        </div>

        {/* System Operations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <CogIcon className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">System Operations</h4>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Sync PracticePanther</div>
                <div className="text-sm text-blue-600">Last sync: 2 hours ago</div>
              </div>
              <ArrowPathIcon className="h-4 w-4 text-blue-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Database Backup</div>
                <div className="text-sm text-gray-600">Schedule: Daily 2:00 AM</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">System Settings</div>
                <div className="text-sm text-gray-600">Configure system</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
          </div>
        </div>

        {/* Monitoring & Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <EyeIcon className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Monitoring & Alerts</h4>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Critical Issues (3)</div>
                <div className="text-sm text-red-600">Require immediate attention</div>
              </div>
              <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">System Logs</div>
                <div className="text-sm text-gray-600">View activity logs</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div>
                <div className="font-medium text-gray-900">Performance Metrics</div>
                <div className="text-sm text-gray-600">Server performance</div>
              </div>
              <div className="text-gray-400">→</div>
            </button>
          </div>
        </div>
      </div>


      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent System Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Recent System Activity</h4>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Backup completed successfully</div>
                <div className="text-xs text-gray-600">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">New user registered: John Smith</div>
                <div className="text-xs text-gray-600">4 hours ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">System maintenance scheduled</div>
                <div className="text-xs text-gray-600">6 hours ago</div>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all activity →</button>
          </div>
        </div>

        {/* Admin Tasks Queue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Admin Tasks Queue</h4>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">5 Pending</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Review failed sync errors</div>
                <div className="text-xs text-red-600">High priority - 3 exchanges affected</div>
              </div>
              <button className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Review</button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ClockIcon className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Approve user permissions</div>
                <div className="text-xs text-yellow-600">2 users waiting for coordinator access</div>
              </div>
              <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">Review</button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <DocumentTextIcon className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Update system templates</div>
                <div className="text-xs text-blue-600">New compliance requirements</div>
              </div>
              <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Update</button>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all tasks →</button>
          </div>
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