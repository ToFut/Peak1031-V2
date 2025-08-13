/**
 * Document Service - Handles document management operations
 * Extracted from the monolithic API service
 */

import { Document } from '../../types';
import { httpClient } from '../base/httpClient';

export class DocumentService {
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  async getDocuments(): Promise<Document[]> {
    return httpClient.get<Document[]>('/documents');
  }

  async getDocument(id: string): Promise<Document> {
    return httpClient.get<Document>(`/documents/${id}`);
  }

  async uploadDocument(file: File, exchangeId: string, category: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exchangeId', exchangeId);
    formData.append('category', category);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upload failed');
    }
    
    return response.json();
  }

  async downloadDocument(id: string, pinCode?: string): Promise<Blob> {
    const endpoint = `/documents/${id}/download${pinCode ? `?pin=${pinCode}` : ''}`;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  async deleteDocument(id: string): Promise<void> {
    await httpClient.delete<void>(`/documents/${id}`);
  }

  async updateDocument(id: string, documentData: Partial<Document>): Promise<Document> {
    return httpClient.put<Document>(`/documents/${id}`, documentData);
  }

  async verifyDocumentPin(id: string, pin: string): Promise<{ valid: boolean }> {
    return httpClient.post<{ valid: boolean }>(`/documents/${id}/verify-pin`, { pin });
  }

  async getDocumentsByExchange(exchangeId: string): Promise<Document[]> {
    return httpClient.get<Document[]>(`/exchanges/${exchangeId}/documents`);
  }

  // Template Management
  async getDocumentTemplates(): Promise<any[]> {
    const response = await httpClient.get<any>('/templates');
    // Handle response format from new templates endpoint
    if (response && response.success && response.data) {
      return response.data || [];
    }
    // Fallback to direct array if response format is different
    return Array.isArray(response) ? response : [];
  }

  async uploadDocumentTemplate(formData: FormData): Promise<any> {
    const response = await fetch(`${this.baseURL}/documents/templates/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload template: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteDocumentTemplate(templateId: string): Promise<void> {
    await httpClient.delete<void>(`/documents/templates/${templateId}`);
  }

  async updateDocumentTemplate(templateId: string, templateData: any): Promise<any> {
    return httpClient.put<any>(`/documents/templates/${templateId}`, templateData);
  }

  async downloadDocumentTemplate(templateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/templates/${templateId}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    return response.blob();
  }

  async generateDocumentFromTemplate(data: {
    template_id: string;
    exchange_id: string;
    generation_data: any;
    generated_by: string;
  }): Promise<{ document_id: string; download_url: string }> {
    return httpClient.post<{ document_id: string; download_url: string }>('/documents/templates/generate', data);
  }

  async getGeneratedDocuments(exchangeId?: string): Promise<any[]> {
    const endpoint = exchangeId 
      ? `/documents/templates/generated?exchange_id=${exchangeId}`
      : '/documents/templates/generated';
    return httpClient.get<any[]>(endpoint);
  }
}

export const documentService = new DocumentService();