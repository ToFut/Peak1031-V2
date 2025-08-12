import { apiService } from './api';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type?: string;
  template_type?: string;
  version?: string;
  file_template?: string;
  required_fields: string[];
  is_required: boolean;
  role_access: string[];
  auto_generate: boolean;
  stage_triggers?: string[];
  created_by: string;
  is_active: boolean;
  isActive?: boolean;
  is_default?: boolean;
  tags?: string[];
  fields?: any[];
  url?: string;
  settings?: {
    autoFill?: boolean;
    requireReview?: boolean;
    allowEditing?: boolean;
    watermark?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface TemplateCreateData {
  name: string;
  description: string;
  category: string;
  template_type?: string;
  version?: string;
  file_template?: string;
  required_fields?: string[];
  is_required?: boolean;
  role_access?: string[];
  auto_generate?: boolean;
  stage_triggers?: string[];
  is_active?: boolean;
  is_default?: boolean;
  tags?: string[];
  fields?: any[];
  settings?: {
    autoFill?: boolean;
    requireReview?: boolean;
    allowEditing?: boolean;
    watermark?: boolean;
  };
}

export interface TemplateUpdateData extends Partial<TemplateCreateData> {
  id: string;
}

export interface TemplatePreviewData {
  templateId: string;
  customData?: Record<string, any>;
  exchangeId?: string;
}

export interface TemplateGenerationData {
  templateId: string;
  exchangeId: string;
  additionalData?: Record<string, any>;
}

class TemplateService {
  private baseUrl = '/templates';

  /**
   * Get all templates
   */
  async getTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await apiService.get<any>(this.baseUrl);
      // Handle both response formats (wrapped in { success, data } or direct array)
      if (response && response.success && response.data) {
        return response.data || [];
      }
      return response || [];
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<DocumentTemplate | null> {
    try {
      const response = await apiService.get<DocumentTemplate>(`${this.baseUrl}/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch template ${id}:`, error);
      return null;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(templateData: TemplateCreateData): Promise<DocumentTemplate | null> {
    try {
      const response = await apiService.post<DocumentTemplate>(this.baseUrl, templateData);
      return response;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateData: TemplateUpdateData): Promise<DocumentTemplate | null> {
    try {
      const { id, ...updateData } = templateData;
      const response = await apiService.put<DocumentTemplate>(`${this.baseUrl}/${id}`, updateData);
      return response;
    } catch (error) {
      console.error(`Failed to update template ${templateData.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await apiService.delete(`${this.baseUrl}/${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generate preview for template
   */
  async generatePreview(data: TemplatePreviewData): Promise<any> {
    try {
      const response = await apiService.post(`${this.baseUrl}/${data.templateId}/preview`, {
        customData: data.customData,
        exchangeId: data.exchangeId
      });
      return response;
    } catch (error) {
      console.error(`Failed to generate preview for template ${data.templateId}:`, error);
      throw error;
    }
  }

  /**
   * Generate document from template
   */
  async generateDocument(templateId: string, exchangeId: string, additionalData?: Record<string, any>): Promise<any> {
    try {
      const response = await apiService.post(`${this.baseUrl}/${templateId}/generate`, {
        exchangeId,
        additionalData
      });
      return response;
    } catch (error) {
      console.error(`Failed to generate document from template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Upload template file
   */
  async uploadTemplateFile(templateId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.post(`${this.baseUrl}/${templateId}/upload`, formData);
      return response;
    } catch (error) {
      console.error(`Failed to upload template file for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Download template file
   */
  async downloadTemplateFile(templateId: string): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`${this.baseUrl}/${templateId}/download`);
      return response;
    } catch (error) {
      console.error(`Failed to download template file for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(): Promise<string[]> {
    try {
      const response = await apiService.get<string[]>(`${this.baseUrl}/categories`);
      return response || [];
    } catch (error) {
      console.error('Failed to fetch template categories:', error);
      return [];
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<DocumentTemplate[]> {
    try {
      const response = await apiService.get<DocumentTemplate[]>(`${this.baseUrl}/categories/${category}`);
      return response || [];
    } catch (error) {
      console.error(`Failed to fetch templates for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Bulk generate documents
   */
  async bulkGenerateDocuments(templateIds: string[], exchangeId: string, additionalData?: Record<string, any>): Promise<any[]> {
    try {
      const response = await apiService.post(`${this.baseUrl}/bulk-generate`, {
        templateIds,
        exchangeId,
        additionalData
      });
      return response || [];
    } catch (error) {
      console.error('Failed to bulk generate documents:', error);
      throw error;
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string, filters?: Record<string, any>): Promise<DocumentTemplate[]> {
    try {
      const response = await apiService.post<DocumentTemplate[]>(`${this.baseUrl}/search`, {
        query,
        filters
      });
      return response || [];
    } catch (error) {
      console.error('Failed to search templates:', error);
      return [];
    }
  }

  /**
   * Get active templates
   */
  async getActiveTemplates(): Promise<DocumentTemplate[]> {
    try {
      console.log('Fetching active templates from:', `${this.baseUrl}/active`);
      const response = await apiService.get<any>(`${this.baseUrl}/active`);
      console.log('Raw response from API:', response);
      
      // The backend returns { success: true, data: [...], count: n }
      if (response && typeof response === 'object' && 'data' in response) {
        console.log('Extracting data from response:', response.data);
        return Array.isArray(response.data) ? response.data : [];
      }
      
      // If response is already an array, return it
      if (Array.isArray(response)) {
        return response;
      }
      
      console.log('Unexpected response format, returning empty array');
      return [];
    } catch (error) {
      console.error('Failed to fetch active templates:', error);
      return [];
    }
  }

  /**
   * Get required templates
   */
  async getRequiredTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await apiService.get<DocumentTemplate[]>(`${this.baseUrl}/required`);
      return response || [];
    } catch (error) {
      console.error('Failed to fetch required templates:', error);
      return [];
    }
  }

  /**
   * Get auto-generate templates
   */
  async getAutoGenerateTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await apiService.get<DocumentTemplate[]>(`${this.baseUrl}/auto-generate`);
      return response || [];
    } catch (error) {
      console.error('Failed to fetch auto-generate templates:', error);
      return [];
    }
  }

  /**
   * Validate template
   */
  async validateTemplate(templateData: TemplateCreateData): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await apiService.post<{ valid: boolean; errors: string[] }>(`${this.baseUrl}/validate`, templateData);
      return response || { valid: false, errors: ['Validation failed'] };
    } catch (error) {
      console.error('Failed to validate template:', error);
      return { valid: false, errors: ['Validation error occurred'] };
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics(): Promise<any> {
    try {
      const response = await apiService.get(`${this.baseUrl}/statistics`);
      return response || {};
    } catch (error) {
      console.error('Failed to fetch template statistics:', error);
      return {};
    }
  }
}

export const templateService = new TemplateService();
export default templateService;