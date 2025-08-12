const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class DocumentTemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.outputDir = path.join(__dirname, '../uploads/generated');
    this.previewDir = path.join(__dirname, '../uploads/previews');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.previewDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Get all document templates with settings
   */
  async getTemplates(options = {}) {
    try {
      let query = supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }
      if (options.templateType) {
        query = query.eq('template_type', options.templateType);
      }
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID with full settings
   */
  async getTemplateById(templateId) {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  /**
   * Create new template with settings
   */
  async createTemplate(templateData, userId) {
    try {
      // Set default settings if not provided
      const defaultSettings = {
        autoFill: true,
        requireReview: false,
        allowEditing: true,
        watermark: false,
        ...templateData.settings
      };

      const template = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category || 'template',
        template_type: templateData.template_type || 'document',
        required_fields: Array.isArray(templateData.required_fields) ? templateData.required_fields : [],
        role_access: Array.isArray(templateData.role_access) ? templateData.role_access : ['admin', 'coordinator'],
        auto_generate: templateData.auto_generate || false,
        stage_triggers: Array.isArray(templateData.stage_triggers) ? templateData.stage_triggers : [],
        is_required: templateData.is_required || false,
        is_active: templateData.is_active !== undefined ? templateData.is_active : true,
        version: templateData.version || '1.0',
        tags: Array.isArray(templateData.tags) ? templateData.tags : [],
        file_template: templateData.file_template,
        settings: defaultSettings,
        created_by: userId
      };

      const { data, error } = await supabase
        .from('document_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template with settings
   */
  async updateTemplate(templateId, updateData, userId) {
    try {
      const updateFields = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('document_templates')
        .update(updateFields)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    try {
      // Get template to delete associated file
      const template = await this.getTemplateById(templateId);
      
      if (template && template.file_path) {
        // Delete file from storage
        await supabase.storage
          .from('documents')
          .remove([template.file_path]);
      }

      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Generate preview of template with sample data
   */
  async generatePreview(templateId, sampleData = {}) {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Prepare sample data for preview
      const previewData = this.preparePreviewData(sampleData);
      
      // Validate required fields and get enhanced data with fallbacks
      const enhancedPreviewData = await this.validateRequiredFields(template, previewData);
      
      // Generate preview based on template type
      let previewContent;
      let previewUrl;

      if (template.file_template) {
        // Text-based template
        previewContent = this.processTextTemplate(template.file_template, enhancedPreviewData);
        previewUrl = null;
      } else if (template.file_path) {
        // File-based template (PDF, DOCX, etc.)
        const previewResult = await this.processFileTemplate(template.file_path, enhancedPreviewData);
        previewContent = previewResult.content;
        previewUrl = previewResult.url;
      } else {
        throw new Error('No template content found');
      }

      return {
        template: template,
        preview: {
          content: previewContent,
          url: previewUrl,
          data: enhancedPreviewData
        }
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  }

  /**
   * Generate document from template with exchange data
   */
  async generateDocument(templateId, exchangeId, additionalData = {}) {
    try {
      console.log(`📄 Generating document from template: ${templateId} for exchange: ${exchangeId}`);
      
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get exchange data
      const exchangeData = await this.getExchangeData(exchangeId);
      if (!exchangeData) {
        throw new Error('Exchange not found');
      }

      // Merge exchange data with additional data
      const templateData = {
        ...exchangeData,
        ...additionalData
      };

      // Validate required fields and get enhanced data with fallbacks
      const enhancedTemplateData = await this.validateRequiredFields(template, templateData);

      // Generate document based on template type
      let generatedDocument;
      
      if (template.file_template) {
        console.log('📄 Using text-based template');
        // Text-based template
        generatedDocument = await this.generateFromTextTemplate(template, enhancedTemplateData, exchangeId);
      } else if (template.file_path) {
        console.log('📄 Using file-based template');
        // File-based template
        generatedDocument = await this.generateFromFileTemplate(template, enhancedTemplateData, exchangeId);
      } else {
        console.error('❌ Template missing content:', {
          templateId: template.id,
          templateName: template.name,
          hasFileTemplate: !!template.file_template,
          hasFilePath: !!template.file_path
        });
        throw new Error(`Template "${template.name}" has no content. Please add either file_template (text content) or file_path (file upload).`);
      }

      // Save generated document to database
      const documentRecord = await this.saveGeneratedDocument(generatedDocument, template, exchangeId);
      
      console.log('📄 Document record saved:', {
        id: documentRecord.id,
        filename: documentRecord.original_filename,
        filePath: documentRecord.file_path,
        exchangeId: documentRecord.exchange_id
      });

      return {
        success: true,
        document: documentRecord,
        template: template.name,
        filePath: generatedDocument.filePath,
        warnings: enhancedTemplateData.warnings || []
      };

    } catch (error) {
      console.error('❌ Error generating document:', error);
      throw error;
    }
  }

  /**
   * Prepare sample data for preview
   */
  preparePreviewData(sampleData = {}) {
    const currentDate = new Date();
    const identificationDeadline = new Date(currentDate.getTime() + (45 * 24 * 60 * 60 * 1000));
    const completionDeadline = new Date(currentDate.getTime() + (180 * 24 * 60 * 60 * 1000));

    return {
      // Exchange data
      '#Exchange.ID#': 'EX-2024-001',
      '#Exchange.Number#': 'EX-2024-001',
      '#Exchange.Name#': 'Sample 1031 Exchange',
      '#Exchange.Type#': 'Delayed Exchange',
      '#Exchange.Status#': 'In Progress',
      '#Exchange.Value#': '$500,000',
      
      // Client data
      '#Client.Name#': 'John Smith',
      '#Client.FirstName#': 'John',
      '#Client.LastName#': 'Smith',
      '#Client.Email#': 'john.smith@email.com',
      '#Client.Phone#': '(555) 123-4567',
      '#Client.Company#': 'Smith Properties LLC',
      
      // Property data
      '#Property.Address#': '123 Main Street, Anytown, CA 90210',
      '#Property.RelinquishedAddress#': '123 Main Street, Anytown, CA 90210',
      '#Property.SalePrice#': '$500,000',
      '#Property.ReplacementValue#': '$550,000',
      
      // Financial data
      '#Financial.ExchangeValue#': '$500,000',
      '#Financial.RelinquishedValue#': '$500,000',
      '#Financial.ReplacementValue#': '$550,000',
      '#Financial.SalePrice#': '$500,000',
      
      // Dates
      '#Date.Start#': currentDate.toLocaleDateString(),
      '#Date.IdentificationDeadline#': identificationDeadline.toLocaleDateString(),
      '#Date.CompletionDeadline#': completionDeadline.toLocaleDateString(),
      '#Date.RelinquishedClosing#': currentDate.toLocaleDateString(),
      '#Date.Current#': currentDate.toLocaleDateString(),
      '#Date.Today#': currentDate.toLocaleDateString(),
      
      // QI data
      '#QI.Company#': 'Peak 1031 Exchange Services',
      '#QI.Name#': 'Jane Doe',
      
      // Coordinator data
      '#Coordinator.Name#': 'Mike Johnson',
      '#Coordinator.Email#': 'mike.johnson@peak1031.com',
      
      // System data
      '#System.Priority#': 'High',
      '#System.RiskLevel#': 'Medium',
      '#System.Notes#': 'Sample exchange for demonstration purposes',
      '#System.CurrentDate#': currentDate.toLocaleDateString(),
      '#System.CurrentDateTime#': currentDate.toLocaleString(),
      
      // Matter data
      '#Matter.Number#': 'MAT-2024-001',
      '#Matter.Name#': 'Smith 1031 Exchange',
      
      // Override with any provided sample data
      ...sampleData
    };
  }

  /**
   * Process text-based template with data replacement
   */
  processTextTemplate(templateContent, data) {
    let processedContent = templateContent;
    
    // Replace all placeholders with actual data
    Object.keys(data).forEach(key => {
      const placeholder = key;
      const value = data[key] || '';
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return processedContent;
  }

  /**
   * Process file-based template (PDF, DOCX, etc.)
   */
  async processFileTemplate(filePath, data) {
    try {
      // Download file from Supabase storage
      const { data: fileData, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      // Process based on file type
      const fileExtension = path.extname(filePath).toLowerCase();
      
      switch (fileExtension) {
        case '.pdf':
          return await this.processPdfTemplate(fileData, data);
        case '.docx':
          return await this.processDocxTemplate(fileData, data);
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Error processing file template:', error);
      throw error;
    }
  }

  /**
   * Process PDF template
   */
  async processPdfTemplate(buffer, data) {
    // For PDF templates, we'll create a new PDF with the data
    const filename = `preview_${Date.now()}.pdf`;
    const outputPath = path.join(this.previewDir, filename);
    
    const doc = new PDFDocument({
      margin: 50,
      info: {
        Title: 'Template Preview',
        Author: 'Peak 1031 Platform',
        Subject: 'Document Template Preview'
      }
    });

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add preview content
      doc.fontSize(16).text('TEMPLATE PREVIEW', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12);
      Object.entries(data).slice(0, 20).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });

      doc.end();

      stream.on('finish', () => {
        resolve({
          content: 'PDF preview generated',
          url: outputPath
        });
      });

      stream.on('error', reject);
    });
  }

  /**
   * Process DOCX template
   */
  async processDocxTemplate(buffer, data) {
    // For DOCX templates, we'll extract text and show a preview
    try {
      const result = await mammoth.extractRawText({ buffer });
      let content = result.value;
      
      // Replace placeholders in the content
      Object.entries(data).forEach(([key, value]) => {
        content = content.replace(new RegExp(key, 'g'), value);
      });
      
      return {
        content: content,
        url: null
      };
    } catch (error) {
      console.error('Error processing DOCX template:', error);
      return {
        content: 'Error processing DOCX template',
        url: null
      };
    }
  }

  /**
   * Get exchange data for template generation
   */
  async getExchangeData(exchangeId) {
    try {
      console.log(`🔍 Fetching exchange data for ID: ${exchangeId}`);
      
      // Get exchange data first
      const { data: exchange, error: exchangeError } = await supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      if (exchangeError) {
        console.error('❌ Error fetching exchange:', exchangeError);
        throw exchangeError;
      }
      
      if (!exchange) {
        console.error('❌ Exchange not found:', exchangeId);
        throw new Error('Exchange not found');
      }

      console.log('✅ Exchange data fetched:', exchange.id);

      // Get client data separately if client_id exists
      let client = {};
      if (exchange.client_id) {
        try {
          const { data: clientData, error: clientError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', exchange.client_id)
            .single();
          
          if (!clientError && clientData) {
            client = clientData;
            console.log('✅ Client data fetched:', client.id);
          } else {
            console.warn('⚠️ Client not found or error:', clientError);
          }
        } catch (clientErr) {
          console.warn('⚠️ Error fetching client data:', clientErr.message);
        }
      }

      // Get coordinator data separately if coordinator_id exists
      let coordinator = {};
      if (exchange.coordinator_id) {
        try {
          const { data: coordinatorData, error: coordinatorError } = await supabase
            .from('users')
            .select('*')
            .eq('id', exchange.coordinator_id)
            .single();
          
          if (!coordinatorError && coordinatorData) {
            coordinator = coordinatorData;
            console.log('✅ Coordinator data fetched:', coordinator.id);
          } else {
            console.warn('⚠️ Coordinator not found or error:', coordinatorError);
          }
        } catch (coordinatorErr) {
          console.warn('⚠️ Error fetching coordinator data:', coordinatorErr.message);
        }
      }

      // Transform exchange data to template format
      const transformedData = this.transformExchangeData({ ...exchange, client, coordinator });
      console.log('✅ Exchange data transformed successfully');
      
      return transformedData;
    } catch (error) {
      console.error('❌ Error in getExchangeData:', error);
      throw error;
    }
  }

  /**
   * Transform exchange data to template format
   */
  transformExchangeData(exchange) {
    const client = exchange.client || {};
    const coordinator = exchange.coordinator || {};
    const currentDate = new Date();

    return {
      // Exchange data
      '#Exchange.ID#': exchange.id,
      '#Exchange.Number#': exchange.exchange_number || exchange.id,
      '#Exchange.Name#': exchange.name || exchange.exchange_name,
      '#Exchange.Type#': exchange.exchange_type || 'Delayed Exchange',
      '#Exchange.Status#': exchange.status || exchange.new_status,
      '#Exchange.Value#': exchange.exchange_value ? `$${Number(exchange.exchange_value).toLocaleString()}` : '',
      
      // Client data
      '#Client.Name#': `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      '#Client.FirstName#': client.first_name || '',
      '#Client.LastName#': client.last_name || '',
      '#Client.Email#': client.email || '',
      '#Client.Phone#': client.phone || '',
      '#Client.Company#': client.company || '',
      
      // Property data
      '#Property.Address#': exchange.relinquished_property_address || '',
      '#Property.RelinquishedAddress#': exchange.relinquished_property_address || '',
      '#Property.SalePrice#': exchange.relinquished_sale_price ? `$${Number(exchange.relinquished_sale_price).toLocaleString()}` : '',
      '#Property.ReplacementValue#': exchange.replacement_property_value ? `$${Number(exchange.replacement_property_value).toLocaleString()}` : '',
      
      // Financial data
      '#Financial.ExchangeValue#': exchange.exchange_value ? `$${Number(exchange.exchange_value).toLocaleString()}` : '',
      '#Financial.RelinquishedValue#': exchange.relinquished_sale_price ? `$${Number(exchange.relinquished_sale_price).toLocaleString()}` : '',
      '#Financial.ReplacementValue#': exchange.replacement_property_value ? `$${Number(exchange.replacement_property_value).toLocaleString()}` : '',
      '#Financial.SalePrice#': exchange.relinquished_sale_price ? `$${Number(exchange.relinquished_sale_price).toLocaleString()}` : '',
      
      // Dates
      '#Date.Start#': exchange.start_date ? new Date(exchange.start_date).toLocaleDateString() : currentDate.toLocaleDateString(),
      '#Date.IdentificationDeadline#': exchange.identification_deadline ? new Date(exchange.identification_deadline).toLocaleDateString() : '',
      '#Date.CompletionDeadline#': exchange.completion_deadline ? new Date(exchange.completion_deadline).toLocaleDateString() : '',
      '#Date.RelinquishedClosing#': exchange.relinquished_closing_date ? new Date(exchange.relinquished_closing_date).toLocaleDateString() : '',
      '#Date.Current#': currentDate.toLocaleDateString(),
      '#Date.Today#': currentDate.toLocaleDateString(),
      
      // QI data
      '#QI.Company#': 'Peak 1031 Exchange Services',
      '#QI.Name#': coordinator ? `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim() : '',
      
      // Coordinator data
      '#Coordinator.Name#': coordinator ? `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim() : '',
      '#Coordinator.Email#': coordinator?.email || '',
      
      // System data
      '#System.Priority#': exchange.priority || 'Medium',
      '#System.RiskLevel#': exchange.risk_level || 'Medium',
      '#System.Notes#': exchange.notes || '',
      '#System.CurrentDate#': currentDate.toLocaleDateString(),
      '#System.CurrentDateTime#': currentDate.toLocaleString(),
      
      // Matter data
      '#Matter.Number#': exchange.exchange_number || exchange.id,
      '#Matter.Name#': exchange.name || exchange.exchange_name
    };
  }

  /**
   * Validate required fields for template and provide fallback values
   */
  async validateRequiredFields(template, data) {
    if (!template.required_fields || template.required_fields.length === 0) {
      return data;
    }

    const currentDate = new Date();
    const fallbackValues = {
      '#Client.Name#': 'Client Name Not Available',
      '#Client.FirstName#': 'Client',
      '#Client.LastName#': 'Name Not Available',
      '#Client.Email#': 'client@example.com',
      '#Client.Phone#': '(555) 000-0000',
      '#Client.Company#': 'Client Company Not Available',
      '#Property.Address#': 'Property Address Not Available',
      '#Property.RelinquishedAddress#': 'Relinquished Property Address Not Available',
      '#Property.SalePrice#': '$0',
      '#Property.ReplacementValue#': '$0',
      '#Financial.ExchangeValue#': '$0',
      '#Financial.RelinquishedValue#': '$0',
      '#Financial.ReplacementValue#': '$0',
      '#Financial.SalePrice#': '$0',
      '#Date.Start#': currentDate.toLocaleDateString(),
      '#Date.IdentificationDeadline#': currentDate.toLocaleDateString(),
      '#Date.CompletionDeadline#': currentDate.toLocaleDateString(),
      '#Date.RelinquishedClosing#': currentDate.toLocaleDateString(),
      '#Date.Current#': currentDate.toLocaleDateString(),
      '#Date.Today#': currentDate.toLocaleDateString(),
      '#Coordinator.Name#': 'Coordinator Name Not Available',
      '#Coordinator.Email#': 'coordinator@example.com',
      '#QI.Company#': 'Peak 1031 Exchange Services',
      '#QI.Name#': 'QI Name Not Available',
      '#System.Priority#': 'Medium',
      '#System.RiskLevel#': 'Medium',
      '#System.Notes#': 'No notes available',
      '#System.CurrentDate#': currentDate.toLocaleDateString(),
      '#System.CurrentDateTime#': currentDate.toLocaleString(),
      '#Matter.Number#': 'MAT-000',
      '#Matter.Name#': 'Matter Name Not Available',
      '#Exchange.ID#': 'EX-000',
      '#Exchange.Name#': 'Exchange Name Not Available',
      '#Exchange.Type#': 'Exchange Type Not Available',
      '#Exchange.Status#': 'Status Not Available',
      '#Exchange.Value#': '$0',
      '#Exchange.Number#': 'EX-000'
    };

    // Add fallback values for missing required fields
    const enhancedData = { ...data };
    let missingFields = [];
    let warnings = [];

    template.required_fields.forEach(field => {
      if (!enhancedData[field] || enhancedData[field].trim() === '') {
        if (fallbackValues[field]) {
          enhancedData[field] = fallbackValues[field];
          warnings.push(`Used fallback value for ${field}: ${fallbackValues[field]}`);
          console.log(`⚠️ Using fallback value for ${field}: ${fallbackValues[field]}`);
        } else if (field.includes('#___#')) {
          // Handle custom fields with #___# delimiters
          const customFieldName = field.replace(/#___#/g, '').trim();
          enhancedData[field] = `${customFieldName} Not Available`;
          warnings.push(`Used fallback value for custom field ${field}: ${customFieldName} Not Available`);
          console.log(`⚠️ Using fallback value for custom field ${field}: ${customFieldName} Not Available`);
        } else {
          missingFields.push(field);
        }
      }
    });

    if (missingFields.length > 0) {
      console.warn(`⚠️ No fallback values available for: ${missingFields.join(', ')}`);
      // Still throw error for fields without fallbacks
      throw new Error(`Missing required fields with no fallback values: ${missingFields.join(', ')}`);
    }

    // Add warnings to the enhanced data
    enhancedData.warnings = warnings;

    return enhancedData;
  }

  /**
   * Generate document from text template
   */
  async generateFromTextTemplate(template, data, exchangeId) {
    try {
      console.log('📄 Starting text template generation...');
      console.log('📋 Template name:', template.name);
      console.log('📋 Template content length:', template.file_template?.length || 0);
      console.log('📋 Data keys:', Object.keys(data || {}));
      
      const processedContent = this.processTextTemplate(template.file_template, data);
      console.log('📄 Processed content length:', processedContent.length);
      
      const filename = `${template.name}_${exchangeId}_${Date.now()}.txt`;
      const outputPath = path.join(this.outputDir, filename);
      
      console.log('📁 Output path:', outputPath);
      
      await fs.writeFile(outputPath, processedContent);
      console.log('✅ File written successfully');
      
      return {
        filePath: outputPath,
        filename: filename,
        mimeType: 'text/plain',
        fileSize: processedContent.length
      };
    } catch (error) {
      console.error('❌ Error in generateFromTextTemplate:', error);
      throw error;
    }
  }

  /**
   * Generate document from file template
   */
  async generateFromFileTemplate(template, data, exchangeId) {
    return await this.processFileTemplate(template.file_path, data);
  }

  /**
   * Save generated document to database
   */
  async saveGeneratedDocument(generatedDoc, template, exchangeId) {
    try {
      console.log('💾 Saving generated document to database...');
      console.log('📋 Generated doc:', {
        filename: generatedDoc.filename,
        filePath: generatedDoc.filePath,
        fileSize: generatedDoc.fileSize,
        mimeType: generatedDoc.mimeType
      });

      const documentData = {
        original_filename: generatedDoc.filename, // Use original_filename instead of filename
        stored_filename: generatedDoc.filename, // Add stored_filename
        file_path: generatedDoc.filePath,
        file_size: generatedDoc.fileSize,
        mime_type: generatedDoc.mimeType,
        exchange_id: exchangeId,
        template_id: template.id, // Add template_id to link to the template
        uploaded_by: null, // System generated
        category: 'generated',
        tags: ['generated', template.category],
        pin_required: false,
        is_public: false,
        is_signed: false,
        signature_required: false,
        approval_status: 'approved', // Auto-approve generated documents
        storage_provider: 'local'
      };

      console.log('📋 Document data to insert:', documentData);

      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting document:', error);
        throw error;
      }
      
      console.log('✅ Document saved successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving generated document:', error);
      throw error;
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories() {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      const categories = [...new Set(data.map(t => t.category))];
      return categories;
    } catch (error) {
      console.error('Error fetching template categories:', error);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      throw error;
    }
  }

  /**
   * Bulk generate documents for multiple exchanges
   */
  async bulkGenerateDocuments(templateId, exchangeIds, additionalData = {}) {
    const results = [];
    
    for (const exchangeId of exchangeIds) {
      try {
        const result = await this.generateDocument(templateId, exchangeId, additionalData);
        results.push({
          exchangeId,
          success: true,
          document: result.document
        });
      } catch (error) {
        results.push({
          exchangeId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics() {
    try {
      // Get all templates
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select('*');

      if (error) throw error;

      const stats = {
        total: templates.length,
        active: templates.filter(t => t.is_active).length,
        inactive: templates.filter(t => !t.is_active).length,
        required: templates.filter(t => t.is_required).length,
        autoGenerate: templates.filter(t => t.auto_generate).length,
        byCategory: {},
        byType: {}
      };

      // Count by category
      templates.forEach(template => {
        const category = template.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      // Count by type
      templates.forEach(template => {
        const type = template.template_type || 'document';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting template statistics:', error);
      throw error;
    }
  }
}

module.exports = new DocumentTemplateService();
