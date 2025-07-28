const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const PracticePantherService = require('../services/practicePanther');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Sync contacts from PracticePartner
router.post('/contacts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await PracticePantherService.syncContacts();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync exchanges from PracticePartner
router.post('/exchanges', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await PracticePantherService.syncExchanges();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync tasks from PracticePartner
router.post('/tasks', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await PracticePantherService.syncTasks();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync all data from PracticePartner
router.post('/all', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await PracticePantherService.syncAll();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = await PracticePantherService.getSyncStatus();
    res.json({ data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 