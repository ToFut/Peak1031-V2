import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import Layout from '../components/Layout';
import {
  User, Settings, Bell, Shield, Activity, ChevronRight,
  Edit3, Save, X, Eye, EyeOff, Phone, Mail, MapPin,
  Building, Calendar, TrendingUp, MessageSquare, FileText,
  Clock, CheckCircle, AlertCircle, Info
} from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  phone_mobile?: string;
  phone_work?: string;
  phone_home?: string;
  role: string;
  company?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  is_active: boolean;
  email_verified: boolean;
  two_fa_enabled: boolean;
  last_login?: string;
  created_at: string;
  exchange_participants: any[];
}

interface UserStats {
  active_exchanges: number;
  pending_tasks: number;
  messages_sent_30d: number;
  documents_uploaded_30d: number;
}

interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    milestone_alerts: boolean;
    task_reminders: boolean;
    document_notifications: boolean;
    chat_notifications: boolean;
  };
  dashboard: {
    default_view: string;
    items_per_page: number;
    show_completed_tasks: boolean;
    compact_view: boolean;
  };
  privacy: {
    profile_visibility: string;
    activity_tracking: boolean;
    analytics_participation: boolean;
  };
}

const AccountManagementPage: React.FC = () => {
  const { user: authUser } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  
  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileData, preferencesData, notificationsData, activitiesData] = await Promise.all([
        apiService.get('/account/profile'),
        apiService.get('/account/preferences'),
        apiService.get('/account/notifications?limit=20'),
        apiService.get('/account/activity?limit=20')
      ]);

      setProfile(profileData.profile);
      setStats(profileData.stats);
      setPreferences(preferencesData);
      setNotifications(notificationsData);
      setActivities(activitiesData);
      
      // Initialize edit form
      setEditForm(profileData.profile);

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!editForm || !profile) return;

    try {
      setSaving(true);
      
      const updatedProfile = await apiService.updateUser(profile.id, editForm as any);
      setProfile(updatedProfile as any);
      setIsEditingProfile(false);
      
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      
      await apiService.updateAccountPreferences(preferences);
      
    } catch (err: any) {
      alert(`Failed to save preferences: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Account</h3>
          <p className="text-gray-500 mb-4">{error || 'Account data not found'}</p>
          <button
            onClick={loadUserData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
          <p className="text-gray-600 mt-1">Manage your profile, preferences, and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'preferences', label: 'Preferences', icon: Settings },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                );
              })}
            </nav>

            {/* Quick Stats Card */}
            {stats && (
              <div className="mt-6 bg-white rounded-lg shadow border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Exchanges</span>
                    <span className="font-medium text-gray-900">{stats.active_exchanges}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending Tasks</span>
                    <span className="font-medium text-gray-900">{stats.pending_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Messages (30d)</span>
                    <span className="font-medium text-gray-900">{stats.messages_sent_30d}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Documents (30d)</span>
                    <span className="font-medium text-gray-900">{stats.documents_uploaded_30d}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow border">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                    {!isEditingProfile ? (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setIsEditingProfile(false);
                            setEditForm(profile);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.first_name || ''}
                            onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.first_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.last_name || ''}
                            onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.last_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        {isEditingProfile ? (
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-900">{profile.email}</p>
                            {profile.email_verified ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        {isEditingProfile ? (
                          <input
                            type="tel"
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.company || ''}
                            onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-900">{profile.company || 'Not provided'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Contact & Address</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone</label>
                        {isEditingProfile ? (
                          <input
                            type="tel"
                            value={editForm.phone_mobile || ''}
                            onChange={(e) => setEditForm({...editForm, phone_mobile: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.phone_mobile || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                        {isEditingProfile ? (
                          <input
                            type="tel"
                            value={editForm.phone_work || ''}
                            onChange={(e) => setEditForm({...editForm, phone_work: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.phone_work || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.address_street || ''}
                            onChange={(e) => setEditForm({...editForm, address_street: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-900">{profile.address_street || 'Not provided'}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={editForm.address_city || ''}
                              onChange={(e) => setEditForm({...editForm, address_city: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-gray-900">{profile.address_city || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={editForm.address_state || ''}
                              onChange={(e) => setEditForm({...editForm, address_state: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-gray-900">{profile.address_state || 'N/A'}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.address_zip_code || ''}
                            onChange={(e) => setEditForm({...editForm, address_zip_code: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{profile.address_zip_code || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <p className="text-gray-900 capitalize">{profile.role}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Participation */}
                  {profile.exchange_participants && profile.exchange_participants.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Exchange Participation</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.exchange_participants.slice(0, 4).map((participation: any) => (
                          <div key={participation.exchange_id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{participation.exchanges?.name || 'Exchange'}</h4>
                                <p className="text-sm text-gray-600">Role: {participation.role}</p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                participation.exchanges?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                participation.exchanges?.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {participation.exchanges?.status || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && preferences && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
                    <button
                      onClick={handleSavePreferences}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Notification Preferences */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
                      <div className="space-y-4">
                        {Object.entries(preferences.notifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700 capitalize">
                                {key.replace(/_/g, ' ')}
                              </label>
                              <p className="text-xs text-gray-500">
                                {key === 'email' && 'Receive notifications via email'}
                                {key === 'sms' && 'Receive SMS notifications on your phone'}
                                {key === 'push' && 'Receive push notifications in browser'}
                                {key === 'milestone_alerts' && 'Alerts for important exchange milestones'}
                                {key === 'task_reminders' && 'Reminders for upcoming tasks and deadlines'}
                                {key === 'document_notifications' && 'Notifications when documents are uploaded or reviewed'}
                                {key === 'chat_notifications' && 'Notifications for new messages in exchange chats'}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value as boolean}
                                onChange={(e) => setPreferences({
                                  ...preferences,
                                  notifications: {
                                    ...preferences.notifications,
                                    [key]: e.target.checked
                                  }
                                })}
                                className="sr-only"
                              />
                              <div className={`w-11 h-6 rounded-full transition-colors ${
                                value ? 'bg-blue-600' : 'bg-gray-200'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform mt-1 ${
                                  value ? 'translate-x-6' : 'translate-x-1'
                                }`}></div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dashboard Preferences */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Default View</label>
                          <select
                            value={preferences.dashboard.default_view}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              dashboard: {
                                ...preferences.dashboard,
                                default_view: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="overview">Overview</option>
                            <option value="exchanges">Exchanges</option>
                            <option value="tasks">Tasks</option>
                            <option value="documents">Documents</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                          <select
                            value={preferences.dashboard.items_per_page}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              dashboard: {
                                ...preferences.dashboard,
                                items_per_page: parseInt(e.target.value)
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Show Completed Tasks</label>
                            <p className="text-xs text-gray-500">Display completed tasks in task lists</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.dashboard.show_completed_tasks}
                              onChange={(e) => setPreferences({
                                ...preferences,
                                dashboard: {
                                  ...preferences.dashboard,
                                  show_completed_tasks: e.target.checked
                                }
                              })}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              preferences.dashboard.show_completed_tasks ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform mt-1 ${
                                preferences.dashboard.show_completed_tasks ? 'translate-x-6' : 'translate-x-1'
                              }`}></div>
                            </div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Compact View</label>
                            <p className="text-xs text-gray-500">Use compact layout for more information density</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.dashboard.compact_view}
                              onChange={(e) => setPreferences({
                                ...preferences,
                                dashboard: {
                                  ...preferences.dashboard,
                                  compact_view: e.target.checked
                                }
                              })}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              preferences.dashboard.compact_view ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform mt-1 ${
                                preferences.dashboard.compact_view ? 'translate-x-6' : 'translate-x-1'
                              }`}></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Privacy Preferences */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profile Visibility</label>
                          <select
                            value={preferences.privacy.profile_visibility}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              privacy: {
                                ...preferences.privacy,
                                profile_visibility: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="public">Public</option>
                            <option value="team">Team Only</option>
                            <option value="private">Private</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Activity Tracking</label>
                            <p className="text-xs text-gray-500">Allow tracking of your activity for analytics</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.privacy.activity_tracking}
                              onChange={(e) => setPreferences({
                                ...preferences,
                                privacy: {
                                  ...preferences.privacy,
                                  activity_tracking: e.target.checked
                                }
                              })}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              preferences.privacy.activity_tracking ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform mt-1 ${
                                preferences.privacy.activity_tracking ? 'translate-x-6' : 'translate-x-1'
                              }`}></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Notifications</h2>
                  
                  <div className="space-y-4">
                    {notifications.length > 0 ? (
                      notifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{notification.content}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{new Date(notification.created_at).toLocaleString()}</span>
                                <span className="capitalize">{notification.type}</span>
                                <span className={`px-2 py-1 rounded-full ${
                                  notification.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                  notification.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {notification.priority}
                                </span>
                              </div>
                            </div>
                            {!notification.is_read && (
                              <button
                                onClick={() => markNotificationRead(notification.id)}
                                className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
                        <p className="text-gray-500">You're all caught up! No new notifications.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          profile.two_fa_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.two_fa_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        {profile.two_fa_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Email Verification</h3>
                          <p className="text-sm text-gray-600">Verify your email address for security</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          profile.email_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {profile.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      {!profile.email_verified && (
                        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                          Send Verification Email
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Password</h3>
                      <p className="text-sm text-gray-600 mb-4">Update your password regularly for security</p>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Change Password
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h3>
                      <p className="text-sm text-gray-600">
                        Last login: {profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
                  
                  <div className="space-y-4">
                    {activities.length > 0 ? (
                      activities.map((activity: any) => (
                        <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900">{activity.displayText}</p>
                              {activity.exchangeName && (
                                <p className="text-sm text-gray-600">Exchange: {activity.exchangeName}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity</h3>
                        <p className="text-gray-500">No recent activity to display.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountManagementPage;