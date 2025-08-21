const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const securityAuditService = require('../services/securityAuditService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get login audit history for a user (admin only)
router.get('/login-history/:userId', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await securityAuditService.getUserLoginHistory(userId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get security alerts (admin only)
router.get('/alerts', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const filters = {
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
      severity: req.query.severity,
      userId: req.query.userId
    };
    
    const alerts = await securityAuditService.getSecurityAlerts(filters);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user security summary (admin only)
router.get('/user-summary/:userId', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await securityAuditService.getUserSecuritySummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching user security summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force password reset for a user (admin only)
router.post('/force-password-reset', authenticateToken, checkPermission(['admin']), [
  body('userId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId } = req.body;
    const result = await securityAuditService.forcePasswordReset(userId, req.user.id);
    res.json({ success: true, message: 'Password reset required for user' });
  } catch (error) {
    console.error('Error forcing password reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user account (admin only)
router.post('/deactivate-user', authenticateToken, checkPermission(['admin']), [
  body('userId').isUUID(),
  body('reason').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId, reason } = req.body;
    const result = await securityAuditService.deactivateUser(userId, req.user.id, reason);
    res.json({ success: true, message: 'User account deactivated' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Whitelist an IP address (admin only)
router.post('/whitelist-ip', authenticateToken, checkPermission(['admin']), [
  body('userId').optional().isUUID(),
  body('ipAddress').isIP(),
  body('label').optional().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId, ipAddress, label } = req.body;
    const result = await securityAuditService.whitelistIP(userId, ipAddress, label, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error whitelisting IP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve security alert (admin only)
router.post('/resolve-alert', authenticateToken, checkPermission(['admin']), [
  body('alertId').isUUID(),
  body('action').isIn(['password_reset', 'account_deactivated', 'false_positive', 'monitored']),
  body('notes').optional().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { alertId, action, notes } = req.body;
    const result = await securityAuditService.resolveAlert(alertId, req.user.id, action, notes);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users with security status (admin only)
router.get('/users-security-status', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const { data, error } = await require('../services/supabase').client
      .from('user_security_status')
      .select('*')
      .order('risk_level', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users security status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's own login history
router.get('/my-login-history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await securityAuditService.getUserLoginHistory(req.user.id, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching own login history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;