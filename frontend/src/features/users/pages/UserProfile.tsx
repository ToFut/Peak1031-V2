import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ShieldCheckIcon,
  EyeIcon,
  BoltIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { UserProfileService } from '../../../services/userProfileService';
import { EnhancedStatCard } from '../../dashboard/components/SharedDashboardComponents';
import UserProfileEnhanced from './UserProfileEnhanced';
import apiService from '../../../services/api';

// Animation variants for staggered wave effect
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const headerVariants = {
  hidden: { 
    opacity: 0, 
    y: -30,
    scale: 0.9
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const statsVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.4
    }
  }
};

const statCardVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.9
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const chartVariants = {
  hidden: { 
    opacity: 0, 
    x: -50,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

interface AgencyAssignment {
  id: string;
  agency_name: string;
  agency_email: string;
  agency_company?: string;
  assignment_date: string;
  can_view_performance: boolean;
  performance_score: number;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile, summary, loading, error, refreshAll } = useUserProfile(userId);
  const [agencyAssignments, setAgencyAssignments] = useState<AgencyAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Load agency assignments for third party users
  useEffect(() => {
    // TODO: Implement agency assignments for third party users
    // This feature requires contact_id mapping which is not yet implemented
  }, [profile]);

  const loadAgencyAssignments = async () => {
    try {
      setLoadingAssignments(true);
      // TODO: Implement agency assignments API call
      console.log('Agency assignments feature not yet implemented');
    } catch (error) {
      console.error('Error loading agency assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

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

  if (!profile || !profile.user) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header with gradient background */}
        <div className="bg-white rounded-xl shadow-lg p-8 bg-gradient-to-r from-blue-50 via-white to-purple-50 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {UserProfileService.formatUserName(profile.user)}
                </h1>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-full shadow-sm">
                    {UserProfileService.formatRole(profile.user.role)}
                  </span>
                  <span className="text-gray-600 flex items-center">
                    <span className="text-gray-400 mr-2">•</span>
                    {profile.user.email}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="inline-flex items-center px-5 py-3 bg-white border border-gray-200 rounded-lg shadow-md text-sm font-medium text-gray-700 hover:shadow-lg hover:border-blue-300 transition-all duration-200 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards with gradients and animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <EnhancedStatCard
              title="Total Exchanges"
              value={profile.stats.totalExchanges}
              icon={DocumentTextIcon}
              color="blue"
              subtitle="All time"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <EnhancedStatCard
              title="Active Exchanges"
              value={profile.stats.activeExchanges}
              icon={ArrowTrendingUpIcon}
              color="green"
              subtitle="In progress"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <EnhancedStatCard
              title="System Actions"
              value={profile.auditActivity?.totalActions || 0}
              icon={BoltIcon}
              color="purple"
              subtitle="Total activity"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <EnhancedStatCard
              title="Recent Activity"
              value={profile.auditActivity?.actionsLast30Days || 0}
              icon={CalendarIcon}
              color="yellow"
              subtitle="Last 30 days"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Exchange Status Distribution */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Exchange Status</h3>
              </div>
              <span className="text-sm text-gray-500">{Object.values(profile.statusDistribution).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <div className="space-y-4">
              {Object.entries(profile.statusDistribution).map(([status, count]) => {
                const total = Object.values(profile.statusDistribution).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 shadow-sm ${
                          status === 'active' || status === 'in_progress' ? 'bg-green-500' :
                          status === 'completed' ? 'bg-blue-500' :
                          status === 'pending' || status === 'initiated' ? 'bg-yellow-500' :
                          status === 'cancelled' || status === 'failed' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-sm font-semibold text-gray-700 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full rounded-full ${
                          status === 'active' || status === 'in_progress' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          status === 'completed' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                          status === 'pending' || status === 'initiated' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          status === 'cancelled' || status === 'failed' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                          'bg-gradient-to-r from-gray-400 to-gray-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Enhanced Recent Exchanges */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Recent Exchanges</h3>
              </div>
              <span className="text-sm text-gray-500">Latest 5</span>
            </div>
            <div className="space-y-3">
              {(profile.recentExchanges || []).slice(0, 5).map((exchange, index) => (
                <motion.div 
                  key={exchange.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + (index * 0.1) }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-purple-50 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {exchange.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {UserProfileService.getTimePeriodDisplay(exchange.createdAt)}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                      exchange.status === 'active' || exchange.status === 'in_progress' ? 'bg-green-100 text-green-800 border border-green-200' :
                      exchange.status === 'completed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      exchange.status === 'pending' || exchange.status === 'initiated' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      exchange.status === 'cancelled' || exchange.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {exchange.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </motion.div>
              ))}
              {(profile.recentExchanges || []).length === 0 && (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No recent exchanges</p>
                </div>
              )}
            </div>
          </motion.div>

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

      {/* System Usage Statistics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <ComputerDesktopIcon className="h-6 w-6 text-gray-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">System Usage</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Used Features */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Most Used Features</h4>
            <div className="space-y-2">
              {(profile.auditActivity?.systemUsageStats?.mostUsedFeatures || []).map((feature, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {UserProfileService.formatEntityType(feature.feature)}
                  </span>
                  <div className="flex items-center">
                    <div 
                      className="bg-blue-200 h-2 rounded-full mr-2"
                      style={{ 
                        width: `${Math.max(feature.usage * 2, 20)}px`,
                        maxWidth: '80px'
                      }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{feature.usage}</span>
                  </div>
                </div>
              ))}
              {(!profile.auditActivity?.systemUsageStats?.mostUsedFeatures || profile.auditActivity.systemUsageStats.mostUsedFeatures.length === 0) && (
                <p className="text-sm text-gray-500">No feature usage data available</p>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Activity Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Days</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile.auditActivity?.systemUsageStats?.activeDays || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Actions/Day</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile.auditActivity?.systemUsageStats?.averageActionsPerDay || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Active</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile.auditActivity?.systemUsageStats?.lastActiveDate 
                    ? UserProfileService.getTimePeriodDisplay(profile.auditActivity.systemUsageStats.lastActiveDate)
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <ClockIcon className="h-6 w-6 text-gray-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(profile.auditActivity?.recentActivity || []).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${UserProfileService.getActionColor(activity.action)}`}>
                  {UserProfileService.formatActionName(activity.action)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">
                    {activity.entityType && (
                      <span className="text-gray-600">
                        {UserProfileService.formatEntityType(activity.entityType)}
                      </span>
                    )}
                  </p>
                  <span className="text-xs text-gray-500">
                    {UserProfileService.getTimePeriodDisplay(activity.timestamp)}
                  </span>
                </div>
                {activity.ipAddress && (
                  <div className="text-xs text-gray-500 mt-1">
                    IP: {activity.ipAddress} • {UserProfileService.getBrowserInfo(activity.userAgent)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!profile.auditActivity?.recentActivity || profile.auditActivity.recentActivity.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Login History */}
      {(profile.auditActivity?.loginHistory || []).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Login History</h3>
          </div>
          <div className="space-y-3">
            {(profile.auditActivity?.loginHistory || []).map((login, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${UserProfileService.getActionColor(login.action)}`}>
                    {UserProfileService.formatActionName(login.action)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {UserProfileService.getTimePeriodDisplay(login.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {login.ipAddress} • {UserProfileService.getBrowserInfo(login.userAgent)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agency Assignments - Only for agency users */}
      {profile.user.role === 'agency' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Agency Assignments</h3>
            </div>
            {loadingAssignments && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
          </div>
          
          {agencyAssignments.length > 0 ? (
            <div className="space-y-3">
              {agencyAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {assignment.agency_name}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          assignment.can_view_performance 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.can_view_performance ? 'Performance Monitoring' : 'Basic Access'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{assignment.agency_email}</p>
                      {assignment.agency_company && (
                        <p className="text-xs text-gray-500">{assignment.agency_company}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned: {new Date(assignment.assignment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        assignment.performance_score >= 80 ? 'text-green-600' :
                        assignment.performance_score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {assignment.performance_score}
                      </div>
                      <div className="text-xs text-gray-500">Performance Score</div>
                    </div>
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center text-sm text-blue-700">
                  <EyeIcon className="h-4 w-4 mr-2" />
                  <span>
                    You have <strong>{agencyAssignments.length}</strong> {agencyAssignments.length === 1 ? 'assignment' : 'assignments'} 
                    for monitoring exchange performance and portfolio management.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-2">No Agency Assignments</h4>
              <p className="text-sm text-gray-500">
                You are not currently assigned to any performance monitoring tasks.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Contact your administrator if you need to be assigned to monitoring tasks.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Breakdown */}
      {Object.keys(profile.auditActivity?.actionBreakdown || {}).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <EyeIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Action Breakdown</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(profile.auditActivity?.actionBreakdown || {})
              .sort(([,a], [,b]) => b - a)
              .slice(0, 9)
              .map(([action, count]) => (
                <div key={action} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {UserProfileService.formatActionName(action)}
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{count}</div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Include the Enhanced User Profile component for exchange and third party assignments */}
      <UserProfileEnhanced initialProfile={profile} />
      </div>
    </div>
  );
};

export default UserProfile;