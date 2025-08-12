import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  EnvelopeIcon, 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface NotificationSettingsProps {
  onClose?: () => void;
}

interface NotificationCategory {
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    browser: boolean;
  };
  events: Record<string, boolean>;
}

interface NotificationSettings {
  global: {
    enabled: boolean;
    sound: boolean;
    browserNotifications: boolean;
  };
  categories: {
    tasks: NotificationCategory;
    messages: NotificationCategory;
    documents: NotificationCategory;
    exchanges: NotificationCategory;
    invitations: NotificationCategory;
    security: NotificationCategory;
    system: NotificationCategory;
  };
  channels: {
    email: {
      enabled: boolean;
      frequency: string;
      quietHours: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    sms: {
      enabled: boolean;
      frequency: string;
      quietHours: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    inApp: {
      enabled: boolean;
      sound: boolean;
      vibration: boolean;
      autoClose: number;
    };
    browser: {
      enabled: boolean;
      requireInteraction: boolean;
      autoClose: number;
    };
  };
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categoryConfig = {
    tasks: {
      name: 'Tasks',
      description: 'Task assignments, completions, and updates',
      icon: '📋',
      events: {
        taskAssigned: 'Task Assigned',
        taskCompleted: 'Task Completed',
        taskOverdue: 'Task Overdue',
        taskUpdated: 'Task Updated',
        taskDeleted: 'Task Deleted'
      }
    },
    messages: {
      name: 'Messages',
      description: 'New messages and mentions in exchanges',
      icon: '💬',
      events: {
        newMessage: 'New Message',
        messageMention: 'Message Mention',
        messageReaction: 'Message Reaction'
      }
    },
    documents: {
      name: 'Documents',
      description: 'Document uploads, approvals, and downloads',
      icon: '📄',
      events: {
        documentUploaded: 'Document Uploaded',
        documentDownloaded: 'Document Downloaded',
        documentApproved: 'Document Approved',
        documentRejected: 'Document Rejected'
      }
    },
    exchanges: {
      name: 'Exchanges',
      description: 'Exchange updates and participant changes',
      icon: '🔄',
      events: {
        exchangeCreated: 'Exchange Created',
        exchangeUpdated: 'Exchange Updated',
        exchangeStatusChanged: 'Status Changed',
        participantAdded: 'Participant Added',
        participantRemoved: 'Participant Removed'
      }
    },
    invitations: {
      name: 'Invitations',
      description: 'Exchange and platform invitations',
      icon: '📧',
      events: {
        invitationReceived: 'Invitation Received',
        invitationAccepted: 'Invitation Accepted',
        invitationDeclined: 'Invitation Declined'
      }
    },
    security: {
      name: 'Security',
      description: 'Login attempts and security events',
      icon: '🔒',
      events: {
        loginAttempt: 'Login Attempt',
        passwordChanged: 'Password Changed',
        twoFactorEnabled: '2FA Enabled',
        suspiciousActivity: 'Suspicious Activity'
      }
    },
    system: {
      name: 'System',
      description: 'Platform updates and maintenance',
      icon: '⚙️',
      events: {
        maintenanceScheduled: 'Maintenance Scheduled',
        systemUpdate: 'System Update',
        featureAnnouncement: 'Feature Announcement'
      }
    }
  };

  const channelConfig = {
    email: {
      name: 'Email',
      description: 'Receive notifications via email',
      icon: EnvelopeIcon,
      color: 'text-blue-600'
    },
    sms: {
      name: 'SMS',
      description: 'Receive notifications via text message',
      icon: DevicePhoneMobileIcon,
      color: 'text-green-600'
    },
    inApp: {
      name: 'In-App',
      description: 'Show notifications within the application',
      icon: ComputerDesktopIcon,
      color: 'text-purple-600'
    },
    browser: {
      name: 'Browser',
      description: 'Show browser push notifications',
      icon: BellIcon,
      color: 'text-orange-600'
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/settings/notifications');
      setSettings(response.data);
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await apiService.put('/settings/notifications', settings);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const updateGlobalSetting = (key: keyof NotificationSettings['global'], value: boolean) => {
    if (!settings) return;
    
    setSettings(prev => prev ? {
      ...prev,
      global: {
        ...prev.global,
        [key]: value
      }
    } : null);
  };

  const updateCategorySetting = (category: string, key: string, value: boolean | NotificationCategory['channels']) => {
    if (!settings) return;
    
    setSettings(prev => prev ? {
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category as keyof typeof prev.categories],
          [key]: value
        }
      }
    } : null);
  };

  const updateChannelSetting = (channel: string, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => prev ? {
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: {
          ...prev.channels[channel as keyof typeof prev.channels],
          [key]: value
        }
      }
    } : null);
  };

  const updateEventSetting = (category: string, event: string, value: boolean) => {
    if (!settings) return;
    
    setSettings(prev => prev ? {
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category as keyof typeof prev.categories],
          events: {
            ...prev.categories[category as keyof typeof prev.categories].events,
            [event]: value
          }
        }
      }
    } : null);
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all notification settings to defaults?')) {
      loadSettings();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading notification settings...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Settings</h3>
            <p className="text-gray-600 mb-4">{error || 'Failed to load notification settings'}</p>
            <button
              onClick={loadSettings}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cog6ToothIcon className="h-6 w-6 text-gray-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">Settings saved successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <XMarkIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Global Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Global Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable All Notifications</label>
                  <p className="text-sm text-gray-500">Master switch for all notifications</p>
                </div>
                <button
                  onClick={() => updateGlobalSetting('enabled', !settings.global.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.global.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.global.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Sound Notifications</label>
                  <p className="text-sm text-gray-500">Play sound for in-app notifications</p>
                </div>
                <button
                  onClick={() => updateGlobalSetting('sound', !settings.global.sound)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.global.sound ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.global.sound ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Browser Notifications</label>
                  <p className="text-sm text-gray-500">Show browser push notifications</p>
                </div>
                <button
                  onClick={() => updateGlobalSetting('browserNotifications', !settings.global.browserNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.global.browserNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.global.browserNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Channel Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(channelConfig).map(([key, config]) => {
                const Icon = config.icon;
                const channelSettings = settings.channels[key as keyof typeof settings.channels];
                
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Icon className={`h-5 w-5 ${config.color} mr-2`} />
                        <span className="font-medium text-gray-900">{config.name}</span>
                      </div>
                      <button
                        onClick={() => updateChannelSetting(key, 'enabled', !channelSettings.enabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          channelSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            channelSettings.enabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{config.description}</p>
                    
                                         {/* Channel-specific settings */}
                     {key === 'email' && 'quietHours' in channelSettings && (
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <span className="text-xs text-gray-600">Quiet Hours</span>
                           <button
                             onClick={() => updateChannelSetting(key, 'quietHours', {
                               ...(channelSettings as any).quietHours,
                               enabled: !(channelSettings as any).quietHours.enabled
                             })}
                             className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                               (channelSettings as any).quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
                             }`}
                           >
                             <span
                               className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                                 (channelSettings as any).quietHours.enabled ? 'translate-x-4' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {(channelSettings as any).quietHours.enabled && (
                           <div className="flex space-x-2 text-xs">
                             <input
                               type="time"
                               value={(channelSettings as any).quietHours.start}
                               onChange={(e) => updateChannelSetting(key, 'quietHours', {
                                 ...(channelSettings as any).quietHours,
                                 start: e.target.value
                               })}
                               className="border border-gray-300 rounded px-2 py-1"
                             />
                             <span className="text-gray-500">to</span>
                             <input
                               type="time"
                               value={(channelSettings as any).quietHours.end}
                               onChange={(e) => updateChannelSetting(key, 'quietHours', {
                                 ...(channelSettings as any).quietHours,
                                 end: e.target.value
                               })}
                               className="border border-gray-300 rounded px-2 py-1"
                             />
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Categories</h3>
            <div className="space-y-6">
              {Object.entries(categoryConfig).map(([categoryKey, category]) => {
                const categorySettings = settings.categories[categoryKey as keyof typeof settings.categories];
                
                return (
                  <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{category.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateCategorySetting(categoryKey, 'enabled', !categorySettings.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          categorySettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            categorySettings.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {categorySettings.enabled && (
                      <div className="space-y-4">
                        {/* Channel preferences */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Channels</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(channelConfig).map(([channelKey, channelConfig]) => (
                              <div key={channelKey} className="flex items-center">
                                                                 <button
                                   onClick={() => {
                                     const newChannels = {
                                       ...categorySettings.channels,
                                       [channelKey]: !categorySettings.channels[channelKey as keyof typeof categorySettings.channels]
                                     };
                                     updateCategorySetting(categoryKey, 'channels', newChannels);
                                   }}
                                   className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                     categorySettings.channels[channelKey as keyof typeof categorySettings.channels] ? 'bg-blue-600' : 'bg-gray-200'
                                   }`}
                                 >
                                   <span
                                     className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                                       categorySettings.channels[channelKey as keyof typeof categorySettings.channels] ? 'translate-x-4' : 'translate-x-1'
                                     }`}
                                   />
                                 </button>
                                <span className="text-xs text-gray-600 ml-2">{channelConfig.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Event preferences */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Events</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(category.events).map(([eventKey, eventName]) => (
                              <div key={eventKey} className="flex items-center">
                                <button
                                  onClick={() => updateEventSetting(categoryKey, eventKey, !categorySettings.events[eventKey])}
                                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                    categorySettings.events[eventKey] ? 'bg-blue-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                                      categorySettings.events[eventKey] ? 'translate-x-4' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="text-xs text-gray-600 ml-2">{eventName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Reset to Defaults
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
