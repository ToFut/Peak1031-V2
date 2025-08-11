import { apiService } from './api';

export interface UploadOptions {
  description?: string;
  pinRequired?: boolean;
  pin?: string;
  folderId?: string;
  category?: string;
}

export interface DocumentUploadResult {
  id: string;
  filename: string;
  originalFilename: string;
  category: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  exchangeId: string;
}

/**
 * Unified document upload service that both chat and document components can use
 * This ensures consistent upload behavior across the entire application
 */
class DocumentUploadService {
  /**
   * Upload a file to the document system
   * @param file The file to upload
   * @param exchangeId The exchange ID to associate with the document
   * @param options Upload options including category, PIN protection, etc.
   * @returns Promise<DocumentUploadResult> The uploaded document information
   */
  async uploadFile(
    file: File,
    exchangeId: string,
    options: UploadOptions = {}
  ): Promise<DocumentUploadResult> {
    console.log('🚀 DocumentUploadService: Starting upload', {
      fileName: file.name,
      fileSize: file.size,
      exchangeId,
      category: options.category || 'general',
      pinRequired: options.pinRequired || false
    });

    try {
      // Use the existing API service uploadDocument method
      const result = await apiService.uploadDocument(
        file,
        exchangeId,
        options.category || 'general',
        {
          description: options.description,
          pinRequired: options.pinRequired,
          pin: options.pin,
          folderId: options.folderId
        }
      );

      console.log('✅ DocumentUploadService: Upload successful', {
        documentId: result.id,
        originalFilename: result.originalFilename
      });

      // Map the Document interface to DocumentUploadResult interface
      // Cast to any to handle backend response with snake_case fields
      const resultAny = result as any;
      const mappedResult: DocumentUploadResult = {
        id: result.id,
        filename: result.filename || resultAny.stored_filename || resultAny.storedFilename || result.filePath,
        originalFilename: result.originalFilename || resultAny.original_filename || file.name,
        category: result.category || options.category || 'general',
        size: result.fileSize || resultAny.file_size || file.size,
        uploadedAt: result.createdAt || resultAny.created_at || new Date().toISOString(),
        uploadedBy: result.uploadedBy || resultAny.uploaded_by,
        exchangeId: result.exchangeId || resultAny.exchange_id || exchangeId
      };

      return mappedResult;
    } catch (error: any) {
      console.error('❌ DocumentUploadService: Upload failed', {
        fileName: file.name,
        exchangeId,
        error: error.message
      });
      throw new Error(error.message || 'Failed to upload document');
    }
  }

  /**
   * Upload a file for chat attachment (simplified interface)
   * @param file The file to upload
   * @param exchangeId The exchange ID to associate with the document
   * @param pinRequired Whether PIN protection is required
   * @param pin The PIN if protection is enabled
   * @returns Promise<string> The document ID for attachment
   */
  async uploadForChat(
    file: File,
    exchangeId: string,
    pinRequired: boolean = false,
    pin?: string
  ): Promise<string> {
    console.log('💬 DocumentUploadService: Uploading for chat', {
      fileName: file.name,
      exchangeId,
      pinRequired
    });

    const result = await this.uploadFile(file, exchangeId, {
      category: 'chat',
      pinRequired,
      pin
    });

    return result.id;
  }

  /**
   * Upload a document with category and description
   * @param file The file to upload
   * @param exchangeId The exchange ID to associate with the document
   * @param category The document category
   * @param description Optional description
   * @param folderId Optional folder ID
   * @returns Promise<DocumentUploadResult> The uploaded document information
   */
  async uploadDocument(
    file: File,
    exchangeId: string,
    category: string,
    description?: string,
    folderId?: string
  ): Promise<DocumentUploadResult> {
    console.log('📄 DocumentUploadService: Uploading document', {
      fileName: file.name,
      exchangeId,
      category,
      description,
      folderId
    });

    return this.uploadFile(file, exchangeId, {
      category,
      description,
      folderId
    });
  }

  /**
   * Upload a template document
   * @param file The file to upload
   * @param templateData Additional template metadata
   * @returns Promise<any> The upload result
   */
  async uploadTemplate(file: File, templateData: any): Promise<any> {
    console.log('📋 DocumentUploadService: Uploading template', {
      fileName: file.name,
      templateName: templateData.name
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add template metadata
      Object.keys(templateData).forEach(key => {
        if (templateData[key] !== undefined && templateData[key] !== null) {
          formData.append(key, typeof templateData[key] === 'object' ? JSON.stringify(templateData[key]) : String(templateData[key]));
        }
      });

      const result = await apiService.uploadDocumentTemplate(formData);
      
      console.log('✅ DocumentUploadService: Template upload successful');
      return result;
    } catch (error: any) {
      console.error('❌ DocumentUploadService: Template upload failed', {
        fileName: file.name,
        error: error.message
      });
      throw new Error(error.message || 'Failed to upload template');
    }
  }
}

// Export a singleton instance
export const documentUploadService = new DocumentUploadService();