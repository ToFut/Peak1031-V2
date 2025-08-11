const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');
const AuditService = require('../services/audit');
// const DocumentTemplateService = require('../services/documentTemplates'); // Uses Sequelize
const bcrypt = require('bcryptjs');
// const { Op } = require('sequelize'); // Not needed with Supabase
// const { Document, Exchange, User } = require('../models'); // Using Supabase instead

// Helper for complex queries since we're not using Sequelize Op
const Op = {
  or: 'or',
  in: 'in',
  like: 'ilike',
  ne: 'neq'
};

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
      // For Supabase, we'll handle this differently
      whereClause.or = [
        { original_filename: { ilike: `%${search}%` } },
        { category: { ilike: `%${search}%` } }
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
      whereClause.exchange_id = { in: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      const userExchanges = await databaseService.getExchanges({
        where: { coordinator_id: req.user.id }
      });
      whereClause.exchange_id = { in: userExchanges.map(e => e.id) };
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
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw docError;
    }

    // Fetch uploader information for documents
    const uploaderIds = [...new Set((documents || []).filter(d => d.uploaded_by).map(d => d.uploaded_by))];
    let uploadersMap = {};
    
    if (uploaderIds.length > 0) {
      const { data: uploaders } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', uploaderIds);
      
      if (uploaders) {
        uploadersMap = uploaders.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

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
      // Regular documents with uploader info
      ...(documents || []).map(doc => {
        const uploader = uploadersMap[doc.uploaded_by];
        return {
          ...doc,
          document_type: 'uploaded',
          source: 'manual_upload',
          uploaded_by_name: uploader 
            ? `${uploader.first_name || ''} ${uploader.last_name || ''}`.trim() || uploader.email
            : 'Unknown'
        };
      }),
      // Generated documents
      ...(generatedDocs || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        original_filename: doc.name,
        file_path: doc.file_path,
        file_url: doc.file_url,
        exchange_id: doc.exchange_id,
        category: doc.template?.category || 'generated',
        description: doc.template?.description || doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        uploaded_by_name: 'System Generated',
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

    const { exchangeId, category, description, pinRequired, pin, folderId } = req.body;
    
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
    let finalPinRequired = pinRequired === 'true';
    
    if (finalPinRequired) {
      let pinToUse = pin;
      
      // If no PIN provided but user has default PIN, use it
      if (!pinToUse && req.user.default_document_pin) {
        pinToUse = req.user.default_document_pin;
        console.log('📌 Using user default PIN for document protection');
      }
      
      if (pinToUse) {
        pinHash = await bcrypt.hash(pinToUse, 12);
        console.log('🔐 PIN protection enabled for document');
      } else {
        // No PIN available, disable PIN protection
        finalPinRequired = false;
        console.log('⚠️ PIN protection requested but no PIN available');
      }
    }

    // Use the authenticated user's ID for uploaded_by field
    const uploadedBy = req.user.id;

    // Save document metadata to database
    const documentData = {
      original_filename: req.file.originalname,
      stored_filename: storedFilename,
      file_path: finalFilePath,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      exchange_id: exchangeId,
      uploaded_by: uploadedBy,
      category: category || 'general',
      pin_required: finalPinRequired,
      pin_hash: pinHash,
      storage_provider: storageProvider
      // Skip folder_id for now as column doesn't exist
    };

    // Only include description if it exists and the column is available
    if (description) {
      // For now, skip description as the column doesn't exist in the current schema
      console.log('📝 Description provided but column not available:', description);
    }

    const document = await databaseService.createDocument(documentData);

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
    console.log('📥 Document download request for ID:', req.params.id);
    const document = await databaseService.getDocumentById(req.params.id);
    
    if (!document) {
      console.log('❌ Document not found in database:', req.params.id);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log('📄 Document found:', {
      id: document.id,
      filename: document.original_filename,
      storage_provider: document.storage_provider,
      file_path: document.file_path
    });

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
        console.log('📦 Downloading from Supabase:', { bucketName, filePath: document.file_path });
        
        const fileData = await supabaseService.downloadFile(bucketName, document.file_path);
        
        if (!fileData) {
          console.error('❌ No file data received from Supabase');
          throw new Error('File data not found');
        }
        
        console.log('✅ File data received, size:', fileData.size || 'unknown');
        
        // Set appropriate headers
        const fileName = document.original_filename || document.originalFilename || document.filename || document.name || 'download';
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', document.mime_type || document.mimeType || 'application/octet-stream');
        if (document.file_size) {
          res.setHeader('Content-Length', document.file_size);
        }
        
        // Send file data as buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());
        res.send(buffer);
      } else {
        // Fallback to local file system (for legacy documents)
        const filePath = path.join(__dirname, '..', document.file_path);
        
        console.log('📂 Checking local file:', filePath);
        if (!await fs.access(filePath).then(() => true).catch(() => false)) {
          console.log('❌ Local file not found:', filePath);
          return res.status(404).json({ error: 'File not found' });
        }
        
        const fileName = document.original_filename || document.originalFilename || document.filename || document.name || 'download';
        res.download(filePath, fileName);
      }
    } catch (storageError) {
      console.error('❌ File download error:', storageError);
      console.error('Stack trace:', storageError.stack);
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
    const document = await databaseService.getDocumentById(req.params.id);

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
    const document = await databaseService.getDocumentById(req.params.id);
    
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
      // Using Supabase audit service instead of models
      await AuditService.log({
        action: 'DOCUMENT_PIN_FAILED',
        resourceType: 'document',
        resourceId: document.id,
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
    // Using Supabase audit service instead of models
    await AuditService.log({
      action: 'DOCUMENT_PIN_SUCCESS',
      resourceType: 'document',
      resourceId: document.id,
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
    const document = await databaseService.getDocumentById(req.params.id);
    
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
      // Using Supabase audit service instead of models
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
    const document = await databaseService.getDocumentById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get access history from Supabase
    const { data: accessHistory, error: historyError } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:user_id(id, first_name, last_name, email)
      `)
      .eq('entity_type', 'document')
      .eq('entity_id', document.id)
      .in('action', ['DOCUMENT_DOWNLOAD', 'DOCUMENT_PIN_SUCCESS', 'DOCUMENT_PIN_FAILED', 'DOCUMENT_VIEW'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('Error fetching access history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch access history' });
    }

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

    // For Supabase, we need to check permissions differently
    const documents = await databaseService.getDocuments({
      where: {
        id: { in: documentIds }
      }
    });

    // Filter documents based on permissions
    const accessibleDocuments = documents.filter(doc => 
      doc.uploaded_by === req.user.id || req.user.role === 'admin'
    );

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

    // Update documents using Supabase
    for (const doc of accessibleDocuments) {
      await databaseService.updateDocument(doc.id, updateData);
    }

    // Log bulk operation
    // Using Supabase audit service instead of models
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
    console.log('Templates endpoint called by:', req.user?.email);
    
    // Fetch templates from Supabase
    const templates = await supabaseService.select('document_templates', {
      where: { is_active: true },
      orderBy: { column: 'created_at', ascending: false }
    });
    
    console.log(`Returning ${templates?.length || 0} templates`);
    
    // Transform the data to match the expected frontend format
    const formattedTemplates = (templates || []).map(template => {
      // Safely parse JSON fields
      let templateData = {};
      let tags = [];
      let compatibility = {
        exchanges: ['all'],
        roles: ['admin', 'coordinator'],
        requirements: []
      };
      let settings = {
        autoFill: true,
        requireReview: false,
        allowEditing: true,
        expiresAfterDays: 30,
        watermark: false
      };

      try {
        if (template.template_data && typeof template.template_data === 'string') {
          templateData = JSON.parse(template.template_data);
        } else if (template.template_data && typeof template.template_data === 'object') {
          templateData = template.template_data;
        }
      } catch (e) {
        console.warn('Failed to parse template_data for template:', template.name);
      }

      try {
        if (template.tags && typeof template.tags === 'string') {
          tags = JSON.parse(template.tags);
        } else if (Array.isArray(template.tags)) {
          tags = template.tags;
        }
      } catch (e) {
        console.warn('Failed to parse tags for template:', template.name);
      }

      try {
        if (template.compatibility && typeof template.compatibility === 'string') {
          compatibility = { ...compatibility, ...JSON.parse(template.compatibility) };
        } else if (template.compatibility && typeof template.compatibility === 'object') {
          compatibility = { ...compatibility, ...template.compatibility };
        }
      } catch (e) {
        console.warn('Failed to parse compatibility for template:', template.name);
      }

      try {
        if (template.settings && typeof template.settings === 'string') {
          settings = { ...settings, ...JSON.parse(template.settings) };
        } else if (template.settings && typeof template.settings === 'object') {
          settings = { ...settings, ...template.settings };
        }
      } catch (e) {
        console.warn('Failed to parse settings for template:', template.name);
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description || '',
        category: template.category || 'general',
        type: template.type || 'pdf',
        version: template.version || '1.0.0',
        isActive: template.is_active !== false,
        isDefault: template.is_default === true,
        tags,
        fields: templateData.fields || [],
        metadata: {
          author: template.created_by || 'System',
          createdAt: template.created_at,
          updatedAt: template.updated_at,
          lastUsed: template.last_used,
          usageCount: template.usage_count || 0
        },
        compatibility,
        settings
      };
    });
    
    res.json(formattedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new template
router.post('/templates', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      type,
      template_data,
      tags,
      compatibility,
      settings
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Template name and category are required' });
    }

    const templateData = {
      name,
      description: description || '',
      category,
      type: type || 'pdf',
      template_data: template_data || { fields: [] },
      tags: tags || [],
      compatibility: compatibility || {
        exchanges: ['all'],
        roles: ['admin', 'coordinator'],
        requirements: []
      },
      settings: settings || {
        autoFill: true,
        requireReview: false,
        allowEditing: true,
        expiresAfterDays: 30,
        watermark: false
      },
      is_active: true,
      is_default: false,
      version: '1.0.0',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await supabaseService.insert('document_templates', templateData);
    
    // Log template creation
    // Using Supabase audit service instead of models
    await AuditLog.create({
      action: 'TEMPLATE_CREATED',
      entityType: 'document_template',
      entityId: result[0]?.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateName: name,
        category,
        type
      }
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: result[0]
    });
  } catch (error) {
    console.error('Error creating template:', error);
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

    // TODO: Fix DocumentTemplateService reference
    // const result = await DocumentTemplateService.generateDocument(templateId, exchangeId, additionalData);
    throw new Error('Document generation service not available - needs migration to Supabase');
    
    // Log document generation
    // Using Supabase audit service instead of models
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
    // Using Supabase audit service instead of models
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

    // Get exchange data from Supabase
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:client_id(id, first_name, last_name, email, phone, company),
        coordinator:coordinator_id(id, first_name, last_name, email)
      `)
      .eq('id', exchangeId)
      .single();

    if (exchangeError || !exchange) {
      console.error('Error fetching exchange:', exchangeError);
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
    // Using Supabase audit service instead of models
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

// Get document versions (placeholder implementation)
router.get('/:documentId/versions', authenticateToken, checkPermission('documents', 'read'), async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // For now, return empty versions array since versioning is not implemented
    // In the future, this would query a document_versions table
    console.log(`📄 Getting versions for document: ${documentId}`);
    
    // Placeholder response that matches the expected format
    const versions = [];
    
    // Could implement actual versioning later by:
    // 1. Creating a document_versions table
    // 2. Storing multiple versions of the same document
    // 3. Linking versions via a parent document ID
    
    res.json({
      versions,
      message: 'Document versioning is not yet implemented'
    });
  } catch (error) {
    console.error('❌ Error fetching document versions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active document templates
router.get('/templates/active', authenticateToken, async (req, res) => {
  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ data: templates || [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate document from template
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { templateId, exchangeId, additionalData } = req.body;
    
    if (!templateId || !exchangeId) {
      return res.status(400).json({ error: 'Template ID and Exchange ID are required' });
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get exchange details
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:client_id(id, first_name, last_name, email, phone, company)
      `)
      .eq('id', exchangeId)
      .single();

    if (exchangeError || !exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Generate document name
    const timestamp = new Date().toISOString().split('T')[0];
    const documentName = `${template.name} - ${exchange.client?.first_name || ''} ${exchange.client?.last_name || ''} - ${timestamp}.pdf`;

    // Create generated document record
    const generatedDoc = {
      id: databaseService.generateId(),
      template_id: templateId,
      exchange_id: exchangeId,
      name: documentName,
      file_path: `generated/${exchangeId}/${documentName}`,
      status: 'pending',
      generated_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('generated_documents')
      .insert([generatedDoc]);

    if (insertError) throw insertError;

    // Log generation
    await AuditService.log({
      action: 'DOCUMENT_GENERATED',
      resourceType: 'document',
      resourceId: generatedDoc.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateId,
        exchangeId,
        documentName
      }
    });

    res.json({ 
      success: true, 
      data: generatedDoc,
      message: 'Document generation initiated'
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 