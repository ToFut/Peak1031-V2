const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');
const documentTemplateService = require('../services/documentTemplateService');
const AuditService = require('../services/audit');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test endpoint for template debugging
router.get('/test/:templateId', authenticateToken, async (req, res) => {
  try {
    const templateId = req.params.templateId;
    
    console.log('🧪 Testing template:', templateId);
    
    // Get template details
    const template = await documentTemplateService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Test template data preparation
    const sampleData = documentTemplateService.preparePreviewData();
    
    console.log('📋 Template info:', {
      id: template.id,
      name: template.name,
      type: template.template_type,
      hasFileTemplate: !!template.file_template,
      hasFilePath: !!template.file_path,
      sampleDataKeys: Object.keys(sampleData).length
    });
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.template_type,
        hasFileTemplate: !!template.file_template,
        hasFilePath: !!template.file_path
      },
      sampleData: sampleData,
      message: 'Template test completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Template test error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple permission check function
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For templates, only admins and coordinators can write
    if (action === 'write' && !['admin', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions to create/modify templates' });
    }
    
    console.log(`🔐 Permission check: ${req.user.role} user accessing ${resource} with ${action} permission`);
    next();
  };
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and HTML files are allowed.'));
    }
  }
});



/**
 * GET /api/templates
 * Get all document templates with optional filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, isActive, templateType, search } = req.query;
    
    const options = {};
    if (category) options.category = category;
    if (isActive !== undefined) options.isActive = isActive === 'true';
    if (templateType) options.templateType = templateType;
    if (search) options.search = search;

    const templates = await documentTemplateService.getTemplates(options);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/categories
 * Get all available template categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await documentTemplateService.getTemplateCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/active
 * Get all active templates
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const templates = await documentTemplateService.getTemplates({ isActive: true });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching active templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/required
 * Get all required templates
 */
router.get('/required', authenticateToken, async (req, res) => {
  try {
    const templates = await documentTemplateService.getTemplates({ isRequired: true });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching required templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/auto-generate
 * Get all auto-generate templates
 */
router.get('/auto-generate', authenticateToken, async (req, res) => {
  try {
    const templates = await documentTemplateService.getTemplates({ autoGenerate: true });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching auto-generate templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/statistics
 * Get template statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const stats = await documentTemplateService.getTemplateStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching template statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await documentTemplateService.getTemplateById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates
 * Create new template
 */
router.post('/', authenticateToken, checkPermission('templates', 'write'), async (req, res) => {
  try {
    const templateData = req.body;
    
    if (!templateData.name || !templateData.description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const template = await documentTemplateService.createTemplate(templateData, req.user.id);
    
    // Log template creation
    await AuditService.log({
      action: 'TEMPLATE_CREATED',
      entityType: 'template',
      entityId: template.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateName: template.name,
        category: template.category
      }
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/templates/:id
 * Update template
 */
router.put('/:id', authenticateToken, checkPermission('templates', 'write'), async (req, res) => {
  try {
    const updateData = req.body;
    const templateId = req.params.id;
    
    const template = await documentTemplateService.updateTemplate(templateId, updateData, req.user.id);
    
    // Log template update
    await AuditService.log({
      action: 'TEMPLATE_UPDATED',
      entityType: 'template',
      entityId: template.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateName: template.name,
        updatedFields: Object.keys(updateData)
      }
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template
 */
router.delete('/:id', authenticateToken, checkPermission('templates', 'write'), async (req, res) => {
  try {
    const templateId = req.params.id;
    
    // Get template info before deletion for audit
    const template = await documentTemplateService.getTemplateById(templateId);
    
    await documentTemplateService.deleteTemplate(templateId);
    
    // Log template deletion
    await AuditService.log({
      action: 'TEMPLATE_DELETED',
      entityType: 'template',
      entityId: templateId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        templateName: template?.name || 'Unknown'
      }
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates/:id/preview
 * Generate preview of template with sample data
 */
router.post('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const templateId = req.params.id;
    const sampleData = req.body.sampleData || {};
    
    const preview = await documentTemplateService.generatePreview(templateId, sampleData);
    
    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates/:id/generate
 * Generate document from template
 */
router.post('/:id/generate', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const templateId = req.params.id;
    const { exchangeId, additionalData } = req.body;
    
    console.log('🔄 Template generation request:', {
      templateId,
      exchangeId,
      hasAdditionalData: !!additionalData,
      userId: req.user.id
    });
    
    if (!exchangeId) {
      console.log('❌ Missing exchangeId in request');
      return res.status(400).json({ error: 'Exchange ID is required' });
    }

    // Enhanced validation and debugging
    console.log('📋 Validating template and exchange...');
    
    // Check if template exists
    const template = await documentTemplateService.getTemplateById(templateId);
    if (!template) {
      console.log('❌ Template not found:', templateId);
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log('✅ Template found:', {
      id: template.id,
      name: template.name,
      type: template.template_type,
      hasFileTemplate: !!template.file_template,
      hasFilePath: !!template.file_path
    });

    // Check if exchange exists
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select('id, exchange_number, status')
      .eq('id', exchangeId)
      .single();
    
    if (exchangeError || !exchange) {
      console.log('❌ Exchange not found:', exchangeId, exchangeError);
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    console.log('✅ Exchange found:', {
      id: exchange.id,
      number: exchange.exchange_number,
      status: exchange.status
    });

    console.log('📋 Calling documentTemplateService.generateDocument...');
    const result = await documentTemplateService.generateDocument(templateId, exchangeId, additionalData);
    console.log('✅ Document generated successfully:', result);
    
    // Log document generation
    try {
      await AuditService.log({
        action: 'DOCUMENT_GENERATED_FROM_TEMPLATE',
        entityType: 'document',
        entityId: result.document.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          templateId,
          templateName: result.template,
          exchangeId,
          documentName: result.document.original_filename
        }
      });
    } catch (auditError) {
      console.error('⚠️ Audit logging failed:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Document generated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error generating document:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorResponse = {
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };
    
    // Add additional context for debugging
    if (error.message && error.message.includes('Multi error')) {
      errorResponse.details = 'Template processing failed due to multiple errors. Check template format and data.';
      errorResponse.suggestion = 'Verify template file is valid DOCX and contains proper placeholders.';
    }
    
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /api/templates/:id/upload
 * Upload template file
 */
router.post('/:id/upload', authenticateToken, checkPermission('templates', 'write'), upload.single('file'), async (req, res) => {
  try {
    const templateId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload file to Supabase storage
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const fileName = `templates/${templateId}/${Date.now()}_${file.originalname}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update template with file information
    const updateData = {
      file_name: file.originalname,
      file_path: fileName,
      file_type: path.extname(file.originalname).substring(1),
      file_size: file.size,
      mime_type: file.mimetype,
      url: urlData.publicUrl
    };

    const template = await documentTemplateService.updateTemplate(templateId, updateData, req.user.id);
    
    // Log file upload
    await AuditService.log({
      action: 'TEMPLATE_FILE_UPLOADED',
      entityType: 'template',
      entityId: templateId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype
      }
    });

    res.json({
      success: true,
      message: 'Template file uploaded successfully',
      data: template
    });
  } catch (error) {
    console.error('Error uploading template file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates/bulk-generate
 * Bulk generate documents from template
 */
router.post('/bulk-generate', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { templateId, exchangeIds, additionalData } = req.body;
    
    if (!templateId || !exchangeIds || !Array.isArray(exchangeIds)) {
      return res.status(400).json({ error: 'Template ID and Exchange IDs array are required' });
    }

    const results = await documentTemplateService.bulkGenerateDocuments(templateId, exchangeIds, additionalData);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    // Log bulk generation
    await AuditService.log({
      action: 'TEMPLATE_BULK_GENERATE',
      entityType: 'template',
      entityId: templateId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
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
    console.error('Error bulk generating documents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/:id/download
 * Download template file
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const template = await documentTemplateService.getTemplateById(req.params.id);
    
    if (!template || !template.file_path) {
      return res.status(404).json({ error: 'Template file not found' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase.storage
      .from('documents')
      .download(template.file_path);

    if (error) throw error;

    res.setHeader('Content-Type', template.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${template.file_name}"`);
    res.send(data);
  } catch (error) {
    console.error('Error downloading template file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
