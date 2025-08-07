import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';

interface TokenStatus {
  status: 'valid' | 'expired' | 'expiring_soon' | 'no_token';
  message: string;
  expires_at?: string;
  has_refresh_token?: boolean;
}

interface TokenInfo {
  created_at: string;
  last_used_at: string;
  expires_at: string;
  token_type: string;
  scope?: string;
  has_refresh_token: boolean;
}

interface LastRefresh {
  refreshed_at: string;
  time_since_refresh: string;
  hours_since_refresh: number;
}

interface SyncInfo {
  last_sync_at?: string;
  last_sync_action?: string;
  time_since_sync?: string;
  hours_since_sync?: number;
  sync_details?: {
    total_synced?: number;
    sync_strategy?: 'incremental' | 'full';
    sync_duration?: string;
    total_errors?: number;
    results?: {
      contacts?: { synced: number; errors: number; strategy?: string };
      matters?: { synced: number; errors: number; strategy?: string };
      tasks?: { synced: number; errors: number; strategy?: string };
      notes?: { synced: number; errors: number; strategy?: string };
      invoices?: { synced: number; errors: number; strategy?: string };
      expenses?: { synced: number; errors: number; strategy?: string };
      users?: { synced: number; errors: number; strategy?: string };
    };
  };
  recent_syncs?: number;
}

interface SyncResult {
  success: boolean;
  message: string;
  details?: any;
}

interface PPTokenManagerProps {
  className?: string;
}

const PPTokenManager: React.FC<PPTokenManagerProps> = ({ className = '' }) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [lastRefresh, setLastRefresh] = useState<LastRefresh | null>(null);
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchTokenStatus = async () => {
    try {
      const response: any = await apiService.get('/admin/pp-token/status');
      setTokenStatus(response.token_status);
      setTokenInfo(response.token_info);
      setLastRefresh(response.last_refresh);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch token status');
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response: any = await apiService.get('/admin/pp-token/sync-status');
      setSyncInfo(response.last_sync);
    } catch (err: any) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      await apiService.post('/admin/pp-token/refresh', {});
      await fetchTokenStatus();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh token');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTriggerSync = async (forceFullSync = false) => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response: any = await apiService.post('/admin/pp-token/trigger-sync', {
        sync_contacts: true,
        sync_matters: true,
        sync_tasks: true,
        force_full_sync: forceFullSync
      });
      
      // Show success message
      setError(null);
      setSyncResult({
        success: true,
        message: response.message,
        details: response.sync_options
      });
      
      console.log(`✅ Sync started: ${response.message}`, response);
      
      // Start polling for updated sync status
      const pollInterval = setInterval(async () => {
        await fetchSyncStatus();
      }, 3000);
      
      // Stop polling after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setSyncing(false);
      }, 30000);
      
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to trigger sync',
        details: err.response?.data
      });
      setError(err.response?.data?.message || err.message || 'Failed to trigger sync');
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-50';
      case 'expiring_soon': return 'text-yellow-600 bg-yellow-50';
      case 'expired': return 'text-red-600 bg-red-50';
      case 'no_token': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return '✅';
      case 'expiring_soon': return '⚠️';
      case 'expired': return '❌';
      case 'no_token': return '🔐';
      default: return '❓';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTokenStatus(), fetchSyncStatus()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          PracticePanther Integration
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage OAuth tokens and data synchronization
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Token Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Token Status</h4>
          
          {tokenStatus ? (
            <div className="space-y-3">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tokenStatus.status)}`}>
                <span className="mr-2">{getStatusIcon(tokenStatus.status)}</span>
                {tokenStatus.message}
              </div>
              
              {tokenInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(tokenInfo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Used:</span>
                    <span className="ml-2 text-gray-900">
                      {tokenInfo.last_used_at ? 
                        new Date(tokenInfo.last_used_at).toLocaleDateString() : 
                        'Never'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expires:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(tokenInfo.expires_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Auto-Refresh:</span>
                    <span className={`ml-2 ${tokenInfo.has_refresh_token ? 'text-green-600' : 'text-red-600'}`}>
                      {tokenInfo.has_refresh_token ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No token information available</div>
          )}
        </div>

        {/* Last Refresh Info */}
        {lastRefresh && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Last Token Refresh</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Refreshed:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(lastRefresh.refreshed_at).toLocaleString()}
                </span>
                <span className="ml-2 text-gray-500">({lastRefresh.time_since_refresh})</span>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Data Synchronization</h4>
          
          {syncInfo ? (
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Last Sync:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(syncInfo.last_sync_at!).toLocaleString()}
                  </span>
                  <span className="ml-2 text-gray-500">({syncInfo.time_since_sync})</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 text-gray-900">{syncInfo.last_sync_action}</span>
                </div>
                {syncInfo.recent_syncs && (
                  <div>
                    <span className="text-gray-500">Recent Syncs:</span>
                    <span className="ml-2 text-gray-900">{syncInfo.recent_syncs}</span>
                  </div>
                )}
              </div>

              {/* Sync Details */}
              {syncInfo.sync_details && (
                <div className="bg-white rounded border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-medium text-gray-700">Last Sync Details</h5>
                    <div className="flex items-center space-x-2">
                      {syncInfo.sync_details.sync_strategy && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          syncInfo.sync_details.sync_strategy === 'incremental' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {syncInfo.sync_details.sync_strategy === 'incremental' ? '📥 Incremental' : '📦 Full'}
                        </span>
                      )}
                      {syncInfo.sync_details.sync_duration && (
                        <span className="text-xs text-gray-500">
                          ⏱️ {syncInfo.sync_details.sync_duration}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-gray-600">Total Items</div>
                      <div className="font-medium text-lg">
                        {syncInfo.sync_details.total_synced || 0}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-600">Errors</div>
                      <div className={`font-medium text-lg ${
                        (syncInfo.sync_details.total_errors || 0) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {syncInfo.sync_details.total_errors || 0}
                      </div>
                    </div>
                  </div>

                  {syncInfo.sync_details.results && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-gray-600">Breakdown:</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {syncInfo.sync_details.results.contacts && (
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="text-blue-600 font-medium">📧</div>
                            <div className="font-medium">{syncInfo.sync_details.results.contacts.synced}</div>
                            <div className="text-gray-500">Contacts</div>
                          </div>
                        )}
                        {syncInfo.sync_details.results.matters && (
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-green-600 font-medium">⚖️</div>
                            <div className="font-medium">{syncInfo.sync_details.results.matters.synced}</div>
                            <div className="text-gray-500">Matters</div>
                          </div>
                        )}
                        {syncInfo.sync_details.results.tasks && (
                          <div className="text-center p-2 bg-yellow-50 rounded">
                            <div className="text-yellow-600 font-medium">📋</div>
                            <div className="font-medium">{syncInfo.sync_details.results.tasks.synced}</div>
                            <div className="text-gray-500">Tasks</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Additional tables row */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {syncInfo.sync_details.results.notes && (
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="text-purple-600 font-medium">📝</div>
                            <div className="font-medium">{syncInfo.sync_details.results.notes.synced}</div>
                            <div className="text-gray-500">Notes</div>
                          </div>
                        )}
                        {syncInfo.sync_details.results.invoices && (
                          <div className="text-center p-2 bg-emerald-50 rounded">
                            <div className="text-emerald-600 font-medium">💰</div>
                            <div className="font-medium">{syncInfo.sync_details.results.invoices.synced}</div>
                            <div className="text-gray-500">Invoices</div>
                          </div>
                        )}
                        {syncInfo.sync_details.results.expenses && (
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-red-600 font-medium">💵</div>
                            <div className="font-medium">{syncInfo.sync_details.results.expenses.synced}</div>
                            <div className="text-gray-500">Expenses</div>
                          </div>
                        )}
                        {syncInfo.sync_details.results.users && (
                          <div className="text-center p-2 bg-indigo-50 rounded">
                            <div className="text-indigo-600 font-medium">👥</div>
                            <div className="font-medium">{syncInfo.sync_details.results.users.synced}</div>
                            <div className="text-gray-500">PP Users</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No sync history available</div>
          )}
        </div>

        {/* Current Sync Status */}
        {syncResult && (
          <div className={`rounded-lg p-4 ${syncResult.success ? 'bg-blue-50' : 'bg-red-50'}`}>
            <div className="flex items-center">
              <div className={`text-sm font-medium ${syncResult.success ? 'text-blue-800' : 'text-red-800'}`}>
                {syncResult.success ? '🚀' : '❌'} {syncResult.message}
              </div>
            </div>
            {syncing && syncResult.success && (
              <div className="mt-2 flex items-center text-sm text-blue-600">
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-300 border-t-blue-600 rounded-full"></div>
                Sync in progress... Checking for updates every 3 seconds
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <button
            onClick={handleRefreshToken}
            disabled={refreshing || !tokenStatus?.has_refresh_token}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh Token
              </>
            )}
          </button>

          <button
            onClick={() => handleTriggerSync(false)}
            disabled={syncing || tokenStatus?.status === 'no_token'}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Syncing...
              </>
            ) : (
              <>
                📥 Sync Changes
              </>
            )}
          </button>

          <button
            onClick={() => handleTriggerSync(true)}
            disabled={syncing || tokenStatus?.status === 'no_token'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                Full Sync...
              </>
            ) : (
              <>
                📦 Full Sync
              </>
            )}
          </button>

          <button
            onClick={() => {
              fetchTokenStatus();
              fetchSyncStatus();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🔍 Refresh Status
          </button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-2">
          <div>
            <p className="font-medium mb-1">📥 Sync Options:</p>
            <p className="mb-1">
              <strong>Sync Changes:</strong> Only fetches data modified since last sync (faster, recommended)
            </p>
            <p>
              <strong>Full Sync:</strong> Fetches all data up to 1000 items per type (slower, for troubleshooting)
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">💡 Auto-Refresh:</p>
            <p>
              PracticePanther tokens automatically refresh when they expire. 
              Tokens are valid for 24 hours and refresh tokens last 60 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPTokenManager;