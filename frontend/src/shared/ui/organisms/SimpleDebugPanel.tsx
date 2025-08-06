import React from 'react';

const SimpleDebugPanel: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded text-xs max-w-xs">
      <div className="font-bold mb-2">Debug Info</div>
      <div>Environment: {process.env.NODE_ENV}</div>
      <div>Build: Development</div>
    </div>
  );
};

export default SimpleDebugPanel;