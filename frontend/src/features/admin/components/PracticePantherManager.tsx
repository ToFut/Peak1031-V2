/**
 * PracticePanther Integration Manager
 * Allows administrators to configure and manage PracticePanther integration
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  LinkIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';
import PPTokenManager from './PPTokenManager';

interface SyncStatus {
  lastSync: string | null;
  isRunning: boolean;
  error?: string;
  stats: {
    total: number;
    success: number;
    failed: number;
  };
}

interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  details: string;
  entityType?: string;
  entityId?: string;
}

interface AuthStatus {
  authorized: boolean;
  lastSync?: string;
}

const PracticePantherManager: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'logs' | 'settings'>('overview');
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [authData, syncData, logsData] = await Promise.all([
        apiService.getP3AuthStatus(),
        apiService.getP3SyncStatus(),
        apiService.getP3SyncLogs(20)
      ]);
      
      setAuthStatus(authData);
      setSyncStatus(syncData);
      setSyncLogs(logsData.logs);
    } catch (error) {
      console.error('Failed to load PracticePanther data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsPerformingAction(true);
      const response = await apiService.initiateP3OAuth();
      // Redirect to OAuth URL
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect PracticePanther integration? This will stop all syncing.')) {
      return;
    }

    try {
      setIsPerformingAction(true);
      await apiService.disconnectP3Integration();
      await loadInitialData();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsPerformingAction(true);
      await apiService.syncFromPracticePanther();
      // Reload data after a short delay
      setTimeout(() => {
        loadInitialData();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <LinkIcon className="h-8 w-8 text-blue-600 mr-3" />
              PracticePanther Integration
            </h1>
            <p className="text-gray-600 mt-2">Manage your PracticePanther integration and sync settings</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {authStatus?.authorized ? (
              <>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Connected
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isPerformingAction}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center text-sm text-red-600">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Not Connected
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isPerformingAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Connect
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Cog6ToothIcon },
              { key: 'sync', label: 'Sync Management', icon: ArrowPathIcon },
              { key: 'logs', label: 'Sync Logs', icon: DocumentTextIcon },
              { key: 'settings', label: 'Settings', icon: Cog6ToothIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* PP Token Manager - Primary Component */}
          <PPTokenManager />
          
          {/* Connection Status Card */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`inline-flex p-3 rounded-full ${
                  authStatus?.authorized ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {authStatus?.authorized ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <XMarkIcon className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {authStatus?.authorized ? 'Connected' : 'Not Connected'}
                </p>
              </div>

              <div className="text-center">
                <div className={`inline-flex p-3 rounded-full ${
                  syncStatus?.isRunning ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {syncStatus?.isRunning ? (
                    <ArrowPathIcon className="h-6 w-6 text-yellow-600 animate-spin" />
                  ) : (
                    <PauseIcon className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {syncStatus?.isRunning ? 'Syncing' : 'Idle'}
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex p-3 rounded-full bg-blue-100">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">Last Sync</p>
                <p className="text-xs text-gray-500">
                  {syncStatus?.lastSync ? formatTimestamp(syncStatus.lastSync) : 'Never'}
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex p-3 rounded-full bg-purple-100">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">Total Records</p>
                <p className="text-xs text-gray-500">{syncStatus?.stats.total || 0}</p>
              </div>
            </div>
          </div>

          {/* Sync Statistics */}
          {syncStatus && syncStatus.stats.total > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Statistics</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{syncStatus.stats.success}</p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{syncStatus.stats.failed}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{syncStatus.stats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {syncStatus?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Sync Error</h4>
                  <p className="text-sm text-red-700 mt-1">{syncStatus.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Management Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Manual Sync Operations</h3>
              {authStatus?.authorized && (
                <button
                  onClick={handleSync}
                  disabled={isPerformingAction || syncStatus?.isRunning}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPerformingAction ? (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4 mr-2" />
                  )}
                  Start Full Sync
                </button>
              )}
            </div>

            {!authStatus?.authorized ? (
              <div className="text-center py-8">
                <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-4 text-lg font-medium text-gray-900">Not Connected</h4>
                <p className="text-gray-600">Connect to PracticePanther first to enable sync operations</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Exchanges Sync</h4>
                  <p className="text-sm text-gray-600 mt-1">Sync exchange data from PracticePanther matters</p>
                  <button 
                    className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    disabled={syncStatus?.isRunning}
                  >
                    Sync Exchanges
                  </button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Contacts Sync</h4>
                  <p className="text-sm text-gray-600 mt-1">Sync contact information from PracticePanther</p>
                  <button 
                    className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    disabled={syncStatus?.isRunning}
                  >
                    Sync Contacts
                  </button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Tasks Sync</h4>
                  <p className="text-sm text-gray-600 mt-1">Sync tasks and deadlines</p>
                  <button 
                    className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    disabled={syncStatus?.isRunning}
                  >
                    Sync Tasks
                  </button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Full Sync</h4>
                  <p className="text-sm text-gray-600 mt-1">Comprehensive sync of all data types</p>
                  <button 
                    onClick={handleSync}
                    disabled={isPerformingAction || syncStatus?.isRunning}
                    className="mt-3 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    {syncStatus?.isRunning ? 'Syncing...' : 'Full Sync'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Sync Logs</h3>
            <button
              onClick={loadInitialData}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>

          {syncLogs.length > 0 ? (
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncLogs.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow border">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No logs available</h3>
              <p className="text-gray-600">Sync logs will appear here once syncing begins</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Integration Settings</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Frequency
              </label>
              <select className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option>Every hour</option>
                <option>Every 4 hours</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Manual only</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable automatic syncing
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-700">
                  Send notifications for sync errors
                </span>
              </label>
            </div>

            <div className="border-t pt-6">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticePantherManager;