import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { AdminGPT, PracticePantherManager } from '../../admin/components';
import { AuditLogFeed } from '../../admin/components/AuditLogFeed';
import TemplateDocumentManager from '../../documents/pages/TemplateDocumentManager';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSettings();
      setSettings(response || {});
    } catch (err: any) {
      console.error('Error loading settings:', err);
      
      // Provide default settings if API fails
      if (err.message?.includes('not found')) {
        
        setSettings({
          profile: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            role: user?.role || ''
          },
          preferences: {
            notifications: { email: true, sms: false },
            dashboard: { theme: 'light', language: 'en' }
          }
        });
      } else {
        setError(err.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await apiService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setSuccess('Settings saved successfully');
      
      // Update user context if profile was changed
      if (activeTab === 'profile' && updateUser) {
        await updateUser(updatedSettings);
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const loadActivityLogs = async () => {
    try {
      setLoadingActivity(true);
      // Try enterprise endpoint first, fallback to regular audit logs
      const response = await apiService.get('/account/activity-logs').catch(() => 
        apiService.get('/audit-logs')
      );
      const logs = response?.logs || response || [];
      setActivityLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
      setActivityLogs([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'activity' && (Array.isArray(activityLogs) ? activityLogs : []).length === 0) {
      loadActivityLogs();
    }
  };

  // Define tabs with role-based visibility
  const getTabs = () => {
    const baseTabs = [
      { key: 'profile', name: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { key: 'notifications', name: 'Notifications', icon: 'M15 17h5l-5 5v-5z', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { key: 'security', name: 'Security', icon: 'M12 15v2m0 0v2m0-2h2m-2 0H10m2-12V3m0 0V1m0 2h2m-2 0H10m7 4l1.414-1.414M21 10h2m-2 0h-2m2 0V8m0 2v2', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { key: 'preferences', name: 'Preferences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { key: 'activity', name: 'Activity Log', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] }
    ];

    // Admin-only tabs
    const adminTabs = [
      { key: 'templates', name: 'Templates', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', roles: ['admin', 'coordinator'] },
      { key: 'pp_management', name: 'PP Management', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-6.75 4.5h6.75m-6.75 4.5h6.75m-6.75 4.5h6.75', roles: ['admin'] },
      { key: 'audit_log', name: 'Audit Log', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z', roles: ['admin'] }
    ];

    return [...baseTabs, ...adminTabs].filter(tab => tab.roles.includes(user?.role || ''));
  };

  const tabs = getTabs();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-gray-200 rounded-lg h-96"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-1/4 bg-gray-50 rounded-l-lg">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={settings.firstName || user?.first_name || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={settings.lastName || user?.last_name || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={settings.email || user?.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={settings.phone || user?.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications !== false}
                        onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                        <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.pushNotifications !== false}
                        onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Task Reminders</h4>
                        <p className="text-sm text-gray-500">Get reminded about upcoming tasks</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.taskReminders !== false}
                        onChange={(e) => handleInputChange('taskReminders', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Application Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Theme</label>
                      <select
                        value={settings.theme || 'light'}
                        onChange={(e) => handleInputChange('theme', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Language</label>
                      <select
                        value={settings.language || 'en'}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timezone</label>
                      <select
                        value={settings.timezone || 'UTC'}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    
                    {/* Menu Experience Settings */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Menu Experience</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delayed Tooltip</label>
                          <div className="mt-1 flex items-center">
                            <input
                              type="checkbox"
                              checked={settings.menuExperience?.delayedTooltipEnabled !== false}
                              onChange={(e) => handleInputChange('menuExperience', {
                                ...settings.menuExperience,
                                delayedTooltipEnabled: e.target.checked
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Enable delayed tooltips on sidebar items
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tooltip Delay (seconds)</label>
                          <select
                            value={settings.menuExperience?.tooltipDelay || 4}
                            onChange={(e) => handleInputChange('menuExperience', {
                              ...settings.menuExperience,
                              tooltipDelay: parseInt(e.target.value)
                            })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={1}>1 second</option>
                            <option value={2}>2 seconds</option>
                            <option value={3}>3 seconds</option>
                            <option value={4}>4 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={6}>6 seconds</option>
                          </select>
                          <p className="mt-1 text-sm text-gray-500">
                            How long to wait before showing tooltips on hover
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
                    <button 
                      onClick={loadActivityLogs}
                      disabled={loadingActivity}
                      className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {loadingActivity ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {loadingActivity ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading activity logs...</p>
                    </div>
                  ) : (Array.isArray(activityLogs) ? activityLogs : []).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                      <p className="text-gray-500">Your recent activity will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(activityLogs) ? activityLogs : []).slice(0, 20).map((log: any, index: number) => (
                        <div key={log.id || index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {log.action || log.details || log.description || 'Activity'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  log.severity === 'error' || log.level === 'error' ? 'bg-red-100 text-red-800' :
                                  log.severity === 'warning' || log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {log.severity || log.level || 'info'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {log.description || log.details || log.message || 'No description available'}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                {log.ip && <span>IP: {log.ip}</span>}
                                {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                                {log.userAgent && <span>Browser: {log.userAgent.split(' ')[0]}</span>}
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="text-sm text-gray-900">
                                {new Date(log.createdAt || log.timestamp || log.created_at || Date.now()).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(Array.isArray(activityLogs) ? activityLogs : []).length > 20 && (
                        <div className="text-center pt-4">
                          <p className="text-sm text-gray-500">Showing last 20 activities</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'templates' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Document Templates</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage document templates for exchanges and other business processes.
                  </p>
                  <div className="border border-gray-200 rounded-lg">
                    <TemplateDocumentManager />
                  </div>
                </div>
              )}

              {activeTab === 'pp_management' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">PracticePanther Management</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure and manage PracticePanther integration settings.
                  </p>
                  <div className="border border-gray-200 rounded-lg">
                    <PracticePantherManager />
                  </div>
                </div>
              )}

              {activeTab === 'audit_log' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">System Audit Log</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View system-wide audit logs and activity tracking.
                  </p>
                  <div className="border border-gray-200 rounded-lg">
                    <AuditLogFeed />
                  </div>
                </div>
              )}

              {/* Save Button - Only show for profile, notifications, security, and preferences tabs */}
              {(activeTab === 'profile' || activeTab === 'notifications' || activeTab === 'security' || activeTab === 'preferences') && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveSettings(settings)}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default Settings;