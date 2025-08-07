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

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await UserProfileService.getUserProfile(userId);
      setProfile(profileData);
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshSummary = useCallback(async () => {
    try {
      // Don't set error to null here to preserve any profile errors
      const summaryData = await UserProfileService.getExchangesSummary(userId);
      setSummary(summaryData);
    } catch (err: any) {
      console.warn('Warning: Could not load exchanges summary:', err);
      // Don't set error for summary failure - it's optional data
    }
  }, [userId]);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Promise.allSettled to handle partial failures
      const [profileResult, summaryResult] = await Promise.allSettled([
        UserProfileService.getUserProfile(userId),
        UserProfileService.getExchangesSummary(userId)
      ]);
      
      // Handle profile result
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        console.error('Error loading user profile:', profileResult.reason);
        setError(profileResult.reason?.message || 'Failed to load user profile');
      }
      
      // Handle summary result (optional - don't fail if this fails)
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        console.warn('Warning: Could not load exchanges summary:', summaryResult.reason);
        // Don't set error for summary failure - it's optional
      }
      
      // Only show error if the main profile failed
      if (profileResult.status === 'rejected') {
        throw new Error(profileResult.reason?.message || 'Failed to load user profile');
      }
    } catch (err: any) {
      console.error('Error loading user profile data:', err);
      setError(err.message || 'Failed to load user profile data');
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