import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { AuditLog } from '../../../types';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings, loading, error, saving } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const tabs = [
    { key: 'profile', name: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'notifications', name: 'Notifications', icon: 'M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 00-6 6v3.75h-.75a1.5 1.5 0 000 3h4.5a1.5 1.5 0 001.5-1.5v-4.5a1.5 1.5 0 00-1.5-1.5h-.75V9.75a3 3 0 016 0v3.75h-.75a1.5 1.5 0 00-1.5 1.5v4.5a1.5 1.5 0 001.5 1.5h4.5a1.5 1.5 0 000-3h-.75V9.75a6 6 0 00-6-6z' },
    { key: 'security', name: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'activity', name: 'Activity', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleInputChange = (field: string, value: string) => {
    // Handle input changes
  };

  const loadAuditLogs = async () => {
    // Load audit logs
  };

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

      {saving && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">Settings saved successfully!</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.name}
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Settings Content</h3>
            <p className="text-gray-600">Settings content will go here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;