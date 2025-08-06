import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface PinProtectedAccessProps {
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export const PinProtectedAccess: React.FC<PinProtectedAccessProps> = ({
  onSuccess,
  title = 'Enter PIN',
  message = 'This content is PIN protected'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check PIN (you can customize this logic)
    const correctPin = localStorage.getItem('document_pin') || '1234';
    
    if (pin === correctPin) {
      onSuccess();
    } else {
      setAttempts(prev => prev + 1);
      setError('Incorrect PIN');
      setPin('');
      
      if (attempts >= 2) {
        setError('Too many attempts. Please contact administrator.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
        <p className="text-gray-600 text-center mb-6">{message}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={6}
            disabled={attempts > 2}
          />
          
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={!pin || attempts > 2}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Unlock className="w-4 h-4 inline mr-2" />
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};