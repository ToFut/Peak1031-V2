const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');
// const DocumentTemplateService = require('../services/documentTemplates'); // Uses Sequelize
const bcrypt = require('bcryptjs');
// const { Op } = require('sequelize'); // Not needed with Supabase
// const { Document, Exchange, User } = require('../models'); // Using Supabase instead

const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for memory storage (Supabase upload)
const upload = multer({
  storage: multer.memoryStorage(),
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Test endpoint for debugging uploads (bypass auth)
router.post('/test-upload', upload.single('file'), async (req, res) => {
  console.log('\n🧪 TEST UPLOAD ENDPOINT HIT');
  console.log('📤 File received:', req.file ? req.file.originalname : 'No file');
  console.log('📋 Body data:', req.body);
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const exchangeId = req.body.exchangeId || 'test-exchange';
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const fileExtension = path.extname(req.file.originalname);
  const storedFilename = `${uniqueSuffix}${fileExtension}`;
  const supabaseFilePath = `exchanges/${exchangeId}/${storedFilename}`;

  console.log(`🔄 Testing Supabase upload: ${supabaseFilePath}`);
  console.log(`🔧 Supabase client status: ${supabaseService.client ? 'Initialized' : 'Not initialized'}`);

  try {
    const bucketName = 'documents';
    await supabaseService.uploadFile(bucketName, supabaseFilePath, req.file.buffer, {
      contentType: req.file.mimetype
    });

    console.log('✅ Test upload successful');
    res.json({ 
      success: true, 
      message: 'Test upload successful',
      filename: req.file.originalname,
      storedAs: supabaseFilePath
    });
  } catch (error) {
    console.error('❌ Test upload failed:', error);
    res.status(500).json({ 
      error: 'Test upload failed', 
      details: error.message 
    });
  }
});

// Get all documents (role-filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, exchangeId, pinRequired, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { original_filename: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (exchangeId) {
      whereClause.exchange_id = exchangeId;
    }
    
    if (pinRequired !== undefined) {
      whereClause.pin_required = pinRequired === 'true';
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      const userExchanges = await databaseService.getExchanges({
        where: { client_id: req.user.id }
      });
      whereClause.exchange_id = { [Op.in]: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      const userExchanges = await databaseService.getExchanges({
        where: { coordinator_id: req.user.id }
      });
      whereClause.exchange_id = { [Op.in]: userExchanges.map(e => e.id) };
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
    const exchangeId = req.params.exchangeId;
    console.log(`📋 Fetching documents for exchange: ${exchangeId}`);

    // Get regular documents
    const documents = await databaseService.getDocuments({
      where: { exchange_id: exchangeId },
      orderBy: { column: 'created_at', ascending: false }
    });

    // Get generated documents from templates
    const { data: generatedDocs, error: genError } = await supabase
      .from('generated_documents')
      .select(`
        *,
        template:template_id(name, category, description)
      `)
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });

    if (genError) {
      console.error('❌ Error fetching generated documents:', genError);
      // Continue without generated docs rather than failing completely
    }

    // Combine and format all documents
    const allDocuments = [
      // Regular documents
      ...documents.map(doc => ({
        ...doc,
        document_type: 'uploaded',
        source: 'manual_upload'
      })),
      // Generated documents
      ...(generatedDocs || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        file_url: doc.file_url,
        exchange_id: doc.exchange_id,
        category: doc.template?.category || 'generated',
        description: doc.template?.description || doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        document_type: 'generated',
        source: 'template_generation',
        template_id: doc.template_id,
        template_name: doc.template?.name,
        auto_generated: doc.auto_generated || false,
        trigger_stage: doc.trigger_stage,
        generated_by: doc.generated_by
      }))
    ];

    // Sort all documents by creation date
    allDocuments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ Found ${documents.length} regular + ${generatedDocs?.length || 0} generated documents`);

    res.json({ 
      data: allDocuments,
      summary: {
        total: allDocuments.length,
        uploaded: documents.length,
        generated: generatedDocs?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching exchange documents:', error);
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
    
    if (!exchangeId) {
      return res.status(400).json({ error: 'Exchange ID is required' });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(req.file.originalname);
    const storedFilename = `${uniqueSuffix}${fileExtension}`;
    const supabaseFilePath = `exchanges/${exchangeId}/${storedFilename}`;

    let finalFilePath = supabaseFilePath;
    let storageProvider = 'supabase';
    let uploadMessage = 'Document uploaded successfully to Supabase storage';

    try {
      // Try to upload file to Supabase storage first
      const bucketName = 'documents';
      console.log(`🔄 Attempting Supabase upload: ${supabaseFilePath}`);
      console.log(`📊 File info: ${req.file.originalname}, Size: ${req.file.size}, Type: ${req.file.mimetype}`);
      console.log(`🔧 Supabase client status: ${supabaseService.client ? 'Initialized' : 'Not initialized'}`);
      
      if (!supabaseService.client) {
        throw new Error('Supabase client not initialized - check environment variables');
      }
      
      await supabaseService.uploadFile(bucketName, supabaseFilePath, req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user.id,
          exchangeId: exchangeId
        }
      });

      console.log('✅ Supabase upload successful');
    } catch (storageError) {
      console.error('❌ Supabase storage failed, falling back to local storage:', storageError);
      
      // Fallback to local file storage
      try {
        console.log(`🔄 Attempting local storage fallback...`);
        const uploadDir = path.join(__dirname, '../uploads/exchanges', exchangeId);
        console.log(`📁 Creating directory: ${uploadDir}`);
        await fs.mkdir(uploadDir, { recursive: true });
        
        const localFilePath = path.join(uploadDir, storedFilename);
        console.log(`💾 Writing file to: ${localFilePath}`);
        await fs.writeFile(localFilePath, req.file.buffer);
        
        finalFilePath = `uploads/exchanges/${exchangeId}/${storedFilename}`;
        storageProvider = 'local';
        uploadMessage = 'Document uploaded successfully to local storage (Supabase unavailable)';
        
        console.log('✅ Local storage fallback successful');
      } catch (localError) {
        console.error('❌ Both Supabase and local storage failed:', localError);
        console.error('Local error details:', {
          message: localError.message,
          code: localError.code,
          path: localError.path
        });
        return res.status(500).json({ 
          error: 'Failed to upload file to any storage', 
          details: `Supabase: ${storageError.message}, Local: ${localError.message}`
        });
      }
    }

    // Hash PIN if required
    let pinHash = null;
    if (pinRequired === 'true' && pin) {
      pinHash = await bcrypt.hash(pin, 12);
    }

    // Save document metadata to database
    const document = await databaseService.createDocument({
      original_filename: req.file.originalname,
      stored_filename: storedFilename,
      file_path: finalFilePath,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      exchange_id: exchangeId,
      uploaded_by: req.user.id,
      category: category || 'general',
      description,
      pin_required: pinRequired === 'true',
      pin_hash: pinHash,
      storage_provider: storageProvider
    });

    res.status(201).json({ 
      data: document,
      message: uploadMessage,
      storage_provider: storageProvider
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const document = await databaseService.getDocumentById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document requires PIN
    if (document.pin_required) {
      const { pin } = req.query;
      if (!pin) {
        return res.status(400).json({ error: 'PIN required for this document' });
      }

      const isValidPin = await bcrypt.compare(pin, document.pin_hash);
      if (!isValidPin) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    try {
      // Check if using Supabase storage or local file
      if (document.storage_provider === 'supabase' || document.file_path.startsWith('exchanges/')) {
        // Download from Supabase storage
        const bucketName = 'documents';
        const fileData = await supabaseService.downloadFile(bucketName, document.file_path);
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
        res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
        res.setHeader('Content-Length', document.file_size);
        
        // Send file data
        res.send(fileData);
      } else {
        // Fallback to local file system (for legacy documents)
        const filePath = path.join(__dirname, '..', document.file_path);
        
        if (!await fs.access(filePath).then(() => true).catch(() => false)) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        res.download(filePath, document.original_filename);
      }
    } catch (storageError) {
      console.error('File download error:', storageError);
      return res.status(500).json({ 
        error: 'Failed to download file', 
        details: storageError.message 
      });
    }
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const document = await databaseService.getDocumentById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    try {
      // Delete file from storage
      if (document.storage_provider === 'supabase' || document.file_path.startsWith('exchanges/')) {
        // Delete from Supabase storage
        const bucketName = 'documents';
        await supabaseService.deleteFile(bucketName, document.file_path);
      } else {
        // Delete from local filesystem (legacy)
        const filePath = path.join(__dirname, '..', document.file_path);
        if (await fs.access(filePath).then(() => true).catch(() => false)) {
          await fs.unlink(filePath);
        }
      }
    } catch (storageError) {
      console.warn('Failed to delete file from storage:', storageError.message);
      // Continue with database deletion even if file deletion fails
    }

    // Delete document record from database
    await databaseService.delete('documents', { id: req.params.id });
    
    res.json({ 
      message: 'Document deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Document deletion error:', error);
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
    // Fetch templates from Supabase
    const templates = await supabaseService.select('document_templates', {
      where: { is_active: true },
      orderBy: { column: 'created_at', ascending: false }
    });
    res.json(templates || []);
  } catch (error) {
    console.error('Error fetching templates:', error);
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