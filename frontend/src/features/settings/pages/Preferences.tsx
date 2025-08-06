import React, { useState, useEffect } from 'react';
import Layout from '@/shared/ui/organisms/Layout';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiService } from '@/shared/services/api';
import {
  BellIcon,
  EyeIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Preferences {
  notifications: {
    email: boolean;
    push: boolean;
    exchange_updates: boolean;
    task_reminders: boolean;
    system_alerts: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'private' | 'contacts_only';
    activity_status: boolean;
    last_seen: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    date_format: string;
  };
  security: {
    two_factor_enabled: boolean;
    session_timeout: number;
    login_notifications: boolean;
  };
}

const Preferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: {
      email: true,
      push: true,
      exchange_updates: true,
      task_reminders: true,
      system_alerts: true
    },
    privacy: {
      profile_visibility: 'contacts_only',
      activity_status: true,
      last_seen: false
    },
    display: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY'
    },
    security: {
      two_factor_enabled: false,
      session_timeout: 30,
      login_notifications: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await apiService.getSettings();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handlePreferenceChange = (section: keyof Preferences, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await apiService.updateSettings(preferences);
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      notifications: {
        email: true,
        push: true,
        exchange_updates: true,
        task_reminders: true,
        system_alerts: true
      },
      privacy: {
        profile_visibility: 'contacts_only',
        activity_status: true,
        last_seen: false
      },
      display: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY'
      },
      security: {
        two_factor_enabled: false,
        session_timeout: 30,
        login_notifications: true
      }
    });
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <CogIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
                  <p className="text-sm text-gray-500">Customize your application experience</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Reset to Default
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckIcon className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <XMarkIcon className="w-5 h-5 text-red-400 mr-2" />
                )}
                <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Preferences Sections */}
          <div className="p-6 space-y-8">
            {/* Notifications */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <BellIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.email}
                      onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Push Notifications</p>
                    <p className="text-xs text-gray-500">Receive real-time notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.push}
                      onChange={(e) => handlePreferenceChange('notifications', 'push', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Exchange Updates</p>
                    <p className="text-xs text-gray-500">Get notified about exchange changes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.exchange_updates}
                      onChange={(e) => handlePreferenceChange('notifications', 'exchange_updates', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <EyeIcon className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">Privacy</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={preferences.privacy.profile_visibility}
                    onChange={(e) => handlePreferenceChange('privacy', 'profile_visibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public - Visible to all users</option>
                    <option value="contacts_only">Contacts Only - Visible to your contacts</option>
                    <option value="private">Private - Only visible to you</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Show Activity Status</p>
                    <p className="text-xs text-gray-500">Let others see when you're online</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.privacy.activity_status}
                      onChange={(e) => handlePreferenceChange('privacy', 'activity_status', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Display */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <GlobeAltIcon className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-medium text-gray-900">Display</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={preferences.display.theme}
                    onChange={(e) => handlePreferenceChange('display', 'theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={preferences.display.language}
                    onChange={(e) => handlePreferenceChange('display', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={preferences.display.timezone}
                    onChange={(e) => handlePreferenceChange('display', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={preferences.display.date_format}
                    onChange={(e) => handlePreferenceChange('display', 'date_format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">Security</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.security.two_factor_enabled}
                      onChange={(e) => handlePreferenceChange('security', 'two_factor_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={preferences.security.session_timeout}
                    onChange={(e) => handlePreferenceChange('security', 'session_timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Login Notifications</p>
                    <p className="text-xs text-gray-500">Get notified of new login attempts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.security.login_notifications}
                      onChange={(e) => handlePreferenceChange('security', 'login_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Preferences; 