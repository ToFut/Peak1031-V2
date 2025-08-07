import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Monitor connection changes
    const unsubscribe = apiService.onConnectionChange((online) => {
      setIsOnline(online);
      setShowStatus(true);
      
      // Auto-hide after 3 seconds if online
      if (online) {
        setTimeout(() => setShowStatus(false), 3000);
      }
    });

    // Check initial backend connection status
    const { online } = apiService.getConnectionStatus();
    setIsOnline(online);

    return unsubscribe;
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-white animate-pulse'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Connected to Backend' : 'Offline - Using Cached Data'}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;