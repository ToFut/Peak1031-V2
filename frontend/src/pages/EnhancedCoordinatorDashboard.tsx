import React, { useState, useEffect } from 'react';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';
import { smartApi } from '../services/smartApi';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ChartBarIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const EnhancedCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'workload' | 'kanban' | 'performance' | 'reports'>('overview');
  const [stats, setStats] = useState({
    managedExchanges: 0,
    activeExchanges: 0,
    assignedTasks: 0,
    totalClients: 0
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      // Try V2 dashboard overview endpoint first
      try {
        console.log('📊 Coordinator: Attempting V2 dashboard overview...');
        const overviewData = await apiService.getDashboardOverview();
        console.log('✅ V2 Coordinator Overview:', overviewData);
        
        setStats({
          managedExchanges: overviewData.exchanges.total, // Coordinator-specific filtering may need backend support
          activeExchanges: overviewData.exchanges.active,
          assignedTasks: overviewData.tasks.pending,
          totalClients: Math.floor(overviewData.exchanges.total * 0.8) // Estimate, ideally from backend
        });
        
        console.log('✅ V2 Coordinator: Stats loaded successfully');
        return; // Exit early with V2 data
      } catch (v2Error) {
        console.warn('⚠️ V2 coordinator dashboard failed, falling back to individual calls:', v2Error);
      }
      
      // Fallback to individual API calls
      const [exchangesRes, tasksRes] = await Promise.all([
        smartApi.getExchanges(),
        smartApi.getTasks()
      ]);
      
      const exchanges = exchangesRes.exchanges || exchangesRes || [];
      const tasks = tasksRes.tasks || tasksRes || [];
      
      // Filter exchanges where user is coordinator
      const managedExchanges = exchanges.filter((ex: any) => ex.coordinatorId === user.id);
      
      // Get unique clients
      const uniqueClients = new Set(managedExchanges.map((ex: any) => ex.clientId).filter(Boolean));
      
      // Filter tasks assigned to coordinator
      const assignedTasks = tasks.filter((task: any) => task.assignedTo === user.id);
      
      setStats({
        managedExchanges: managedExchanges.length,
        activeExchanges: managedExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
        assignedTasks: assignedTasks.filter((task: any) => task.status === 'pending').length,
        totalClients: uniqueClients.size
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar Navigation */}
      <div className="w-80 bg-white shadow-lg">
        {/* Coordinator Header with Blue Theme */}
        <div className="bg-gradient-to-r from-blue-600 to-sky-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Coordinator Dashboard</h1>
              <p className="text-sm text-blue-100">{user?.company || 'Exchange Coordinator'}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 space-y-4 mt-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.managedExchanges}</p>
                <p className="text-sm opacity-90">Managed Exchanges</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.activeExchanges}</p>
                <p className="text-sm opacity-90">Active Exchanges</p>
              </div>
              <ArrowPathIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.assignedTasks}</p>
                <p className="text-sm opacity-90">Pending Tasks</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-6 space-y-2 mt-6">
          {[
            { name: 'Overview', id: 'overview', icon: ChartBarIcon },
            { name: 'Workload', id: 'workload', icon: UserGroupIcon },
            { name: 'Kanban Board', id: 'kanban', icon: CheckCircleIcon },
            { name: 'Performance', id: 'performance', icon: ArrowTrendingUpIcon },
            { name: 'Reports', id: 'reports', icon: DocumentArrowDownIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>

        {/* Performance Indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center text-xs text-green-700">
              <StarIcon className="w-4 h-4 mr-2" />
              <span>92% On-Time Rate</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{stats.totalClients} active clients</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Unified Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                {activeTab === 'overview' && <><ChartBarIcon className="w-6 h-6 mr-2" /> Coordinator Overview</>}
                {activeTab === 'workload' && <><UserGroupIcon className="w-6 h-6 mr-2" /> Team Workload</>}
                {activeTab === 'kanban' && <><CheckCircleIcon className="w-6 h-6 mr-2" /> Task Kanban Board</>}
                {activeTab === 'performance' && <><ArrowTrendingUpIcon className="w-6 h-6 mr-2" /> Performance Metrics</>}
                {activeTab === 'reports' && <><DocumentArrowDownIcon className="w-6 h-6 mr-2" /> Reports & Analytics</>}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'overview' && 'Monitor your exchanges and team performance'}
                {activeTab === 'workload' && 'Manage team assignments and workload distribution'}
                {activeTab === 'kanban' && 'Track tasks progress in visual board'}
                {activeTab === 'performance' && 'View detailed performance metrics and trends'}
                {activeTab === 'reports' && 'Generate and view comprehensive reports'}
              </p>
            </div>
            {/* Tab-specific action buttons */}
            <div className="flex items-center space-x-3">
              {activeTab === 'workload' && (
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <PlusIcon className="w-4 h-4" />
                  <span>Assign Task</span>
                </button>
              )}
              {activeTab === 'reports' && (
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <PPIntegratedDashboard role="coordinator" />
        )}

        {activeTab === 'workload' && (
          <div className="space-y-6">
            {/* Team Members Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Workload Distribution</h2>
              
              {/* Team Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-orange-50 rounded-lg p-4">
                  <UserGroupIcon className="w-8 h-8 text-orange-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">5</p>
                  <p className="text-sm text-gray-600">Team Members</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <DocumentTextIcon className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">45</p>
                  <p className="text-sm text-gray-600">Total Exchanges</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <CheckCircleIcon className="w-8 h-8 text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">128</p>
                  <p className="text-sm text-gray-600">Active Tasks</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <ClockIcon className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">92%</p>
                  <p className="text-sm text-gray-600">On-Time Rate</p>
                </div>
              </div>

              {/* Team Members Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchanges</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { name: 'Sarah Johnson', exchanges: 12, tasks: 28, workload: 85, status: 'busy' },
                      { name: 'Michael Chen', exchanges: 8, tasks: 18, workload: 60, status: 'available' },
                      { name: 'Emily Rodriguez', exchanges: 10, tasks: 35, workload: 95, status: 'overloaded' },
                      { name: 'David Thompson', exchanges: 9, tasks: 22, workload: 70, status: 'available' },
                      { name: 'Lisa Anderson', exchanges: 6, tasks: 15, workload: 50, status: 'available' }
                    ].map((member, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 flex items-center justify-center text-white font-medium">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-500">Exchange Coordinator</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.exchanges}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.tasks}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  member.workload >= 90 ? 'bg-red-600' :
                                  member.workload >= 70 ? 'bg-yellow-600' :
                                  'bg-green-600'
                                }`}
                                style={{ width: `${member.workload}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{member.workload}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'overloaded' ? 'bg-red-100 text-red-800' :
                            member.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {member.status === 'overloaded' && '🔴'}
                            {member.status === 'busy' && '🟡'}
                            {member.status === 'available' && '🟢'}
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-orange-600 hover:text-orange-900 mr-3">Reassign</button>
                          <button className="text-blue-600 hover:text-blue-900">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workload Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workload Trends (Last 7 Days)</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const height = Math.random() * 80 + 20;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-sky-500 rounded-t-lg transition-all hover:from-blue-600 hover:to-sky-600"
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Exchange Kanban Board</h2>
                <button className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Exchange
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* To Do Column */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
                    <span>To Do</span>
                    <span className="text-sm text-gray-500">5</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 1, title: 'Exchange #1234', client: 'John Smith', priority: 'high' },
                      { id: 2, title: 'Exchange #1235', client: 'Jane Doe', priority: 'medium' },
                      { id: 3, title: 'Exchange #1236', client: 'Bob Johnson', priority: 'low' },
                    ].map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></span>
                        </div>
                        <p className="text-xs text-gray-600">{task.client}</p>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">📅 Due in 3 days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
                    <span>In Progress</span>
                    <span className="text-sm text-gray-500">8</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 4, title: 'Exchange #1237', client: 'Sarah Wilson', progress: 45 },
                      { id: 5, title: 'Exchange #1238', client: 'Mike Brown', progress: 72 },
                    ].map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <span className="text-xs text-blue-600">{task.progress}%</span>
                        </div>
                        <p className="text-xs text-gray-600">{task.client}</p>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Column */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
                    <span>Under Review</span>
                    <span className="text-sm text-gray-500">3</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 6, title: 'Exchange #1239', client: 'Lisa Garcia', reviewer: 'Admin' },
                    ].map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                        </div>
                        <p className="text-xs text-gray-600">{task.client}</p>
                        <p className="text-xs text-yellow-600 mt-2">Reviewing: {task.reviewer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Column */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
                    <span>Completed</span>
                    <span className="text-sm text-gray-500">12</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 7, title: 'Exchange #1240', client: 'Tom Davis', completedDate: '2024-01-10' },
                      { id: 8, title: 'Exchange #1241', client: 'Amy Lee', completedDate: '2024-01-09' },
                    ].map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow opacity-75">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-xs text-gray-600">{task.client}</p>
                        <p className="text-xs text-gray-500 mt-2">✓ {task.completedDate}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-sm font-medium text-gray-900">94%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">On-Time Delivery</span>
                      <span className="text-sm font-medium text-gray-900">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Client Satisfaction</span>
                      <span className="text-sm font-medium text-gray-900">4.8/5</span>
                    </div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} className={`w-5 h-5 ${star <= 4.8 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Exchanges Completed</span>
                    <span className="text-lg font-bold text-gray-900">42</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Tasks Resolved</span>
                    <span className="text-lg font-bold text-gray-900">156</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Avg. Response Time</span>
                    <span className="text-lg font-bold text-gray-900">2.4h</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Johnson', score: 98 },
                    { name: 'David Thompson', score: 95 },
                    { name: 'Michael Chen', score: 92 }
                  ].map((performer, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                        <p className="text-xs text-gray-500">Performance Score: {performer.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Trend</h3>
              <div className="h-64 flex items-end justify-between space-x-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => {
                  const performance = Math.random() * 30 + 70;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-900 mb-2">{Math.round(performance)}%</span>
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-sky-500 rounded-t-lg"
                        style={{ height: `${performance}%` }}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Team Reports</h2>
                <button className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: 'Weekly Team Performance Report',
                    description: 'Comprehensive overview of team productivity and exchange completion rates',
                    lastGenerated: '2024-01-15',
                    icon: ChartBarIcon,
                    type: 'Performance'
                  },
                  {
                    title: 'Exchange Status Summary',
                    description: 'Current status of all active exchanges with timeline projections',
                    lastGenerated: '2024-01-14',
                    icon: DocumentTextIcon,
                    type: 'Status'
                  },
                  {
                    title: 'Client Satisfaction Report',
                    description: 'Feedback scores and client satisfaction metrics across all exchanges',
                    lastGenerated: '2024-01-13',
                    icon: StarIcon,
                    type: 'Satisfaction'
                  },
                  {
                    title: 'Task Completion Analysis',
                    description: 'Detailed breakdown of task completion times and bottlenecks',
                    lastGenerated: '2024-01-12',
                    icon: CheckCircleIcon,
                    type: 'Analysis'
                  }
                ].map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <report.icon className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-gray-500">Last generated: {report.lastGenerated}</span>
                          <div className="flex items-center space-x-2">
                            <button className="text-sm text-blue-600 hover:text-blue-800">View</button>
                            <span className="text-gray-300">|</span>
                            <button className="text-sm text-orange-600 hover:text-orange-800">Generate New</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Generation Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Daily Status Report</p>
                    <p className="text-xs text-gray-500">Automatically generated every day at 9:00 AM</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Weekly Performance Report</p>
                    <p className="text-xs text-gray-500">Generated every Monday at 8:00 AM</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Monthly Summary Report</p>
                    <p className="text-xs text-gray-500">Generated on the 1st of every month</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedCoordinatorDashboard;