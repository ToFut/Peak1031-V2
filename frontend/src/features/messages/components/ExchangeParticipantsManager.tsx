import React from 'react';

interface ExchangeParticipantsManagerProps {
  exchangeId?: string;
  participants?: any[];
  className?: string;
}

const ExchangeParticipantsManager: React.FC<ExchangeParticipantsManagerProps> = ({ 
  exchangeId, 
  participants = [], 
  className 
}) => {
  return (
    <div className={`p-4 bg-white rounded-lg border ${className}`}>
      <h3 className="text-lg font-medium mb-3">Exchange Participants</h3>
      {participants.length === 0 ? (
        <p className="text-gray-500">No participants found</p>
      ) : (
        <div className="space-y-2">
          {participants.map((participant, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {participant.name?.[0] || 'U'}
              </div>
              <span>{participant.name || 'Unknown User'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExchangeParticipantsManager;