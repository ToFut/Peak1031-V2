import { useState, useEffect, useCallback } from 'react';
import { UserProfileService, UserProfile, ExchangesSummary } from '../services/userProfileService';

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

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Force refresh to get real-time data
      const freshProfile = await UserProfileService.getUserProfile(userId);
      setProfile(freshProfile);
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
      
      // Force refresh both profile and summary
      const [freshProfile, freshSummary] = await Promise.all([
        UserProfileService.getUserProfile(userId),
        UserProfileService.getExchangesSummary()
      ]);
      
      setProfile(freshProfile);
      setSummary(freshSummary);
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
    refreshAll();
  }, [refreshAll]);

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