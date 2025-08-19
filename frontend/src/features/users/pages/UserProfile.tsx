import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { UserProfileService } from '../../../services/userProfileService';
import { EnhancedStatCard } from '../../dashboard/components/SharedDashboardComponents';
import { apiService } from '../../../services/api';

interface AgencyAssignment {
  id: string;
  agency_name: string;
  agency_email: string;
  agency_company?: string;
  assignment_date: string;
  can_view_performance: boolean;
  performance_score: number;
}

interface Exchange {
  id: string;
  name: string;
  status: string;
  property_address?: string;
  exchange_type?: string;
  created_at: string;
}

interface Agency {
  id: string;
  name: string;
  email: string;
  company?: string;
  created_at: string;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile, summary, loading, error, refreshAll } = useUserProfile(userId);
  const [agencyAssignments, setAgencyAssignments] = useState<AgencyAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // Exchange assignment modal state
  const [showExchangeAssignModal, setShowExchangeAssignModal] = useState(false);
  const [availableExchanges, setAvailableExchanges] = useState<Exchange[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [assigningExchange, setAssigningExchange] = useState(false);
  
  // Agency assignment modal state
  const [showAgencyAssignModal, setShowAgencyAssignModal] = useState(false);
  const [availableAgencies, setAvailableAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [assigningAgency, setAssigningAgency] = useState(false);

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

  // Load available exchanges for assignment
  const loadAvailableExchanges = async () => {
    try {
      const exchanges = await apiService.getExchanges();
      const exchangesArray = Array.isArray(exchanges) ? exchanges : (exchanges as any)?.data || [];
      // Filter out exchanges already assigned to this user
      const userExchangeIds = (profile?.recentExchanges || []).map(ex => ex.id);
      const available = exchangesArray.filter((ex: any) => !userExchangeIds.includes(ex.id));
      setAvailableExchanges(available);
    } catch (error) {
      console.error('Error loading exchanges:', error);
      setAvailableExchanges([]);
    }
  };

  // Load available agencies for assignment
  const loadAvailableAgencies = async () => {
    try {
      console.log('Loading agencies...');
      
      // Get agencies from the API
      const response = await apiService.getAgencies();
      const agenciesData = (response as any)?.data || (response as any)?.agencies || [];
      
      // Map the API response to match our Agency interface
      const agencies = agenciesData.map((agency: any) => ({
        id: agency.id,
        name: agency.agency_name || agency.name,
        email: agency.contactInfo?.email || agency.email || '',
        company: agency.contactInfo?.company || agency.company,
        created_at: agency.createdAt || agency.created_at || new Date().toISOString()
      }));
      
      console.log('Available agencies:', agencies);
      setAvailableAgencies(agencies);
    } catch (error) {
      console.error('Error loading agencies:', error);
      setAvailableAgencies([]);
    }
  };

  // Handle exchange assignment
  const handleExchangeAssignment = async () => {
    if (!selectedExchangeId || !userId) return;
    
    try {
      setAssigningExchange(true);
      
      // Use the addExchangeParticipant method for all user types
      await apiService.addExchangeParticipant(selectedExchangeId, {
        email: profile?.user.email,
        role: profile?.user.role
      });
      
      // Refresh the profile to show the new assignment
      await refreshAll();
      setShowExchangeAssignModal(false);
      setSelectedExchangeId('');
    } catch (error) {
      console.error('Error assigning exchange:', error);
      alert(`Failed to assign exchange: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAssigningExchange(false);
    }
  };

  // Handle agency assignment
  const handleAgencyAssignment = async () => {
    if (!selectedAgencyId || !userId) return;
    
    try {
      setAssigningAgency(true);
      
      // Check user role and handle accordingly
      if (profile?.user.role === 'agency') {
        // Agency users cannot assign third parties - show message
        alert('Agency users cannot assign third parties. Please contact an administrator to create agency assignments.');
        return;
      }
      
      if (profile?.user.role === 'third_party') {
        // Third party users can request assignment to an agency
        const userContactId = (profile?.user as any)?.contact_id;
        
        if (!userContactId) {
          throw new Error('User does not have a contact record for agency assignment');
        }
        
        // Assign third party to agency using the correct API
        await apiService.assignThirdPartyToAgency(selectedAgencyId, userContactId, {
          can_view_performance: true,
          notes: 'Assignment from user profile'
        });
        
        // Refresh profile data
        refreshAll();
        setShowAgencyAssignModal(false);
        setSelectedAgencyId('');
      } else {
        throw new Error('Only third party users can be assigned to agencies');
      }
      
    } catch (error) {
      console.error('Error assigning agency:', error);
      alert(`Failed to assign agency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAssigningAgency(false);
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
              {error.includes('not found') || error.includes('does not exist') ? (
                <div className="mt-3">
                  <p className="text-sm text-red-600 mb-2">The requested user profile could not be found.</p>
                  <p className="text-sm text-gray-600 mb-3">Try navigating to a valid user profile:</p>
                  <div className="space-x-2">
                    <a
                      href="/users/user-profile/550e8400-e29b-41d4-a716-446655440000"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      System Admin
                    </a>
                    <a
                      href="/users/user-profile/550e8400-e29b-41d4-a716-446655440001"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                    >
                      Exchange Coordinator
                    </a>
                    <button
                      onClick={() => window.location.href = '/users'}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                    >
                      View All Users
                    </button>
                  </div>
                </div>
              ) : (
              <button
                onClick={refreshAll}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !profile.user) {
    console.log('UserProfile Debug:', { profile, userId, loading, error });
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Data Available</h3>
          <p className="text-gray-600 mb-4">The requested user profile could not be loaded.</p>
          <p className="text-sm text-gray-500 mb-6">Try navigating to a valid user profile:</p>
          <div className="space-x-2">
            <a
              href="/users/user-profile/550e8400-e29b-41d4-a716-446655440000"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              System Admin
            </a>
            <a
              href="/users/user-profile/550e8400-e29b-41d4-a716-446655440001"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
            >
              Exchange Coordinator
            </a>
            <button
              onClick={() => window.location.href = '/users'}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              View All Users
            </button>
            <button
              onClick={refreshAll}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Refresh Page
            </button>
          </div>
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
              title="System Actions"
              value={profile.auditActivity?.totalActions || 0}
              icon={BoltIcon}
              color="purple"
              subtitle="Total activity"
            />
          
            <EnhancedStatCard
              title="Recent Activity"
              value={profile.auditActivity?.actionsLast30Days || 0}
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

        {/* Exchange Assignments */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Exchange Assignments</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {profile.stats.totalExchanges} total
              </span>
              <button
                onClick={() => {
                  setShowExchangeAssignModal(true);
                  loadAvailableExchanges();
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Assign Exchange
              </button>
            </div>
          </div>
          
          {profile.stats.totalExchanges > 0 ? (
            <div className="space-y-3">
              {(profile.recentExchanges || []).map((exchange) => (
                <div key={exchange.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {exchange.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {exchange.propertyAddress && `📍 ${exchange.propertyAddress}`}
                        {exchange.exchangeType && ` • ${exchange.exchangeType.replace('_', ' ')}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created {UserProfileService.getTimePeriodDisplay(exchange.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${UserProfileService.getStatusColor(exchange.status)}`}>
                      {exchange.status.replace('_', ' ')}
                    </span>
                    <a
                      href={`/exchanges/${exchange.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                </div>
              ))}
              
              {profile.stats.totalExchanges > (profile.recentExchanges || []).length && (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-500">
                    Showing {profile.recentExchanges?.length || 0} of {profile.stats.totalExchanges} exchanges
                  </p>
                  <a
                    href="/exchanges"
                    className="inline-flex items-center px-3 py-2 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View All Exchanges →
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Exchange Assignments</h4>
              <p className="text-gray-500 mb-4">
                {profile.user.role === 'client' ? 'You haven\'t been assigned to any exchanges yet.' :
                 profile.user.role === 'coordinator' ? 'You haven\'t been assigned to coordinate any exchanges yet.' :
                 'This user hasn\'t been assigned to any exchanges yet.'}
              </p>
              <a
                href="/exchanges"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Browse Exchanges
              </a>
            </div>
          )}
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

      {/* Agency Assignments */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {profile.user.role === 'agency' ? 'Third Party Assignments' : 'Agency Assignments'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {loadingAssignments && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            {profile.user.role === 'third_party' && (
              <button
                onClick={() => {
                  setShowAgencyAssignModal(true);
                  loadAvailableAgencies();
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Assign Agency
              </button>
            )}
            {profile.user.role === 'agency' && (
              <button
                onClick={() => window.location.href = '/admin/agency-assignments'}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                Manage Assignments
              </button>
            )}
          </div>
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
                    You are assigned to <strong>{agencyAssignments.length}</strong> {agencyAssignments.length === 1 ? 'agency' : 'agencies'} 
                    who can monitor your exchange performance and portfolio.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {profile.user.role === 'agency' ? 'No Third Party Assignments' : 'No Agency Assignments'}
              </h4>
              <p className="text-sm text-gray-500">
                {profile.user.role === 'agency' 
                  ? 'You do not have any third parties assigned to your agency for performance monitoring.'
                  : 'You are not currently assigned to any agencies for performance monitoring.'
                }
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {profile.user.role === 'agency'
                  ? 'Contact an administrator to assign third parties to your agency.'
                  : 'Contact your administrator if you need to be assigned to an agency.'
                }
              </p>
            </div>
          )}
        </div>

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

      {/* Exchange Assignment Modal */}
      {showExchangeAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assign Exchange</h3>
                <button
                  onClick={() => setShowExchangeAssignModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Assign {UserProfileService.formatUserName(profile.user)} to an exchange as{' '}
                {profile.user.role === 'coordinator' ? 'coordinator' :
                 profile.user.role === 'client' ? 'client' : 'participant'}.
              </p>
              
              {availableExchanges.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Exchange
                    </label>
                    <select
                      value={selectedExchangeId}
                      onChange={(e) => setSelectedExchangeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose an exchange...</option>
                      {availableExchanges.map((exchange) => (
                        <option key={exchange.id} value={exchange.id}>
                          {exchange.name} ({exchange.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowExchangeAssignModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExchangeAssignment}
                      disabled={!selectedExchangeId || assigningExchange}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center"
                    >
                      {assigningExchange ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          Assign Exchange
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">No available exchanges to assign.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agency Assignment Modal */}
      {showAgencyAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assign Agency</h3>
                <button
                  onClick={() => setShowAgencyAssignModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Assign {UserProfileService.formatUserName(profile.user)} to an agency for performance monitoring.
              </p>
              
              {availableAgencies.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Agency
                    </label>
                    <select
                      value={selectedAgencyId}
                      onChange={(e) => setSelectedAgencyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Choose an agency...</option>
                      {availableAgencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name} ({agency.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowAgencyAssignModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAgencyAssignment}
                      disabled={!selectedAgencyId || assigningAgency}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg flex items-center"
                    >
                      {assigningAgency ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          Assign Agency
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">No available agencies to assign.</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Agency management feature is still being implemented.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;