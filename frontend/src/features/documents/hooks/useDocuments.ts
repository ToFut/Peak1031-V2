import { useState, useEffect, useCallback } from 'react';
import { Document } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

interface UseDocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  uploadProgress: { [key: string]: number };
}

interface UseDocumentsFilters {
  exchangeId?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const useDocuments = (filters?: UseDocumentsFilters) => {
  const { user } = useAuth();
  const [state, setState] = useState<UseDocumentsState>({
    documents: [],
    loading: true,
    error: null,
    uploadProgress: {},
  });

  // Load documents with filters
  const loadDocuments = useCallback(async (customFilters?: UseDocumentsFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const filterParams = { ...filters, ...customFilters };
      const stringParams = Object.fromEntries(
        Object.entries(filterParams).map(([key, value]) => [key, String(value)])
      );
      const queryString = new URLSearchParams(stringParams).toString();
      const response = await apiService.get(`/documents?${queryString}`);
      
      setState(prev => ({
        ...prev,
        documents: Array.isArray(response) ? response : response.documents || [],
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error loading documents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load documents',
      }));
    }
  }, [filters]);

  // Upload document with progress tracking
  const uploadDocument = useCallback(async (
    file: File,
    metadata: {
      exchangeId?: string;
      category?: string;
      tags?: string[];
      pinRequired?: boolean;
      pin?: string;
    } = {}
  ): Promise<Document | null> => {
    const uploadId = `${file.name}_${Date.now()}`;
    
    try {
      setState(prev => ({
        ...prev,
        uploadProgress: { ...prev.uploadProgress, [uploadId]: 0 },
      }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      // Upload with progress tracking
      const document = await apiService.post('/documents/upload', formData);

      // Add to documents list
      setState(prev => ({
        ...prev,
        documents: [document, ...prev.documents],
        uploadProgress: { ...prev.uploadProgress, [uploadId]: 100 },
      }));

      // Clear progress after delay
      setTimeout(() => {
        setState(prev => {
          const { [uploadId]: _, ...restProgress } = prev.uploadProgress;
          return { ...prev, uploadProgress: restProgress };
        });
      }, 2000);

      return document;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to upload document',
        uploadProgress: { ...prev.uploadProgress, [uploadId]: -1 }, // Error state
      }));
      return null;
    }
  }, []);

  // Download document
  const downloadDocument = useCallback(async (id: string, pin?: string): Promise<boolean> => {
    try {
      await apiService.downloadDocument(id, pin);
      return true;
    } catch (error: any) {
      console.error('Error downloading document:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to download document',
      }));
      return false;
    }
  }, []);

  // Delete document
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiService.deleteDocument(id);
      
      // Remove from local state
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== id),
      }));
      
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to delete document',
      }));
      return false;
    }
  }, []);

  // Get document templates
  const getTemplates = useCallback(async () => {
    try {
      return await apiService.getDocumentTemplates();
    } catch (error: any) {
      console.error('Error getting templates:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to get templates',
      }));
      return [];
    }
  }, []);

  // Generate document from template
  const generateFromTemplate = useCallback(async (
    templateId: string,
    data: any,
    exchangeId?: string
  ): Promise<Document | null> => {
    try {
      const document = await apiService.post('/documents/generate', {
        template_id: templateId,
        exchange_id: exchangeId,
        generation_data: data,
        generated_by: user?.id || 'unknown'
      });
      
      // Add to documents list
      setState(prev => ({
        ...prev,
        documents: [document, ...prev.documents],
      }));
      
      return document;
    } catch (error: any) {
      console.error('Error generating document:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to generate document',
      }));
      return null;
    }
  }, []);

  // Refresh documents
  const refresh = useCallback(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load documents on mount and when filters change
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents: state.documents,
    loading: state.loading,
    error: state.error,
    uploadProgress: state.uploadProgress,
    loadDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    getTemplates,
    generateFromTemplate,
    refresh,
    clearError,
  };
};