import { useState, useRef, useCallback } from 'react';
import { apiService } from '../services/api';

interface UseDocumentUploadReturn {
  uploading: boolean;
  uploadError: string | null;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploadDocument: (file: File) => Promise<boolean>;
  resetUpload: () => void;
}

export function useDocumentUpload(
  exchangeId: string | undefined,
  onUploadSuccess?: () => void
): UseDocumentUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useCallback(async (file: File): Promise<boolean> => {
    if (!file || !exchangeId) return false;

    try {
      setUploading(true);
      setUploadError(null);

      const response = await apiService.uploadDocument(file, exchangeId, selectedCategory);
      
      if (response) {
        if (onUploadSuccess) {
          await onUploadSuccess();
        }
        setShowUploadModal(false);
        setSelectedCategory('general');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setUploadError(err.message || 'Failed to upload document');
      return false;
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [exchangeId, selectedCategory, onUploadSuccess]);

  const resetUpload = useCallback(() => {
    setUploadError(null);
    setSelectedCategory('general');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return {
    uploading,
    uploadError,
    showUploadModal,
    setShowUploadModal,
    selectedCategory,
    setSelectedCategory,
    fileInputRef,
    uploadDocument,
    resetUpload
  };
}