import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon, 
  XMarkIcon,
  LockClosedIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import DocumentPinVerification from './DocumentPinVerification';
import { apiService } from '../../services/api';

interface ChatDocument {
  id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  pin_required: boolean;
  category: string;
  description?: string;
  created_at: string;
}

interface ChatDocumentViewerProps {
  document: ChatDocument;
  className?: string;
}

export const ChatDocumentViewer: React.FC<ChatDocumentViewerProps> = ({
  document: doc,
  className = ''
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Load image when preview is shown and PIN is verified
  const loadImageForPreview = async () => {
    if (!showPreview || !doc.mime_type.includes('image')) return;
    if (loadingImage || imageUrl) return;
    if (doc.pin_required && !verifiedPin) return;

    setLoadingImage(true);
    setError(null);

    try {
      const blob = await apiService.downloadDocument(doc.id, verifiedPin || undefined);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoadingImage(false);
    }
  };

  // Load image when preview opens
  useEffect(() => {
    loadImageForPreview();
  }, [showPreview, verifiedPin]);

  // Cleanup image URL when component unmounts or preview closes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Reset image URL when preview closes
  useEffect(() => {
    if (!showPreview && imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }, [showPreview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <DocumentTextIcon className="w-8 h-8 text-red-500" />;
    }
    if (mimeType.includes('image')) {
      return <DocumentIcon className="w-8 h-8 text-green-500" />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DocumentIcon className="w-8 h-8 text-blue-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  const handleViewClick = () => {
    if (doc.pin_required && !verifiedPin) {
      setShowPinModal(true);
      setError(null);
    } else {
      openDocument();
    }
  };

  const handleDownloadClick = () => {
    if (doc.pin_required && !verifiedPin) {
      setShowPinModal(true);
      setError(null);
    } else {
      downloadDocument();
    }
  };

  const handlePinVerified = async (pin: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Verify PIN by attempting to download the document
      const response = await apiService.downloadDocument(doc.id, pin);
      if (response) {
        setVerifiedPin(pin);
        setShowPinModal(false);
        // After PIN verification, open the document
        setTimeout(() => openDocument(pin), 100);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (pin?: string) => {
    try {
      const pinToUse = pin || verifiedPin;
      
      if (doc.mime_type.includes('image')) {
        // For images, show in a modal preview
        setShowPreview(true);
      } else {
        // For other files, download them
        await downloadDocument(pinToUse || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open document');
    }
  };

  const downloadDocument = async (pin?: string) => {
    try {
      setLoading(true);
      const pinToUse = pin || verifiedPin;
      
      const blob = await apiService.downloadDocument(doc.id, (pinToUse || undefined));
      if (blob) {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = doc.original_filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setError(null);
  };

  return (
    <>
      <div className={`bg-white border border-gray-200 rounded-lg p-4 max-w-sm ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getFileIcon(doc.mime_type)}
            {doc.pin_required && (
              <LockClosedIcon className="w-4 h-4 text-orange-500 absolute -mt-2 -mr-1" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.original_filename}
              </p>
              {doc.pin_required && (
                <LockClosedIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {doc.category}
              </span>
              <span>{formatFileSize(doc.file_size)}</span>
            </div>
            
            {doc.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {doc.description}
              </p>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleViewClick}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <EyeIcon className="w-4 h-4 mr-1" />
                View
              </button>
              
              <button
                onClick={handleDownloadClick}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                Download
              </button>
            </div>
            
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <DocumentPinVerification
          onPinVerified={handlePinVerified}
          onCancel={handleCancelPin}
          documentName={doc.original_filename}
          loading={loading}
          error={error ?? undefined}
        />
      )}

      {/* Image Preview Modal */}
      {showPreview && doc.mime_type.includes('image') && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl max-h-full">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-medium">{doc.original_filename}</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                {loadingImage ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading image...</span>
                  </div>
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={doc.original_filename}
                    className="max-w-full max-h-96 mx-auto"
                    onError={() => setError('Failed to load image')}
                  />
                ) : error ? (
                  <div className="flex items-center justify-center h-96 text-red-600">
                    <p>{error}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    <p>Image not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatDocumentViewer;