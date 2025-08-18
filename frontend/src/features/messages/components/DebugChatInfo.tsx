import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useChat } from '../hooks/useChat';

const DebugChatInfo: React.FC = () => {
  const { user } = useAuth();
  const { selectedExchange, exchanges, error } = useChat();
  const [debugData, setDebugData] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const collectDebugInfo = async () => {
    setLoading(true);
    const data: any = {};

    // Browser Information
    data.browser = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      platform: navigator.platform,
      vendor: navigator.vendor,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio
    };

    // Network Information
    data.network = {
      connectionType: (navigator as any).connection?.effectiveType || 'Unknown',
      downlink: (navigator as any).connection?.downlink || 'Unknown',
      rtt: (navigator as any).connection?.rtt || 'Unknown',
      saveData: (navigator as any).connection?.saveData || false
    };

    // Local Storage Details
    data.storage = {
      token: localStorage.getItem('token') ? 'Present' : 'Missing',
      refreshToken: localStorage.getItem('refreshToken') ? 'Present' : 'Missing',
      user: localStorage.getItem('user') ? 'Present' : 'Missing',
      totalItems: localStorage.length,
      availableSpace: 'Unknown', // Browser doesn't expose this directly
      quota: 'Unknown'
    };

    // Performance Metrics
    if ('performance' in window) {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perf) {
        data.performance = {
          loadTime: Math.round(perf.loadEventEnd - perf.loadEventStart),
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
          firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
          firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
          timeToInteractive: Math.round(perf.domInteractive - perf.fetchStart)
        };
      }
    }

    // Memory Usage (if available)
    if ('memory' in performance) {
      data.memory = {
        usedJSHeapSize: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        totalJSHeapSize: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        jsHeapSizeLimit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      };
    }

    // API Health Check
    try {
      const startTime = performance.now();
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const endTime = performance.now();
      
      data.apiHealth = {
        status: response.ok ? '✅ Online' : '❌ Offline',
        statusCode: response.status,
        responseTime: Math.round(endTime - startTime) + 'ms',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      data.apiHealth = {
        status: '❌ Cannot connect',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }

    // Cache Status
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        data.cache = {
          available: true,
          cacheCount: cacheNames.length,
          cacheNames: cacheNames
        };
      } catch (error) {
        data.cache = {
          available: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      data.cache = { available: false, reason: 'Cache API not supported' };
    }

    // Session Information
    data.session = {
      sessionStorageItems: sessionStorage.length,
      currentTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset()
    };

    // Exchange Details
    data.exchanges = {
      total: exchanges.length,
      selected: selectedExchange ? {
        id: selectedExchange.id,
        name: selectedExchange.exchange_name,
        status: selectedExchange.status,
        participants: selectedExchange.participants?.length || 0,
        created: (selectedExchange as any).created_at || 'N/A',
        updated: (selectedExchange as any).updated_at || 'N/A'
      } : null
    };

    setDebugData(data);
    setLoading(false);
  };

  useEffect(() => {
    collectDebugInfo();
    // Refresh debug info every 30 seconds
    const interval = setInterval(collectDebugInfo, 30000);
    return () => clearInterval(interval);
  }, [exchanges, selectedExchange]);

  const testMessage = async () => {
    if (!selectedExchange) {
      alert('Please select an exchange first');
      return;
    }
    
    try {
              const response = await fetch(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001'}/api/test-messages/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exchange_id: selectedExchange.id
        })
      });
      
      const data = await response.json();
      console.log('🧪 Test message result:', data);
      
      if (!response.ok) {
        alert(`Test failed: ${data.error}`);
      } else {
        alert('Test message created successfully! Check console for details.');
      }
    } catch (error) {
      console.error('Test error:', error);
      alert(`Test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-2 rounded-lg text-xs z-50 cursor-pointer" onClick={() => setIsExpanded(true)}>
        <div className="flex items-center space-x-2">
          <span>🐛</span>
          <span>Debug</span>
          {debugData.apiHealth?.status === '✅ Online' && <span className="text-green-400">●</span>}
          {debugData.apiHealth?.status === '❌ Offline' && <span className="text-red-400">●</span>}
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-md z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">🐛 Enhanced Debug Info</h3>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <button
        onClick={collectDebugInfo}
        disabled={loading}
        className="mb-3 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-3 py-1 rounded text-xs font-medium"
      >
        {loading ? 'Refreshing...' : 'Refresh Debug Info'}
      </button>
      
      <div className="space-y-3">
        {/* User Information */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-yellow-400 mb-1">👤 User Info</h4>
          <div className="space-y-1">
            <div><strong>User:</strong> {user ? `${user.first_name} ${user.last_name} (${user.role})` : 'Not logged in'}</div>
            <div><strong>User ID:</strong> {user?.id || 'None'}</div>
            <div><strong>Token:</strong> {debugData.storage?.token || 'Unknown'}</div>
          </div>
        </div>

        {/* Exchange Information */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-green-400 mb-1">📊 Exchange Info</h4>
          <div className="space-y-1">
            <div><strong>Total Exchanges:</strong> {debugData.exchanges?.total || 0}</div>
            <div><strong>Selected Exchange:</strong> {selectedExchange ? `${selectedExchange.exchange_name} (${selectedExchange.id})` : 'None'}</div>
            <div><strong>Participants:</strong> {selectedExchange?.participants?.length || 0}</div>
            <div><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}</div>
          </div>
        </div>

        {/* API Health */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-blue-400 mb-1">🌐 API Health</h4>
          <div className="space-y-1">
            <div><strong>Status:</strong> {debugData.apiHealth?.status || 'Unknown'}</div>
            {debugData.apiHealth?.statusCode && <div><strong>Status Code:</strong> {debugData.apiHealth.statusCode}</div>}
            {debugData.apiHealth?.responseTime && <div><strong>Response Time:</strong> {debugData.apiHealth.responseTime}</div>}
            {debugData.apiHealth?.timestamp && <div><strong>Last Check:</strong> {new Date(debugData.apiHealth.timestamp).toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* Browser Information */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-purple-400 mb-1">🌍 Browser Info</h4>
          <div className="space-y-1">
            <div><strong>Platform:</strong> {debugData.browser?.platform || 'Unknown'}</div>
            <div><strong>Language:</strong> {debugData.browser?.language || 'Unknown'}</div>
            <div><strong>Online:</strong> {debugData.browser?.onLine ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Screen:</strong> {debugData.browser?.screenResolution || 'Unknown'}</div>
            <div><strong>Window:</strong> {debugData.browser?.windowSize || 'Unknown'}</div>
          </div>
        </div>

        {/* Network Information */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-cyan-400 mb-1">📡 Network</h4>
          <div className="space-y-1">
            <div><strong>Connection:</strong> {debugData.network?.connectionType || 'Unknown'}</div>
            <div><strong>Speed:</strong> {debugData.network?.downlink || 'Unknown'} Mbps</div>
            <div><strong>RTT:</strong> {debugData.network?.rtt || 'Unknown'} ms</div>
            <div><strong>Save Data:</strong> {debugData.network?.saveData ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        {/* Performance */}
        {debugData.performance && (
          <div className="border-b border-gray-600 pb-2">
            <h4 className="font-semibold text-orange-400 mb-1">⚡ Performance</h4>
            <div className="space-y-1">
              <div><strong>Load Time:</strong> {debugData.performance.loadTime}ms</div>
              <div><strong>DOM Ready:</strong> {debugData.performance.domContentLoaded}ms</div>
              <div><strong>First Paint:</strong> {debugData.performance.firstPaint}ms</div>
              <div><strong>Interactive:</strong> {debugData.performance.timeToInteractive}ms</div>
            </div>
          </div>
        )}

        {/* Memory */}
        {debugData.memory && (
          <div className="border-b border-gray-600 pb-2">
            <h4 className="font-semibold text-red-400 mb-1">💾 Memory</h4>
            <div className="space-y-1">
              <div><strong>Used:</strong> {debugData.memory.usedJSHeapSize}</div>
              <div><strong>Total:</strong> {debugData.memory.totalJSHeapSize}</div>
              <div><strong>Limit:</strong> {debugData.memory.jsHeapSizeLimit}</div>
            </div>
          </div>
        )}

        {/* Storage */}
        <div className="border-b border-gray-600 pb-2">
          <h4 className="font-semibold text-pink-400 mb-1">💿 Storage</h4>
          <div className="space-y-1">
            <div><strong>Local Items:</strong> {debugData.storage?.totalItems || 0}</div>
            <div><strong>Session Items:</strong> {debugData.session?.sessionStorageItems || 0}</div>
            <div><strong>Cache Available:</strong> {debugData.cache?.available ? '✅ Yes' : '❌ No'}</div>
            {debugData.cache?.cacheCount && <div><strong>Cache Count:</strong> {debugData.cache.cacheCount}</div>}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="border-b border-gray-600 pb-2">
            <h4 className="font-semibold text-red-400 mb-1">❌ Errors</h4>
            <div className="text-red-300">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={testMessage}
        className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium"
      >
        Test Message Creation
      </button>
    </div>
  );
};

export default DebugChatInfo;