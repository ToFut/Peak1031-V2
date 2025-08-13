import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface NotificationPreferences {
  category: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  {
    value: 'system',
    label: 'System Notifications',
    description: 'Updates about the platform, maintenance, and important announcements',
    icon: ComputerDesktopIcon,
    color: 'blue'
  },
  {
    value: 'task',
    label: 'Task Notifications',
    description: 'Task assignments, due dates, and completion updates',
    icon: '✓',
    color: 'green'
  },
  {
    value: 'document',
    label: 'Document Notifications',
    description: 'New documents, document updates, and sharing notifications',
    icon: '📄',
    color: 'purple'
  },
  {
    value: 'exchange',
    label: 'Exchange Notifications',
    description: 'Exchange status changes, milestones, and important updates',
    icon: '🏢',
    color: 'indigo'
  },
  {
    value: 'message',
    label: 'Message Notifications',
    description: 'New messages, mentions, and chat activity',
    icon: '💬',
    color: 'yellow'
  },
  {
    value: 'participant',
    label: 'Participant Notifications',
    description: 'New participants, role changes, and participant activity',
    icon: '👥',
    color: 'pink'
  },
  {
    value: 'deadline',
    label: 'Deadline Notifications',
    description: 'Approaching deadlines, overdue items, and time-sensitive alerts',
    icon: '⏰',
    color: 'red'
  },
  {
    value: 'security',
    label: 'Security Notifications',
    description: 'Login alerts, security updates, and account activity',
    icon: '🔒',
    color: 'red'
  }
];

const FREQUENCIES = [
  { value: 'immediate', label: 'Immediately', description: 'Receive notifications right away' },
  { value: 'hourly', label: 'Hourly Digest', description: 'Receive a summary every hour' },
  { value: 'daily', label: 'Daily Digest', description: 'Receive a summary once per day' },
  { value: 'weekly', label: 'Weekly Digest', description: 'Receive a summary once per week' }
];

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose
}) => {
  const [preferences, setPreferences] = useState<Record<string, NotificationPreferences>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState({
    browserPermission: 'default' as NotificationPermission,
    soundEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Fetch preferences
  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications-enhanced/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const prefsMap: Record<string, NotificationPreferences> = {};
        
        data.preferences.forEach((pref: NotificationPreferences) => {
          prefsMap[pref.category] = pref;
        });

        // Fill in missing categories with defaults
        CATEGORIES.forEach(category => {
          if (!prefsMap[category.value]) {
            prefsMap[category.value] = {
              category: category.value,
              emailEnabled: true,
              smsEnabled: false,
              inAppEnabled: true,
              browserEnabled: true,
              soundEnabled: true,
              desktopEnabled: false,
              frequency: 'immediate',
              timezone: globalSettings.timezone
            };
          }
        });

        setPreferences(prefsMap);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update preference
  const updatePreference = async (category: string, updates: Partial<NotificationPreferences>) => {
    setSaving(category);
    try {
      const response = await fetch(`/api/notifications-enhanced/preferences/${category}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setPreferences(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            ...updates
          }
        }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setSaving(null);
    }
  };

  // Request browser notification permission
  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setGlobalSettings(prev => ({ ...prev, browserPermission: permission }));
      
      if (permission === 'granted') {
        // Enable browser notifications for all categories
        Object.keys(preferences).forEach(category => {
          updatePreference(category, { browserEnabled: true });
        });
      }
    }
  };

  // Test notification
  const testNotification = (category: string) => {
    const categoryInfo = CATEGORIES.find(c => c.value === category);
    if (categoryInfo && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Test: ${categoryInfo.label}`, {
        body: `This is a test notification for ${categoryInfo.label.toLowerCase()}`,
        icon: '/favicon.ico',
        tag: `test-${category}`
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
      
      // Check browser permission
      if ('Notification' in window) {
        setGlobalSettings(prev => ({ 
          ...prev, 
          browserPermission: Notification.permission 
        }));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Settings Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Customize how and when you receive notifications for different types of activities.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Global Settings */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Global Settings</h3>
                
                {/* Browser Permission */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Browser Notifications</h4>
                    <p className="text-sm text-gray-600">Allow browser notifications when the app is not active</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      globalSettings.browserPermission === 'granted' 
                        ? 'bg-green-100 text-green-800' 
                        : globalSettings.browserPermission === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {globalSettings.browserPermission === 'granted' ? 'Enabled' : 
                       globalSettings.browserPermission === 'denied' ? 'Blocked' : 'Not Set'}
                    </span>
                    {globalSettings.browserPermission !== 'granted' && (
                      <button
                        onClick={requestBrowserPermission}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>

                {/* Sound Settings */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sound Notifications</h4>
                    <p className="text-sm text-gray-600">Play sound when receiving notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalSettings.soundEnabled}
                      onChange={(e) => setGlobalSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Quiet Hours</h4>
                      <p className="text-sm text-gray-600">Disable notifications during specified hours</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSettings.quietHoursEnabled}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, quietHoursEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {globalSettings.quietHoursEnabled && (
                    <div className="flex items-center space-x-3 ml-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="time"
                          value={globalSettings.quietHoursStart}
                          onChange={(e) => setGlobalSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="time"
                          value={globalSettings.quietHoursEnd}
                          onChange={(e) => setGlobalSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Preferences */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Categories</h3>
                <div className="space-y-6">
                  {CATEGORIES.map((category) => {
                    const pref = preferences[category.value];
                    if (!pref) return null;

                    return (
                      <div key={category.value} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-lg bg-${category.color}-100 flex items-center justify-center text-lg`}>
                              {typeof category.icon === 'string' ? category.icon : '🔔'}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{category.label}</h4>
                              <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                            </div>
                          </div>
                          
                          {globalSettings.browserPermission === 'granted' && (
                            <button
                              onClick={() => testNotification(category.value)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded hover:bg-blue-50"
                            >
                              Test
                            </button>
                          )}
                        </div>

                        {/* Channel Toggles */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.inAppEnabled}
                              onChange={(e) => updatePreference(category.value, { inAppEnabled: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <BellIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">In-App</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.emailEnabled}
                              onChange={(e) => updatePreference(category.value, { emailEnabled: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Email</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.browserEnabled && globalSettings.browserPermission === 'granted'}
                              onChange={(e) => updatePreference(category.value, { browserEnabled: e.target.checked })}
                              disabled={globalSettings.browserPermission !== 'granted'}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <ComputerDesktopIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Browser</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.smsEnabled}
                              onChange={(e) => updatePreference(category.value, { smsEnabled: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <DevicePhoneMobileIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">SMS</span>
                          </label>
                        </div>

                        {/* Frequency Setting */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-2">Delivery Frequency</label>
                          <select
                            value={pref.frequency}
                            onChange={(e) => updatePreference(category.value, { frequency: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {FREQUENCIES.map(freq => (
                              <option key={freq.value} value={freq.value}>
                                {freq.label} - {freq.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Loading indicator */}
                        {saving === category.value && (
                          <div className="mt-2 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-xs text-gray-600">Saving...</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};