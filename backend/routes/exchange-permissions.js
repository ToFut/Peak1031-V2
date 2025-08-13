const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { permissions } = require('../middleware/permissions');
const permissionService = require('../services/permissionService');
const AuditService = require('../services/audit');

const router = express.Router();

/**
 * GET /api/exchanges/:exchangeId/users
 * Get all users with access to an exchange
 */
router.get('/:exchangeId/users', authenticateToken, permissions.exchangeAdmin, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    const users = await permissionService.getExchangeUsers(exchangeId);
    
    res.json(users);
  } catch (error) {
    console.error('Error getting exchange users:', error);
    res.status(500).json({
      error: 'Failed to get exchange users',
      details: error.message
    });
  }
});

/**
 * POST /api/exchanges/:exchangeId/users
 * Add user to exchange with permissions
 */
router.post('/:exchangeId/users', authenticateToken, permissions.exchangeAdmin, [
  param('exchangeId').isUUID().withMessage('Invalid exchange ID'),
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('accessLevel').isIn(['read', 'write', 'admin']).withMessage('Invalid access level'),
  body('templateId').optional().isUUID().withMessage('Invalid template ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { exchangeId } = req.params;
    const { userId, accessLevel, templateId, notes } = req.body;

    // Set exchange access
    const access = await permissionService.setUserExchangeAccess(
      userId,
      exchangeId,
      accessLevel,
      req.user.id,
      { notes }
    );

    if (!access) {
      return res.status(400).json({
        error: 'Failed to set exchange access'
      });
    }

    // Apply template if provided
    if (templateId) {
      // Get template name from ID
      const templates = await permissionService.getPermissionTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        await permissionService.applyPermissionTemplate(
          template.name,
          userId,
          exchangeId,
          req.user.id
        );
      }
    }

    // Log the action
    await AuditService.log({
      action: 'USER_ADDED_TO_EXCHANGE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchangeId,
        targetUserId: userId,
        accessLevel,
        templateId
      }
    });

    res.status(201).json({
      success: true,
      access
    });
  } catch (error) {
    console.error('Error adding user to exchange:', error);
    res.status(500).json({
      error: 'Failed to add user to exchange',
      details: error.message
    });
  }
});

/**
 * PUT /api/exchanges/:exchangeId/users/:userId
 * Update user access level in exchange
 */
router.put('/:exchangeId/users/:userId', authenticateToken, permissions.exchangeAdmin, [
  param('exchangeId').isUUID().withMessage('Invalid exchange ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('accessLevel').isIn(['none', 'read', 'write', 'admin']).withMessage('Invalid access level'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { exchangeId, userId } = req.params;
    const { accessLevel, notes } = req.body;

    let result;
    if (accessLevel === 'none') {
      // Remove user from exchange
      result = await permissionService.removeUserFromExchange(userId, exchangeId);
    } else {
      // Update access level
      result = await permissionService.setUserExchangeAccess(
        userId,
        exchangeId,
        accessLevel,
        req.user.id,
        { notes }
      );
    }

    if (!result) {
      return res.status(400).json({
        error: 'Failed to update user access'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'USER_ACCESS_UPDATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchangeId,
        targetUserId: userId,
        accessLevel
      }
    });

    res.json({
      success: true,
      access: result
    });
  } catch (error) {
    console.error('Error updating user access:', error);
    res.status(500).json({
      error: 'Failed to update user access',
      details: error.message
    });
  }
});

/**
 * DELETE /api/exchanges/:exchangeId/users/:userId
 * Remove user from exchange
 */
router.delete('/:exchangeId/users/:userId', authenticateToken, permissions.exchangeAdmin, [
  param('exchangeId').isUUID().withMessage('Invalid exchange ID'),
  param('userId').isUUID().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { exchangeId, userId } = req.params;

    const success = await permissionService.removeUserFromExchange(userId, exchangeId);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to remove user from exchange'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'USER_REMOVED_FROM_EXCHANGE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchangeId,
        targetUserId: userId
      }
    });

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error removing user from exchange:', error);
    res.status(500).json({
      error: 'Failed to remove user from exchange',
      details: error.message
    });
  }
});

/**
 * GET /api/exchanges/:exchangeId/users/:userId/permissions
 * Get user's specific permissions for an exchange
 */
router.get('/:exchangeId/users/:userId/permissions', authenticateToken, permissions.exchangeAdmin, async (req, res) => {
  try {
    const { exchangeId, userId } = req.params;
    
    const permissions = await permissionService.getUserExchangePermissions(userId, exchangeId);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      error: 'Failed to get user permissions',
      details: error.message
    });
  }
});

/**
 * PUT /api/exchanges/:exchangeId/users/:userId/permissions
 * Update user's specific permissions for an exchange
 */
router.put('/:exchangeId/users/:userId/permissions', authenticateToken, permissions.exchangeAdmin, [
  param('exchangeId').isUUID().withMessage('Invalid exchange ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('permissions').isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { exchangeId, userId } = req.params;
    const { permissions: newPermissions } = req.body;

    // Get current permissions to determine what to revoke
    const currentPermissions = await permissionService.getUserExchangePermissions(userId, exchangeId);
    const currentPermissionTypes = currentPermissions.map(p => p.permission_type);

    // Revoke permissions that are no longer included
    for (const currentPerm of currentPermissionTypes) {
      if (!newPermissions.includes(currentPerm)) {
        await permissionService.revokePermission(userId, exchangeId, currentPerm);
      }
    }

    // Grant new permissions
    for (const newPerm of newPermissions) {
      if (!currentPermissionTypes.includes(newPerm)) {
        await permissionService.grantPermission(userId, exchangeId, newPerm, req.user.id);
      }
    }

    // Log the action
    await AuditService.log({
      action: 'USER_PERMISSIONS_UPDATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchangeId,
        targetUserId: userId,
        newPermissions,
        previousPermissions: currentPermissionTypes
      }
    });

    res.json({
      success: true,
      permissions: newPermissions
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({
      error: 'Failed to update user permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/permission-templates
 * Get all permission templates
 */
router.get('/templates', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const templates = await permissionService.getPermissionTemplates(req.user.organization_id);
    
    res.json(templates);
  } catch (error) {
    console.error('Error getting permission templates:', error);
    res.status(500).json({
      error: 'Failed to get permission templates',
      details: error.message
    });
  }
});

/**
 * POST /api/exchanges/:exchangeId/users/bulk
 * Bulk assign users to exchange
 */
router.post('/:exchangeId/users/bulk', authenticateToken, permissions.exchangeAdmin, [
  param('exchangeId').isUUID().withMessage('Invalid exchange ID'),
  body('assignments').isArray().withMessage('Assignments must be an array'),
  body('assignments.*.userId').isUUID().withMessage('Invalid user ID'),
  body('assignments.*.accessLevel').isIn(['read', 'write', 'admin']).withMessage('Invalid access level'),
  body('assignments.*.template').optional().isString().withMessage('Template must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { exchangeId } = req.params;
    const { assignments } = req.body;

    const results = await permissionService.bulkAssignUsersToExchange(
      assignments,
      exchangeId,
      req.user.id
    );

    // Log the action
    await AuditService.log({
      action: 'BULK_USER_ASSIGNMENT',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchangeId,
        assignments: assignments.length,
        results
      }
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error bulk assigning users:', error);
    res.status(500).json({
      error: 'Failed to bulk assign users',
      details: error.message
    });
  }
});

/**
 * GET /api/user/accessible-exchanges
 * Get user's accessible exchanges with permissions
 */
router.get('/user/accessible-exchanges', authenticateToken, async (req, res) => {
  try {
    const exchanges = await permissionService.getUserAccessibleExchanges(req.user.id);
    
    res.json(exchanges);
  } catch (error) {
    console.error('Error getting accessible exchanges:', error);
    res.status(500).json({
      error: 'Failed to get accessible exchanges',
      details: error.message
    });
  }
});

/**
 * GET /api/exchanges/:exchangeId/permissions
 * Get current user's permissions for an exchange
 */
router.get('/:exchangeId/permissions', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    const permissions = await permissionService.getFilteredExchangeData(req.user.id, exchangeId);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error getting exchange permissions:', error);
    res.status(500).json({
      error: 'Failed to get exchange permissions',
      details: error.message
    });
  }
});

module.exports = router;