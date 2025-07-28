const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const Document = require('../models/Document');
const Exchange = require('../models/Exchange');
const User = require('../models/User');
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
        { originalFilename: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
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
      const userExchanges = await Exchange.findAll({
        where: { clientId: req.user.id },
        attributes: ['id']
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      const userExchanges = await Exchange.findAll({
        where: { coordinatorId: req.user.id },
        attributes: ['id']
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    }

    const documents = await Document.findAndCountAll({
      where: whereClause,
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'uploader' }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: documents.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: documents.count,
        totalPages: Math.ceil(documents.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documents for specific exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { exchangeId: req.params.exchangeId },
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'uploader' }
      ],
      order: [['createdAt', 'DESC']]
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

    const document = await Document.create({
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

module.exports = router; 