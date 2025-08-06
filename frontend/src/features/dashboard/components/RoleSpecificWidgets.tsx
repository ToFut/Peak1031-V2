import React from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRolePermissions } from '@/shared/hooks/useRolePermissions';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  ShieldCheckIcon,
  ServerIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  exchanges: any[];
  tasks: any[];
  contacts: any[];
  documents: any[];
}

interface RoleSpecificWidgetsProps {
  data: DashboardData;
}

const RoleSpecificWidgets: React.FC<RoleSpecificWidgetsProps> = ({ data }) => {
  const { user } = useAuth();
  const { permissions, ui } = useRolePermissions();

  if (!user) return null;

  const renderAdminWidgets = () => (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
          <ServerIcon className="w-5 h-5 mr-2 text-red-600" />
          System Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{data.exchanges.length}</div>
            <div className="text-sm text-gray-600">Total Exchanges</div>
            <div className="text-xs text-green-600 mt-1">+12% this month</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data.contacts.length}</div>
            <div className="text-sm text-gray-600">Active Users</div>
            <div className="text-xs text-gray-500 mt-1">127 total users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{data.tasks.filter(t => t.status === 'PENDING').length}</div>
            <div className="text-sm text-gray-600">Pending Tasks</div>
            <div className="text-xs text-red-600 mt-1">{data.tasks.filter(t => new Date(t.dueDate) < new Date()).length} overdue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">98</div>
            <div className="text-sm text-gray-600">System Health %</div>
            <div className="text-xs text-gray-500 mt-1">All systems operational</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
            <ArrowPathIcon className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Sync PP Data</div>
              <div className="text-xs text-gray-500">Update from PracticePanther</div>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Create User</div>
              <div className="text-xs text-gray-500">Add new platform user</div>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors">
            <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">View Audit Logs</div>
              <div className="text-xs text-gray-500">System activity history</div>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
            <CogIcon className="w-8 h-8 text-gray-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">System Settings</div>
              <div className="text-xs text-gray-500">Configure platform</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderClientWidgets = () => (
    <div className="space-y-6">
      {/* Priority Alerts */}
      {data.tasks.filter(t => new Date(t.dueDate) < new Date()).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-900">Urgent Actions Required</h2>
          </div>
          <div className="space-y-3">
            {data.tasks
              .filter(task => new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED')
              .slice(0, 3)
              .map(task => (
                <div key={task.id} className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900">{task.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <p className="text-xs text-red-600 mt-2">
                        Due: {new Date(task.dueDate).toLocaleDateString()} (Overdue)
                      </p>
                    </div>
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* My Exchanges Quick View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-900">My Exchanges Overview</h2>
          <span className="text-sm text-gray-600">Total: {data.exchanges.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.exchanges.slice(0, 3).map(exchange => (
            <div key={exchange.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900 truncate">{exchange.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  exchange.status === '45D' ? 'bg-yellow-100 text-yellow-800' :
                  exchange.status === '180D' ? 'bg-orange-100 text-orange-800' :
                  exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exchange.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Progress: {Math.round(Math.random() * 100)}%</p>
                <p className="text-xs mt-1">Next: Document Review</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAgencyWidgets = () => (
    <div className="space-y-6">
      {/* Portfolio Health */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
          <ChartBarIcon className="w-5 h-5 mr-2 text-purple-600" />
          Portfolio Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{data.exchanges.length}</div>
            <div className="text-sm text-gray-600">Active Services</div>
            <div className="text-xs text-green-600 mt-1">+15% growth</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">87%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-xs text-gray-500 mt-1">Above industry avg</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">$12.3M</div>
            <div className="text-sm text-gray-600">Pipeline Value</div>
            <div className="text-xs text-green-600 mt-1">+8% this quarter</div>
          </div>
        </div>
      </div>

      {/* Client Portfolio */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Portfolio Overview</h2>
        <div className="space-y-3">
          {data.exchanges.slice(0, 4).map(exchange => (
            <div key={exchange.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-medium text-sm">
                    {exchange.client?.first_name?.[0] || 'C'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{exchange.client?.first_name} {exchange.client?.last_name}</p>
                  <p className="text-sm text-gray-500">Active: {Math.floor(Math.random() * 3) + 1} exchanges</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">${Math.floor(Math.random() * 2000) + 500}K</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  Math.random() > 0.5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {Math.random() > 0.5 ? 'On Track' : 'Needs Attention'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderThirdPartyWidgets = () => (
    <div className="space-y-6">
      {/* Read-Only Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">
            <span className="font-medium">Third-Party Access:</span> You have read-only access to assigned exchanges for security.
          </p>
        </div>
      </div>

      {/* My Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Role Assignments</h2>
        <div className="space-y-3">
          {data.exchanges.slice(0, 3).map(exchange => (
            <div key={exchange.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{exchange.name}</h3>
                  <p className="text-sm text-gray-600">Role: Legal Review</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {exchange.status} • Progress: {Math.round(Math.random() * 100)}%
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                  <button className="text-green-600 hover:text-green-800 text-sm">Documents</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCoordinatorWidgets = () => (
    <div className="space-y-6">
      {/* Team Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-teal-900 mb-4 flex items-center">
          <UsersIcon className="w-5 h-5 mr-2 text-teal-600" />
          Team Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-teal-600">{data.exchanges.length}</div>
            <div className="text-sm text-gray-600">Active Exchanges</div>
            <div className="text-xs text-gray-500 mt-1">Coordinating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">92%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-xs text-green-600 mt-1">Above target</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">12</div>
            <div className="text-sm text-gray-600">Team Members</div>
            <div className="text-xs text-gray-500 mt-1">78% capacity</div>
          </div>
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Workload Distribution</h2>
          <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">Rebalance</button>
        </div>
        <div className="space-y-3">
          {['Mike Chen', 'Lisa Wang', 'Tom Davis', 'Amy Brown'].map((name, index) => {
            const load = [85, 92, 67, 78][index];
            const status = load > 90 ? 'High Load' : load < 70 ? 'Available' : 'On Track';
            const color = load > 90 ? 'text-red-600' : load < 70 ? 'text-green-600' : 'text-yellow-600';
            
            return (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-600 font-medium text-sm">{name[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{name}</p>
                    <p className="text-sm text-gray-500">Load: {load}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${color}`}>{status}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full ${load > 90 ? 'bg-red-500' : load < 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{width: `${load}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  switch (user.role) {
    case 'admin':
      return renderAdminWidgets();
    case 'client':
      return renderClientWidgets();
    case 'agency':
      return renderAgencyWidgets();
    case 'third_party':
      return renderThirdPartyWidgets();
    case 'coordinator':
      return renderCoordinatorWidgets();
    default:
      return null;
  }
};

export default RoleSpecificWidgets;