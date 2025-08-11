import React, { useState, useCallback } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';

export interface DocumentUploaderProps {
  exchangeId?: string;
  onUploadSuccess?: () => void;
  compact?: boolean;
  allowedCategories?: string[];
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[];
  className?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  exchangeId,
  onUploadSuccess,
  compact = false,
  allowedCategories = ['general', 'legal', 'financial', 'property'],
  maxFileSize = 10,
  allowedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.png'],
  className = ''
}) => {
  const {
    uploading,
    uploadError,
    showUploadModal,
    setShowUploadModal,
    selectedCategory,
    setSelectedCategory,
    fileInputRef,
    uploadDocument,
    resetUpload
  } = useDocumentUpload(exchangeId, onUploadSuccess);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      const success = await uploadDocument(selectedFile);
      if (success) {
        setSelectedFile(null);
      }
    }
  }, [selectedFile, uploadDocument]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setShowUploadModal(false);
    resetUpload();
  }, [resetUpload, setShowUploadModal]);

  const formatFileSize = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (compact) {
    return (
      <div className={`inline-flex ${className}`}>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={!exchangeId || uploading}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </button>

        {/* Compact Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Upload Document</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {allowedCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={allowedFileTypes.join(',')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />

                {selectedFile && (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                    <File className="w-5 h-5 text-blue-500" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600">{uploadError}</span>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full drag-and-drop interface
  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports: {allowedFileTypes.join(', ')} (max {maxFileSize}MB)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={allowedFileTypes.join(',')}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!exchangeId || uploading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose Files
        </button>
      </div>

      {selectedFile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Selected File</h4>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <File className="w-8 h-8 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {allowedCategories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {uploadError && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600">{uploadError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};