import React, { useState } from 'react';
import { KeyIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface DocumentPinVerificationProps {
  onPinVerified: (pin: string) => void;
  onCancel: () => void;
  documentName?: string;
  loading?: boolean;
  error?: string;
}

export const DocumentPinVerification: React.FC<DocumentPinVerificationProps> = ({
  onPinVerified,
  onCancel,
  documentName = 'document',
  loading = false,
  error
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      onPinVerified(pin.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <LockClosedIcon className="w-6 h-6 text-orange-500 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">Document Protected</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This document requires a PIN to view: <strong>{documentName}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter PIN
            </label>
            <div className="relative">
              <div className="flex items-center border-2 border-gray-300 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <KeyIcon className="w-5 h-5 text-gray-400 ml-3" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => {
                    // Only allow numbers and basic characters
                    const value = e.target.value.replace(/[^0-9a-zA-Z]/g, '');
                    setPin(value);
                  }}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-3 text-lg border-0 rounded-md focus:outline-none bg-transparent"
                  placeholder="Enter PIN (numbers/letters)"
                  autoFocus
                  disabled={loading}
                  maxLength={10}
                  style={{ fontFamily: 'monospace' }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-2 text-gray-400 hover:text-gray-600 mr-2"
                  disabled={loading}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? 
                    <EyeSlashIcon className="w-5 h-5" /> : 
                    <EyeIcon className="w-5 h-5" />
                  }
                </button>
              </div>
              {pin && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 -mr-10">
                  <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                    {pin.length} chars
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pin.trim() || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-4 h-4 mr-2" />
                  View Document
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Tip: You can set a default PIN for documents in your Profile settings to skip this step.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentPinVerification;