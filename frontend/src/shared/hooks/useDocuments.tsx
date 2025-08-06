import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/shared/services/api';

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  exchange_id?: string;
  uploaded_by: string;
  created_at: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface UseDocumentsReturn {
  documents: Document[];
  loading: boolean;
  error: string | null;
  uploadDocument: (file: File, exchangeId?: string) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  downloadDocument: (id: string) => void;
  getDocumentsByExchange: (exchangeId: string) => Document[];
  refreshDocuments: () => Promise<void>;
}

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/documents');
      if (response.success && response.data) {
        setDocuments(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(async (file: File, exchangeId?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    if (exchangeId) formData.append('exchange_id', exchangeId);
    
    const response = await apiService.post('/api/documents/upload', formData);
    if (response.success && response.data) {
      const newDoc = response.data;
      setDocuments(prev => [newDoc, ...prev]);
      return newDoc;
    }
    throw new Error('Failed to upload document');
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    const response = await apiService.delete(`/api/documents/${id}`);
    if (response.success) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const downloadDocument = useCallback((id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      window.open(doc.url, '_blank');
    }
  }, [documents]);

  const getDocumentsByExchange = useCallback((exchangeId: string): Document[] => {
    return documents.filter(d => d.exchange_id === exchangeId);
  }, [documents]);

  const refreshDocuments = useCallback(async (): Promise<void> => {
    await fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentsByExchange,
    refreshDocuments
  };
};