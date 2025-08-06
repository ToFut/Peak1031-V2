import React from 'react';

interface DebugChatInfoProps {
  chatData?: any;
  className?: string;
}

const DebugChatInfo: React.FC<DebugChatInfoProps> = ({ chatData, className }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`p-2 bg-gray-100 text-xs border rounded ${className}`}>
      <div className="font-semibold mb-1">Debug Chat Info:</div>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(chatData, null, 2)}
      </pre>
    </div>
  );
};

export default DebugChatInfo;