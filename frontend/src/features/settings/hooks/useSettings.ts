import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api';

interface UserSettings {
  id: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    exchangeUpdates: boolean;
    taskReminders: boolean;
    documentRequests: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
    allowDataExport: boolean;
  };
}

interface UseSettingsState {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export const useSettings = () => {
  const [state, setState] = useState<UseSettingsState>({
    settings: null,
    loading: true,
    error: null,
    saving: false,
  });

  // Load user settings
  const loadSettings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const settings = await apiService.getSettings();
      
      setState({
        settings,
        loading: false,
        error: null,
        saving: false,
      });
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load settings',
      }));
    }
  }, []);

  // Update user settings
  const updateSettings = useCallback(async (updates: Partial<UserSettings>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      
      const updatedSettings = await apiService.updateSettings(updates);
      
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        saving: false,
        error: null,
      }));
      
      return true;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      setState(prev => ({
        ...prev,
        saving: false,
        error: error.message || 'Failed to update settings',
      }));
      return false;
    }
  }, []);

  // Update notification settings
  const updateNotifications = useCallback(async (notifications: Partial<UserSettings['notifications']>): Promise<boolean> => {
    if (!state.settings) return false;
    
    return updateSettings({
      ...state.settings,
      notifications: { ...state.settings.notifications, ...notifications }
    });
  }, [state.settings, updateSettings]);

  // Update preferences
  const updatePreferences = useCallback(async (preferences: Partial<UserSettings['preferences']>): Promise<boolean> => {
    if (!state.settings) return false;
    
    return updateSettings({
      ...state.settings,
      preferences: { ...state.settings.preferences, ...preferences }
    });
  }, [state.settings, updateSettings]);

  // Update privacy settings
  const updatePrivacy = useCallback(async (privacy: Partial<UserSettings['privacy']>): Promise<boolean> => {
    if (!state.settings) return false;
    
    return updateSettings({
      ...state.settings,
      privacy: { ...state.settings.privacy, ...privacy }
    });
  }, [state.settings, updateSettings]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      
      await apiService.post('/auth/change-password', { currentPassword, newPassword });
      
      setState(prev => ({
        ...prev,
        saving: false,
        error: null,
      }));
      
      return true;
    } catch (error: any) {
      console.error('Error changing password:', error);
      setState(prev => ({
        ...prev,
        saving: false,
        error: error.message || 'Failed to change password',
      }));
      return false;
    }
  }, []);

  // Export user data
  const exportData = useCallback(async (): Promise<boolean> => {
    try {
      await apiService.post('/users/export-data', {});
      return true;
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to export data',
      }));
      return false;
    }
  }, []);

  // Get activity logs
  const getActivityLogs = useCallback(async () => {
    try {
      return await apiService.get('/audit-logs');
    } catch (error: any) {
      console.error('Error getting activity logs:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to get activity logs',
      }));
      return [];
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings: state.settings,
    loading: state.loading,
    error: state.error,
    saving: state.saving,
    loadSettings,
    updateSettings,
    updateNotifications,
    updatePreferences,
    updatePrivacy,
    changePassword,
    exportData,
    getActivityLogs,
    clearError,
  };
};