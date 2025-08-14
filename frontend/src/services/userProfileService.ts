import { apiService } from './api';

export interface UserProfileStats {
  totalExchanges: number;
  activeExchanges: number;
  completedExchanges: number;
  pendingExchanges: number;
  recentExchanges: number;
  exchangesLast90Days: number;
}

export interface MessageStats {
  totalMessages: number;
  messagesLast30Days: number;
  avgMessagesPerExchange: number;
}

export interface RecentExchange {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  propertyAddress?: string;
  exchangeType?: string;
}

export interface MonthlyActivity {
  month: string;
  exchanges: number;
  date: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  first_name?: string; // Backend compatibility
  last_name?: string; // Backend compatibility
  role: string;
  isActive?: boolean;
  is_active?: boolean; // Backend compatibility
  lastLogin?: string;
  last_login?: string; // Backend compatibility
  createdAt?: string;
  created_at?: string; // Backend compatibility
}

export interface AuditActivity {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginHistory {
  action: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export interface SystemUsageStats {
  mostUsedFeatures: Array<{ feature: string; usage: number }>;
  mostCommonActions: Array<{ action: string; count: number }>;
  averageActionsPerDay: number;
  activeDays: number;
  lastActiveDate?: string;
}

export interface AuditActivityData {
  totalActions: number;
  actionsLast30Days: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  dailyActivity: Record<string, number>;
  recentActivity: AuditActivity[];
  systemUsageStats: SystemUsageStats;
  loginHistory: LoginHistory[];
}

export interface UserProfile {
  user: UserInfo;
  stats: UserProfileStats;
  statusDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  messageStats: MessageStats;
  recentExchanges: RecentExchange[];
  monthlyActivity: MonthlyActivity[];
  participationCount: number;
  auditActivity: AuditActivityData;
}

export interface ExchangesSummary {
  totalCount: number;
  byStatus: Record<string, RecentExchange[]>;
  byType: Record<string, RecentExchange[]>;
  byCreationMonth: Record<string, RecentExchange[]>;
  averageTimeframes: Record<string, number>;
  recentActivity: RecentExchange[];
}

export class UserProfileService {
  private static etagCache: Map<string, string> = new Map();

  /**
   * Get comprehensive user profile with exchange analytics and real-time data
   * @param userId - Optional user ID. If provided, gets that user's profile (admin only)
   */
  static async getUserProfile(userId?: string): Promise<UserProfile> {
    try {
      const endpoint = userId ? `/user-profile/${userId}` : '/user-profile';
      const etag = this.etagCache.get(endpoint);
      
      const response = await apiService.get(endpoint, { 
        useCache: false, // Don't use cache for real-time data
        cacheDuration: 1 * 60 * 1000, // 1 minute for offline fallback only
        useFallback: true,
        forceRefresh: true, // Always fetch fresh data
        lazyLoad: false,
        etag
      });
      
      // The API service already unwraps the response, so we get the data directly
      if (!response) {
        throw new Error('Failed to load user profile');
      }
      
      // Store ETag for future requests
      if (response.etag) {
        this.etagCache.set(endpoint, response.etag);
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get detailed exchanges summary with real-time data
   */
  static async getExchangesSummary(): Promise<ExchangesSummary> {
    try {
      const endpoint = '/user-profile/exchanges-summary';
      const etag = this.etagCache.get(endpoint);
      
      const response = await apiService.get(endpoint, { 
        useCache: false, // Don't use cache for real-time data
        cacheDuration: 1 * 60 * 1000, // 1 minute for offline fallback only
        useFallback: true,
        forceRefresh: true, // Always fetch fresh data
        lazyLoad: false,
        etag
      });
      
      if (!response) {
        throw new Error('Failed to load exchanges summary');
      }
      
      // Store ETag for future requests
      if (response.etag) {
        this.etagCache.set(endpoint, response.etag);
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching exchanges summary:', error);
      throw error;
    }
  }

  /**
   * Format user display name
   */
  static formatUserName(user: UserInfo): string {
    // Handle both camelCase and snake_case properties
    const firstName = user.firstName || user.first_name;
    const lastName = user.lastName || user.last_name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) {
      return firstName;
    }
    if (lastName) {
      return lastName;
    }
    return user.email.split('@')[0];
  }

  /**
   * Format role display name
   */
  static formatRole(role: string): string {
    if (!role || typeof role !== 'string') return 'User';
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'coordinator':
        return 'Exchange Coordinator';
      case 'client':
        return 'Client';
      case 'third_party':
        return 'Third Party';
      case 'agency':
        return 'Agency Representative';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }

  /**
   * Get status color for exchange status
   */
  static getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
      case 'initiated':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'on_hold':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Format large numbers
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Get time period display
   */
  static getTimePeriodDisplay(date: string): string {
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else if (diffDays <= 30) {
      return `${Math.ceil(diffDays / 7)} weeks ago`;
    } else if (diffDays <= 365) {
      return `${Math.ceil(diffDays / 30)} months ago`;
    } else {
      return `${Math.ceil(diffDays / 365)} years ago`;
    }
  }

  /**
   * Format action name for display
   */
  static formatActionName(action: string): string {
    switch (action.toLowerCase()) {
      case 'login':
        return 'Logged In';
      case 'logout':
        return 'Logged Out';
      case 'view_profile':
        return 'Viewed Profile';
      case 'view_other_user_profile':
        return 'Viewed User Profile';
      case 'create_exchange':
        return 'Created Exchange';
      case 'update_exchange':
        return 'Updated Exchange';
      case 'view_exchange':
        return 'Viewed Exchange';
      case 'send_message':
        return 'Sent Message';
      case 'upload_document':
        return 'Uploaded Document';
      case 'download_document':
        return 'Downloaded Document';
      case 'create_task':
        return 'Created Task';
      case 'update_task':
        return 'Updated Task';
      case 'complete_task':
        return 'Completed Task';
      case 'api_access':
        return 'API Access';
      case 'auth_success':
        return 'Authentication Success';
      case 'auth_failure':
        return 'Authentication Failed';
      case 'token_refresh':
        return 'Token Refreshed';
      default:
        return action.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  }

  /**
   * Format entity type for display
   */
  static formatEntityType(entityType: string): string {
    switch (entityType?.toLowerCase()) {
      case 'exchange':
        return 'Exchange';
      case 'user':
        return 'User';
      case 'message':
        return 'Message';
      case 'document':
        return 'Document';
      case 'task':
        return 'Task';
      case 'contact':
        return 'Contact';
      case 'auth':
        return 'Authentication';
      case 'endpoint':
        return 'API Endpoint';
      case 'system':
        return 'System';
      default:
        return entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Unknown';
    }
  }

  /**
   * Get action color for display
   */
  static getActionColor(action: string): string {
    switch (action.toLowerCase()) {
      case 'login':
      case 'auth_success':
        return 'text-green-600 bg-green-100';
      case 'logout':
        return 'text-blue-600 bg-blue-100';
      case 'create_exchange':
      case 'create_task':
      case 'upload_document':
        return 'text-blue-600 bg-blue-100';
      case 'update_exchange':
      case 'update_task':
        return 'text-yellow-600 bg-yellow-100';
      case 'complete_task':
        return 'text-green-600 bg-green-100';
      case 'auth_failure':
        return 'text-red-600 bg-red-100';
      case 'view_profile':
      case 'view_exchange':
      case 'view_other_user_profile':
        return 'text-gray-600 bg-gray-100';
      case 'send_message':
        return 'text-purple-600 bg-purple-100';
      case 'download_document':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get browser name from user agent
   */
  static getBrowserInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown Browser';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown Browser';
  }
}