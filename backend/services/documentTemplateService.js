/**
 * Next Generation Document Template Service
 * Clean implementation with all fixes and enhancements
 */

const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const SmartPlaceholderService = require('./smartPlaceholderService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class DocumentTemplateServiceV2 {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.outputDir = path.join(__dirname, '../uploads/generated');
    this.previewDir = path.join(__dirname, '../uploads/previews');
    this.smartPlaceholderService = new SmartPlaceholderService();
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.previewDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(options = {}) {
    try {
      console.log('📄 Fetching templates with options:', options);
      
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

      const { data: templates, error } = await query;
      
      if (error) throw error;
      
      console.log(`✅ Found ${templates?.length || 0} templates`);
      return templates || [];
      
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories() {
    try {
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      // Extract unique categories
      const categories = [...new Set(templates?.map(t => t.category).filter(Boolean))];
      return categories;
      
    } catch (error) {
      console.error('Error fetching template categories:', error);
      return [];
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData, userId) {
    try {
      const { data: template, error } = await supabase
        .from('document_templates')
        .insert([{
          ...templateData,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updateData, userId) {
    try {
      const { data: template, error } = await supabase
        .from('document_templates')
        .update({
        ...updateData,
          updated_by: userId,
        updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return template;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId) {
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics() {
    try {
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select('*');
      
      if (error) throw error;
      
      const stats = {
        total: templates?.length || 0,
        active: templates?.filter(t => t.is_active).length || 0,
        inactive: templates?.filter(t => !t.is_active).length || 0,
        byCategory: {},
        byType: {}
      };
      
      // Group by category
      templates?.forEach(template => {
        const category = template.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        const type = template.template_type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error fetching template statistics:', error);
      throw error;
    }
  }

  /**
   * Generate preview of a template
   */
  async generatePreview(templateId, sampleData = {}) {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Use sample data or default preview data
      const previewData = {
        ...this.preparePreviewData(),
        ...sampleData
      };
      
      // Simple preview - just return the template with sample data
      return {
        template,
        previewData,
        previewText: this.generatePreviewText(template, previewData)
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  }

  /**
   * Prepare sample preview data
   */
  preparePreviewData() {
    return {
      '#Exchange.Number#': 'EX-SAMPLE-001',
      '#Exchange.Name#': 'Sample Exchange',
      '#Client.Name#': 'John Doe',
      '#Client.Email#': 'john.doe@example.com',
      '#Client.Phone#': '(555) 123-4567',
      '#Property.Address#': '123 Main St, City, State 12345',
      '#Property.SalePrice#': '$500,000',
      '#Date.Current#': new Date().toLocaleDateString(),
      '#Coordinator.Name#': 'Jane Smith',
      '#Coordinator.Email#': 'coordinator@example.com'
    };
  }

  /**
   * Generate preview text
   */
  generatePreviewText(template, data) {
    let text = template.file_template || '';
    
    // Replace placeholders with sample data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      text = text.replace(regex, value);
    });
    
    return text;
  }

  /**
   * Bulk generate documents
   */
  async bulkGenerateDocuments(templateId, exchangeIds, additionalData = {}) {
    const results = [];
    
    for (const exchangeId of exchangeIds) {
      try {
        const result = await this.generateDocument(templateId, exchangeId, additionalData);
        results.push({
          success: true,
          exchangeId,
          result
        });
      } catch (error) {
        results.push({
          success: false,
          exchangeId,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Main method: Generate document from template
   */
  async generateDocument(templateId, exchangeId, additionalData = {}) {
    try {
      console.log('📄 Generating document from template:', templateId, 'for exchange:', exchangeId);
      
      // Get template
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get exchange data
      const exchangeData = await this.getExchangeData(exchangeId);
      if (!exchangeData) {
        throw new Error('Exchange not found');
      }
      
      console.log('📋 Raw exchange data structure:', {
        hasClient: !!exchangeData.client,
        clientFields: exchangeData.client ? Object.keys(exchangeData.client) : [],
        exchangeFields: Object.keys(exchangeData).filter(k => !['client', 'coordinator'].includes(k))
      });

      // Merge exchange data with additional data
      const templateData = {
        ...exchangeData,
        ...additionalData
      };

      // Validate required fields and get enhanced data with fallbacks
      const enhancedTemplateData = await this.validateRequiredFields(template, templateData);
      console.log('📋 Enhanced template data sample:', {
        'Matter.Number': enhancedTemplateData['Matter.Number'],
        'Matter.Client': enhancedTemplateData['Matter.Client'],
        'Contact.FirstName': enhancedTemplateData['Contact.FirstName'],
        'Contact.LastName': enhancedTemplateData['Contact.LastName'],
        'Contact.Street1': enhancedTemplateData['Contact.Street1']
      });

      // Generate document based on template type
      let generatedDocument;
      
      // Check if file_template contains a URL (Supabase storage URL)
      const isFileTemplateUrl = template.file_template && 
        (template.file_template.startsWith('http://') || 
         template.file_template.startsWith('https://') ||
         template.file_template.includes('supabase.co/storage'));
      
      if (isFileTemplateUrl) {
        console.log('📄 Detected URL in file_template, processing as file template');
        // Extract the file path from the URL for Supabase storage
        const urlParts = template.file_template.split('/storage/v1/object/public/documents/');
        if (urlParts.length >= 2) {
          const filePath = urlParts[1];
          console.log('📁 Extracted file path:', filePath);
          // Store template and exchange info for filename generation
          this.currentTemplateName = template.name;
          this.currentExchangeId = exchangeId;
          generatedDocument = await this.processFileTemplate(filePath, enhancedTemplateData, exchangeId);
        } else {
          throw new Error('Invalid template file URL format');
        }
      } else if (template.file_template && !isFileTemplateUrl) {
        console.log('📄 Using text-based template');
        // Text-based template (actual text content)
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
   * Get template by ID
   */
  async getTemplateById(templateId) {
    try {
      const { data: template, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return template;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Process file-based template (PDF, DOCX, etc.)
   */
  async processFileTemplate(filePath, data, exchangeId) {
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
          return await this.processDocxTemplate(fileData, data, exchangeId);
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Error processing file template:', error);
      throw error;
    }
  }

  /**
   * Process PDF template with proper document generation
   */
  async processPdfTemplate(fileData, data) {
    try {
      console.log('📄 Processing PDF template...');
      
      // For now, return the original PDF
      // In production, you would use pdf-lib or similar to modify the PDF
      const buffer = Buffer.from(await fileData.arrayBuffer());
      
      return {
        buffer: buffer,
        contentType: 'application/pdf',
        filename: `document_${Date.now()}.pdf`,
        warnings: ['PDF template processing is in development']
      };
    } catch (error) {
      console.error('❌ Error processing PDF template:', error);
      throw new Error(`Failed to process PDF template: ${error.message}`);
    }
  }

  /**
   * Process DOCX template with enhanced error handling
   */
  async processDocxTemplate(fileData, data, exchangeId) {
    try {
      console.log('🚀 Processing DOCX template with smart placeholder system...');
      
      // Convert to Buffer
      let buffer;
      if (fileData instanceof Blob) {
        const arrayBuffer = await fileData.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (fileData instanceof ArrayBuffer) {
        buffer = Buffer.from(fileData);
      } else {
        buffer = fileData;
      }
      
      // Use smart placeholder service to process the template
      const smartProcessedBuffer = await this.smartPlaceholderService.processTemplate(buffer, exchangeId);
      
      console.log('✅ Smart DOCX processing complete');
      
      // Generate filename for the document
      const timestamp = Date.now();
      const templateName = this.currentTemplateName || 'document';
      const sanitizedTemplateName = templateName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      const exchangeIdForFilename = exchangeId || 'unknown';
      const filename = `${sanitizedTemplateName}_${exchangeIdForFilename}_${timestamp}.docx`;
      
      return {
        buffer: smartProcessedBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: filename,
        warnings: []
      };
    } catch (error) {
      console.error('❌ Error processing DOCX template:', error);
      throw new Error(`Failed to process DOCX template: ${error.message}`);
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
            console.log('✅ Client data fetched');
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch client data:', error);
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
            console.log('✅ Coordinator data fetched');
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch coordinator data:', error);
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
   * Transform exchange data to template format with comprehensive placeholders
   */
  transformExchangeData(exchange) {
    const client = exchange.client || {};
    const coordinator = exchange.coordinator || {};
    const currentDate = new Date();

    // Helper functions
    const formatCurrency = (value) => {
      if (!value || isNaN(value)) return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };

    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US');
    };

    const formatDateTime = (dateValue) => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString('en-US');
    };

    // Build comprehensive template data
    const templateData = {
      // Exchange fields
      '#Exchange.ID#': exchange.id,
      '#Exchange.Number#': exchange.exchange_number || exchange.exchangeNumber || '',
      '#Exchange.Name#': exchange.exchange_name || exchange.exchangeName || exchange.name || '',
      '#Exchange.Type#': exchange.exchange_type || exchange.exchangeType || '',
      '#Exchange.Status#': exchange.status || '',
      '#Exchange.Value#': formatCurrency(exchange.exchange_value || exchange.exchangeValue),
      
      // Client fields
      '#Client.Name#': client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'N/A',
      '#Client.FirstName#': client.first_name || client.firstName || 'N/A',
      '#Client.LastName#': client.last_name || client.lastName || 'N/A',
      '#Client.Email#': client.email || 'N/A',
      '#Client.Phone#': client.phone || 'N/A',
      '#Client.Company#': client.company || 'N/A',
      '#Client.Address#': client.address || client.street || 'N/A',
      '#Client.City#': client.city || 'N/A',
      '#Client.State#': client.state || client.province_state || 'N/A',
      '#Client.ZipCode#': client.zip || client.zip_code || client.postal_code || 'N/A',
      
      // Contact fields (alias for client)
      '#Contact.FirstName#': client.first_name || client.firstName || 'N/A',
      '#Contact.LastName#': client.last_name || client.lastName || 'N/A',
      '#Contact.Email#': client.email || 'N/A',
      '#Contact.Phone#': client.phone || 'N/A',
      '#Contact.HomeNumber#': client.phone || 'N/A',
      '#Contact.Street1#': client.street || client.address || 'N/A',
      '#Contact.Street2#': client.street2 || '',
      '#Contact.City#': client.city || 'N/A',
      '#Contact.ProvinceState#': client.state || client.province_state || 'N/A',
      '#Contact.ZipPostalCode#': client.zip || client.zip_code || client.postal_code || 'N/A',
      '#Contact.Fee#': formatCurrency(exchange.fee || 0),
      
      // Secondary signatory fields
      '#Contact.2nd Signatory Address#': exchange.client2_address || '',
      '#Contact.2nd Signatory Phone#': exchange.client2_phone || '',
      '#Contact.2nd Signatory Email#': exchange.client2_email || '',
      
      // Property fields
      '#Property.Address#': exchange.property_address || exchange.propertyAddress || exchange.relinquished_property_address || '',
      '#Property.RelinquishedAddress#': exchange.relinquished_property_address || exchange.relinquishedPropertyAddress || '',
      '#Property.SalePrice#': formatCurrency(exchange.relinquished_sale_price || exchange.relinquishedSalePrice || exchange.relinquished_value),
      '#Property.ReplacementValue#': formatCurrency(exchange.replacement_value || exchange.replacementValue),
      '#Property.Type#': exchange.property_type || '',
      
      // Financial fields
      '#Financial.ExchangeValue#': formatCurrency(exchange.exchangeValue || exchange.exchange_value),
      '#Financial.RelinquishedValue#': formatCurrency(exchange.relinquishedValue || exchange.relinquished_value),
      '#Financial.ReplacementValue#': formatCurrency(exchange.replacementValue || exchange.replacement_value),
      '#Financial.SalePrice#': formatCurrency(exchange.relinquishedSalePrice || exchange.relinquished_sale_price),
      '#Financial.NetProceeds#': formatCurrency(exchange.net_proceeds || 0),
      
      // Date fields
      '#Date.Start#': formatDate(exchange.startDate || exchange.start_date),
      '#Date.IdentificationDeadline#': formatDate(exchange.identificationDeadline || exchange.identification_deadline),
      '#Date.CompletionDeadline#': formatDate(exchange.completionDeadline || exchange.completion_deadline),
      '#Date.RelinquishedClosing#': formatDate(exchange.relinquishedClosingDate || exchange.relinquished_closing_date),
      '#Date.Current#': formatDate(currentDate),
      '#Date.Today#': formatDate(currentDate),
      '#Date.Creation#': formatDate(exchange.created_at),
      '#Date.LastUpdated#': formatDate(exchange.updated_at),
      
      // Coordinator fields
      '#Coordinator.Name#': coordinator.name || `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim() || '',
      '#Coordinator.FirstName#': coordinator.first_name || '',
      '#Coordinator.LastName#': coordinator.last_name || '',
      '#Coordinator.Email#': coordinator.email || '',
      '#Coordinator.Phone#': coordinator.phone || '',
      '#Coordinator.Title#': coordinator.title || '',
      
      // User fields (current user context)
      '#User.FirstName#': coordinator.first_name || '',
      '#User.LastName#': coordinator.last_name || '',
      '#User.Title#': coordinator.title || '',
      '#User.Email#': coordinator.email || '',
      '#User.Phone#': coordinator.phone || '',
      
      // QI fields
      '#QI.Company#': exchange.qiCompany || 'Peak 1031 Exchange',
      '#QI.Name#': exchange.qiName || 'Peak 1031 Exchange',
      '#QI.Address#': exchange.qiAddress || '',
      '#QI.Phone#': exchange.qiPhone || '',
      '#QI.Email#': exchange.qiEmail || '',
      
      // System fields
      '#System.Priority#': exchange.priority || '',
      '#System.RiskLevel#': exchange.riskLevel || '',
      '#System.Notes#': exchange.clientNotes || '',
      '#System.CurrentDate#': formatDate(currentDate),
      '#System.CurrentDateTime#': formatDateTime(currentDate),
      '#System.GeneratedBy#': coordinator.email || 'system',
      '#System.Version#': '2.0',
      
      // Matter fields (PracticePanther compatibility)
      '#Matter.Number#': exchange.matter_number || exchange.exchange_number || exchange.id,
      '#Matter.Name#': exchange.matter_name || exchange.exchange_name || '',
      '#Matter.Type#': exchange.matter_type || exchange.exchange_type || '',
      '#Matter.Client Vesting#': exchange.client_vesting || client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      '#Matter.Client 1 Signatory Title#': exchange.client1_signatory_title || 'Exchanger',
      '#Matter.Client 2 Name#': exchange.client2_name || '',
      '#Matter.Client 2 Signatory Title#': exchange.client2_signatory_title || '',
      
      // Relinquished property fields
      '#Matter.Rel Property Address#': exchange.relinquished_property_address || '',
      '#Matter.Rel Escrow Number#': exchange.rel_escrow_number || '',
      '#Matter.Rel Settlement Agent.FirstName#': exchange.rel_settlement_agent_first_name || '',
      '#Matter.Rel Settlement Agent.LastName#': exchange.rel_settlement_agent_last_name || '',
      '#Matter.Rel Settlement Agent.Escrow Company Name#': exchange.rel_escrow_company || '',
      '#Matter.Rel Settlement Agent.Street1#': exchange.rel_settlement_street1 || '',
      '#Matter.Rel Settlement Agent.Street2#': exchange.rel_settlement_street2 || '',
      '#Matter.Rel Settlement Agent.City#': exchange.rel_settlement_city || '',
      '#Matter.Rel Settlement Agent.ProvinceState#': exchange.rel_settlement_state || '',
      '#Matter.Rel Settlement Agent.ZipPostalCode#': exchange.rel_settlement_zip || '',
      
      // Replacement property fields
      '#Matter.Rep 1 Property Address#': exchange.replacement_property_address || '',
      '#Matter.Rep 1 Escrow Number#': exchange.rep_escrow_number || '',
      '#Matter.Rep 1 Settlement Agent.FirstName#': exchange.rep_settlement_agent_first_name || '',
      '#Matter.Rep 1 Settlement Agent.LastName#': exchange.rep_settlement_agent_last_name || '',
      '#Matter.Rep 1 Settlement Agent.Escrow Company Name#': exchange.rep_escrow_company || '',
      '#Matter.Rep 1 Settlement Agent.Street1#': exchange.rep_settlement_street1 || '',
      '#Matter.Rep 1 Settlement Agent.Street2#': exchange.rep_settlement_street2 || '',
      '#Matter.Rep 1 Settlement Agent.City#': exchange.rep_settlement_city || '',
      '#Matter.Rep 1 Settlement Agent.ProvinceState#': exchange.rep_settlement_state || '',
      '#Matter.Rep 1 Settlement Agent.ZipPostalCode#': exchange.rep_settlement_zip || '',
      
      // Additional computed fields
      '#Exchange.Timeline#': this.calculateTimeline(exchange),
      '#Exchange.Category#': exchange.category || 'Standard',
      '#Exchange.DaysRemaining#': this.calculateDaysRemaining(exchange),
      '#Exchange.Progress#': this.calculateProgress(exchange),
      '#Exchange.IsComplete#': exchange.status === 'completed' ? 'Yes' : 'No'
    };

    return templateData;
  }

  /**
   * Calculate timeline for exchange
   */
  calculateTimeline(exchange) {
    const start = new Date(exchange.startDate || exchange.start_date);
    const end = new Date(exchange.completionDeadline || exchange.completion_deadline);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }

  /**
   * Calculate days remaining
   */
  calculateDaysRemaining(exchange) {
    const deadline = new Date(exchange.completionDeadline || exchange.completion_deadline);
    const today = new Date();
    const days = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : 'Expired';
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(exchange) {
    const statusProgress = {
      'pending': '10%',
      'started': '25%',
      '45D': '50%',
      '180D': '75%',
      'completed': '100%'
    };
    return statusProgress[exchange.status] || '0%';
  }

  /**
   * Validate required fields with fallbacks
   */
  async validateRequiredFields(template, data) {
    const warnings = [];
    const enhancedData = { ...data };
    
    // Add any validation logic here
    if (template.required_fields && Array.isArray(template.required_fields)) {
      for (const field of template.required_fields) {
        if (!enhancedData[field] || enhancedData[field] === 'N/A') {
          warnings.push(`Missing required field: ${field}`);
        }
      }
    }
    
    enhancedData.warnings = warnings;
    return enhancedData;
  }

  /**
   * Generate document from text template
   */
  async generateFromTextTemplate(template, data, exchangeId) {
    try {
      console.log('📝 Generating from text template');
      
      let content = template.file_template;
      
      // Replace all placeholders
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, value || '');
      });
      
      // Generate filename
      const timestamp = Date.now();
      const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${exchangeId}_${timestamp}.txt`;
      
      return {
        buffer: Buffer.from(content, 'utf8'),
        contentType: 'text/plain',
        filename: filename,
        filePath: path.join(this.outputDir, filename),
        warnings: []
      };
    } catch (error) {
      console.error('Error generating from text template:', error);
      throw error;
    }
  }

  /**
   * Generate document from file template
   */
  async generateFromFileTemplate(template, data, exchangeId) {
    return await this.processFileTemplate(template.file_path, data, exchangeId);
  }

  /**
   * Save generated document to database
   */
  async saveGeneratedDocument(generatedDocument, template, exchangeId) {
    try {
      // Upload to Supabase storage
      const storagePath = `generated/${generatedDocument.filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, generatedDocument.buffer, {
          contentType: generatedDocument.contentType,
          duplex: 'half'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Save to database
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            exchange_id: exchangeId,
            original_filename: generatedDocument.filename,
            stored_filename: generatedDocument.filename, // Added stored_filename
            file_path: storagePath,
            file_url: publicUrl,
            mime_type: generatedDocument.contentType,
            file_size: generatedDocument.buffer.length, // Changed from 'size' to 'file_size'
            template_id: template.id,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;
      
      return document;
    } catch (error) {
      console.error('Error saving generated document:', error);
      throw error;
    }
  }
}

module.exports = DocumentTemplateServiceV2;