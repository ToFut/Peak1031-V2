import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useChat } from '../hooks/useChat';

const DebugChatInfo: React.FC = () => {
  const { user } = useAuth();
  const { selectedExchange, exchanges, error } = useChat();
  
  const testMessage = async () => {
    if (!selectedExchange) {
      alert('Please select an exchange first');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/test-messages/test', {
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

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🐛 Debug Info</h3>
      
      <div className="space-y-1">
        <div>
          <strong>User:</strong> {user ? `${user.first_name} ${user.last_name} (${user.role})` : 'Not logged in'}
        </div>
        
        <div>
          <strong>User ID:</strong> {user?.id || 'None'}
        </div>
        
        <div>
          <strong>Token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}
        </div>
        
        <div>
          <strong>Exchanges:</strong> {exchanges.length}
        </div>
        
        <div>
          <strong>Selected Exchange:</strong> {selectedExchange ? `${selectedExchange.exchange_name} (${selectedExchange.id})` : 'None'}
        </div>
        
        <div>
          <strong>Participants:</strong> {selectedExchange?.participants.length || 0}
        </div>
        
        <div>
          <strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}
        </div>
        
        {error && (
          <div className="text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
      
      <button
        onClick={testMessage}
        className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium"
      >
        Test Message Creation
      </button>
    </div>
  );
};

export default DebugChatInfo;