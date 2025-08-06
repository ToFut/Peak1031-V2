import React, { useState, useEffect } from 'react';
import { apiService } from '@/shared/services/api';

interface SyncStatus {
  config: {
    enabled: boolean;
    lastSyncTime: string | null;
    syncInterval: number;
    nextSyncTime: string | null;
  };
  lastSync: {
    syncId: string;
    status: string;
    startTime: string;
    endTime: string;
    statistics: {
      totalRecords: number;
      importedRecords: number;
      updatedRecords: number;
      skippedRecords: number;
      errorRecords: number;
    };
  } | null;
}

interface SyncHistory {
  syncId: string;
  syncType: string;
  status: string;
  startTime: string;
  endTime: string;
  statistics: {
    totalRecords: number;
    importedRecords: number;
    updatedRecords: number;
    skippedRecords: number;
    errorRecords: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SyncStatistics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  partialSyncs: number;
  totalRecordsProcessed: number;
  totalRecordsImported: number;
  totalRecordsUpdated: number;
  totalErrors: number;
  averageSyncDuration: number;
}

export const PracticePartnerSync: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [statistics, setStatistics] = useState<SyncStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'config'>('status');

  useEffect(() => {
    loadSyncStatus();
    loadSyncHistory();
    loadStatistics();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await apiService.getPracticePartnerSyncStatus();
      setSyncStatus(response.data);
    } catch (error) {
      setError('Failed to load sync status');
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await apiService.getPracticePartnerSyncHistory();
      setSyncHistory(response.data.syncs);
    } catch (error) {
      setError('Failed to load sync history');
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiService.getPracticePartnerSyncStatistics();
      setStatistics(response.data);
    } catch (error) {
      setError('Failed to load statistics');
    }
  };

  const startSync = async (syncType: 'full' | 'incremental') => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiService.startPracticePartnerSync(syncType);
      setIsRunning(true);
      
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const response = await apiService.getPracticePartnerSyncStatus();
          const status = response.data;
          
          if (status.lastSync && status.lastSync.status !== 'running') {
            setIsRunning(false);
            clearInterval(pollInterval);
            loadSyncStatus();
            loadSyncHistory();
            loadStatistics();
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to start sync');
      setIsRunning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">PracticePartner Integration</h2>
              <p className="text-sm text-gray-600">Sync data from PracticePartner to Peak 1031 Platform</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => startSync('incremental')}
                disabled={isLoading || isRunning}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting...' : 'Start Incremental Sync'}
              </button>
              <button
                onClick={() => startSync('full')}
                disabled={isLoading || isRunning}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Full Sync
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sync Status
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sync History
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Current Status */}
              {syncStatus && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Last Sync</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {syncStatus.lastSync ? formatDateTime(syncStatus.lastSync.startTime) : 'Never'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Next Sync</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {syncStatus.config.nextSyncTime ? formatDateTime(syncStatus.config.nextSyncTime) : 'Not scheduled'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Sync Interval</p>
                      <p className="text-lg font-semibold text-gray-900">{syncStatus.config.syncInterval} minutes</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syncStatus.lastSync?.status || 'unknown')}`}>
                        {syncStatus.lastSync?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync Details */}
              {syncStatus?.lastSync && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Last Sync Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{syncStatus.lastSync.statistics.totalRecords}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Imported</p>
                      <p className="text-2xl font-bold text-green-600">{syncStatus.lastSync.statistics.importedRecords}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Updated</p>
                      <p className="text-2xl font-bold text-blue-600">{syncStatus.lastSync.statistics.updatedRecords}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-600">{syncStatus.lastSync.statistics.skippedRecords}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Errors</p>
                      <p className="text-2xl font-bold text-red-600">{syncStatus.lastSync.statistics.errorRecords}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              {statistics && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Statistics (Last 30 Days)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Total Syncs</p>
                      <p className="text-2xl font-bold text-gray-900">{statistics.totalSyncs}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {statistics.totalSyncs > 0 ? Math.round((statistics.successfulSyncs / statistics.totalSyncs) * 100) : 0}%
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(statistics.averageSyncDuration)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Sync History</h3>
                <button
                  onClick={loadSyncHistory}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Refresh
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncHistory.map((sync) => (
                      <tr key={sync.syncId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {sync.syncId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {sync.syncType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sync.status)}`}>
                            {sync.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(sync.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sync.endTime ? formatDuration(new Date(sync.endTime).getTime() - new Date(sync.startTime).getTime()) : 'Running...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sync.statistics.totalRecords}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sync.createdBy.firstName} {sync.createdBy.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Configuration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Auto Sync</p>
                      <p className="text-sm text-gray-500">Automatically sync data from PracticePartner</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600">
                      <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sync Interval (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      defaultValue="30"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="pt-4">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 