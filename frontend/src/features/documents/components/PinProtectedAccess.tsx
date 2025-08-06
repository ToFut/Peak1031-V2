import React, { useState } from 'react';
import {
  LockClosedIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  name: string;
  size?: string;
  uploadedAt: string;
  uploadedBy: string;
  pinProtected: boolean;
  accessed?: boolean;
}

interface PinProtectedAccessProps {
  document: Document;
  onPinVerified?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
}

const PinProtectedAccess: React.FC<PinProtectedAccessProps> = ({
  document,
  onPinVerified,
  onDownload
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(document.accessed || false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    setIsVerifying(true);
    setPinError('');

    try {
      // Simulate PIN verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept '1234' as valid PIN
      if (pin === '1234') {
        setIsVerified(true);
        setShowPinModal(false);
        onPinVerified?.(document.id);
      } else {
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (error) {
      setPinError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDocumentAccess = (action: 'view' | 'download') => {
    if (!document.pinProtected || isVerified) {
      if (action === 'download') {
        onDownload?.(document.id);
      } else {
        // Handle view action
        window.open(`/api/documents/${document.id}/view`, '_blank');
      }
    } else {
      setShowPinModal(true);
    }
  };

  const PinModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <LockClosedIcon className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">PIN Protected Document</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            This document requires PIN verification to access:
          </p>
          <p className="text-sm font-medium text-gray-900">{document.name}</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter 4-digit PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setPin(value);
                setPinError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="****"
              autoFocus
            />
            {pinError && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {pinError}
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowPinModal(false);
                setPin('');
                setPinError('');
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isVerifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length !== 4 || isVerifying}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify PIN'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <ShieldCheckIcon className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">Security Notice:</p>
              <p>All document access is logged for audit purposes. Unauthorized access attempts will be reported.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {document.pinProtected ? (
                <div className="relative">
                  <DocumentArrowDownIcon className="w-8 h-8 text-gray-400" />
                  <LockClosedIcon className="w-4 h-4 text-red-600 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
                </div>
              ) : (
                <DocumentArrowDownIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {document.name}
                </h3>
                {document.pinProtected && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <LockClosedIcon className="w-3 h-3 mr-1" />
                    PIN Required
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ShieldCheckIcon className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                )}
              </div>
              
              <div className="mt-1 text-xs text-gray-500">
                <p>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
                <p>By: {document.uploadedBy}</p>
                {document.size && <p>Size: {document.size}</p>}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => handleDocumentAccess('view')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
              title={document.pinProtected && !isVerified ? 'PIN required to view' : 'View document'}
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              {document.pinProtected && !isVerified ? 'Unlock & View' : 'View'}
            </button>
            
            <button
              onClick={() => handleDocumentAccess('download')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
              title={document.pinProtected && !isVerified ? 'PIN required to download' : 'Download document'}
            >
              <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
              {document.pinProtected && !isVerified ? 'Unlock & Download' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      {showPinModal && <PinModal />}
    </>
  );
};

export default PinProtectedAccess;