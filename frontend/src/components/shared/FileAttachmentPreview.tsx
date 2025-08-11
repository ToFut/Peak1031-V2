import React, { useState } from 'react';
import { 
  XMarkIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface FileAttachmentPreviewProps {
  file: File;
  onSend: (message: string, file: File, pinRequired: boolean, pin?: string) => void;
  onCancel: () => void;
  uploading?: boolean;
}

export const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({
  file,
  onSend,
  onCancel,
  uploading = false
}) => {
  const [message, setMessage] = useState('');
  const [pinRequired, setPinRequired] = useState(true);
  const [pin, setPin] = useState('5678'); // Default PIN
  const [showPinSettings, setShowPinSettings] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="w-12 h-12 text-green-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <DocumentTextIcon className="w-12 h-12 text-red-500" />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DocumentIcon className="w-12 h-12 text-blue-500" />;
    }
    return <DocumentIcon className="w-12 h-12 text-gray-500" />;
  };

  const getPreviewContent = () => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="relative">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="max-w-full max-h-64 rounded-lg object-contain"
            onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
          />
          {pinRequired && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2">
              <LockClosedIcon className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="relative">
          {getFileIcon(file.type)}
          {pinRequired && (
            <LockClosedIcon className="w-6 h-6 text-orange-500 absolute -top-1 -right-1 bg-white rounded-full p-1" />
          )}
        </div>
        <p className="mt-3 text-sm font-medium text-gray-900 text-center">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatFileSize(file.size)}
        </p>
      </div>
    );
  };

  const handleSend = () => {
    if (uploading) return;
    onSend(message, file, pinRequired, pinRequired ? pin : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Send File</h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* File Preview */}
        <div className="p-4">
          {getPreviewContent()}
        </div>

        {/* File Info */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">File Name:</span>
              <span className="text-sm text-gray-600 truncate max-w-48">{file.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Size:</span>
              <span className="text-sm text-gray-600">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <span className="text-sm text-gray-600">{file.type || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="px-4 pb-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <LockClosedIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">PIN Protection</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinRequired}
                  onChange={(e) => setPinRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {pinRequired && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Document PIN:</label>
                  <button
                    onClick={() => setShowPinSettings(!showPinSettings)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    {showPinSettings ? 'Hide' : 'Change PIN'}
                  </button>
                </div>
                
                {showPinSettings && (
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    maxLength={10}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
                
                {!showPinSettings && (
                  <p className="text-xs text-gray-500">
                    This document will require PIN verification to view
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="px-4 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a message with this file..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 p-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSend}
            disabled={uploading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Send File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileAttachmentPreview;