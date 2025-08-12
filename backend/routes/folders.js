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

module.exports = router;




