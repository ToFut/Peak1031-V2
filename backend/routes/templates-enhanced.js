const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Document parsing and categorization functions
const parseDocumentContent = async (file) => {
  try {
    let content = '';
    let title = '';
    
    console.log('🔍 Parsing document:', file.mimetype, file.originalname);
    
    switch (file.mimetype) {
      case 'application/pdf':
        const pdfData = await pdfParse(file.buffer);
        content = pdfData.text;
        title = extractTitleFromContent(content, file.originalname);
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
        content = docxResult.value;
        title = extractTitleFromContent(content, file.originalname);
        break;
        
      case 'application/msword':
        // For older .doc files, use filename as fallback
        title = extractTitleFromFilename(file.originalname);
        content = 'Legacy Word document - content extraction not available';
        break;
        
      default:
        title = extractTitleFromFilename(file.originalname);
        content = 'Content extraction not supported for this file type';
    }
    
    return {
      title: title || extractTitleFromFilename(file.originalname),
      content: content.substring(0, 1000), // First 1000 characters for analysis
      fullContent: content
    };
  } catch (error) {
    console.error('❌ Error parsing document:', error);
    return {
      title: extractTitleFromFilename(file.originalname),
      content: 'Error parsing document content',
      fullContent: ''
    };
  }
};

const extractTitleFromContent = (content, fallbackFilename) => {
  if (!content) return extractTitleFromFilename(fallbackFilename);
  
  // Try to find title patterns in content
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Look for common title patterns
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip very short lines or lines with just numbers/dates
    if (line.length < 10 || /^\d+[\d\s\-\/]*$/.test(line)) continue;
    
    // Skip lines that look like headers, footers, or metadata
    if (line.toLowerCase().includes('page') || 
        line.toLowerCase().includes('confidential') ||
        line.toLowerCase().includes('draft') ||
        /^\d+$/.test(line)) continue;
    
    // If line looks like a title (reasonable length, not all caps unless short)
    if (line.length <= 100 && (line.length <= 50 || !/^[A-Z\s]+$/.test(line))) {
      return cleanTitle(line);
    }
  }
  
  // Fallback to filename-based title
  return extractTitleFromFilename(fallbackFilename);
};

const extractTitleFromFilename = (filename) => {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    .trim();
};

const cleanTitle = (title) => {
  return title
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s\-()]/g, '') // Remove special characters except dashes and parentheses
    .trim()
    .substring(0, 100); // Limit length
};

const categorizeDocument = (title, content, filename) => {
  const text = `${title} ${content} ${filename}`.toLowerCase();
  
  // Define categories with keywords
  const categories = {
    'legal': ['agreement', 'contract', 'legal', 'terms', 'conditions', 'liability', 'indemnity', 'jurisdiction', 'attorney', 'counsel', 'court', 'law', 'statute', 'regulation', 'compliance'],
    'financial': ['financial', 'accounting', 'budget', 'cost', 'price', 'payment', 'invoice', 'receipt', 'expense', 'revenue', 'profit', 'loss', 'tax', 'irs', 'closing', 'settlement'],
    'real-estate': ['property', 'real estate', 'deed', 'title', 'escrow', 'closing', 'appraisal', 'inspection', 'survey', 'zoning', 'mortgage', 'lien', 'easement', 'covenant'],
    'exchange': ['exchange', '1031', 'like-kind', 'intermediary', 'qi', 'qualified', 'replacement', 'relinquished', 'identification', 'reverse', 'build-to-suit', 'improvement'],
    'tax': ['tax', 'irs', 'depreciation', 'basis', 'gain', 'loss', 'deduction', 'schedule', 'form', 'return', 'withholding', 'estimated'],
    'insurance': ['insurance', 'policy', 'coverage', 'claim', 'premium', 'deductible', 'liability', 'casualty', 'property', 'title insurance'],
    'compliance': ['compliance', 'audit', 'review', 'inspection', 'certification', 'approval', 'permit', 'license', 'regulation', 'requirement'],
    'template': ['template', 'form', 'blank', 'sample', 'example', 'standard', 'boilerplate']
  };
  
  // Score each category
  const scores = {};
  for (const [category, keywords] of Object.entries(categories)) {
    scores[category] = keywords.reduce((score, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return score + matches;
    }, 0);
  }
  
  // Find category with highest score
  const bestCategory = Object.entries(scores)
    .sort(([,a], [,b]) => b - a)
    .find(([category, score]) => score > 0);
  
  return bestCategory ? bestCategory[0] : 'document';
};

const generateDescription = (title, category, content) => {
  // Generate a smart description based on category and content
  const categoryDescriptions = {
    'legal': 'Legal document template for',
    'financial': 'Financial document template for',
    'real-estate': 'Real estate document template for',
    'exchange': '1031 exchange document template for',
    'tax': 'Tax-related document template for',
    'insurance': 'Insurance document template for',
    'compliance': 'Compliance document template for',
    'template': 'Document template for',
    'document': 'Document template for'
  };
  
  const baseDescription = categoryDescriptions[category] || 'Document template for';
  
  // Extract key terms from content for more specific description
  const keyTerms = extractKeyTerms(content, category);
  const specificPurpose = keyTerms.length > 0 ? keyTerms.slice(0, 3).join(', ') : title.toLowerCase();
  
  return `${baseDescription} ${specificPurpose}. Auto-generated template document.`;
};

const extractKeyTerms = (content, category) => {
  if (!content) return [];
  
  const categoryKeywords = {
    'exchange': ['like-kind', 'qualified intermediary', 'replacement property', 'relinquished property', '45-day', '180-day'],
    'legal': ['agreement', 'contract', 'terms', 'conditions', 'parties'],
    'financial': ['payment', 'amount', 'fee', 'cost', 'settlement'],
    'real-estate': ['property', 'address', 'deed', 'title', 'closing'],
    'tax': ['form', 'schedule', 'return', 'deduction', 'basis']
  };
  
  const keywords = categoryKeywords[category] || [];
  const foundTerms = [];
  
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) {
      foundTerms.push(keyword);
    }
  });
  
  return foundTerms;
};

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
 * GET /api/documents/templates
 * Get all template documents
 */
router.get('/', async (req, res) => {
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
      
      return res.json({
        success: true,
        data: templates || []
      });
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
      
      res.json({
        success: true,
        data: localTemplates
      });
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
 * POST /api/documents/templates/upload
 * Upload a new template document with auto-title extraction and categorization
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let { name, description, category } = req.body;
    const file = req.file;

    console.log('📤 Enhanced template upload request:', {
      providedName: name,
      providedDescription: description,
      providedCategory: category,
      hasFile: !!file,
      fileSize: file?.size,
      mimeType: file?.mimetype,
      originalName: file?.originalname
    });

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse document content to extract title and auto-categorize
    console.log('🔍 Parsing document content for auto-extraction...');
    const parsedContent = await parseDocumentContent(file);
    
    // Use extracted title if name not provided or generic
    if (!name || name.trim() === '' || name === file.originalname) {
      name = parsedContent.title;
      console.log('✨ Auto-extracted title:', name);
    }
    
    // Auto-categorize if category not provided or generic
    if (!category || category === 'template' || category === 'document') {
      category = categorizeDocument(name, parsedContent.content, file.originalname);
      console.log('🏷️ Auto-categorized as:', category);
    }
    
    // Generate description if not provided
    if (!description || description.trim() === '') {
      description = generateDescription(name, category, parsedContent.content);
      console.log('📝 Auto-generated description:', description);
    }

    console.log('📋 Final template metadata:', { 
      name, 
      description, 
      category,
      extractedTitle: parsedContent.title,
      contentPreview: parsedContent.content.substring(0, 100) + '...'
    });

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
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

    // Save enhanced template metadata to database
    const templateData = {
      name,
      description,
      file_name: fileName,
      file_path: filePath,
      file_type: fileExtension.slice(1), // Remove the dot
      file_size: file.size,
      mime_type: file.mimetype,
      url: publicUrl,
      category,
      // Store extracted metadata
      extracted_title: parsedContent.title,
      content_preview: parsedContent.content.substring(0, 500),
      auto_categorized: !req.body.category || req.body.category === 'template',
      auto_titled: !req.body.name || req.body.name.trim() === '',
      auto_described: !req.body.description || req.body.description.trim() === '',
      created_by: req.user?.id || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: template, error: dbError } = await supabase
      .from('document_templates')
      .insert([templateData])
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

    console.log('✅ Enhanced template saved to database:', template.id);

    res.json({
      success: true,
      message: 'Template uploaded successfully with auto-extraction',
      data: {
        ...template,
        extraction_info: {
          title_extracted: templateData.auto_titled,
          category_extracted: templateData.auto_categorized,
          description_generated: templateData.auto_described,
          content_parsed: !!parsedContent.fullContent
        }
      }
    });

  } catch (error) {
    console.error('❌ Error uploading enhanced template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during template processing',
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
 * GET /api/documents/templates/categories
 * Get available template categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'legal', label: 'Legal Documents', description: 'Contracts, agreements, and legal forms' },
      { value: 'financial', label: 'Financial Documents', description: 'Financial statements, invoices, and accounting forms' },
      { value: 'real-estate', label: 'Real Estate Documents', description: 'Property-related documents and forms' },
      { value: 'exchange', label: '1031 Exchange Documents', description: 'Like-kind exchange specific templates' },
      { value: 'tax', label: 'Tax Documents', description: 'Tax forms and related documentation' },
      { value: 'insurance', label: 'Insurance Documents', description: 'Insurance policies and claims forms' },
      { value: 'compliance', label: 'Compliance Documents', description: 'Regulatory and audit documentation' },
      { value: 'template', label: 'General Templates', description: 'Miscellaneous document templates' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

module.exports = router;