const express = require('express');
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for memory storage
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

// Get all template documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const templates = await supabaseService.select('template_documents', {
      orderBy: { column: 'created_at', ascending: false }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Upload a new template document
router.post('/upload', authenticateToken, requireRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, category, description, tags } = req.body;
    const fileId = uuidv4();
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExt}`;
    const filePath = `templates/${category}/${fileName}`;

    // Upload file to Supabase storage
    await supabaseService.uploadFile('documents', filePath, req.file.buffer, {
      contentType: req.file.mimetype
    });

    // Get the signed URL for the file
    const fileUrl = await supabaseService.getFileUrl('documents', filePath, 60 * 60 * 24 * 365); // 1 year

    // Save template document metadata to database
    const templateData = {
      id: fileId,
      name: name || req.file.originalname,
      category: category || 'other',
      description: description || '',
      tags: tags ? JSON.parse(tags) : [],
      file_name: req.file.originalname,
      file_path: filePath,
      file_url: fileUrl,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const template = await supabaseService.insert('template_documents', templateData);

    res.json({
      success: true,
      template: template
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ 
      error: 'Failed to upload template',
      details: error.message 
    });
  }
});

// Update template document metadata
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, tags } = req.body;

    const updateData = {
      name,
      category,
      description,
      tags,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const updated = await supabaseService.update('template_documents', updateData, { id });

    res.json({
      success: true,
      template: updated
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template document
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get template to find file path
    const templates = await supabaseService.select('template_documents', { where: { id } });
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Delete file from storage
    if (template.file_path) {
      await supabaseService.deleteFile('documents', template.file_path);
    }

    // Delete from database
    await supabaseService.delete('template_documents', { id });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Download template document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get template metadata
    const templates = await supabaseService.select('template_documents', { where: { id } });
    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Get a fresh signed URL
    const signedUrl = await supabaseService.getFileUrl('documents', template.file_path, 3600); // 1 hour

    res.json({
      url: signedUrl,
      filename: template.file_name,
      mimeType: template.mime_type
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

module.exports = router;