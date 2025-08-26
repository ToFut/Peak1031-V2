import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Download,
  Calendar,
  Filter,
  Share2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Shield
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import { format } from 'date-fns';

interface ReportCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
  roles: string[];
}

const getAllReportCategories = (): ReportCategory[] => [
  { 
    id: 'overview', 
    name: 'Overview', 
    icon: BarChart3, 
    color: 'bg-blue-500',
    description: 'System-wide metrics and KPIs',
    roles: ['admin', 'coordinator', 'agency']
  },
  { 
    id: 'financial', 
    name: 'Financial', 
    icon: DollarSign, 
    color: 'bg-green-500',
    description: 'Revenue, values, and financial metrics',
    roles: ['admin', 'coordinator', 'agency']
  },
  { 
    id: 'exchanges', 
    name: 'My Exchanges', 
    icon: TrendingUp, 
    color: 'bg-purple-500',
    description: 'Exchange performance and analytics',
    roles: ['admin', 'coordinator', 'client', 'agency', 'third_party']
  },
  { 
    id: 'users', 
    name: 'Users', 
    icon: Users, 
    color: 'bg-orange-500',
    description: 'User activity and engagement',
    roles: ['admin', 'coordinator']
  },
  { 
    id: 'tasks', 
    name: 'My Tasks', 
    icon: Activity, 
    color: 'bg-indigo-500',
    description: 'Task completion and productivity',
    roles: ['admin', 'coordinator', 'client', 'agency', 'third_party']
  },
  { 
    id: 'audit', 
    name: 'Security', 
    icon: Shield, 
    color: 'bg-red-500',
    description: 'Audit logs and security events',
    roles: ['admin']
  }
];

export const MobileReportViewer: React.FC = () => {
  const { user } = useAuth();
  
  // Filter report categories based on user role
  const reportCategories = getAllReportCategories().filter(category => 
    category.roles.includes(user?.role || 'client')
  );
  
  // Set default active category to first available for user role
  const [activeCategory, setActiveCategory] = useState(() => {
    const firstAvailable = reportCategories[0]?.id || 'exchanges';
    return firstAvailable;
  });
  
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');

  useEffect(() => {
    loadReportData();
  }, [activeCategory, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      console.log(`📊 Loading ${activeCategory} report data for user:`, user?.email);
      
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd')
      });
      
      // Use apiService.get with proper URL construction
      const endpoint = `/mobile-reports/${activeCategory}?${params.toString()}`;
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        console.log(`✅ Loaded ${activeCategory} data:`, response.data);
        setReportData(response.data);
      } else {
        console.error(`❌ Failed to load ${activeCategory} data:`, response.error);
        throw new Error(response.error || `Failed to load ${activeCategory} report`);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      // Set fallback data to prevent crashes
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: exportFormat,
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd')
      });
      
      const endpoint = `/mobile-reports/${activeCategory}/export?${params.toString()}`;
      const response = await apiService.get(endpoint);
      
      // Create download based on format
      let blob: Blob;
      let filename = `${activeCategory}_report_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      
      if (exportFormat === 'json') {
        blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      } else {
        // For PDF and CSV, the response should be the raw data
        blob = new Blob([response], { 
          type: exportFormat === 'pdf' ? 'application/pdf' : 'text/csv' 
        });
      }
      
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data available for the selected period
        </div>
      );
    }

    // Render different report layouts based on category
    switch (activeCategory) {
      case 'overview':
        return <OverviewReport data={reportData} />;
      case 'financial':
        return <FinancialReport data={reportData} />;
      case 'exchanges':
        return <ExchangesReport data={reportData} />;
      case 'users':
        return <UsersReport data={reportData} />;
      case 'tasks':
        return <TasksReport data={reportData} />;
      case 'audit':
        return <AuditReport data={reportData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-4 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <Filter className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Date Range Filter (collapsible) */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={format(dateRange.start, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    start: new Date(e.target.value)
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={format(dateRange.end, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    end: new Date(e.target.value)
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              
              {/* Export Format Selection */}
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-gray-600">Export as:</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs - PracticePanther Style */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide px-4 lg:px-8">
              {reportCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeCategory === category.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {category.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="px-4 lg:px-8 py-4 max-w-7xl mx-auto">
        {renderReportContent()}
      </div>
    </div>
  );
};

// Individual Report Components

const OverviewReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4 lg:space-y-6">
    {/* Key Metrics Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
      <MetricCard
        title="Total Exchanges"
        value={data.totalExchanges}
        change={data.exchangeChange}
        icon={TrendingUp}
        color="blue"
      />
      <MetricCard
        title="Active Users"
        value={data.activeUsers}
        change={data.userChange}
        icon={Users}
        color="green"
      />
      <MetricCard
        title="Tasks Completed"
        value={data.completedTasks}
        change={data.taskChange}
        icon={Activity}
        color="purple"
      />
      <MetricCard
        title="Revenue"
        value={`$${(data.totalRevenue / 1000).toFixed(1)}K`}
        change={data.revenueChange}
        icon={DollarSign}
        color="orange"
      />
    </div>

    {/* Charts and Activity - Responsive Layout */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Weekly Trend</h3>
        <MobileChart data={data.weeklyTrend} type="line" />
      </div>

      <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {data.recentActivity?.map((activity: any, index: number) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activity.type === 'success' ? 'bg-green-100 text-green-800' :
                activity.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {activity.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const FinancialReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
    {/* Financial Summary */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Exchange Value</span>
          <span className="font-semibold text-lg">${(data.totalValue / 1000000).toFixed(2)}M</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Average Deal Size</span>
          <span className="font-semibold">${(data.averageValue / 1000).toFixed(0)}K</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Monthly Revenue</span>
          <span className="font-semibold text-green-600">${(data.monthlyRevenue / 1000).toFixed(1)}K</span>
        </div>
      </div>
    </div>

    {/* Value Distribution Chart */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Value Distribution</h3>
      <MobileChart data={data.valueDistribution} type="pie" />
    </div>

    {/* Top Exchanges by Value */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Top Exchanges</h3>
      <div className="space-y-2">
        {data.topExchanges?.map((exchange: any, index: number) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{exchange.name}</p>
              <p className="text-xs text-gray-500">{exchange.client}</p>
            </div>
            <span className="font-semibold text-sm">${(exchange.value / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ExchangesReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
    {/* Status Distribution */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Status Distribution</h3>
      <div className="space-y-2">
        {Object.entries(data.statusCounts || {}).map(([status, count]: any) => (
          <div key={status} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                status === 'completed' ? 'bg-green-500' :
                status === 'active' ? 'bg-blue-500' :
                status === 'pending' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span className="text-sm capitalize">{status}</span>
            </div>
            <span className="font-semibold">{count}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Timeline Compliance */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Timeline Compliance</h3>
      <div className="space-y-3">
        <ProgressBar
          label="On Schedule"
          value={data.onSchedule}
          total={data.totalExchanges}
          color="green"
        />
        <ProgressBar
          label="At Risk"
          value={data.atRisk}
          total={data.totalExchanges}
          color="yellow"
        />
        <ProgressBar
          label="Overdue"
          value={data.overdue}
          total={data.totalExchanges}
          color="red"
        />
      </div>
    </div>

    {/* Performance Metrics */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
      <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
        <p className="text-xs text-gray-600 mb-1">Completion Rate</p>
        <p className="text-xl font-bold text-green-600">{data.completionRate}%</p>
      </div>
      <div className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
        <p className="text-xs text-gray-600 mb-1">Avg. Duration</p>
        <p className="text-xl font-bold text-blue-600">{data.avgDuration} days</p>
      </div>
    </div>
  </div>
);

const UsersReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
    {/* User Statistics */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">User Statistics</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-600">Total Users</p>
          <p className="text-2xl font-bold">{data.totalUsers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Active Today</p>
          <p className="text-2xl font-bold text-green-600">{data.activeToday}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600">{data.newThisMonth}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Avg. Session</p>
          <p className="text-2xl font-bold">{data.avgSession}m</p>
        </div>
      </div>
    </div>

    {/* Role Distribution */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Role Distribution</h3>
      <MobileChart data={data.roleDistribution} type="donut" />
    </div>

    {/* Top Active Users */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Most Active Users</h3>
      <div className="space-y-2">
        {data.topUsers?.map((user: any, index: number) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                {user.initials}
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
            <span className="text-sm font-semibold">{user.actions} actions</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TasksReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
    {/* Task Overview */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Task Overview</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Tasks</span>
          <span className="font-semibold text-lg">{data.totalTasks}</span>
        </div>
        <ProgressBar
          label="Completed"
          value={data.completedTasks}
          total={data.totalTasks}
          color="green"
        />
        <ProgressBar
          label="In Progress"
          value={data.inProgressTasks}
          total={data.totalTasks}
          color="blue"
        />
        <ProgressBar
          label="Overdue"
          value={data.overdueTasks}
          total={data.totalTasks}
          color="red"
        />
      </div>
    </div>

    {/* Productivity Metrics */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Productivity</h3>
      <MobileChart data={data.dailyCompletion} type="bar" />
    </div>

    {/* Task Distribution by Priority */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Priority Distribution</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm">High Priority</span>
          </span>
          <span className="font-semibold">{data.highPriority}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm">Medium Priority</span>
          </span>
          <span className="font-semibold">{data.mediumPriority}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm">Low Priority</span>
          </span>
          <span className="font-semibold">{data.lowPriority}</span>
        </div>
      </div>
    </div>
  </div>
);

const AuditReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
    {/* Security Overview */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Security Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{data.successfulLogins}</p>
          <p className="text-xs text-gray-600">Successful Logins</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-600">{data.failedLogins}</p>
          <p className="text-xs text-gray-600">Failed Attempts</p>
        </div>
      </div>
    </div>

    {/* Recent Security Events */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Recent Security Events</h3>
      <div className="space-y-2">
        {data.securityEvents?.map((event: any, index: number) => (
          <div key={index} className="border-l-4 border-red-500 pl-3 py-2">
            <p className="text-sm font-medium">{event.type}</p>
            <p className="text-xs text-gray-500">{event.user} • {event.time}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Activity by Hour */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Activity Pattern</h3>
      <MobileChart data={data.hourlyActivity} type="line" />
    </div>
  </div>
);

// Helper Components

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-lg p-3 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <Icon className={`h-5 w-5 text-${color}-500`} />
      {change && (
        <span className={`text-xs font-medium ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <p className="text-xs text-gray-600 mb-1">{title}</p>
    <p className="text-xl font-bold text-gray-900">{value}</p>
  </div>
);

const ProgressBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => {
  const percentage = Math.round((value / total) * 100);
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">{value} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full bg-${color}-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const MobileChart: React.FC<{
  data: any;
  type: 'line' | 'bar' | 'pie' | 'donut';
}> = ({ data, type }) => {
  // Placeholder for chart implementation
  // You can integrate with libraries like recharts, chart.js, or victory-native
  return (
    <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
      <p className="text-gray-500 text-sm">
        {type.charAt(0).toUpperCase() + type.slice(1)} Chart
      </p>
    </div>
  );
};

export default MobileReportViewer;