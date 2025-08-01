const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const DocumentTemplateService = require('../services/documentTemplates');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const exchangeId = req.body.exchangeId;
    const uploadDir = path.join(__dirname, '../uploads/exchanges', exchangeId);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all documents (role-filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, exchangeId, pinRequired, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { originalFilename: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (exchangeId) {
      whereClause.exchangeId = exchangeId;
    }
    
    if (pinRequired !== undefined) {
      whereClause.pinRequired = pinRequired === 'true';
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      const userExchanges = await databaseService.getExchanges({
        where: { clientId: req.user.id }
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      const userExchanges = await databaseService.getExchanges({
        where: { coordinatorId: req.user.id }
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    }

    const documents = await databaseService.getDocuments({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: sortBy, ascending: sortOrder === 'ASC' }
    });

    res.json({
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: documents.length,
        totalPages: Math.ceil(documents.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documents for specific exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const documents = await databaseService.getDocuments({
      where: { exchangeId: req.params.exchangeId },
      orderBy: { column: 'createdAt', ascending: false }
    });

    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document
router.post('/', authenticateToken, checkPermission('documents', 'write'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { exchangeId, category, description, pinRequired, pin } = req.body;
    
    let pinHash = null;
    if (pinRequired === 'true' && pin) {
      pinHash = await bcrypt.hash(pin, 12);
    }

    const document = await databaseService.createDocument({
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      exchangeId,
      uploadedBy: req.user.id,
      category: category || 'general',
      description,
      pinRequired: pinRequired === 'true',
      pinHash
    });

    res.status(201).json({ data: document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document requires PIN
    if (document.pinRequired) {
      const { pin } = req.query;
      if (!pin) {
        return res.status(400).json({ error: 'PIN required for this document' });
      }

      const isValidPin = await bcrypt.compare(pin, document.pinHash);
      if (!isValidPin) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    const filePath = path.join(__dirname, '..', document.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, document.originalFilename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', document.filePath);
    if (fs.existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    await document.destroy();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'uploader' }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ data: document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify PIN for document
router.post('/:id/verify-pin', authenticateToken, async (req, res) => {
  try {
    const { pin } = req.body;
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.pinRequired) {
      return res.status(400).json({ error: 'This document does not require a PIN' });
    }

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const isValidPin = await bcrypt.compare(pin, document.pinHash);
    
    if (!isValidPin) {
      // Log failed PIN attempt
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'DOCUMENT_PIN_FAILED',
        entityType: 'document',
        entityId: document.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          documentName: document.originalFilename,
          exchangeId: document.exchangeId
        }
      });
      
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Log successful PIN verification
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'DOCUMENT_PIN_SUCCESS',
      entityType: 'document',
      entityId: document.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        documentName: document.originalFilename,
        exchangeId: document.exchangeId
      }
    });

    res.json({ 
      success: true, 
      message: 'PIN verified successfully',
      documentId: document.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document PIN
router.put('/:id/pin', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { currentPin, newPin, enablePin, disablePin } = req.body;
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user owns this document or is admin
    if (document.uploadedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to modify this document' });
    }

    if (disablePin) {
      // Disable PIN protection
      if (document.pinRequired && currentPin) {
        const isValidPin = await bcrypt.compare(currentPin, document.pinHash);
        if (!isValidPin) {
          return res.status(401).json({ error: 'Invalid current PIN' });
        }
      }

      await document.update({
        pinRequired: false,
        pinHash: null
      });

      return res.json({ 
        success: true, 
        message: 'PIN protection disabled' 
      });
    }

    if (enablePin || newPin) {
      // Enable PIN protection or update PIN
      if (!newPin) {
        return res.status(400).json({ error: 'New PIN is required' });
      }

      if (newPin.length < 4) {
        return res.status(400).json({ error: 'PIN must be at least 4 characters' });
      }

      // If document already has PIN, verify current PIN
      if (document.pinRequired && currentPin) {
        const isValidPin = await bcrypt.compare(currentPin, document.pinHash);
        if (!isValidPin) {
          return res.status(401).json({ error: 'Invalid current PIN' });
        }
      }

      const newPinHash = await bcrypt.hash(newPin, 12);
      
      await document.update({
        pinRequired: true,
        pinHash: newPinHash
      });

      // Log PIN update
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'DOCUMENT_PIN_UPDATED',
        entityType: 'document',
        entityId: document.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          documentName: document.originalFilename,
          exchangeId: document.exchangeId,
          action: document.pinRequired ? 'updated' : 'enabled'
        }
      });

      res.json({ 
        success: true, 
        message: 'PIN protection updated successfully' 
      });
    } else {
      res.status(400).json({ error: 'Invalid request parameters' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document access history
router.get('/:id/access-history', authenticateToken, checkPermission('documents', 'read'), async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const AuditLog = require('../models/AuditLog');
    const accessHistory = await AuditLog.findAll({
      where: {
        entityType: 'document',
        entityId: document.id,
        action: {
          [Op.in]: ['DOCUMENT_DOWNLOAD', 'DOCUMENT_PIN_SUCCESS', 'DOCUMENT_PIN_FAILED', 'DOCUMENT_VIEW']
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ 
      data: accessHistory,
      documentName: document.originalFilename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk PIN operations
router.post('/bulk-pin-update', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { documentIds, action, pin } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({ error: 'Document IDs array is required' });
    }

    const documents = await Document.findAll({
      where: {
        id: { [Op.in]: documentIds },
        [Op.or]: [
          { uploadedBy: req.user.id },
          ...(req.user.role === 'admin' ? [{}] : [])
        ]
      }
    });

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found or access denied' });
    }

    let updateData = {};
    let message = '';

    if (action === 'enable_pin') {
      if (!pin || pin.length < 4) {
        return res.status(400).json({ error: 'PIN must be at least 4 characters' });
      }
      
      const pinHash = await bcrypt.hash(pin, 12);
      updateData = {
        pinRequired: true,
        pinHash: pinHash
      };
      message = 'PIN protection enabled for selected documents';
    } else if (action === 'disable_pin') {
      updateData = {
        pinRequired: false,
        pinHash: null
      };
      message = 'PIN protection disabled for selected documents';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await Document.update(updateData, {
      where: { id: { [Op.in]: documents.map(d => d.id) } }
    });

    // Log bulk operation
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'DOCUMENT_BULK_PIN_UPDATE',
      entityType: 'document',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        action,
        documentCount: documents.length,
        documentIds: documents.map(d => d.id)
      }
    });

    res.json({ 
      success: true, 
      message,
      updatedCount: documents.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Template management routes

// Get available templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = DocumentTemplateService.getAvailableTemplates();
    res.json({ data: templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate document from template
router.post('/generate', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { templateId, exchangeId, additionalData } = req.body;
    
    if (!templateId || !exchangeId) {
      return res.status(400).json({ error: 'Template ID and Exchange ID are required' });
    }

    const result = await DocumentTemplateService.generateDocument(templateId, exchangeId, additionalData);
    
    // Log document generation
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'DOCUMENT_GENERATED',
      entityType: 'document',
      entityId: result.document.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateId,
        templateName: result.templateUsed,
        exchangeId,
        documentName: result.document.originalFilename
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'Document generated successfully',
      data: result 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk generate documents
router.post('/bulk-generate', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { templateId, exchangeIds, additionalData } = req.body;
    
    if (!templateId || !exchangeIds || !Array.isArray(exchangeIds)) {
      return res.status(400).json({ error: 'Template ID and Exchange IDs array are required' });
    }

    const results = await DocumentTemplateService.bulkGenerateDocuments(templateId, exchangeIds, additionalData);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    // Log bulk generation
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'DOCUMENT_BULK_GENERATED',
      entityType: 'document',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateId,
        exchangeCount: exchangeIds.length,
        successCount,
        errorCount,
        exchangeIds
      }
    });

    res.json({ 
      success: true,
      message: `Generated ${successCount} documents successfully, ${errorCount} errors`,
      data: results,
      summary: {
        total: exchangeIds.length,
        successful: successCount,
        failed: errorCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get generated documents for exchange
router.get('/exchange/:exchangeId/generated', authenticateToken, async (req, res) => {
  try {
    const documents = await DocumentTemplateService.getGeneratedDocuments(req.params.exchangeId);
    res.json({ data: documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preview template data (without generating document)
router.post('/templates/:templateId/preview', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { exchangeId, additionalData } = req.body;

    if (!exchangeId) {
      return res.status(400).json({ error: 'Exchange ID is required' });
    }

    // Get exchange data
    const Exchange = require('../models/Exchange');
    const Contact = require('../models/Contact');
    const User = require('../models/User');
    
    const exchange = await Exchange.findByPk(exchangeId, {
      include: [
        { model: Contact, as: 'client' },
        { model: User, as: 'coordinator' }
      ]
    });

    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Prepare template data without generating PDF
    const templateData = await DocumentTemplateService.prepareTemplateData(exchange, additionalData);
    
    const template = DocumentTemplateService.getAvailableTemplates().find(t => t.id === templateId);
    
    res.json({ 
      success: true,
      template: template,
      templateData: templateData,
      exchange: {
        id: exchange.id,
        name: exchange.name || exchange.exchangeName,
        status: exchange.status || exchange.newStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete generated document
router.delete('/generated/:documentId', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const result = await DocumentTemplateService.deleteGeneratedDocument(req.params.documentId);
    
    // Log deletion
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'DOCUMENT_GENERATED_DELETED',
      entityType: 'document',
      entityId: req.params.documentId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        documentId: req.params.documentId
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 