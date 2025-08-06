import React, { useState, useEffect } from 'react';
import { practicePartnerOAuth } from '@/shared/services/practicePartnerOAuth';

interface ConnectionInfo {
  connected: boolean;
  expiresAt?: string;
  userId?: string;
}

const PracticePartnerIntegration: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnectionInfo();
  }, []);

  const loadConnectionInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await practicePartnerOAuth.getConnectionInfo();
      setConnectionInfo(info || { connected: false });
    } catch (error: any) {
      console.error('Failed to load connection info:', error);
      setError('Failed to load connection status');
      setConnectionInfo({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      // Redirect to PracticePanther OAuth
      practicePartnerOAuth.redirectToAuthorization();
    } catch (error: any) {
      console.error('Failed to initiate OAuth:', error);
      setError(error.message || 'Failed to connect to PracticePanther');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect from PracticePanther? This will stop all data synchronization.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);
      
      await practicePartnerOAuth.disconnect();
      await loadConnectionInfo();
      
      console.log('✅ Successfully disconnected from PracticePanther');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      setError(error.message || 'Failed to disconnect from PracticePanther');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return 'Expired';
    } else if (diffHours < 24) {
      return `Expires in ${diffHours} hours`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Expires in ${diffDays} days`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">PracticePanther Integration</h3>
          <p className="text-sm text-gray-500">
            Connect your PracticePanther account to sync matters, contacts, and tasks
          </p>
        </div>
        
        {/* Connection Status Badge */}
        <div className="flex items-center">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            connectionInfo.connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionInfo.connected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {connectionInfo.connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Details */}
      {connectionInfo.connected ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">
                  Successfully connected to PracticePanther
                </h4>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your PracticePanther account is connected and ready for data synchronization.</p>
                  {connectionInfo.expiresAt && (
                    <p className="mt-1">
                      <strong>Token Status:</strong> {formatExpiryDate(connectionInfo.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Connection Actions */}
          <div className="flex space-x-3">
            <button
              onClick={loadConnectionInfo}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Status
            </button>
            
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
              ) : (
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Connect to PracticePanther
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  <p>To enable data synchronization, you need to connect your PracticePanther account.</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Sync matters, contacts, and tasks automatically</li>
                    <li>Keep data up-to-date between both systems</li>
                    <li>Secure OAuth 2.0 authentication</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {connecting ? 'Connecting...' : 'Connect to PracticePanther'}
            </button>
          </div>
        </div>
      )}

      {/* OAuth Flow Information */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How it works:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>1. Click "Connect to PracticePanther" to start the OAuth flow</p>
          <p>2. You'll be redirected to PracticePanther to authorize access</p>
          <p>3. After approval, you'll be redirected back with a secure connection</p>
          <p>4. Data synchronization will be enabled automatically</p>
        </div>
      </div>
    </div>
  );
};

export default PracticePartnerIntegration; 