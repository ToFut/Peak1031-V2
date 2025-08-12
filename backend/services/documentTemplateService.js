const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

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
          generatedDocument = await this.processFileTemplate(filePath, enhancedTemplateData);
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
   * Intelligent Client Identification System
   * Handles multiple clients in the same exchange with different roles
   */
  identifyClientsInExchange(exchangeData) {
    const clients = {
      primary: null,
      secondary: [],
      all: [],
      byRole: {}
    };

    // Extract clients from various sources
    const clientSources = [
      exchangeData.client,
      exchangeData.clients,
      exchangeData.participants,
      exchangeData.exchangeParticipants,
      exchangeData.customFieldValues
    ].filter(Boolean);

    // Process each client source
    clientSources.forEach(source => {
      if (Array.isArray(source)) {
        source.forEach(client => this.processClient(client, clients));
      } else if (typeof source === 'object') {
        this.processClient(source, clients);
      }
    });

    // Auto-detect primary client based on multiple criteria
    clients.primary = this.detectPrimaryClient(clients.all);

    // Categorize clients by role
    clients.all.forEach(client => {
      const role = client.role || client.participantType || 'client';
      if (!clients.byRole[role]) {
        clients.byRole[role] = [];
      }
      clients.byRole[role].push(client);
    });

    return clients;
  }

  /**
   * Process individual client and categorize them
   */
  processClient(clientData, clients) {
    if (!clientData || !clientData.id) return;

    const client = {
      id: clientData.id,
      name: this.formatClientName(clientData),
      firstName: clientData.firstName || clientData.first_name,
      lastName: clientData.lastName || clientData.last_name,
      email: clientData.email,
      phone: clientData.phone,
      company: clientData.company,
      address: clientData.address,
      role: clientData.role || clientData.participantType || 'client',
      ownershipPercentage: clientData.ownershipPercentage || clientData.ownership_percentage,
      isPrimary: clientData.isPrimary || clientData.is_primary || false,
      vesting: clientData.vesting || clientData.clientVesting,
      entityType: clientData.entityType || clientData.entity_type
    };

    // Determine if this is a primary client
    if (client.isPrimary || this.isPrimaryClient(client, clients.all)) {
      clients.primary = client;
    } else {
      clients.secondary.push(client);
    }

    clients.all.push(client);
  }

  /**
   * Detect primary client using intelligent criteria
   */
  detectPrimaryClient(allClients) {
    if (allClients.length === 0) return null;
    if (allClients.length === 1) return allClients[0];

    // Priority scoring system
    const scoredClients = allClients.map(client => {
      let score = 0;

      // Higher score for clients with more complete information
      if (client.name) score += 10;
      if (client.email) score += 5;
      if (client.phone) score += 5;
      if (client.company) score += 3;
      if (client.address) score += 3;

      // Higher score for specific roles
      if (client.role === 'client' || client.role === 'primary') score += 20;
      if (client.role === 'owner') score += 15;
      if (client.role === 'trustee') score += 10;

      // Higher score for higher ownership percentage
      if (client.ownershipPercentage) {
        score += parseInt(client.ownershipPercentage) / 10;
      }

      // Higher score for entity types that are typically primary
      if (client.entityType === 'individual') score += 5;
      if (client.entityType === 'trust') score += 3;

      return { ...client, score };
    });

    // Return client with highest score
    return scoredClients.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
  }

  /**
   * Check if client should be considered primary
   */
  isPrimaryClient(client, allClients) {
    // If only one client, they're primary
    if (allClients.length === 0) return true;

    // Check role indicators
    const primaryRoles = ['client', 'primary', 'owner', 'trustee'];
    if (primaryRoles.includes(client.role?.toLowerCase())) return true;

    // Check ownership percentage
    if (client.ownershipPercentage && parseFloat(client.ownershipPercentage) > 50) return true;

    return false;
  }

  /**
   * Format client name consistently
   */
  formatClientName(clientData) {
    const firstName = clientData.firstName || clientData.first_name || '';
    const lastName = clientData.lastName || clientData.last_name || '';
    const company = clientData.company || clientData.companyName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else if (company) {
      return company;
    } else {
      return clientData.name || clientData.displayName || 'Unknown Client';
    }
  }

  /**
   * Identify properties in exchange
   */
  identifyPropertiesInExchange(exchangeData) {
    const properties = {
      relinquished: [],
      replacement: [],
      primaryRelinquished: null,
      primaryReplacement: null,
      all: []
    };

    // Extract properties from various sources
    const propertySources = [
      exchangeData.relinquishedProperties,
      exchangeData.replacementProperties,
      exchangeData.properties,
      exchangeData.customFieldValues
    ].filter(Boolean);

    propertySources.forEach(source => {
      if (Array.isArray(source)) {
        source.forEach(property => this.processProperty(property, properties));
      } else if (typeof source === 'object') {
        this.processProperty(source, properties);
      }
    });

    // Set primary properties
    properties.primaryRelinquished = properties.relinquished[0] || null;
    properties.primaryReplacement = properties.replacement[0] || null;

    return properties;
  }

  /**
   * Process individual property
   */
  processProperty(propertyData, properties) {
    if (!propertyData) return;

    const property = {
      id: propertyData.id,
      address: propertyData.address || propertyData.propertyAddress,
      value: propertyData.value || propertyData.propertyValue,
      type: propertyData.type || propertyData.propertyType,
      apn: propertyData.apn || propertyData.assessorParcelNumber,
      city: propertyData.city,
      state: propertyData.state,
      zip: propertyData.zip,
      county: propertyData.county,
      isRelinquished: propertyData.isRelinquished || propertyData.type === 'relinquished',
      isReplacement: propertyData.isReplacement || propertyData.type === 'replacement'
    };

    if (property.isRelinquished) {
      properties.relinquished.push(property);
    } else if (property.isReplacement) {
      properties.replacement.push(property);
    }

    properties.all.push(property);
  }

  /**
   * Identify participants in exchange
   */
  identifyParticipantsInExchange(exchangeData) {
    const participants = {
      coordinators: [],
      attorneys: [],
      accountants: [],
      titleCompanies: [],
      all: []
    };

    // Extract participants from various sources
    const participantSources = [
      exchangeData.participants,
      exchangeData.exchangeParticipants,
      exchangeData.assignedUsers,
      exchangeData.customFieldValues
    ].filter(Boolean);

    participantSources.forEach(source => {
      if (Array.isArray(source)) {
        source.forEach(participant => this.processParticipant(participant, participants));
      } else if (typeof source === 'object') {
        this.processParticipant(source, participants);
      }
    });

    return participants;
  }

  /**
   * Process individual participant
   */
  processParticipant(participantData, participants) {
    if (!participantData) return;

    const participant = {
      id: participantData.id,
      name: this.formatClientName(participantData),
      email: participantData.email,
      phone: participantData.phone,
      company: participantData.company,
      role: participantData.role || participantData.participantType,
      type: participantData.type || participantData.participantType
    };

    // Categorize by role
    const role = participant.role?.toLowerCase();
    if (role === 'coordinator' || role === 'exchange_coordinator') {
      participants.coordinators.push(participant);
    } else if (role === 'attorney' || role === 'lawyer') {
      participants.attorneys.push(participant);
    } else if (role === 'accountant' || role === 'cpa') {
      participants.accountants.push(participant);
    } else if (role === 'title' || role === 'title_company') {
      participants.titleCompanies.push(participant);
    }

    participants.all.push(participant);
  }

  /**
   * Prepare enhanced template data with intelligent client identification
   * This method provides comprehensive data for DOCX templates
   */
  prepareEnhancedTemplateData(exchangeData) {
    const clients = this.identifyClientsInExchange(exchangeData);
    const properties = this.identifyPropertiesInExchange(exchangeData);
    const participants = this.identifyParticipantsInExchange(exchangeData);
    
    return {
      // Exchange Information
      '#Exchange.ID#': exchangeData['#Exchange.ID#'] || exchangeData.exchange?.id || 'N/A',
      '#Exchange.Number#': exchangeData['#Exchange.Number#'] || exchangeData.exchange?.number || 'N/A',
      '#Exchange.Name#': exchangeData['#Exchange.Name#'] || exchangeData.exchange?.name || 'N/A',
      '#Exchange.Type#': exchangeData['#Exchange.Type#'] || exchangeData.exchange?.type || 'Delayed Exchange',
      '#Exchange.Status#': exchangeData['#Exchange.Status#'] || exchangeData.exchange?.status || 'In Progress',
      '#Exchange.Value#': exchangeData['#Exchange.Value#'] || exchangeData.exchange?.value || '$0.00',
      '#Exchange.StartDate#': exchangeData['#Exchange.StartDate#'] || exchangeData.exchange?.startDate || 'Not specified',
      '#Exchange.CompletionDate#': exchangeData['#Exchange.CompletionDate#'] || exchangeData.exchange?.completionDate || 'Not specified',
      '#Exchange.IdentificationDeadline#': exchangeData['#Exchange.IdentificationDeadline#'] || exchangeData.exchange?.identificationDeadline || 'Not specified',
      '#Exchange.CompletionDeadline#': exchangeData['#Exchange.CompletionDeadline#'] || exchangeData.exchange?.completionDeadline || 'Not specified',

      // Intelligent Client Information
      '#Client.Name#': exchangeData['#Client.Name#'] || clients.primary?.name || 'Client Name Not Available',
      '#Client.FirstName#': exchangeData['#Client.FirstName#'] || clients.primary?.firstName || '',
      '#Client.LastName#': exchangeData['#Client.LastName#'] || clients.primary?.lastName || '',
      '#Client.Email#': exchangeData['#Client.Email#'] || clients.primary?.email || '',
      '#Client.Phone#': exchangeData['#Client.Phone#'] || clients.primary?.phone || '',
      '#Client.Company#': exchangeData['#Client.Company#'] || clients.primary?.company || '',
      '#Client.Address#': exchangeData['#Client.Address#'] || clients.primary?.address || '',
      '#Client.Role#': exchangeData['#Client.Role#'] || clients.primary?.role || 'client',
      '#Client.OwnershipPercentage#': exchangeData['#Client.OwnershipPercentage#'] || clients.primary?.ownershipPercentage || '100%',

      // Secondary Clients (for multiple client scenarios)
      '#SecondaryClients#': exchangeData['#SecondaryClients#'] || clients.secondary.map(c => c.name).join(', '),
      '#AllClients#': exchangeData['#AllClients#'] || clients.all.map(c => c.name).join(', '),
      '#ClientCount#': exchangeData['#ClientCount#'] || clients.all.length.toString(),

      // Property Information
      '#RelinquishedProperty.Address#': exchangeData['#RelinquishedProperty.Address#'] || properties.primaryRelinquished?.address || 'Not specified',
      '#RelinquishedProperty.Value#': exchangeData['#RelinquishedProperty.Value#'] || properties.primaryRelinquished?.value || '$0.00',
      '#ReplacementProperty.Address#': exchangeData['#ReplacementProperty.Address#'] || properties.primaryReplacement?.address || 'Not specified',
      '#ReplacementProperty.Value#': exchangeData['#ReplacementProperty.Value#'] || properties.primaryReplacement?.value || '$0.00',
      '#RelinquishedProperties#': exchangeData['#RelinquishedProperties#'] || properties.relinquished.map(p => `${p.address} (${p.value})`).join(', '),
      '#ReplacementProperties#': exchangeData['#ReplacementProperties#'] || properties.replacement.map(p => `${p.address} (${p.value})`).join(', '),

      // Participant Information
      '#Coordinator.Name#': exchangeData['#Coordinator.Name#'] || participants.coordinators[0]?.name || 'Coordinator Not Assigned',
      '#Coordinator.Email#': exchangeData['#Coordinator.Email#'] || participants.coordinators[0]?.email || '',
      '#Coordinator.Phone#': exchangeData['#Coordinator.Phone#'] || participants.coordinators[0]?.phone || '',
      '#Attorney.Name#': exchangeData['#Attorney.Name#'] || participants.attorneys[0]?.name || 'Attorney Not Assigned',
      '#Accountant.Name#': exchangeData['#Accountant.Name#'] || participants.accountants[0]?.name || 'Accountant Not Assigned',
      '#TitleCompany.Name#': exchangeData['#TitleCompany.Name#'] || participants.titleCompanies[0]?.name || 'Title Company Not Assigned',

      // Financial Information
      '#ExchangeValue#': exchangeData['#ExchangeValue#'] || exchangeData.financial?.exchangeValue || '$0.00',
      '#RelinquishedValue#': exchangeData['#RelinquishedValue#'] || exchangeData.financial?.relinquishedValue || '$0.00',
      '#ReplacementValue#': exchangeData['#ReplacementValue#'] || exchangeData.financial?.replacementValue || '$0.00',
      '#CashBoot#': exchangeData['#CashBoot#'] || exchangeData.financial?.cashBoot || '$0.00',
      '#FinancingAmount#': exchangeData['#FinancingAmount#'] || exchangeData.financial?.financingAmount || '$0.00',

      // Dates
      '#CurrentDate#': exchangeData['#CurrentDate#'] || new Date().toLocaleDateString(),
      '#CurrentDateTime#': exchangeData['#CurrentDateTime#'] || new Date().toLocaleString(),
      '#IdentificationDeadline#': exchangeData['#IdentificationDeadline#'] || exchangeData.dates?.identificationDeadline || 'Not specified',
      '#CompletionDeadline#': exchangeData['#CompletionDeadline#'] || exchangeData.dates?.completionDeadline || 'Not specified',

      // Company Information
      '#Company.Name#': exchangeData['#Company.Name#'] || 'Peak 1031 Exchange Services',
      '#Company.Address#': exchangeData['#Company.Address#'] || '123 Exchange Street, Suite 100, Finance City, FC 12345',
      '#Company.Phone#': exchangeData['#Company.Phone#'] || '(555) 123-4567',
      '#Company.Email#': exchangeData['#Company.Email#'] || 'info@peak1031.com',
      '#Company.Website#': exchangeData['#Company.Website#'] || 'www.peak1031.com',

      // Enhanced data structures for DOCX templates
      exchange: exchangeData.exchange || {
        id: exchangeData['#Exchange.ID#'],
        name: exchangeData['#Exchange.Name#'],
        number: exchangeData['#Exchange.Number#'],
        status: exchangeData['#Exchange.Status#'],
        type: exchangeData['#Exchange.Type#'],
        value: exchangeData['#Exchange.Value#']
      },

      clients: clients,
      primaryClient: clients.primary,
      secondaryClients: clients.secondary,
      allClients: clients.all,

      properties: properties,
      relinquishedProperties: properties.relinquished,
      replacementProperties: properties.replacement,
      primaryRelinquishedProperty: properties.primaryRelinquished,
      primaryReplacementProperty: properties.primaryReplacement,

      participants: participants,
      coordinators: participants.coordinators,
      attorneys: participants.attorneys,
      accountants: participants.accountants,
      titleCompanies: participants.titleCompanies,

      financial: exchangeData.financial || {
        exchangeValue: exchangeData['#ExchangeValue#'],
        relinquishedValue: exchangeData['#RelinquishedValue#'],
        replacementValue: exchangeData['#ReplacementValue#'],
        cashBoot: exchangeData['#CashBoot#'],
        financingAmount: exchangeData['#FinancingAmount#']
      },

      dates: exchangeData.dates || {
        current: exchangeData['#CurrentDate#'],
        currentDateTime: exchangeData['#CurrentDateTime#'],
        identificationDeadline: exchangeData['#IdentificationDeadline#'],
        completionDeadline: exchangeData['#CompletionDeadline#']
      },

      company: exchangeData.company || {
        name: 'Peak 1031 Exchange Services',
        address: '123 Exchange Street, Suite 100, Finance City, FC 12345',
        phone: '(555) 123-4567',
        email: 'info@peak1031.com',
        website: 'www.peak1031.com'
      },

      // Include all original data for backward compatibility
      ...exchangeData
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
   * Process PDF template with proper document generation
   */
  async processPdfTemplate(fileData, data) {
    try {
      console.log('📄 Processing PDF template with data replacement...');
      
      // Convert Blob/File to Buffer if needed
      let buffer;
      if (fileData instanceof Blob) {
        console.log('📄 Converting Blob to Buffer...');
        const arrayBuffer = await fileData.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (fileData instanceof ArrayBuffer) {
        console.log('📄 Converting ArrayBuffer to Buffer...');
        buffer = Buffer.from(fileData);
      } else {
        // Assume it's already a Buffer
        buffer = fileData;
      }
      
      // For PDF templates, we need to extract text and create a new PDF
      // Note: Full PDF form-filling would require libraries like pdf-lib
      const pdfData = await pdfParse(buffer);
      let content = pdfData.text;
      
      console.log('📋 Extracted PDF content length:', content.length);
      console.log('🔍 Available placeholders:', Object.keys(data).slice(0, 10));
      
      // Replace placeholders in the extracted text
      let replacementCount = 0;
      Object.entries(data).forEach(([placeholder, value]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const beforeReplace = content;
        content = content.replace(regex, String(value || ''));
        if (beforeReplace !== content) {
          replacementCount++;
          console.log(`✅ Replaced ${placeholder} with "${value}"`);
        }
      });
      
      console.log(`📊 Made ${replacementCount} placeholder replacements`);
      
      // Create a new PDF with the processed content
      const timestamp = Date.now();
      const filename = `generated_document_${timestamp}.pdf`;
      const outputPath = path.join(this.outputDir, filename);
      
      const doc = new PDFDocument({
        margin: 50,
        info: {
          Title: 'Generated Document',
          Author: 'Peak 1031 Platform',
          Subject: 'Generated 1031 Exchange Document'
        }
      });

      return new Promise((resolve, reject) => {
        const stream = require('fs').createWriteStream(outputPath);
        doc.pipe(stream);

        // Add the processed content to the PDF
        doc.fontSize(12);
        
        // Split content into paragraphs for better formatting
        const paragraphs = content.split('\n\n').filter(p => p.trim());
        
        paragraphs.forEach((paragraph, index) => {
          if (paragraph.trim()) {
            doc.text(paragraph.trim(), { align: 'left' });
            if (index < paragraphs.length - 1) {
              doc.moveDown(0.5);
            }
          }
        });

        doc.end();

        stream.on('finish', async () => {
          try {
            const stats = await fs.stat(outputPath);
            resolve({
              filename: filename,
              filePath: outputPath,
              fileSize: stats.size,
              mimeType: 'application/pdf',
              content: content,
              replacementCount: replacementCount
            });
          } catch (err) {
            reject(err);
          }
        });

        stream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error processing PDF template:', error);
      throw new Error(`Failed to process PDF template: ${error.message}`);
    }
  }

  /**
   * Process DOCX template with enhanced error handling
   */
  async processDocxTemplate(fileData, data) {
    try {
      console.log('📄 Processing DOCX template with docxtemplater...');
      
      // Convert Blob/File to Buffer if needed
      let buffer;
      if (fileData instanceof Blob) {
        console.log('📄 Converting Blob to Buffer...');
        const arrayBuffer = await fileData.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (fileData instanceof ArrayBuffer) {
        console.log('📄 Converting ArrayBuffer to Buffer...');
        buffer = Buffer.from(fileData);
      } else {
        // Assume it's already a Buffer
        buffer = fileData;
      }
      
      console.log('🔍 Available placeholders:', Object.keys(data).slice(0, 10));
      console.log(`📋 Total placeholders available: ${Object.keys(data).length}`);
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Template file is empty or invalid');
      }
      
      // Load the docx file as binary content
      let zip;
      try {
        zip = new PizZip(buffer);
      } catch (zipError) {
        console.error('❌ Error creating PizZip from buffer:', zipError);
        throw new Error('Invalid DOCX file format');
      }
      
      let doc;
      try {
        // Initialize Docxtemplater with options in constructor
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: {
            start: '#',
            end: '#'
          }
        });
      } catch (docError) {
        console.error('❌ Error creating Docxtemplater:', {
          message: docError.message,
          stack: docError.stack,
          name: docError.name,
          properties: docError.properties || {},
          offsets: docError.offsets || []
        });
        throw new Error(`Failed to initialize document template processor: ${docError.message || 'Unknown error'}`);
      }
      
      // Prepare data for docxtemplater with intelligent client identification
      const templateData = {};
      const warnings = [];
      
      // Enhanced data preparation with intelligent client identification
      const enhancedData = this.prepareEnhancedTemplateData(data);
      
      Object.entries(enhancedData).forEach(([key, value]) => {
        try {
          // Remove # from the beginning and end of the key
          const cleanKey = key.replace(/^#/, '').replace(/#$/, '');
          
          // Handle different data types for DOCX templates
          let processedValue = value;
          if (value !== null && value !== undefined) {
            if (typeof value === 'object') {
              // For complex objects, convert to JSON string for debugging
              processedValue = JSON.stringify(value);
            } else {
              processedValue = String(value);
            }
          } else {
            processedValue = '';
          }
          
          templateData[cleanKey] = processedValue;
          
          // Log if we're using a placeholder
          if (processedValue && processedValue !== '') {
            console.log(`✅ Will replace ${cleanKey} with: "${processedValue}"`);
          }
        } catch (keyError) {
          console.warn(`⚠️ Error processing key ${key}:`, keyError);
          warnings.push(`Failed to process placeholder: ${key}`);
        }
      });
      
      console.log('📋 Clean template data keys:', Object.keys(templateData).slice(0, 10));
      console.log(`📊 Total template data entries: ${Object.keys(templateData).length}`);
      
      // Validate template data
      if (Object.keys(templateData).length === 0) {
        console.warn('⚠️ No template data available for replacement');
        warnings.push('No template data available for replacement');
      }
      
      // Render the document (replace all occurrences of {placeholders})
      try {
        doc.render(templateData);
      } catch (renderError) {
        console.error('❌ Error rendering document:', renderError);
        
        // Provide detailed error information
        if (renderError.properties && renderError.properties.errors) {
          console.error('📋 Docxtemplater errors:', renderError.properties.errors);
          const errorDetails = renderError.properties.errors.map(err => err.message).join('; ');
          throw new Error(`Template rendering failed: ${errorDetails}`);
        } else if (renderError.message) {
          throw new Error(`Template rendering failed: ${renderError.message}`);
        } else {
          throw new Error('Template rendering failed with unknown error');
        }
      }
      
      // Get the processed document as a buffer
      let processedBuffer;
      try {
        processedBuffer = doc.getZip().generate({
          type: 'nodebuffer',
          compression: 'DEFLATE'
        });
      } catch (generateError) {
        console.error('❌ Error generating processed document:', generateError);
        throw new Error('Failed to generate processed document');
      }
      
      // Validate processed buffer
      if (!processedBuffer || processedBuffer.length === 0) {
        throw new Error('Generated document is empty');
      }
      
      // Generate a unique filename for the processed document
      const timestamp = Date.now();
      const templateName = this.currentTemplateName || 'document';
      const sanitizedTemplateName = templateName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      const exchangeId = this.currentExchangeId || 'unknown';
      const filename = `${sanitizedTemplateName}_${exchangeId}_${timestamp}.docx`;
      const outputPath = path.join(this.outputDir, filename);
      
      // Ensure output directory exists
      try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
      } catch (mkdirError) {
        console.error('❌ Error creating output directory:', mkdirError);
        throw new Error('Failed to create output directory');
      }
      
      // Write the processed DOCX file
      try {
        await fs.writeFile(outputPath, processedBuffer);
      } catch (writeError) {
        console.error('❌ Error writing processed document:', writeError);
        throw new Error('Failed to save processed document');
      }
      
      console.log(`📁 Generated DOCX document saved to: ${outputPath}`);
      
      // Get file stats
      let stats;
      try {
        stats = await fs.stat(outputPath);
      } catch (statError) {
        console.error('❌ Error getting file stats:', statError);
        stats = { size: processedBuffer.length };
      }
      
      // Count replacements by checking which template keys were found
      const replacementCount = Object.keys(templateData).filter(key => {
        return templateData[key] && templateData[key] !== '';
      }).length;
      
      console.log(`📊 Processed ${replacementCount} placeholders`);
      
      return {
        filename: filename,
        filePath: outputPath,
        fileSize: stats.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        replacementCount: replacementCount,
        warnings: warnings
      };
    } catch (error) {
      console.error('❌ Error processing DOCX template:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to process DOCX template';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      if (error.properties && error.properties.errors) {
        const errorDetails = error.properties.errors.map(err => err.message).join('; ');
        errorMessage += ` - Details: ${errorDetails}`;
      }
      
      throw new Error(errorMessage);
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
   * Transform exchange data to template format with comprehensive placeholders
   * Enhanced with intelligent client identification and DOCX support
   */
  transformExchangeData(exchange) {
    const client = exchange.client || {};
    const coordinator = exchange.coordinator || {};
    const currentDate = new Date();

    // Enhanced client identification system
    const clients = this.identifyClientsInExchange(exchange);
    const properties = this.identifyPropertiesInExchange(exchange);
    const participants = this.identifyParticipantsInExchange(exchange);

    // Helper function to format currency
    const formatCurrency = (amount) => {
      if (!amount) return '$0.00';
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(num || 0);
    };

    // Helper function to format dates
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Not specified';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return 'Invalid date';
      }
    };

    // Helper function to format client name consistently
    const formatClientName = (clientData) => {
      const firstName = clientData.firstName || clientData.first_name || '';
      const lastName = clientData.lastName || clientData.last_name || '';
      const company = clientData.company || clientData.companyName || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`.trim();
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      } else if (company) {
        return company;
      } else {
        return clientData.name || clientData.displayName || 'Unknown Client';
      }
    };

    // Helper function to calculate deadline dates
    const calculate45DayDeadline = (startDate) => {
      if (!startDate) return 'Not calculated';
      try {
        const start = new Date(startDate);
        const deadline = new Date(start.getTime() + (45 * 24 * 60 * 60 * 1000));
        return formatDate(deadline);
      } catch (e) {
        return 'Not calculated';
      }
    };

    const calculate180DayDeadline = (startDate) => {
      if (!startDate) return 'Not calculated';
      try {
        const start = new Date(startDate);
        const deadline = new Date(start.getTime() + (180 * 24 * 60 * 60 * 1000));
        return formatDate(deadline);
      } catch (e) {
        return 'Not calculated';
      }
    };

    return {
      // Exchange data
      '#Exchange.ID#': exchange.id || 'N/A',
      '#Exchange.Number#': exchange.exchange_number || exchange.id || 'N/A',
      '#Exchange.Name#': exchange.name || exchange.exchange_name || 'Unnamed Exchange',
      '#Exchange.Type#': exchange.exchange_type || 'Delayed Exchange',
      '#Exchange.Status#': exchange.status || exchange.new_status || 'Pending',
      '#Exchange.Value#': formatCurrency(exchange.exchange_value || exchange.total_value),
      
      // Client data
      '#Client.Name#': client.first_name && client.last_name 
        ? `${client.first_name} ${client.last_name}` 
        : client.name || 'Client Name Not Available',
      '#Client.FirstName#': client.first_name || 'First Name',
      '#Client.LastName#': client.last_name || 'Last Name', 
      '#Client.Email#': client.email || 'Email Not Available',
      '#Client.Phone#': client.phone || client.phone_number || 'Phone Not Available',
      '#Client.Company#': client.company || client.organization || '',
      '#Client.Address#': client.address || client.mailing_address || 'Address Not Available',
      '#Client.City#': client.city || '',
      '#Client.State#': client.state || '',
      '#Client.ZipCode#': client.zip_code || client.postal_code || '',
      
      // Contact data (same as client for compatibility)
      '#Contact.FirstName#': client.first_name || 'First Name',
      '#Contact.LastName#': client.last_name || 'Last Name',
      '#Contact.Email#': client.email || 'Email Not Available',
      '#Contact.Phone#': client.phone || client.phone_number || 'Phone Not Available',
      '#Contact.HomeNumber#': client.phone || client.phone_number || 'Phone Not Available',
      '#Contact.Street1#': client.street || client.street1 || client.address || 'Address',
      '#Contact.Street2#': client.street2 || '',
      '#Contact.City#': client.city || 'City',
      '#Contact.ProvinceState#': client.state || client.province_state || 'State',
      '#Contact.ZipPostalCode#': client.zip_code || client.postal_code || 'Zip',
      '#Contact.Fee#': formatCurrency(exchange.fee || exchange.qi_fee || 1500),
      '#Contact.2nd Signatory Address#': exchange.client2_address || '',
      '#Contact.2nd Signatory Phone#': exchange.client2_phone || '',
      '#Contact.2nd Signatory Email#': exchange.client2_email || '',
      
      // Property data
      '#Property.Address#': exchange.relinquished_property_address || exchange.property_address || 'Property Address Not Available',
      '#Property.RelinquishedAddress#': exchange.relinquished_property_address || 'Relinquished Property Address Not Available',
      '#Property.SalePrice#': formatCurrency(exchange.relinquished_sale_price || exchange.sale_price),
      '#Property.ReplacementValue#': formatCurrency(exchange.replacement_property_value || exchange.replacement_value),
      '#Property.Type#': exchange.property_type || 'Real Estate',
      
      // Financial data
      '#Financial.ExchangeValue#': formatCurrency(exchange.exchange_value || exchange.total_value),
      '#Financial.RelinquishedValue#': formatCurrency(exchange.relinquished_value || exchange.relinquished_sale_price),
      '#Financial.ReplacementValue#': formatCurrency(exchange.replacement_value || exchange.replacement_property_value),
      '#Financial.SalePrice#': formatCurrency(exchange.sale_price || exchange.relinquished_sale_price),
      '#Financial.NetProceeds#': formatCurrency(exchange.net_proceeds),
      
      // Dates
      '#Date.Start#': formatDate(exchange.start_date || exchange.created_at),
      '#Date.IdentificationDeadline#': exchange.identification_deadline 
        ? formatDate(exchange.identification_deadline)
        : calculate45DayDeadline(exchange.start_date || exchange.created_at),
      '#Date.CompletionDeadline#': exchange.completion_deadline 
        ? formatDate(exchange.completion_deadline)
        : calculate180DayDeadline(exchange.start_date || exchange.created_at),
      '#Date.RelinquishedClosing#': formatDate(exchange.relinquished_closing_date || exchange.closing_date),
      '#Date.Current#': formatDate(currentDate),
      '#Date.Today#': formatDate(currentDate),
      '#Date.Creation#': formatDate(exchange.created_at),
      '#Date.LastUpdated#': formatDate(exchange.updated_at),
      
      // Coordinator data
      '#Coordinator.Name#': coordinator.first_name && coordinator.last_name 
        ? `${coordinator.first_name} ${coordinator.last_name}` 
        : coordinator.name || 'Coordinator Not Assigned',
      '#Coordinator.FirstName#': coordinator.first_name || 'Coordinator',
      '#Coordinator.LastName#': coordinator.last_name || 'Name',
      '#Coordinator.Email#': coordinator.email || 'coordinator@peak1031.com',
      '#Coordinator.Phone#': coordinator.phone || coordinator.phone_number || '(555) 123-4567',
      '#Coordinator.Title#': coordinator.title || 'Exchange Coordinator',
      
      // User data (current user/coordinator)
      '#User.FirstName#': coordinator.first_name || 'User',
      '#User.LastName#': coordinator.last_name || 'Name',
      '#User.Title#': coordinator.title || coordinator.role || 'Exchange Coordinator',
      '#User.Email#': coordinator.email || 'user@peak1031.com',
      '#User.Phone#': coordinator.phone || coordinator.phone_number || '(555) 123-4567',
      
      // QI data
      '#QI.Company#': 'Peak 1031 Exchange Services',
      '#QI.Name#': coordinator.first_name && coordinator.last_name 
        ? `${coordinator.first_name} ${coordinator.last_name}` 
        : 'Qualified Intermediary',
      '#QI.Address#': '123 Exchange Street, Suite 100, Finance City, FC 12345',
      '#QI.Phone#': '(555) 123-4567',
      '#QI.Email#': 'info@peak1031.com',
      
      // System data
      '#System.Priority#': exchange.priority || 'Medium',
      '#System.RiskLevel#': exchange.risk_level || 'Medium',
      '#System.Notes#': exchange.notes || exchange.internal_notes || '',
      '#System.CurrentDate#': formatDate(currentDate),
      '#System.CurrentDateTime#': currentDate.toLocaleString(),
      '#System.GeneratedBy#': 'Peak 1031 Platform',
      '#System.Version#': '1.0',
      
      // Matter data (if applicable)
      '#Matter.Number#': exchange.matter_number || exchange.case_number || exchange.id,
      '#Matter.Name#': exchange.matter_name || exchange.name || exchange.exchange_name,
      '#Matter.Type#': '1031 Like-Kind Exchange',
      '#Matter.Client Vesting#': exchange.client_vesting || client.vesting || 
        (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : client.name) || 
        'Client Name',
      '#Matter.Client 1 Signatory Title#': exchange.client1_signatory_title || client.signatory_title || 'Authorized Signatory',
      '#Matter.Client 2 Name#': exchange.client2_name || '',
      '#Matter.Client 2 Signatory Title#': exchange.client2_signatory_title || '',
      
      // Relinquished property details
      '#Matter.Rel Property Address#': exchange.relinquished_property_address || exchange.property_address || 'Property Address',
      '#Matter.Rel Escrow Number#': exchange.relinquished_escrow_number || exchange.rel_escrow_number || '',
      '#Matter.Rel Settlement Agent.FirstName#': exchange.rel_settlement_agent_first_name || '',
      '#Matter.Rel Settlement Agent.LastName#': exchange.rel_settlement_agent_last_name || '',
      '#Matter.Rel Settlement Agent.Escrow Company Name#': exchange.rel_settlement_agent_company || exchange.rel_escrow_company || '',
      '#Matter.Rel Settlement Agent.Street1#': exchange.rel_settlement_agent_street1 || '',
      '#Matter.Rel Settlement Agent.Street2#': exchange.rel_settlement_agent_street2 || '',
      '#Matter.Rel Settlement Agent.City#': exchange.rel_settlement_agent_city || '',
      '#Matter.Rel Settlement Agent.ProvinceState#': exchange.rel_settlement_agent_state || '',
      '#Matter.Rel Settlement Agent.ZipPostalCode#': exchange.rel_settlement_agent_zip || '',
      
      // Replacement property 1 details
      '#Matter.Rep 1 Property Address#': exchange.replacement_property_address || exchange.rep1_property_address || '',
      '#Matter.Rep 1 Escrow Number#': exchange.replacement_escrow_number || exchange.rep1_escrow_number || '',
      '#Matter.Rep 1 Settlement Agent.FirstName#': exchange.rep1_settlement_agent_first_name || '',
      '#Matter.Rep 1 Settlement Agent.LastName#': exchange.rep1_settlement_agent_last_name || '',
      '#Matter.Rep 1 Settlement Agent.Escrow Company Name#': exchange.rep1_settlement_agent_company || exchange.rep1_escrow_company || '',
      '#Matter.Rep 1 Settlement Agent.Street1#': exchange.rep1_settlement_agent_street1 || '',
      '#Matter.Rep 1 Settlement Agent.Street2#': exchange.rep1_settlement_agent_street2 || '',
      '#Matter.Rep 1 Settlement Agent.City#': exchange.rep1_settlement_agent_city || '',
      '#Matter.Rep 1 Settlement Agent.ProvinceState#': exchange.rep1_settlement_agent_state || '',
      '#Matter.Rep 1 Settlement Agent.ZipPostalCode#': exchange.rep1_settlement_agent_zip || '',
      
      // Additional exchange details
      '#Exchange.Timeline#': exchange.timeline_type || 'Standard 180-Day Exchange',
      '#Exchange.Category#': exchange.category || 'Real Estate',
      '#Exchange.Complexity#': exchange.complexity || 'Standard',
      '#Exchange.Region#': exchange.region || 'United States',
      
      // Regulatory information
      '#Regulation.IRCSection#': 'Internal Revenue Code Section 1031',
      '#Regulation.Type#': 'Like-Kind Exchange',
      '#Regulation.TaxDeferred#': 'Yes - Tax Deferred Exchange'
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
