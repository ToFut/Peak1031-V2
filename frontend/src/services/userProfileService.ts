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
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
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
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
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
}