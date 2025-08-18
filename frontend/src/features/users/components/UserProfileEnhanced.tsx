import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChatBubbleBottomCenterTextIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { UserProfileService } from '../../../services/userProfileService';
import { EnhancedStatCard } from '../../dashboard/components/SharedDashboardComponents';
import apiService from '../../../services/api';

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
  created_at: string;
  property_address?: string;
  exchange_type?: string;
  updated_at?: string;
}

interface ThirdParty {
  id: string;
  display_name: string;
  email: string;
  status: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
}

interface UserProfileEnhancedProps {
  initialProfile?: any; // Profile passed from parent to avoid duplicate API calls
}

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
      ease: "easeOut" as const
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
      ease: "easeOut" as const
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
      ease: "easeOut" as const
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
      ease: "easeOut" as const
    }
  }
};

const loadingVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const loadingItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeInOut" as const
    }
  }
};

const UserProfileEnhanced: React.FC<UserProfileEnhancedProps> = ({ initialProfile }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  // Always call the hook to satisfy React rules, but skip fetching if profile is provided
  const hookResult = useUserProfile(initialProfile ? undefined : userId);
  
  // Use initial profile if provided, otherwise use fetched profile
  const profile = initialProfile || hookResult.profile;
  const loading = initialProfile ? false : hookResult.loading;
  const error = initialProfile ? null : hookResult.error;
  const refreshAll = initialProfile ? async () => {} : hookResult.refreshAll;
  
  const [agencyAssignments, setAgencyAssignments] = useState<AgencyAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // State for assignments
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [availableExchanges, setAvailableExchanges] = useState<Exchange[]>([]);
  const [assignedExchanges, setAssignedExchanges] = useState<Exchange[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [availableThirdParties, setAvailableThirdParties] = useState<ThirdParty[]>([]);
  const [assignedThirdParties, setAssignedThirdParties] = useState<ThirdParty[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [exchangePermissions, setExchangePermissions] = useState<Record<string, string[]>>({});
  
  // UI state
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Enhanced exchange assignment state
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState('all');
  const [exchangeSortBy, setExchangeSortBy] = useState('name');
  const [showAssignedExchanges, setShowAssignedExchanges] = useState(true);

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
      <motion.div 
        className="p-6"
        variants={loadingVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-6">
          {/* Header skeleton */}
          <motion.div variants={loadingItemVariants} className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
          </motion.div>

          {/* Stats cards skeleton */}
          <motion.div 
            variants={loadingVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[1, 2, 3, 4].map((i) => (
              <motion.div 
                key={i} 
                variants={loadingItemVariants}
                className="bg-gray-200 h-32 rounded-lg animate-pulse"
              ></motion.div>
            ))}
          </motion.div>

          {/* Charts skeleton */}
          <motion.div 
            variants={loadingVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {[1, 2].map((i) => (
              <motion.div 
                key={i} 
                variants={loadingItemVariants}
                className="bg-gray-200 h-96 rounded-lg animate-pulse"
              ></motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="bg-red-50 border border-red-200 rounded-lg p-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Profile</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <motion.button
                onClick={refreshAll}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!profile || !profile.user) {
    return (
      <motion.div 
        className="p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">The requested user profile could not be loaded.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="p-6 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with staggered animation */}
      <motion.div 
        className="flex items-center justify-between"
        variants={headerVariants}
      >
        <motion.div variants={itemVariants}>
          <motion.h1 
            className="text-3xl font-bold text-gray-900"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {UserProfileService.formatUserName(profile.user)}
          </motion.h1>
          <motion.p 
            className="text-gray-600 mt-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {UserProfileService.formatRole(profile.user.role)} • {profile.user.email}
          </motion.p>
        </motion.div>
        <motion.button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          variants={itemVariants}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stats Cards with wave animation */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={statsVariants}
      >
        <motion.div variants={statCardVariants}>
          <EnhancedStatCard
            title="Total Exchanges"
            value={profile.stats.totalExchanges}
            icon={DocumentTextIcon}
            color="blue"
            subtitle="All time"
          />
        </motion.div>
        
        <motion.div variants={statCardVariants}>
          <EnhancedStatCard
            title="Active Exchanges"
            value={profile.stats.activeExchanges}
            icon={ArrowTrendingUpIcon}
            color="green"
            subtitle="In progress"
          />
        </motion.div>
        
        <motion.div variants={statCardVariants}>
          <EnhancedStatCard
            title="System Actions"
            value={profile.auditActivity?.totalActions || 0}
            icon={BoltIcon}
            color="purple"
            subtitle="Total activity"
          />
        </motion.div>
        
        <motion.div variants={statCardVariants}>
          <EnhancedStatCard
            title="Recent Activity"
            value={profile.auditActivity?.actionsLast30Days || 0}
            icon={CalendarIcon}
            color="yellow"
            subtitle="Last 30 days"
          />
        </motion.div>
      </motion.div>

      {/* Charts with staggered entrance */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        variants={containerVariants}
      >
        {/* Exchange Status Distribution */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border p-6"
          variants={chartVariants}
        >
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Exchange Status</h3>
          </div>
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
          >
            {Object.entries(profile.statusDistribution as Record<string, number>).map(([status, count], index) => (
              <motion.div 
                key={status} 
                className="flex items-center justify-between"
                variants={itemVariants}
                custom={index}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${UserProfileService.getStatusColor(status).split(' ')[1]}`}></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{String(count)}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Recent Exchanges */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border p-6"
          variants={chartVariants}
        >
          <div className="flex items-center mb-4">
            <DocumentTextIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Exchanges</h3>
          </div>
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
          >
            {(profile.recentExchanges || []).slice(0, 5).map((exchange: any, index: number) => (
              <motion.div 
                key={exchange.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                variants={itemVariants}
                custom={index}
                whileHover={{ 
                  scale: 1.02, 
                  backgroundColor: "#f8fafc",
                  transition: { duration: 0.2 }
                }}
              >
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
              </motion.div>
            ))}
            {(profile.recentExchanges || []).length === 0 && (
              <motion.div 
                className="text-center py-8 text-gray-500"
                variants={itemVariants}
              >
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent exchanges</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Additional sections can be added here with similar animation patterns */}
    </motion.div>
  );
};

export default UserProfileEnhanced;
