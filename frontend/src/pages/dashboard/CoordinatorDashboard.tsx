import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { roleBasedApiService } from '../../services/roleBasedApiService';
import KanbanTaskBoard from '../../components/dashboard/KanbanTaskBoard';
import {
  DocumentTextIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface CoordinatorStats {
  team: {
    total: number;
    active: number;
    workloadCapacity: number;
  };
  exchanges: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  performance: {
    avgCompletionDays: number;
    teamEfficiency: number;
    onTimeDelivery: number;
  };
}

const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'team_workload' | 'kanban_board' | 'performance' | 'reports'>('overview');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<CoordinatorStats>({
    team: { total: 0, active: 0, workloadCapacity: 0 },
    exchanges: { total: 0, active: 0, completed: 0, overdue: 0 },
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 },
    performance: { avgCompletionDays: 0, teamEfficiency: 0, onTimeDelivery: 0 }
  });

  useEffect(() => {
    if (user?.role === 'coordinator') {
      loadCoordinatorData();
    }
  }, [user]);

  const loadCoordinatorData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role as any,
        company: user.company || ''
      });

      const myExchanges = dashboardData.exchanges || [];
      const myTasks = dashboardData.tasks || [];

      setExchanges(myExchanges);
      setTasks(myTasks);

      // Calculate stats
      const now = new Date();
      const overdueTasks = myTasks.filter((t: any) => new Date(t.dueDate) < now && t.status !== 'COMPLETED');
      const overdueExchanges = myExchanges.filter((ex: any) => {
        if (ex.status === 'COMPLETED') return false;
        // Mock deadline logic
        return Math.random() > 0.8; // 20% chance of being overdue
      });

      setStats({
        team: {
          total: 12, // Mock team size
          active: 10,
          workloadCapacity: 85
        },
        exchanges: {
          total: myExchanges.length,
          active: myExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
          completed: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length,
          overdue: overdueExchanges.length
        },
        tasks: {
          total: myTasks.length,
          pending: myTasks.filter((t: any) => t.status === 'PENDING').length,
          inProgress: myTasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
          completed: myTasks.filter((t: any) => t.status === 'COMPLETED').length,
          overdue: overdueTasks.length
        },
        performance: {
          avgCompletionDays: 138,
          teamEfficiency: 87,
          onTimeDelivery: 94
        }
      });

    } catch (err) {
      console.error('Failed to load coordinator data:', err);
      setError('Failed to load coordinator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'coordinator') {
    return (
      <Layout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the coordinator dashboard.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-600">Loading coordinator dashboard...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Coordinator Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">⚡ Team Coordination Center</h1>
              <p className="text-orange-100 mt-1">
                Manage exchange workflows, track team performance, and ensure timely completion
              </p>
            </div>
            <div className="text-right">
              <div className="text-orange-100 text-sm">📊 Team Efficiency</div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="font-medium">{stats.performance.teamEfficiency}% Efficiency</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Team Overview', icon: ChartBarIcon },
              { id: 'team_workload', name: 'Workload Distribution', icon: UsersIcon },
              { id: 'kanban_board', name: 'Kanban Board', icon: DocumentTextIcon },
              { id: 'performance', name: 'Performance', icon: ArrowTrendingUpIcon },
              { id: 'reports', name: 'Reports', icon: DocumentArrowDownIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Team Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <UsersIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.team.total}</p>
                    <p className="text-sm font-medium text-gray-600">Team Members</p>
                    <p className="text-xs text-green-600 mt-1">{stats.team.active} active today</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.exchanges.active}</p>
                    <p className="text-sm font-medium text-gray-600">Active Exchanges</p>
                    <p className="text-xs text-red-600 mt-1">{stats.exchanges.overdue} overdue</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-yellow-100">
                    <CheckCircleIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.tasks.pending + stats.tasks.inProgress}</p>
                    <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                    <p className="text-xs text-red-600 mt-1">{stats.tasks.overdue} overdue</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.performance.onTimeDelivery}%</p>
                    <p className="text-sm font-medium text-gray-600">On-Time Delivery</p>
                    <p className="text-xs text-green-600 mt-1">+3% vs last month</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Path Alerts */}
            {(stats.tasks.overdue > 0 || stats.exchanges.overdue > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
                  <h2 className="text-lg font-semibold text-red-900">🚨 Critical Path Issues</h2>
                  <span className="ml-auto text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[Resolve All]</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">⚠️ Exchange EX-2024-001 delayed - Impact on dependency chain</h3>
                        <p className="text-sm text-gray-600 mt-1">3 downstream tasks affected • Smith 1031 Exchange</p>
                        <p className="text-xs text-red-600 mt-2">
                          Critical: 2 days overdue • Affects 45-day deadline
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">[🔄 Reassign]</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">[📞 Escalate]</button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">⏰ Team member Sarah overloaded - 15 active tasks</h3>
                        <p className="text-sm text-gray-600 mt-1">Above recommended capacity • Risk of quality impact</p>
                        <p className="text-xs text-red-600 mt-2">
                          Action needed: Redistribute 5 tasks to available team members
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">[⚖️ Balance]</button>
                        <button className="text-purple-600 hover:text-purple-800 text-sm">[👁️ View]</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Performance Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-orange-900">⚡ Team Performance Summary</h2>
                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">[View Details]</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-orange-600">{stats.performance.avgCompletionDays}</div>
                  <div className="text-sm text-gray-600">Avg Completion Days</div>
                  <div className="text-xs text-green-600 mt-1">📈 12% improvement</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">{stats.team.workloadCapacity}%</div>
                  <div className="text-sm text-gray-600">Team Capacity</div>
                  <div className="text-xs text-yellow-600 mt-1">⚠️ Near optimal</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{Math.round((stats.tasks.completed / Math.max(stats.tasks.total, 1)) * 100)}%</div>
                  <div className="text-sm text-gray-600">Task Completion</div>
                  <div className="text-xs text-gray-500 mt-1">{stats.tasks.completed}/{stats.tasks.total} tasks</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">{stats.performance.teamEfficiency}%</div>
                  <div className="text-sm text-gray-600">Efficiency Score</div>
                  <div className="text-xs text-green-600 mt-1">🏆 Above target</div>
                </div>
              </div>
            </div>

            {/* Workload Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">👥 Team Workload Distribution</h2>
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">[⚖️ Auto-Balance]</button>
                  <button className="text-sm text-blue-600 hover:text-blue-800">[📊 View Details]</button>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Sarah Johnson', role: 'Senior Coordinator', tasks: 15, capacity: 95, status: 'overloaded' },
                  { name: 'Mike Chen', role: 'Exchange Specialist', tasks: 8, capacity: 65, status: 'optimal' },
                  { name: 'Lisa Wang', role: 'Document Coordinator', tasks: 12, capacity: 80, status: 'optimal' },
                  { name: 'David Brown', role: 'Client Relations', tasks: 6, capacity: 45, status: 'available' },
                  { name: 'Emma Davis', role: 'Compliance Officer', tasks: 10, capacity: 75, status: 'optimal' }
                ].map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{member.tasks} tasks</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                member.status === 'overloaded' ? 'bg-red-500' :
                                member.status === 'available' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`}
                              style={{width: `${member.capacity}%`}}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{member.capacity}%</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'overloaded' ? 'bg-red-100 text-red-800' :
                        member.status === 'available' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {member.status === 'overloaded' ? '🔴 Overloaded' :
                         member.status === 'available' ? '🟢 Available' :
                         '🔵 Optimal'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board Tab */}
        {activeTab === 'kanban_board' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">📋 Task Management Kanban Board</h2>
                <div className="flex space-x-3">
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Exchanges ▼</option>
                    <option>EX-2024-001</option>
                    <option>EX-2024-002</option>
                  </select>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Team Members ▼</option>
                    <option>Sarah Johnson</option>
                    <option>Mike Chen</option>
                  </select>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                    + Add Task
                  </button>
                </div>
              </div>
              
              <KanbanTaskBoard tasks={tasks} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CoordinatorDashboard;