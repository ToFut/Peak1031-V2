const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs').promises;
const path = require('path');

class DocxDocumentGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/docx');
    this.outputDir = path.join(__dirname, '../uploads/generated');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.promises.mkdir(this.templatesDir, { recursive: true });
      await fs.promises.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Generate DOCX document from template
   */
  async generateDocx(templateId, exchangeData, additionalData = {}) {
    try {
      console.log(`📄 Generating DOCX document: ${templateId} for exchange: ${exchangeData.exchangeId}`);
      
      // Get template file path
      const templatePath = path.join(this.templatesDir, `${templateId}.docx`);
      
      // Check if template exists
      try {
        await fs.access(templatePath);
      } catch (error) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      // Read template file
      const content = await fs.readFile(templatePath);
      const zip = new PizZip(content);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
      });

      // Prepare template data with advanced client identification
      const templateData = await this.prepareAdvancedTemplateData(exchangeData, additionalData);
      
      // Render the document
      doc.render(templateData);
      
      // Generate output file
      const outputBuffer = doc.getZip().generate({ type: 'nodebuffer' });
      const filename = `${templateId}_${exchangeData.exchangeId}_${Date.now()}.docx`;
      const outputPath = path.join(this.outputDir, filename);
      
      // Write file
      await fs.writeFile(outputPath, outputBuffer);
      
      console.log('✅ DOCX document generated successfully:', outputPath);
      
      return {
        success: true,
        filePath: outputPath,
        filename: filename,
        fileSize: outputBuffer.length,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

    } catch (error) {
      console.error('❌ Error generating DOCX document:', error);
      throw error;
    }
  }

  /**
   * Advanced template data preparation with intelligent client identification
   */
  async prepareAdvancedTemplateData(exchangeData, additionalData) {
    const clients = this.identifyClientsInExchange(exchangeData);
    const properties = this.identifyPropertiesInExchange(exchangeData);
    const participants = this.identifyParticipantsInExchange(exchangeData);
    
    return {
      // Exchange Information
      exchange: {
        id: exchangeData.exchangeId,
        name: exchangeData.exchangeName || exchangeData.name,
        number: exchangeData.exchangeNumber || exchangeData.number,
        status: exchangeData.exchangeStatus || exchangeData.status,
        type: exchangeData.exchangeType || exchangeData.type,
        value: exchangeData.exchangeValue || exchangeData.value,
        startDate: exchangeData.startDate,
        completionDate: exchangeData.completionDate,
        identificationDeadline: exchangeData.identificationDeadline,
        completionDeadline: exchangeData.completionDeadline
      },

      // Intelligent Client Identification
      clients: clients,
      primaryClient: clients.primary,
      secondaryClients: clients.secondary,
      allClients: clients.all,

      // Property Information
      properties: properties,
      relinquishedProperties: properties.relinquished,
      replacementProperties: properties.replacement,
      primaryRelinquishedProperty: properties.primaryRelinquished,
      primaryReplacementProperty: properties.primaryReplacement,

      // Participant Information
      participants: participants,
      coordinators: participants.coordinators,
      attorneys: participants.attorneys,
      accountants: participants.accountants,
      titleCompanies: participants.titleCompanies,

      // Financial Information
      financial: {
        exchangeValue: exchangeData.exchangeValue,
        relinquishedValue: exchangeData.relinquishedValue,
        replacementValue: exchangeData.replacementValue,
        cashBoot: exchangeData.cashBoot || 0,
        financingAmount: exchangeData.financingAmount,
        proceeds: exchangeData.proceeds
      },

      // Dates
      dates: {
        current: new Date().toLocaleDateString(),
        currentDateTime: new Date().toLocaleString(),
        identificationDeadline: exchangeData.identificationDeadline,
        completionDeadline: exchangeData.completionDeadline,
        startDate: exchangeData.startDate,
        completionDate: exchangeData.completionDate
      },

      // Company Information
      company: {
        name: 'Peak 1031 Exchange Services',
        address: '123 Exchange Street, Suite 100, Finance City, FC 12345',
        phone: '(555) 123-4567',
        email: 'info@peak1031.com',
        website: 'www.peak1031.com'
      },

      // Additional data
      ...additionalData
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
   * Get available DOCX templates
   */
  getAvailableTemplates() {
    return [
      {
        id: 'exchange_agreement',
        name: '1031 Exchange Agreement',
        description: 'Standard 1031 exchange agreement document',
        category: 'legal',
        filename: 'exchange_agreement.docx',
        fields: [
          'exchange.id', 'exchange.name', 'clients.primary.name',
          'properties.primaryRelinquished.address', 'properties.primaryReplacement.address'
        ]
      },
      {
        id: 'identification_notice',
        name: '45-Day Identification Notice',
        description: 'Notice of identified replacement properties',
        category: 'notice',
        filename: 'identification_notice.docx',
        fields: [
          'exchange.id', 'clients.primary.name', 'exchange.identificationDeadline',
          'properties.replacement', 'exchange.value'
        ]
      },
      {
        id: 'assignment_agreement',
        name: 'Assignment Agreement',
        description: 'Assignment of exchange agreement',
        category: 'legal',
        filename: 'assignment_agreement.docx',
        fields: [
          'exchange.id', 'clients.primary.name', 'clients.secondary',
          'exchange.startDate', 'exchange.value'
        ]
      },
      {
        id: 'completion_certificate',
        name: 'Exchange Completion Certificate',
        description: 'Certificate of completed 1031 exchange',
        category: 'certificate',
        filename: 'completion_certificate.docx',
        fields: [
          'exchange.id', 'clients.primary.name', 'exchange.completionDate',
          'properties.relinquished', 'properties.replacement', 'participants.coordinators'
        ]
      }
    ];
  }
}

module.exports = DocxDocumentGenerator;








