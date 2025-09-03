import React from 'react';
import { StatCard } from './DashboardCard';
import { ExchangeWidget } from './ExchangeWidget';
import { TaskWidget } from './TaskWidget';
import { useDashboard } from './DashboardProvider';
import ImprovedAdminDashboard from '../../../features/dashboard/components/ImprovedAdminContent';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  return <ImprovedAdminDashboard />;
};

export const ClientDashboard: React.FC = () => {
  const { data } = useDashboard();
  const { stats, loading } = data;

  return (
    <div className="space-y-6">
      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="My Exchanges"
          value={stats.totalExchanges}
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingTasks}
          icon={<ClockIcon className="w-6 h-6" />}
          color="yellow"
          loading={loading}
        />
        <StatCard
          label="Upcoming Deadlines"
          value={stats.upcomingDeadlines}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Client Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExchangeWidget userRole="client" variant="grid" maxItems={4} />
        <TaskWidget userRole="client" variant="list" maxItems={5} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <DocumentIcon className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-600">Upload Document</span>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
            <CheckCircleIcon className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-600">Complete Task</span>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-600">View Progress</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CoordinatorDashboard: React.FC = () => {
  const { data } = useDashboard();
  const { stats, loading } = data;

  return (
    <div className="space-y-6">
      {/* Coordinator Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Assigned Exchanges"
          value={stats.totalExchanges}
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Active Tasks"
          value={stats.pendingTasks}
          icon={<ClockIcon className="w-6 h-6" />}
          color="yellow"
          loading={loading}
        />
        <StatCard
          label="Completed This Month"
          value={stats.completedThisMonth}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Overdue Items"
          value={stats.overdueItems}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Coordinator Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExchangeWidget userRole="coordinator" variant="table" maxItems={6} />
        </div>
        <TaskWidget userRole="coordinator" variant="list" maxItems={5} />
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskWidget userRole="coordinator" variant="board" />
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900">Exchange EX-2024-001 status updated</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900">Task completed: Document review</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900">New client message received</p>
                <p className="text-xs text-gray-500">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AgencyDashboard: React.FC = () => {
  const { data } = useDashboard();
  const { stats, loading } = data;

  return (
    <div className="space-y-6">
      {/* Agency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Agency Exchanges"
          value={stats.totalExchanges}
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Total Commission"
          value={stats.totalValue}
          icon={<BanknotesIcon className="w-6 h-6" />}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Active Clients"
          value={stats.activeExchanges}
          icon={<UserGroupIcon className="w-6 h-6" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Agency Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExchangeWidget userRole="agency" variant="list" maxItems={6} />
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agency Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Monthly Goal</span>
                <span className="font-medium">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Client Satisfaction</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ThirdPartyDashboard: React.FC = () => {
  const { data } = useDashboard();
  const { stats, loading } = data;

  return (
    <div className="space-y-6">
      {/* Third Party Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          label="Monitored Exchanges"
          value={stats.totalExchanges}
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Compliance Issues"
          value={stats.overdueItems}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Third Party Content */}
      <ExchangeWidget userRole="third_party" variant="table" maxItems={8} />

      {/* Compliance Dashboard */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">85%</div>
            <div className="text-sm text-gray-600">Compliant</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">12%</div>
            <div className="text-sm text-gray-600">At Risk</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">3%</div>
            <div className="text-sm text-gray-600">Non-Compliant</div>
          </div>
        </div>
      </div>
    </div>
  );
};