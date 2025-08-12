import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  UserIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { UserProfileService } from '../../../services/userProfileService';
import { EnhancedStatCard } from '../../dashboard/components/SharedDashboardComponents';

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile, summary, loading, error, refreshAll } = useUserProfile(userId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-200 h-96 rounded-lg"></div>
            <div className="bg-gray-200 h-96 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Profile</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={refreshAll}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {UserProfileService.formatUserName(profile.user)}
          </h1>
          <p className="text-gray-600 mt-1">
            {UserProfileService.formatRole(profile.user.role)} • {profile.user.email}
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Total Exchanges"
          value={profile.stats.totalExchanges}
          icon={DocumentTextIcon}
          color="blue"
          subtitle="All time"
        />
        
        <EnhancedStatCard
          title="Active Exchanges"
          value={profile.stats.activeExchanges}
          icon={ArrowTrendingUpIcon}
          color="green"
          subtitle="In progress"
        />
        
        <EnhancedStatCard
          title="Total Messages"
          value={profile.messageStats.totalMessages}
          icon={ChatBubbleLeftRightIcon}
          color="purple"
          subtitle="All exchanges"
        />
        
        <EnhancedStatCard
          title="Recent Activity"
          value={profile.stats.recentExchanges}
          icon={CalendarIcon}
          color="yellow"
          subtitle="Last 30 days"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exchange Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Exchange Status</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(profile.statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${UserProfileService.getStatusColor(status).split(' ')[1]}`}></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Exchanges */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <DocumentTextIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Exchanges</h3>
          </div>
          <div className="space-y-3">
            {(profile.recentExchanges || []).slice(0, 5).map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {exchange.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {UserProfileService.getTimePeriodDisplay(exchange.createdAt)}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${UserProfileService.getStatusColor(exchange.status)}`}>
                    {exchange.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {(profile.recentExchanges || []).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent exchanges</p>
            )}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <ArrowTrendingUpIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
          </div>
          <div className="space-y-2">
            {(profile.monthlyActivity || []).slice(-6).map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month.month}</span>
                <div className="flex items-center">
                  <div 
                    className="bg-blue-200 h-2 rounded-full mr-2"
                    style={{ 
                      width: `${Math.max(month.exchanges * 10, 4)}px`,
                      minWidth: '4px',
                      maxWidth: '120px'
                    }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">{month.exchanges}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Communication Stats</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Messages</span>
              <span className="text-lg font-semibold text-gray-900">
                {UserProfileService.formatNumber(profile.messageStats.totalMessages)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last 30 Days</span>
              <span className="text-lg font-semibold text-gray-900">
                {UserProfileService.formatNumber(profile.messageStats.messagesLast30Days)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg per Exchange</span>
              <span className="text-lg font-semibold text-gray-900">
                {profile.messageStats.avgMessagesPerExchange}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Type Distribution */}
      {Object.keys(profile.typeDistribution).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Exchange Types</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(profile.typeDistribution).map(([type, count]) => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-900 capitalize mb-1">
                  {type.replace('_', ' ')}
                </div>
                <div className="text-2xl font-bold text-blue-600">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;