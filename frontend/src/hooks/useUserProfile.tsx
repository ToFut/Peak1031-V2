import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfileService, UserProfile, ExchangesSummary, RecentExchange } from '../services/userProfileService';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  summary: ExchangesSummary | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useUserProfile = (userId?: string): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<ExchangesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(true);
  const hasLoadedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Force refresh to get real-time data
      const freshProfile = await UserProfileService.getUserProfile(userId);
      setProfile(freshProfile);
      
      // Update summary from profile data - convert distribution to expected format
      if (freshProfile?.stats) {
        // Convert statusDistribution from counts to empty arrays (or skip setting summary)
        const byStatus: Record<string, RecentExchange[]> = {};
        const byType: Record<string, RecentExchange[]> = {};
        
        // For now, just set empty arrays for each status/type
        if (freshProfile.statusDistribution) {
          Object.keys(freshProfile.statusDistribution).forEach(status => {
            byStatus[status] = [];
          });
        }
        
        if (freshProfile.typeDistribution) {
          Object.keys(freshProfile.typeDistribution).forEach(type => {
            byType[type] = [];
          });
        }
        
        setSummary({
          totalCount: freshProfile.stats.totalExchanges,
          totalExchanges: freshProfile.stats.totalExchanges,
          byStatus,
          byType,
          byCreationMonth: {},
          averageTimeframes: {},
          recentActivity: freshProfile.recentExchanges || []
        });
      }
      
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err: any) {
      console.error('Error refreshing profile:', err);
      setError(err.message || 'Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Force refresh to get real-time data
      const freshSummary = await UserProfileService.getExchangesSummary();
      setSummary(freshSummary);
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err: any) {
      console.error('Error refreshing summary:', err);
      setError(err.message || 'Failed to refresh summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch user profile - it already contains exchange summary data
      const freshProfile = await UserProfileService.getUserProfile(userId);
      
      setProfile(freshProfile);
      // Extract summary from profile if available - convert distribution to expected format
      if (freshProfile?.stats) {
        // Convert statusDistribution from counts to empty arrays (or skip setting summary)
        const byStatus: Record<string, RecentExchange[]> = {};
        const byType: Record<string, RecentExchange[]> = {};
        
        // For now, just set empty arrays for each status/type
        if (freshProfile.statusDistribution) {
          Object.keys(freshProfile.statusDistribution).forEach(status => {
            byStatus[status] = [];
          });
        }
        
        if (freshProfile.typeDistribution) {
          Object.keys(freshProfile.typeDistribution).forEach(type => {
            byType[type] = [];
          });
        }
        
        setSummary({
          totalCount: freshProfile.stats.totalExchanges,
          totalExchanges: freshProfile.stats.totalExchanges,
          byStatus,
          byType,
          byCreationMonth: {},
          averageTimeframes: {},
          recentActivity: freshProfile.recentExchanges || []
        });
      }
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err: any) {
      console.error('Error refreshing all data:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Only refresh when userId changes or on initial mount
    if (userId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      refreshAll();
    } else if (!userId) {
      // If no userId, reset the state
      setProfile(null);
      setSummary(null);
      setLoading(false);
      setError(null);
    }
  }, [userId, refreshAll]); // Include refreshAll to satisfy exhaustive deps
  
  // Reset hasLoaded when userId changes
  useEffect(() => {
    if (userId) {
      hasLoadedRef.current = false;
    }
  }, [userId]);

  return {
    profile,
    summary,
    loading,
    error,
    refreshProfile,
    refreshSummary,
    refreshAll
  };
};