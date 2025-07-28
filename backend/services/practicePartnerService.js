const axios = require('axios');
const PracticePartnerSync = require('../models/PracticePartnerSync');
const Contact = require('../models/Contact');
const Exchange = require('../models/Exchange');
const Document = require('../models/Document');
const { v4: uuidv4 } = require('uuid');

class PracticePartnerService {
  constructor() {
    this.apiConfig = {
      baseURL: process.env.PRACTICEPARTNER_API_URL,
      headers: {
        'Authorization': `Bearer ${process.env.PRACTICEPARTNER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    this.client = axios.create(this.apiConfig);
  }

  // Data Transformation: PracticePartner's data structure → Your schema
  transformClientData(ppClient) {
    return {
      firstName: ppClient.firstName || ppClient.givenName || '',
      lastName: ppClient.lastName || ppClient.familyName || '',
      email: ppClient.email || '',
      phone: ppClient.phone || ppClient.telephone || '',
      company: ppClient.company || ppClient.organization || '',
      address: {
        street: ppClient.address?.street || '',
        city: ppClient.address?.city || '',
        state: ppClient.address?.state || '',
        zipCode: ppClient.address?.zipCode || ppClient.address?.postalCode || '',
        country: ppClient.address?.country || 'US'
      },
      ppClientId: ppClient.id || ppClient.clientId,
      ppMatterId: ppClient.matterId,
      source: 'practicepartner',
      metadata: {
        originalData: ppClient,
        importedAt: new Date(),
        lastSyncAt: new Date()
      }
    };
  }

  transformMatterData(ppMatter) {
    return {
      title: ppMatter.title || ppMatter.name || 'Untitled Exchange',
      description: ppMatter.description || ppMatter.notes || '',
      status: this.mapMatterStatus(ppMatter.status),
      type: '1031_exchange',
      ppMatterId: ppMatter.id || ppMatter.matterId,
      ppClientId: ppMatter.clientId,
      source: 'practicepartner',
      metadata: {
        originalData: ppMatter,
        importedAt: new Date(),
        lastSyncAt: new Date()
      }
    };
  }

  transformDocumentData(ppDocument) {
    return {
      originalFilename: ppDocument.filename || ppDocument.name || 'Unknown Document',
      fileSize: ppDocument.fileSize || 0,
      mimeType: ppDocument.mimeType || ppDocument.contentType || 'application/octet-stream',
      ppDocumentId: ppDocument.id || ppDocument.documentId,
      ppMatterId: ppDocument.matterId,
      source: 'practicepartner',
      metadata: {
        originalData: ppDocument,
        importedAt: new Date(),
        lastSyncAt: new Date()
      }
    };
  }

  mapMatterStatus(ppStatus) {
    const statusMap = {
      'active': 'in_progress',
      'pending': 'pending',
      'closed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[ppStatus?.toLowerCase()] || 'pending';
  }

  // Duplicate Handling: What if records already exist?
  async handleDuplicateContact(transformedData) {
    const existingContact = await Contact.findOne({
      $or: [
        { ppClientId: transformedData.ppClientId },
        { 
          email: transformedData.email,
          'metadata.source': 'practicepartner'
        }
      ]
    });

    if (existingContact) {
      // Update existing record with new data
      const updatedContact = await Contact.findByIdAndUpdate(
        existingContact._id,
        {
          ...transformedData,
          'metadata.lastSyncAt': new Date(),
          'metadata.originalData': transformedData.metadata.originalData
        },
        { new: true }
      );
      return { action: 'updated', record: updatedContact };
    } else {
      // Create new record
      const newContact = new Contact(transformedData);
      const savedContact = await newContact.save();
      return { action: 'created', record: savedContact };
    }
  }

  async handleDuplicateExchange(transformedData) {
    const existingExchange = await Exchange.findOne({
      ppMatterId: transformedData.ppMatterId
    });

    if (existingExchange) {
      // Update existing exchange
      const updatedExchange = await Exchange.findByIdAndUpdate(
        existingExchange._id,
        {
          ...transformedData,
          'metadata.lastSyncAt': new Date(),
          'metadata.originalData': transformedData.metadata.originalData
        },
        { new: true }
      );
      return { action: 'updated', record: updatedExchange };
    } else {
      // Create new exchange
      const newExchange = new Exchange(transformedData);
      const savedExchange = await newExchange.save();
      return { action: 'created', record: savedExchange };
    }
  }

  async handleDuplicateDocument(transformedData) {
    const existingDocument = await Document.findOne({
      ppDocumentId: transformedData.ppDocumentId
    });

    if (existingDocument) {
      // Update existing document metadata
      const updatedDocument = await Document.findByIdAndUpdate(
        existingDocument._id,
        {
          ...transformedData,
          'metadata.lastSyncAt': new Date(),
          'metadata.originalData': transformedData.metadata.originalData
        },
        { new: true }
      );
      return { action: 'updated', record: updatedDocument };
    } else {
      // Create new document record
      const newDocument = new Document(transformedData);
      const savedDocument = await newDocument.save();
      return { action: 'created', record: savedDocument };
    }
  }

  // Incremental Updates: How to sync ongoing changes?
  async getIncrementalData(lastSyncTime) {
    try {
      const response = await this.client.get('/api/changes', {
        params: {
          since: lastSyncTime.toISOString(),
          include: 'clients,matters,documents'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch incremental data: ${error.message}`);
    }
  }

  async getFullData() {
    try {
      const [clientsResponse, mattersResponse, documentsResponse] = await Promise.all([
        this.client.get('/api/clients'),
        this.client.get('/api/matters'),
        this.client.get('/api/documents')
      ]);

      return {
        clients: clientsResponse.data,
        matters: mattersResponse.data,
        documents: documentsResponse.data
      };
    } catch (error) {
      throw new Error(`Failed to fetch full data: ${error.message}`);
    }
  }

  // Error Handling: Invalid data, missing fields
  validateClientData(ppClient) {
    const errors = [];
    
    if (!ppClient.id && !ppClient.clientId) {
      errors.push('Missing client ID');
    }
    
    if (!ppClient.firstName && !ppClient.givenName) {
      errors.push('Missing first name');
    }
    
    if (!ppClient.lastName && !ppClient.familyName) {
      errors.push('Missing last name');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateMatterData(ppMatter) {
    const errors = [];
    
    if (!ppMatter.id && !ppMatter.matterId) {
      errors.push('Missing matter ID');
    }
    
    if (!ppMatter.clientId) {
      errors.push('Missing client ID reference');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateDocumentData(ppDocument) {
    const errors = [];
    
    if (!ppDocument.id && !ppDocument.documentId) {
      errors.push('Missing document ID');
    }
    
    if (!ppDocument.matterId) {
      errors.push('Missing matter ID reference');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Main sync method
  async syncData(syncType = 'incremental', userId = null) {
    const syncId = uuidv4();
    const syncRecord = new PracticePartnerSync({
      syncId,
      syncType,
      status: 'running',
      createdBy: userId
    });

    await syncRecord.save();

    try {
      const lastSync = await PracticePartnerSync.findOne({
        status: 'completed',
        syncType: { $in: ['full', 'incremental'] }
      }).sort({ startTime: -1 });

      const lastSyncTime = lastSync?.config?.lastSyncTime || new Date(0);
      let data;

      if (syncType === 'full') {
        data = await this.getFullData();
      } else {
        data = await this.getIncrementalData(lastSyncTime);
      }

      const statistics = {
        totalRecords: 0,
        importedRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0
      };

      const errors = [];

      // Process clients
      for (const client of data.clients || []) {
        statistics.totalRecords++;
        
        const validation = this.validateClientData(client);
        if (!validation.isValid) {
          statistics.errorRecords++;
          errors.push({
            recordId: client.id || client.clientId,
            recordType: 'client',
            error: validation.errors.join(', ')
          });
          continue;
        }

        try {
          const transformedData = this.transformClientData(client);
          const result = await this.handleDuplicateContact(transformedData);
          
          if (result.action === 'created') {
            statistics.importedRecords++;
          } else {
            statistics.updatedRecords++;
          }
        } catch (error) {
          statistics.errorRecords++;
          errors.push({
            recordId: client.id || client.clientId,
            recordType: 'client',
            error: error.message
          });
        }
      }

      // Process matters
      for (const matter of data.matters || []) {
        statistics.totalRecords++;
        
        const validation = this.validateMatterData(matter);
        if (!validation.isValid) {
          statistics.errorRecords++;
          errors.push({
            recordId: matter.id || matter.matterId,
            recordType: 'matter',
            error: validation.errors.join(', ')
          });
          continue;
        }

        try {
          const transformedData = this.transformMatterData(matter);
          const result = await this.handleDuplicateExchange(transformedData);
          
          if (result.action === 'created') {
            statistics.importedRecords++;
          } else {
            statistics.updatedRecords++;
          }
        } catch (error) {
          statistics.errorRecords++;
          errors.push({
            recordId: matter.id || matter.matterId,
            recordType: 'matter',
            error: error.message
          });
        }
      }

      // Process documents
      for (const document of data.documents || []) {
        statistics.totalRecords++;
        
        const validation = this.validateDocumentData(document);
        if (!validation.isValid) {
          statistics.errorRecords++;
          errors.push({
            recordId: document.id || document.documentId,
            recordType: 'document',
            error: validation.errors.join(', ')
          });
          continue;
        }

        try {
          const transformedData = this.transformDocumentData(document);
          const result = await this.handleDuplicateDocument(transformedData);
          
          if (result.action === 'created') {
            statistics.importedRecords++;
          } else {
            statistics.updatedRecords++;
          }
        } catch (error) {
          statistics.errorRecords++;
          errors.push({
            recordId: document.id || document.documentId,
            recordType: 'document',
            error: error.message
          });
        }
      }

      // Update sync record
      const status = errors.length > 0 ? 'partial' : 'completed';
      await PracticePartnerSync.findByIdAndUpdate(syncRecord._id, {
        status,
        endTime: new Date(),
        statistics,
        errors,
        'config.lastSyncTime': new Date()
      });

      return {
        syncId,
        status,
        statistics,
        errors: errors.length
      };

    } catch (error) {
      await PracticePartnerSync.findByIdAndUpdate(syncRecord._id, {
        status: 'failed',
        endTime: new Date(),
        errors: [{
          recordId: 'SYSTEM',
          recordType: 'sync',
          error: error.message
        }]
      });

      throw error;
    }
  }

  // Audit Trail: Track what was imported when
  async getSyncHistory(limit = 50) {
    return await PracticePartnerSync.find()
      .sort({ startTime: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');
  }

  async getSyncDetails(syncId) {
    return await PracticePartnerSync.findOne({ syncId })
      .populate('createdBy', 'firstName lastName email');
  }
}

module.exports = new PracticePartnerService(); 