const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');

// Simple permission check function
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For now, allow all authenticated users to access documents
    // This can be enhanced later with more granular permissions
    console.log(`🔐 Permission check: ${req.user.role} user accessing ${resource} with ${action} permission`);
    next();
  };
};
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');

const router = express.Router();

// Helper function to create virtual folders based on document categories
async function createVirtualFolders(exchangeId) {
  try {
    console.log('📁 Creating virtual folders for exchange:', exchangeId);
    
    // Get all documents for this exchange to see what categories exist
    const { data: documents, error } = await supabaseService.client
      .from('documents')
      .select('category, id, original_filename, uploaded_by, created_at, users!documents_uploaded_by_fkey(first_name, last_name, email)')
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents for virtual folders:', error);
      return getDefaultFolders(exchangeId);
    }

    // Group documents by category
    const categoryCounts = {};
    const categoryDocs = {};
    
    documents.forEach(doc => {
      const category = doc.category || 'general';
      const normalizedCategory = category.toLowerCase();
      
      if (!categoryCounts[normalizedCategory]) {
        categoryCounts[normalizedCategory] = 0;
        categoryDocs[normalizedCategory] = [];
      }
      
      categoryCounts[normalizedCategory]++;
      categoryDocs[normalizedCategory].push({
        id: doc.id,
        filename: doc.original_filename,
        uploadedBy: doc.users ? `${doc.users.first_name} ${doc.users.last_name}` : 'Unknown',
        uploadedByEmail: doc.users?.email,
        createdAt: doc.created_at
      });
    });

    // Create virtual folders based on categories found
    const virtualFolders = Object.keys(categoryCounts).map(category => {
      const folderName = getCategoryDisplayName(category);
      return {
        id: `virtual-${exchangeId}-${category}`,
        name: folderName,
        exchange_id: exchangeId,
        parent_id: null,
        document_count: categoryCounts[category],
        category: category,
        recent_documents: categoryDocs[category].slice(0, 3), // Show 3 most recent
        created_at: new Date().toISOString(),
        is_virtual: true
      };
    });

    // If no documents exist, return default folder structure
    if (virtualFolders.length === 0) {
      return getDefaultFolders(exchangeId);
    }

    console.log(`📁 Created ${virtualFolders.length} virtual folders for exchange ${exchangeId}`);
    return virtualFolders;

  } catch (error) {
    console.error('Error creating virtual folders:', error);
    return getDefaultFolders(exchangeId);
  }
}

// Get default folder structure
function getDefaultFolders(exchangeId) {
  return [
    {
      id: `virtual-${exchangeId}-legal`,
      name: 'Legal Documents',
      exchange_id: exchangeId,
      parent_id: null,
      document_count: 0,
      category: 'legal',
      recent_documents: [],
      created_at: new Date().toISOString(),
      is_virtual: true
    },
    {
      id: `virtual-${exchangeId}-financial`,
      name: 'Financial Records',
      exchange_id: exchangeId,
      parent_id: null,
      document_count: 0,
      category: 'financial',
      recent_documents: [],
      created_at: new Date().toISOString(),
      is_virtual: true
    },
    {
      id: `virtual-${exchangeId}-contracts`,
      name: 'Contracts',
      exchange_id: exchangeId,
      parent_id: null,
      document_count: 0,
      category: 'contracts',
      recent_documents: [],
      created_at: new Date().toISOString(),
      is_virtual: true
    },
    {
      id: `virtual-${exchangeId}-general`,
      name: 'General Documents',
      exchange_id: exchangeId,
      parent_id: null,
      document_count: 0,
      category: 'general',
      recent_documents: [],
      created_at: new Date().toISOString(),
      is_virtual: true
    }
  ];
}

// Convert category codes to display names
function getCategoryDisplayName(category) {
  const categoryMap = {
    'legal': 'Legal Documents',
    'financial': 'Financial Records',
    'contracts': 'Contracts',
    'general': 'General Documents',
    'compliance': 'Compliance',
    'insurance': 'Insurance',
    'permits': 'Permits & Licenses',
    'environmental': 'Environmental',
    'technical': 'Technical Documents',
    'correspondence': 'Correspondence',
    'reports': 'Reports',
    'invoices': 'Invoices',
    'receipts': 'Receipts'
  };
  
  return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// Get folders by query parameter (for backward compatibility)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { exchange_id, parentId } = req.query;
    
    if (!exchange_id) {
      return res.status(400).json({ error: 'exchange_id query parameter is required' });
    }

    let query = { exchange_id };
    if (parentId) {
      query.parent_id = parentId;
    } else {
      query.parent_id = null; // Root folders only
    }

    try {
      const folders = await databaseService.getFolders({
        where: query,
        orderBy: { column: 'name', ascending: true }
      });

      res.json({ data: folders });
    } catch (folderError) {
      // If folders table doesn't exist, create virtual folders based on document categories
      if (folderError.message && (folderError.message.includes('folders') || folderError.message.includes('schema cache'))) {
        console.log('⚠️ Folders table not found, creating virtual folders for exchange:', exchange_id);
        
        // Create virtual folders based on common document categories
        const virtualFolders = await createVirtualFolders(exchange_id);
        res.json({ 
          data: virtualFolders,
          message: 'Using virtual folders based on document categories'
        });
      } else {
        throw folderError;
      }
    }
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all folders for an exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { parentId } = req.query;

    let query = { exchange_id: exchangeId };
    if (parentId) {
      query.parent_id = parentId;
    } else {
      query.parent_id = null; // Root folders only
    }

    const folders = await databaseService.getFolders({
      where: query,
      orderBy: { column: 'name', ascending: true }
    });

    res.json({ data: folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get folder by ID with children
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const folder = await databaseService.getFolderById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get child folders
    const children = await databaseService.getFolders({
      where: { parent_id: id },
      orderBy: { column: 'name', ascending: true }
    });

    // Get documents in this folder
    const documents = await databaseService.getDocuments({
      where: { folder_id: id },
      orderBy: { column: 'created_at', ascending: false }
    });

    res.json({
      data: {
        ...folder,
        children,
        documents
      }
    });
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new folder
router.post('/', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { name, parentId, exchangeId } = req.body;

    if (!name || !exchangeId) {
      return res.status(400).json({ error: 'Name and exchange ID are required' });
    }

    // Check if folder with same name already exists in the same parent
    const existingFolder = await databaseService.getFolders({
      where: {
        name,
        exchange_id: exchangeId,
        parent_id: parentId || null
      }
    });

    if (existingFolder.length > 0) {
      return res.status(400).json({ error: 'A folder with this name already exists' });
    }

    const folder = await databaseService.createFolder({
      name,
      parent_id: parentId || null,
      exchange_id: exchangeId,
      created_by: req.user.id
    });

    res.status(201).json({ data: folder });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update folder
router.put('/:id', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const folder = await databaseService.getFolderById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder with same name already exists in the same parent
    const existingFolder = await databaseService.getFolders({
      where: {
        name,
        exchange_id: folder.exchange_id,
        parent_id: parentId || null
      }
    });

    if (existingFolder.length > 0 && existingFolder[0].id !== id) {
      return res.status(400).json({ error: 'A folder with this name already exists' });
    }

    const updatedFolder = await databaseService.updateFolder(id, {
      name,
      parent_id: parentId || null
    });

    res.json({ data: updatedFolder });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
router.delete('/:id', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await databaseService.getFolderById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder has children
    const children = await databaseService.getFolders({
      where: { parent_id: id }
    });

    if (children.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder with subfolders' });
    }

    // Check if folder has documents
    const documents = await databaseService.getDocuments({
      where: { folder_id: id }
    });

    if (documents.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder with documents' });
    }

    await databaseService.deleteFolder(id);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move documents to folder
router.post('/:id/move-documents', authenticateToken, checkPermission('documents', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { documentIds } = req.body;

    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({ error: 'Document IDs array is required' });
    }

    const folder = await databaseService.getFolderById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Move documents to folder
    const movedDocuments = await databaseService.moveDocumentsToFolder(documentIds, id);

    res.json({ 
      data: movedDocuments,
      message: `Moved ${movedDocuments.length} documents to folder`
    });
  } catch (error) {
    console.error('Error moving documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get documents in a specific folder (category)
router.get('/:folderId/documents', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log('📂 Getting documents for folder:', folderId);
    
    // Parse virtual folder ID to get exchange and category
    if (folderId.startsWith('virtual-')) {
      const parts = folderId.split('-');
      if (parts.length >= 3) {
        const exchangeId = parts[1];
        const category = parts.slice(2).join('-'); // Handle categories with hyphens
        
        console.log(`📂 Virtual folder: exchange=${exchangeId}, category=${category}`);
        
        // Get documents for this category in this exchange
        let query = supabaseService.client
          .from('documents')
          .select(`
            *,
            users!documents_uploaded_by_fkey(first_name, last_name, email)
          `)
          .eq('exchange_id', exchangeId)
          .order('created_at', { ascending: false });
        
        // Filter by category
        if (category !== 'general') {
          query = query.eq('category', category);
        } else {
          // For general, include documents with null/empty category or 'general'
          query = query.or('category.is.null,category.eq.general,category.eq.');
        }
        
        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);
        
        const { data: documents, error, count } = await query;
        
        if (error) {
          console.error('Error fetching folder documents:', error);
          throw error;
        }
        
        // Format documents with uploader info
        const formattedDocs = documents.map(doc => ({
          ...doc,
          uploaded_by_name: doc.users ? `${doc.users.first_name} ${doc.users.last_name}` : 'Unknown User',
          uploaded_by_email: doc.users?.email || null
        }));
        
        res.json({
          data: formattedDocs,
          folder: {
            id: folderId,
            name: getCategoryDisplayName(category),
            category: category,
            exchange_id: exchangeId
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / parseInt(limit))
          }
        });
      } else {
        return res.status(400).json({ error: 'Invalid virtual folder ID format' });
      }
    } else {
      // Handle real folder IDs (when folders table exists)
      return res.status(404).json({ error: 'Real folders not yet implemented' });
    }
    
  } catch (error) {
    console.error('Error fetching folder documents:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;




