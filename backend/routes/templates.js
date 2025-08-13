const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Document parsing utilities
const parseDocumentContent = async (file) => {
  let content = '';
  let title = '';
  
  try {
    switch (file.mimetype) {
      case 'application/pdf':
        console.log('📄 Parsing PDF document...');
        const pdfData = await pdfParse(file.buffer);
        content = pdfData.text;
        title = extractTitleFromContent(content, file.originalname);
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        console.log('📝 Parsing Word document...');
        const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
        content = docxResult.value;
        title = extractTitleFromContent(content, file.originalname);
        break;
        
      case 'application/msword':
        console.log('📝 Parsing legacy Word document...');
        // For older .doc files, we'll use the filename as fallback
        title = file.originalname.replace(/\.[^/.]+$/, '');
        content = 'Content extraction not available for legacy Word documents';
        break;
        
      default:
        console.log('📎 Unsupported file type for content extraction');
        title = file.originalname.replace(/\.[^/.]+$/, '');
        content = 'Content extraction not available for this file type';
    }
    
    return { content, title };
  } catch (error) {
    console.error('Error parsing document:', error);
    return { 
      content: 'Error extracting content', 
      title: file.originalname.replace(/\.[^/.]+$/, '') 
    };
  }
};

const extractTitleFromContent = (content, fallbackName) => {
  if (!content || content.trim().length === 0) {
    return fallbackName.replace(/\.[^/.]+$/, '');
  }
  
  // Remove file extension from fallback
  const cleanFallback = fallbackName.replace(/\.[^/.]+$/, '');
  
  // Try to find a title in the first few lines
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return cleanFallback;
  }
  
  // Look for the first substantial line as title
  for (const line of lines.slice(0, 5)) {
    const trimmedLine = line.trim();
    
    // Skip very short lines, lines with mostly symbols, or lines that look like headers/footers
    if (trimmedLine.length > 10 && 
        trimmedLine.length < 100 && 
        !/^[\d\s\-_=]+$/.test(trimmedLine) &&
        !trimmedLine.toLowerCase().includes('page') &&
        !trimmedLine.toLowerCase().includes('confidential')) {
      
      // Clean up the title
      let title = trimmedLine
        .replace(/[^\w\s\-\(\)]/g, ' ') // Remove special chars except dashes and parentheses
        .replace(/\s+/g, ' ')          // Normalize spaces
        .trim();
        
      if (title.length > 5) {
        return title;
      }
    }
  }
  
  return cleanFallback;
};

const categorizeDocument = (title, content, filename) => {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  const text = `${titleLower} ${contentLower} ${filenameLower}`;
  
  // Legal documents
  if (text.includes('agreement') || text.includes('contract') || text.includes('legal') ||
      text.includes('terms') || text.includes('conditions') || text.includes('clause') ||
      text.includes('deed') || text.includes('lease') || text.includes('purchase') ||
      text.includes('sale') || text.includes('conveyance')) {
    return 'legal';
  }
  
  // Financial documents
  if (text.includes('financial') || text.includes('statement') || text.includes('closing') ||
      text.includes('settlement') || text.includes('fee') || text.includes('cost') ||
      text.includes('price') || text.includes('payment') || text.includes('invoice') ||
      text.includes('receipt') || text.includes('accounting')) {
    return 'financial';
  }
  
  // Real estate specific
  if (text.includes('property') || text.includes('real estate') || text.includes('realty') ||
      text.includes('listing') || text.includes('appraisal') || text.includes('inspection') ||
      text.includes('title') || text.includes('escrow') || text.includes('mortgage')) {
    return 'real-estate';
  }
  
  // 1031 Exchange specific
  if (text.includes('1031') || text.includes('exchange') || text.includes('like-kind') ||
      text.includes('deferred') || text.includes('intermediary') || text.includes('accommodator') ||
      text.includes('replacement') || text.includes('relinquished')) {
    return '1031-exchange';
  }
  
  // Tax documents
  if (text.includes('tax') || text.includes('irs') || text.includes('depreciation') ||
      text.includes('capital gains') || text.includes('w-9') || text.includes('1099')) {
    return 'tax';
  }
  
  // Compliance and regulatory
  if (text.includes('compliance') || text.includes('regulation') || text.includes('disclosure') ||
      text.includes('environmental') || text.includes('due diligence') || text.includes('audit')) {
    return 'compliance';
  }
  
  // Default to template if no specific category matches
  return 'template';
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and Excel files are allowed.'));
    }
  }
});

/**
 * GET /api/templates
 * Get all template documents
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching template documents...');
    
    // Try Supabase first
    try {
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('⚠️ Supabase error, falling back to local templates:', error.message);
        throw error; // Fall back to local templates
      }

      console.log(`✅ Found ${templates?.length || 0} template documents in Supabase`);
      
      return res.json(templates || []);
    } catch (supabaseError) {
      // Fall back to local templates
      console.log('📋 Using local template fallback');
      
      const localTemplates = [
        {
          id: 'template-1',
          name: 'Exchange Agreement Template',
          description: 'Standard 1031 exchange agreement template',
          category: 'legal',
          file_path: '/templates/exchange-agreement.pdf',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'template-2',
          name: 'Closing Statement Template',
          description: 'Standard closing statement template',
          category: 'financial',
          file_path: '/templates/closing-statement.pdf',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'template-3',
          name: 'Property Transfer Template',
          description: 'Property transfer documentation template',
          category: 'real-estate',
          file_path: '/templates/property-transfer.pdf',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      console.log(`✅ Found ${localTemplates.length} local template documents`);
      
      res.json(localTemplates);
    }
  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/templates/active
 * Get only active template documents
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching active template documents...');
    
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching active templates:', error);
      throw error;
    }

    console.log(`✅ Found ${templates?.length || 0} active templates`);
    
    res.json({
      success: true,
      data: templates || [],
      count: templates?.length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching active templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active templates',
      error: error.message
    });
  }
});

/**
 * POST /api/documents/templates/upload
 * Upload a new template document with automatic title extraction and categorization
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let { name, description, category } = req.body;
    const file = req.file;
    const autoExtract = req.body.autoExtract !== 'false'; // Default to true

    console.log('📤 Enhanced template upload request:', {
      name,
      description,
      category,
      autoExtract,
      hasFile: !!file,
      fileSize: file?.size,
      mimeType: file?.mimetype,
      userContext: {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role
      }
    });

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let extractedTitle = '';
    let extractedCategory = category || 'template';
    let extractedDescription = description || '';
    let extractionInfo = null;

    // Perform automatic extraction if enabled
    if (autoExtract) {
      console.log('🔍 Performing automatic content extraction...');
      
      try {
        const { content, title } = await parseDocumentContent(file);
        extractedTitle = title;
        
        // Auto-categorize if no category provided
        if (!category || category === 'template') {
          extractedCategory = categorizeDocument(title, content, file.originalname);
        }
        
        // Auto-generate description if not provided
        if (!description && content.length > 0) {
          const words = content.split(/\s+/).slice(0, 30).join(' ');
          extractedDescription = words.length > 10 ? `${words}...` : 'Auto-extracted document template';
        }
        
        extractionInfo = {
          titleExtracted: !name && extractedTitle !== file.originalname.replace(/\.[^/.]+$/, ''),
          categoryExtracted: !category || category === 'template',
          descriptionExtracted: !description,
          contentLength: content.length
        };
        
        console.log('✅ Content extraction completed:', {
          extractedTitle,
          extractedCategory,
          extractionInfo
        });
        
      } catch (extractError) {
        console.error('⚠️ Content extraction failed, using fallbacks:', extractError);
        extractedTitle = file.originalname.replace(/\.[^/.]+$/, '');
      }
    }

    // Use provided values or extracted values
    const finalName = name || extractedTitle || file.originalname.replace(/\.[^/.]+$/, '');
    const finalDescription = description || extractedDescription || 'Document template';
    const finalCategory = category || extractedCategory;

    if (!finalName || !finalDescription) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const timestamp = Date.now();
    const sanitizedName = finalName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    const fileName = `${sanitizedName}-${timestamp}${fileExtension}`;
    const filePath = `templates/${fileName}`;

    console.log('📁 Uploading to Supabase Storage:', filePath);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        duplex: 'half'
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to storage',
        error: uploadError.message
      });
    }

    console.log('✅ File uploaded to storage:', uploadData.path);

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    console.log('🔗 Public URL generated:', publicUrl);

    // Use the authenticated user's ID for created_by field
    const createdById = req.user?.id || null;

    // Save template metadata to database
    const { data: template, error: dbError } = await supabase
      .from('document_templates')
      .insert([
        {
          name: finalName,
          description: finalDescription,
          category: finalCategory,
          file_template: publicUrl, // Store the URL in file_template field
          required_fields: [], // Empty array for now
          is_required: false,
          role_access: ['client', 'coordinator', 'admin'], // Default access
          auto_generate: false,
          created_by: createdById,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      
      // Try to clean up uploaded file if database insert fails
      try {
        await supabase.storage
          .from('documents')
          .remove([filePath]);
        console.log('🧹 Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.error('❌ Failed to clean up file:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to save template to database',
        error: dbError.message
      });
    }

    console.log('✅ Template saved to database:', template.id);

    res.json({
      success: true,
      message: 'Template uploaded successfully',
      data: {
        ...template,
        extractionInfo: autoExtract ? extractionInfo : null
      }
    });

  } catch (error) {
    console.error('❌ Error uploading template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * DELETE /api/documents/templates/:id
 * Delete a template document
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting template: ${id}`);

    // Get template info first
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      console.error('❌ Template not found:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Delete from storage
    if (template.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([template.file_path]);

      if (storageError) {
        console.error('⚠️ Failed to delete from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      } else {
        console.log('✅ File deleted from storage');
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Database deletion error:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete template from database',
        error: deleteError.message
      });
    }

    console.log('✅ Template deleted successfully');

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/documents/templates/:id/download
 * Download a template file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📥 Downloading template: ${id}`);

    // Get template info
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      console.error('❌ Template not found:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (!template.file_template) {
      return res.status(404).json({
        success: false,
        message: 'Template file not available'
      });
    }

    try {
      // Extract the file path from the URL
      // file_template is like: https://fozdhmlcjnjkwilmiiem.supabase.co/storage/v1/object/public/documents/templates/file.pdf
      const urlParts = template.file_template.split('/storage/v1/object/public/documents/');
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL format');
      }
      
      const filePath = urlParts[1]; // e.g., "templates/file.pdf"
      console.log('📁 Downloading file from path:', filePath);

      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) {
        console.error('❌ Download error:', downloadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to download file from storage',
          error: downloadError.message
        });
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await fileData.arrayBuffer());
      
      // Set appropriate headers
      const filename = `${template.name}.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      
      // Send file data
      res.send(buffer);
      console.log('✅ File downloaded successfully');

    } catch (storageError) {
      console.error('❌ Storage download error:', storageError);
      return res.status(500).json({
        success: false,
        message: 'Failed to download template file',
        error: storageError.message
      });
    }

  } catch (error) {
    console.error('❌ Error downloading template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/documents/templates/:id/view
 * View a template file (returns file data for inline viewing)
 */
router.get('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`👁️ Viewing template: ${id}`);

    // Get template info
    const { data: template, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      console.error('❌ Template not found:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (!template.file_template) {
      return res.status(404).json({
        success: false,
        message: 'Template file not available'
      });
    }

    try {
      // Extract the file path from the URL
      const urlParts = template.file_template.split('/storage/v1/object/public/documents/');
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL format');
      }
      
      const filePath = urlParts[1];
      console.log('📁 Viewing file from path:', filePath);

      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) {
        console.error('❌ View error:', downloadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to load file from storage',
          error: downloadError.message
        });
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await fileData.arrayBuffer());
      
      // Set appropriate headers for inline viewing
      const filename = `${template.name}.pdf`;
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      
      // Send file data
      res.send(buffer);
      console.log('✅ File viewed successfully');

    } catch (storageError) {
      console.error('❌ Storage view error:', storageError);
      return res.status(500).json({
        success: false,
        message: 'Failed to view template file',
        error: storageError.message
      });
    }

  } catch (error) {
    console.error('❌ Error viewing template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * PUT /api/documents/templates/:id
 * Update a template document
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, required_fields, is_required, auto_generate, stage_triggers } = req.body;

    console.log(`✏️ Updating template: ${id}`);

    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and category are required'
      });
    }

    // Update template in database
    const { data: template, error: updateError } = await supabase
      .from('document_templates')
      .update({
        name,
        description,
        category,
        required_fields: required_fields || [],
        is_required: is_required || false,
        auto_generate: auto_generate || false,
        stage_triggers: stage_triggers || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update template',
        error: updateError.message
      });
    }

    console.log('✅ Template updated successfully');

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/documents/templates/generate
 * Generate a document from a template with exchange data replacement
 * Now using the new DocumentTemplateService
 */
router.post('/generate', async (req, res) => {
  try {
    const { template_id, exchange_id, generation_data, generated_by } = req.body;

    console.log('🔄 Generating document from template (NEW FLOW):', {
      template_id,
      exchange_id,
      generated_by,
      hasGenerationData: !!generation_data
    });

    // Validate required fields
    if (!template_id || !exchange_id || !generated_by) {
      return res.status(400).json({
        success: false,
        message: 'template_id, exchange_id, and generated_by are required'
      });
    }

    // Use the new DocumentTemplateService
    const DocumentTemplateService = require('../services/documentTemplateService');
    const templateService = new DocumentTemplateService();
    
    try {
      // Generate document using the new service
      const result = await templateService.generateDocument(
        template_id, 
        exchange_id, 
        generation_data || {}
      );
      
      console.log('✅ Document generated successfully:', {
        documentId: result.document.id,
        filename: result.document.original_filename
      });
      
      // Save to generated_documents table for compatibility
      const { data: generatedDoc, error: saveError } = await supabase
        .from('generated_documents')
        .insert([
          {
            template_id,
            exchange_id,
            name: result.document.original_filename,
            file_path: result.document.file_path,
            file_url: result.document.file_url,
            generation_data: generation_data || {},
            generated_by: generated_by,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      
      if (saveError) {
        console.error('⚠️ Warning: Could not save to generated_documents table:', saveError);
      }
      
      // Return response in the expected format
      return res.json({
        success: true,
        message: 'Document generated successfully',
        document_id: result.document.id,
        download_url: result.document.file_url,
        data: {
          ...result.document,
          template_name: result.template,
          warnings: result.warnings
        }
      });
      
    } catch (serviceError) {
      console.error('❌ Document generation failed:', serviceError);
      return res.status(500).json({
        success: false,
        message: serviceError.message || 'Failed to generate document',
        error: serviceError.message
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error in template generation:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
});

/**
 * GET /api/documents/templates/generated
 * Get generated documents, optionally filtered by exchange_id
 */
router.get('/generated', async (req, res) => {
  try {
    const { exchange_id } = req.query;

    console.log('🔍 Fetching generated documents:', { exchange_id });

    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        template:template_id(*),
        exchange:exchange_id(*)
      `)
      .order('created_at', { ascending: false });

    if (exchange_id) {
      query = query.eq('exchange_id', exchange_id);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('❌ Error fetching generated documents:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch generated documents',
        error: error.message
      });
    }

    console.log(`✅ Found ${documents?.length || 0} generated documents`);

    res.json(documents || []);

  } catch (error) {
    console.error('❌ Error fetching generated documents:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/documents/templates/check-auto-generation
 * Check if templates should be auto-generated based on exchange stage
 */
router.post('/check-auto-generation', async (req, res) => {
  try {
    const { exchange_id, new_status, triggered_by } = req.body;

    console.log('🔍 Checking auto-generation rules for exchange:', exchange_id, 'status:', new_status);

    if (!exchange_id || !new_status || !triggered_by) {
      return res.status(400).json({
        success: false,
        message: 'exchange_id, new_status, and triggered_by are required'
      });
    }

    // Get templates that should auto-generate for this stage
    const { data: autoGenTemplates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('auto_generate', true)
      .contains('stage_triggers', [new_status]);

    if (templatesError) {
      console.error('❌ Error fetching auto-generation templates:', templatesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch auto-generation templates',
        error: templatesError.message
      });
    }

    console.log(`📋 Found ${autoGenTemplates?.length || 0} templates for auto-generation`);

    if (!autoGenTemplates || autoGenTemplates.length === 0) {
      return res.json({
        success: true,
        message: 'No templates configured for auto-generation at this stage',
        generated_documents: []
      });
    }

    // Get exchange info
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:clientId(*),
        coordinator:coordinatorId(*)
      `)
      .eq('id', exchange_id)
      .single();

    if (exchangeError || !exchange) {
      console.error('❌ Exchange not found:', exchangeError);
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }

    const generatedDocuments = [];
    const errors = [];

    // Generate documents for each template
    for (const template of autoGenTemplates) {
      try {
        console.log(`🔄 Auto-generating document for template: ${template.name}`);

        // Check if document was already generated for this exchange
        const { data: existingDoc } = await supabase
          .from('generated_documents')
          .select('id')
          .eq('template_id', template.id)
          .eq('exchange_id', exchange_id)
          .single();

        if (existingDoc) {
          console.log(`⏭️ Document already exists for template ${template.name}, skipping`);
          continue;
        }

        // Extract comprehensive exchange data for replacements
        const replacementData = buildReplacementData(exchange);

        // Get the original file from storage
        const urlParts = template.file_template.split('/storage/v1/object/public/documents/');
        if (urlParts.length < 2) {
          errors.push(`Invalid template file URL for ${template.name}`);
          continue;
        }
        
        const originalFilePath = urlParts[1];
        
        // Download original template file
        const { data: templateFile, error: downloadError } = await supabase.storage
          .from('documents')
          .download(originalFilePath);

        if (downloadError) {
          console.error(`❌ Template download error for ${template.name}:`, downloadError);
          errors.push(`Failed to download template ${template.name}`);
          continue;
        }

        const originalBuffer = Buffer.from(await templateFile.arrayBuffer());
        const fileExtension = path.extname(originalFilePath).toLowerCase();
        
        // Process the document (for now, just use original buffer)
        let processedBuffer = originalBuffer;
        if (fileExtension === '.pdf') {
          processedBuffer = await processPdfTemplate(originalBuffer, replacementData);
        } else if (fileExtension === '.docx') {
          processedBuffer = await processDocxTemplate(originalBuffer, replacementData);
        }
        
        // Generate new filename for the generated document
        const timestamp = Date.now();
        const sanitizedExchangeName = exchange.exchangeName?.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-') || exchange.id;
        const sanitizedTemplateName = template.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        // For DOCX files processed to text, change extension to .txt
        const outputExtension = fileExtension === '.docx' ? '.txt' : fileExtension;
        const generatedFileName = `generated/${sanitizedExchangeName}-${sanitizedTemplateName}-${timestamp}${outputExtension}`;

        // Upload processed document to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(generatedFileName, processedBuffer, {
            contentType: getContentType(outputExtension)
          });

        if (uploadError) {
          console.error(`❌ Upload error for ${template.name}:`, uploadError);
          errors.push(`Failed to upload generated document for ${template.name}`);
          continue;
        }

        // Get public URL for the generated document
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(generatedFileName);

        // Use the triggered_by user ID directly
        const validTriggeredBy = triggered_by || null;

        // Save generated document record
        const { data: generatedDoc, error: saveError } = await supabase
          .from('generated_documents')
          .insert([
            {
              template_id: template.id,
              exchange_id,
              name: `${template.name} - ${exchange.exchangeName || exchange.id}`,
              file_path: generatedFileName,
              file_url: publicUrl,
              generation_data: replacementData,
              generated_by: validTriggeredBy, // Use validated ID or null
              status: 'completed',
              auto_generated: true,
              trigger_stage: new_status,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (saveError) {
          console.error(`❌ Save error for ${template.name}:`, saveError);
          // Clean up uploaded file
          await supabase.storage.from('documents').remove([generatedFileName]);
          errors.push(`Failed to save generated document for ${template.name}`);
          continue;
        }

        generatedDocuments.push(generatedDoc);
        console.log(`✅ Auto-generated document for template: ${template.name}`);

      } catch (error) {
        console.error(`❌ Error generating document for template ${template.name}:`, error);
        errors.push(`Error generating document for ${template.name}: ${error.message}`);
      }
    }

    console.log(`✅ Auto-generation completed. Generated: ${generatedDocuments.length}, Errors: ${errors.length}`);

    res.json({
      success: true,
      message: `Auto-generated ${generatedDocuments.length} documents`,
      generated_documents: generatedDocuments,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error in auto-generation check:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Helper function to build replacement data with #field# format
function buildReplacementData(exchange, additionalData = {}) {
  // Try to get client data from various possible fields
  const clientName = exchange.client_name || exchange.clientName || '';
  const clientFirstName = exchange.client?.firstName || exchange.client?.first_name || '';
  const clientLastName = exchange.client?.lastName || exchange.client?.last_name || '';
  const clientEmail = exchange.client?.email || exchange.client_email || '';
  const clientPhone = exchange.client?.phone || exchange.client_phone || '';
  const clientCompany = exchange.client?.company || exchange.client_company || '';
  const clientAddress = exchange.client?.address || exchange.client_address || '';
  const clientStreet = exchange.client?.street || exchange.client?.street1 || exchange.client_street || '';
  const clientCity = exchange.client?.city || exchange.client_city || '';
  const clientState = exchange.client?.state || exchange.client?.province_state || exchange.client_state || '';
  const clientZip = exchange.client?.zip || exchange.client?.zip_code || exchange.client?.postal_code || exchange.client_zip || '';
  
  const data = {
    // Matter/Exchange fields (matching template placeholders)
    '#Matter.Number#': exchange.exchange_number || exchange.exchangeNumber || exchange.id,
    '#Matter.Name#': exchange.exchange_name || exchange.exchangeName || exchange.name || '',
    '#Matter.Client Vesting#': exchange.client_vesting || exchange.vesting || clientName || '',
    '#Matter.Closeout Amount#': formatCurrency(exchange.closeout_amount || exchange.exchange_value || exchange.exchangeValue || 0),
    '#Matter.Client 1 Signatory Title#': exchange.client1_signatory_title || 'Exchanger',
    '#Matter.Client 2 Signatory Title#': exchange.client2_signatory_title || '',
    '#Matter.Client 2 Name#': exchange.client2_name || '',
    
    // Contact fields (matching template placeholders)
    '#Contact.FirstName#': clientFirstName || 'N/A',
    '#Contact.LastName#': clientLastName || 'N/A',
    '#Contact.Street1#': clientStreet || clientAddress || 'N/A',
    '#Contact.City#': clientCity || 'N/A',
    '#Contact.ProvinceState#': clientState || 'N/A',
    '#Contact.ZipPostalCode#': clientZip || 'N/A',
    '#Contact.HomeNumber#': clientPhone || 'N/A',
    '#Contact.Email#': clientEmail || 'N/A',
    '#Contact.2nd Signatory Address#': exchange.client2_address || '',
    '#Contact.2nd Signatory Phone#': exchange.client2_phone || '',
    '#Contact.2nd Signatory Email#': exchange.client2_email || '',
    
    // Additional fields for other templates
    '#Exchange.ID#': exchange.id,
    '#Exchange.Number#': exchange.exchange_number || exchange.exchangeNumber || '',
    '#Exchange.Name#': exchange.exchange_name || exchange.exchangeName || exchange.name || '',
    '#Exchange.Type#': exchange.exchange_type || exchange.exchangeType || '',
    '#Exchange.Status#': exchange.status || '',
    '#Exchange.Value#': formatCurrency(exchange.exchange_value || exchange.exchangeValue),
    
    // Client fields (alternative format)
    '#Client.Name#': clientName || `${clientFirstName} ${clientLastName}`.trim() || 'N/A',
    '#Client.FirstName#': clientFirstName || 'N/A',
    '#Client.LastName#': clientLastName || 'N/A',
    '#Client.Email#': clientEmail || 'N/A',
    '#Client.Phone#': clientPhone || 'N/A',
    '#Client.Company#': clientCompany || 'N/A',
    
    // Property fields
    '#Property.Address#': exchange.property_address || exchange.propertyAddress || exchange.relinquished_property_address || exchange.relinquishedPropertyAddress || '',
    '#Property.RelinquishedAddress#': exchange.relinquished_property_address || exchange.relinquishedPropertyAddress || '',
    '#Property.SalePrice#': formatCurrency(exchange.relinquished_sale_price || exchange.relinquishedSalePrice || exchange.relinquished_value || exchange.relinquishedValue),
    '#Property.ReplacementValue#': formatCurrency(exchange.replacement_value || exchange.replacementValue),
    
    // Financial fields
    '#Financial.ExchangeValue#': formatCurrency(exchange.exchangeValue),
    '#Financial.RelinquishedValue#': formatCurrency(exchange.relinquishedValue),
    '#Financial.ReplacementValue#': formatCurrency(exchange.replacementValue),
    '#Financial.SalePrice#': formatCurrency(exchange.relinquishedSalePrice),
    
    // Date fields
    '#Date.Start#': formatDate(exchange.startDate),
    '#Date.IdentificationDeadline#': formatDate(exchange.identificationDeadline),
    '#Date.CompletionDeadline#': formatDate(exchange.completionDeadline),
    '#Date.RelinquishedClosing#': formatDate(exchange.relinquishedClosingDate),
    '#Date.Current#': formatDate(new Date()),
    '#Date.Today#': formatDate(new Date()),
    
    // QI fields
    '#QI.Company#': exchange.qiCompany || '',
    '#QI.Name#': exchange.qiCompany || '',
    
    // Coordinator fields
    '#Coordinator.Name#': '',
    '#Coordinator.Email#': '',
    
    // System fields
    '#System.Priority#': exchange.priority || '',
    '#System.RiskLevel#': exchange.riskLevel || '',
    '#System.Notes#': exchange.clientNotes || '',
    '#System.CurrentDate#': formatDate(new Date()),
    '#System.CurrentDateTime#': formatDateTime(new Date()),
  };
  
  // Extract client data if available
  if (exchange.client) {
    data['#Client.FirstName#'] = exchange.client.firstName || exchange.client.first_name || '';
    data['#Client.LastName#'] = exchange.client.lastName || exchange.client.last_name || '';
    data['#Client.Name#'] = `${data['#Client.FirstName#']} ${data['#Client.LastName#']}`.trim();
    data['#Client.Email#'] = exchange.client.email || '';
    data['#Client.Phone#'] = exchange.client.phone || '';
    data['#Client.Company#'] = exchange.client.company || '';
  }
  
  // Extract coordinator data if available
  if (exchange.coordinator) {
    const coordFirstName = exchange.coordinator.first_name || exchange.coordinator.firstName || '';
    const coordLastName = exchange.coordinator.last_name || exchange.coordinator.lastName || '';
    data['#Coordinator.Name#'] = `${coordFirstName} ${coordLastName}`.trim();
    data['#Coordinator.Email#'] = exchange.coordinator.email || '';
  }
  
  // Merge with any additional data provided (should also use #field# format)
  return { ...data, ...additionalData };
}

// Helper function to format currency
function formatCurrency(value) {
  if (!value || isNaN(value)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

// Helper function to format dates
function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US');
}

// Helper function to format date and time
function formatDateTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US');
}

// Helper function to get content type based on file extension
function getContentType(extension) {
  const types = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel'
  };
  return types[extension] || 'application/octet-stream';
}

// Helper function to process PDF templates (placeholder implementation)
async function processPdfTemplate(buffer, replacementData) {
  // For now, return the original buffer
  // In a production system, you would use pdf-lib or similar to:
  // 1. Parse the PDF
  // 2. Find text fields or annotations with #field# markers
  // 3. Replace them with actual values
  // 4. Return the modified PDF buffer
  
  console.log('📄 PDF processing would replace:', Object.keys(replacementData).length, 'fields');
  return buffer;
}

// Helper function to process DOCX templates
async function processDocxTemplate(buffer, replacementData) {
  try {
    console.log('📝 Processing DOCX template with placeholder replacement...');
    
    // Extract text content from the DOCX
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    let content = result.value;
    
    console.log('📋 Original content length:', content.length);
    console.log('🔍 Available placeholders:', Object.keys(replacementData).slice(0, 10));
    
    // Replace placeholders in the content
    let replacementCount = 0;
    Object.entries(replacementData).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const beforeReplace = content;
      content = content.replace(regex, String(value || ''));
      if (beforeReplace !== content) {
        replacementCount++;
        console.log(`✅ Replaced ${placeholder} with "${value}"`);
      }
    });
    
    console.log(`📊 Made ${replacementCount} placeholder replacements`);
    
    // Convert the processed text back to a buffer
    // Note: This creates a plain text file, not a DOCX with formatting
    // For full DOCX processing with format preservation, use docxtemplater
    const processedBuffer = Buffer.from(content, 'utf8');
    
    return processedBuffer;
  } catch (error) {
    console.error('❌ Error processing DOCX template:', error);
    // Return original buffer if processing fails
    return buffer;
  }
}

module.exports = router;