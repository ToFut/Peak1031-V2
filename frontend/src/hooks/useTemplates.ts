import { useState, useCallback, useEffect } from 'react';
import { templateService, DocumentTemplate, TemplateCreateData, TemplateUpdateData } from '../services/templateService';

interface UseTemplatesReturn {
  templates: DocumentTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplate: (templateData: TemplateCreateData) => Promise<DocumentTemplate | null>;
  updateTemplate: (templateData: TemplateUpdateData) => Promise<DocumentTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  generateDocument: (templateId: string, exchangeId: string, additionalData?: Record<string, any>) => Promise<any>;
  downloadTemplate: (templateId: string) => Promise<Blob>;
  viewTemplate: (templateId: string) => Promise<string | null>;
  getTemplateById: (id: string) => Promise<DocumentTemplate | null>;
  searchTemplates: (query: string, filters?: Record<string, any>) => Promise<DocumentTemplate[]>;
  getActiveTemplates: () => Promise<DocumentTemplate[]>;
  getRequiredTemplates: () => Promise<DocumentTemplate[]>;
  getAutoGenerateTemplates: () => Promise<DocumentTemplate[]>;
  validateTemplate: (templateData: TemplateCreateData) => Promise<{ valid: boolean; errors: string[] }>;
  getTemplateStatistics: () => Promise<any>;
}

export const useTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData: TemplateCreateData) => {
    setError(null);
    try {
      const newTemplate = await templateService.createTemplate(templateData);
      await fetchTemplates(); // Refresh list
      return newTemplate;
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
      throw err;
    }
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (templateData: TemplateUpdateData) => {
    setError(null);
    try {
      const updatedTemplate = await templateService.updateTemplate(templateData);
      await fetchTemplates(); // Refresh list
      return updatedTemplate;
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
      throw err;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    setError(null);
    try {
      const success = await templateService.deleteTemplate(id);
      if (success) {
        await fetchTemplates(); // Refresh list
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
      throw err;
    }
  }, [fetchTemplates]);

  const generateDocument = useCallback(async (templateId: string, exchangeId: string, additionalData?: Record<string, any>) => {
    setError(null);
    try {
      const result = await templateService.generateDocument(templateId, exchangeId, additionalData);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to generate document');
      throw err;
    }
  }, []);

  const downloadTemplate = useCallback(async (templateId: string) => {
    try {
      const blob = await templateService.downloadTemplateFile(templateId);
      return blob;
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
      throw err;
    }
  }, []);

  const viewTemplate = useCallback(async (templateId: string) => {
    try {
      // Find the template in the current state
      const template = templates.find(t => t.id === templateId);
      if (template?.url) {
        return template.url;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to view template');
      return null;
    }
  }, [templates]);

  const getTemplateById = useCallback(async (id: string) => {
    try {
      const template = await templateService.getTemplateById(id);
      return template;
    } catch (err: any) {
      setError(err.message || 'Failed to get template');
      return null;
    }
  }, []);

  const searchTemplates = useCallback(async (query: string, filters?: Record<string, any>) => {
    try {
      const results = await templateService.searchTemplates(query, filters);
      return results;
    } catch (err: any) {
      setError(err.message || 'Failed to search templates');
      return [];
    }
  }, []);

  const getActiveTemplates = useCallback(async () => {
    try {
      const activeTemplates = await templateService.getActiveTemplates();
      return activeTemplates;
    } catch (err: any) {
      setError(err.message || 'Failed to get active templates');
      return [];
    }
  }, []);

  const getRequiredTemplates = useCallback(async () => {
    try {
      const requiredTemplates = await templateService.getRequiredTemplates();
      return requiredTemplates;
    } catch (err: any) {
      setError(err.message || 'Failed to get required templates');
      return [];
    }
  }, []);

  const getAutoGenerateTemplates = useCallback(async () => {
    try {
      const autoGenerateTemplates = await templateService.getAutoGenerateTemplates();
      return autoGenerateTemplates;
    } catch (err: any) {
      setError(err.message || 'Failed to get auto-generate templates');
      return [];
    }
  }, []);

  const validateTemplate = useCallback(async (templateData: TemplateCreateData) => {
    try {
      const validation = await templateService.validateTemplate(templateData);
      return validation;
    } catch (err: any) {
      setError(err.message || 'Failed to validate template');
      return { valid: false, errors: ['Validation error occurred'] };
    }
  }, []);

  const getTemplateStatistics = useCallback(async () => {
    try {
      const stats = await templateService.getTemplateStatistics();
      return stats;
    } catch (err: any) {
      setError(err.message || 'Failed to get template statistics');
      return {};
    }
  }, []);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateDocument,
    downloadTemplate,
    viewTemplate,
    getTemplateById,
    searchTemplates,
    getActiveTemplates,
    getRequiredTemplates,
    getAutoGenerateTemplates,
    validateTemplate,
    getTemplateStatistics
  };
};