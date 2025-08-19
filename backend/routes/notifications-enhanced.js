const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/audit');
const { transformToCamelCase } = require('../utils/caseTransform');
const notificationService = require('../services/notifications');

const router = express.Router();

/**
 * GET /api/notifications
 * Get user notifications with modern features (pagination, filtering, history)
 */
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isIn(['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']).withMessage('Invalid category'),
  query('status').optional().isIn(['all', 'unread', 'read', 'archived']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('start_date').optional().isISO8601().withMessage('Start date must be valid ISO8601 format'),
  query('end_date').optional().isISO8601().withMessage('End date must be valid ISO8601 format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const options = {
      limit,
      offset,
      category: req.query.category,
      status: req.query.status || 'all',
      priority: req.query.priority,
      startDate: req.query.start_date,
      endDate: req.query.end_date
    };

    // Get notifications from enhanced service
    const result = await notificationService.getNotificationHistory(req.user.id, options);
    
    // Get unread count
    const unreadCount = await notificationService.getUnreadNotificationCount(req.user.id);

    res.json({
      notifications: result.notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        status: notification.status,
        actionUrl: notification.action_url,
        actionLabel: notification.action_label,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : {},
        timestamp: notification.created_at,
        readAt: notification.read_at,
        archivedAt: notification.archived_at,
        expiresAt: notification.expires_at,
        exchangeId: notification.related_exchange_id,
        sourceUserId: notification.source_user_id,
        read: notification.is_read || notification.status === 'read'
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      },
      meta: {
        unread_count: unreadCount,
        categories: ['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info'],
        priorities: ['low', 'medium', 'high', 'urgent']
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});

/**
 * GET /api/notifications/count
 * Get notification counts by status
 */
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadNotificationCount(req.user.id);
    
    // Get additional counts from database
    const databaseService = require('../services/database');
    const counts = await databaseService.getNotificationCounts(req.user.id);

    res.json({
      unread: unreadCount,
      total: counts.total_count || 0,
      urgent: counts.urgent_count || 0
    });

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({
      error: 'Failed to fetch notification counts',
      details: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticateToken, [
  param('id').isUUID().withMessage('Notification ID must be a valid UUID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const success = await notificationService.markNotificationAsRead(id, req.user.id);

    if (!success) {
      return res.status(404).json({
        error: 'Notification not found or access denied'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_MARKED_READ',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { notificationId: id }
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      details: error.message
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const updatedCount = await notificationService.markAllNotificationsAsRead(req.user.id);

    // Log the action
    await AuditService.log({
      action: 'ALL_NOTIFICATIONS_MARKED_READ',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { updatedCount }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      details: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/archive
 * Archive notification
 */
router.put('/:id/archive', authenticateToken, [
  param('id').isUUID().withMessage('Notification ID must be a valid UUID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const success = await notificationService.archiveNotification(id, req.user.id);

    if (!success) {
      return res.status(404).json({
        error: 'Notification not found or access denied'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_ARCHIVED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { notificationId: id }
    });

    res.json({
      success: true,
      message: 'Notification archived'
    });

  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({
      error: 'Failed to archive notification',
      details: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Notification ID must be a valid UUID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const success = await notificationService.deleteNotification(id, req.user.id);

    if (!success) {
      return res.status(404).json({
        error: 'Notification not found or access denied'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_DELETED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { notificationId: id }
    });

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      details: error.message
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await notificationService.getAllNotificationPreferences(req.user.id);

    res.json({
      preferences: preferences.map(pref => ({
        category: pref.category,
        emailEnabled: pref.email_enabled,
        smsEnabled: pref.sms_enabled,
        inAppEnabled: pref.in_app_enabled,
        browserEnabled: pref.browser_enabled,
        soundEnabled: pref.sound_enabled,
        desktopEnabled: pref.desktop_enabled,
        frequency: pref.frequency,
        quietHoursStart: pref.quiet_hours_start,
        quietHoursEnd: pref.quiet_hours_end,
        timezone: pref.timezone
      }))
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch notification preferences',
      details: error.message
    });
  }
});

/**
 * PUT /api/notifications/preferences/:category
 * Update notification preferences for a category
 */
router.put('/preferences/:category', authenticateToken, [
  param('category').isIn(['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']).withMessage('Invalid category'),
  body('emailEnabled').optional().isBoolean(),
  body('smsEnabled').optional().isBoolean(),
  body('inAppEnabled').optional().isBoolean(),
  body('browserEnabled').optional().isBoolean(),
  body('soundEnabled').optional().isBoolean(),
  body('desktopEnabled').optional().isBoolean(),
  body('frequency').optional().isIn(['immediate', 'hourly', 'daily', 'weekly']),
  body('quietHoursStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('quietHoursEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('timezone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { category } = req.params;
    const preferences = {
      email_enabled: req.body.emailEnabled,
      sms_enabled: req.body.smsEnabled,
      in_app_enabled: req.body.inAppEnabled,
      browser_enabled: req.body.browserEnabled,
      sound_enabled: req.body.soundEnabled,
      desktop_enabled: req.body.desktopEnabled,
      frequency: req.body.frequency,
      quiet_hours_start: req.body.quietHoursStart,
      quiet_hours_end: req.body.quietHoursEnd,
      timezone: req.body.timezone
    };

    // Filter out undefined values
    const filteredPreferences = Object.fromEntries(
      Object.entries(preferences).filter(([_, value]) => value !== undefined)
    );

    const success = await notificationService.updateNotificationPreferences(
      req.user.id,
      category,
      filteredPreferences
    );

    if (!success) {
      return res.status(400).json({
        error: 'Failed to update notification preferences'
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { category, preferences: filteredPreferences }
    });

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences',
      details: error.message
    });
  }
});

/**
 * POST /api/notifications
 * Create a new notification (admin only)
 */
router.post('/', authenticateToken, requireRole(['admin']), [
  body('userId').isUUID().withMessage('User ID must be a valid UUID'),
  body('type').optional().isString(),
  body('category').isIn(['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']).withMessage('Invalid category'),
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('message').isLength({ min: 1 }).withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('actionUrl').optional().isURL({ protocols: ['http', 'https'] }).withMessage('Action URL must be valid'),
  body('actionLabel').optional().isString(),
  body('expiresAt').optional().isISO8601().withMessage('Expires at must be valid ISO8601 format'),
  body('exchangeId').optional().isUUID().withMessage('Exchange ID must be a valid UUID'),
  body('templateName').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const notificationData = {
      userId: req.body.userId,
      type: req.body.type,
      category: req.body.category,
      title: req.body.title,
      message: req.body.message,
      priority: req.body.priority,
      actionUrl: req.body.actionUrl,
      actionLabel: req.body.actionLabel,
      metadata: req.body.metadata || {},
      expiresAt: req.body.expiresAt,
      exchangeId: req.body.exchangeId,
      sourceUserId: req.user.id,
      organizationId: req.user.organization_id,
      templateName: req.body.templateName
    };

    const result = await notificationService.createNotification(notificationData);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to create notification',
        details: result.error
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_CREATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { 
        targetUserId: req.body.userId,
        category: req.body.category,
        title: req.body.title
      }
    });

    res.status(201).json({
      success: true,
      notification: result.notification,
      channels: result.channels
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      details: error.message
    });
  }
});

/**
 * POST /api/notifications/template
 * Create notification from template (admin only)
 */
router.post('/template', authenticateToken, requireRole(['admin']), [
  body('templateName').isString().withMessage('Template name is required'),
  body('userId').isUUID().withMessage('User ID must be a valid UUID'),
  body('variables').optional().isObject().withMessage('Variables must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { templateName, userId, variables = {} } = req.body;

    const result = await notificationService.createNotificationFromTemplate(
      templateName,
      userId,
      variables
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to create notification from template',
        details: result.error
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_CREATED_FROM_TEMPLATE',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { 
        templateName,
        targetUserId: userId,
        variables
      }
    });

    res.status(201).json({
      success: true,
      notification: result.notification,
      channels: result.channels
    });

  } catch (error) {
    console.error('Error creating notification from template:', error);
    res.status(500).json({
      error: 'Failed to create notification from template',
      details: error.message
    });
  }
});

/**
 * POST /api/notifications/batch
 * Create multiple notifications in batch (admin only)
 */
router.post('/batch', authenticateToken, requireRole(['admin']), [
  body('notifications').isArray({ min: 1, max: 100 }).withMessage('Notifications must be an array with 1-100 items'),
  body('notifications.*.userId').isUUID().withMessage('Each notification must have a valid user ID'),
  body('notifications.*.category').isIn(['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']).withMessage('Invalid category'),
  body('notifications.*.title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('notifications.*.message').isLength({ min: 1 }).withMessage('Message is required'),
  body('notifications.*.priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { notifications } = req.body;
    const results = {
      successful: [],
      failed: [],
      totalProcessed: notifications.length
    };

    // Process notifications in batch
    for (let i = 0; i < notifications.length; i++) {
      const notificationData = {
        ...notifications[i],
        sourceUserId: req.user.id,
        organizationId: req.user.organization_id
      };

      try {
        const result = await notificationService.createNotification(notificationData);
        
        if (result.success) {
          results.successful.push({
            index: i,
            notificationId: result.notification.id,
            userId: notifications[i].userId
          });
        } else {
          results.failed.push({
            index: i,
            userId: notifications[i].userId,
            error: result.error
          });
        }
      } catch (error) {
        results.failed.push({
          index: i,
          userId: notifications[i].userId,
          error: error.message
        });
      }
    }

    // Log the batch operation
    await AuditService.log({
      action: 'NOTIFICATION_BATCH_CREATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { 
        totalCount: notifications.length,
        successfulCount: results.successful.length,
        failedCount: results.failed.length
      }
    });

    res.status(201).json({
      success: results.failed.length === 0,
      message: `Batch notification completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Error creating batch notifications:', error);
    res.status(500).json({
      error: 'Failed to create batch notifications',
      details: error.message
    });
  }
});

/**
 * GET /api/notifications/templates
 * Get available notification templates (admin only)
 */
router.get('/templates', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const templates = await notificationService.getNotificationTemplates();
    
    res.json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        title: template.title_template,
        message: template.message_template,
        variables: template.variables ? JSON.parse(template.variables) : [],
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({
      error: 'Failed to fetch notification templates',
      details: error.message
    });
  }
});

/**
 * POST /api/notifications/templates
 * Create a new notification template (admin only)
 */
router.post('/templates', authenticateToken, requireRole(['admin']), [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Template name is required and must be less than 100 characters'),
  body('category').isIn(['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']).withMessage('Invalid category'),
  body('titleTemplate').isLength({ min: 1, max: 255 }).withMessage('Title template is required and must be less than 255 characters'),
  body('messageTemplate').isLength({ min: 1 }).withMessage('Message template is required'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const templateData = {
      name: req.body.name,
      category: req.body.category,
      titleTemplate: req.body.titleTemplate,
      messageTemplate: req.body.messageTemplate,
      variables: req.body.variables || [],
      priority: req.body.priority || 'medium',
      createdBy: req.user.id
    };

    const result = await notificationService.createNotificationTemplate(templateData);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to create notification template',
        details: result.error
      });
    }

    // Log the action
    await AuditService.log({
      action: 'NOTIFICATION_TEMPLATE_CREATED',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { 
        templateName: req.body.name,
        category: req.body.category
      }
    });

    res.status(201).json({
      success: true,
      template: result.template
    });

  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({
      error: 'Failed to create notification template',
      details: error.message
    });
  }
});

/**
 * GET /api/notifications/digest
 * Get notification digest for user (for batched delivery)
 */
router.get('/digest', authenticateToken, [
  query('frequency').isIn(['hourly', 'daily', 'weekly']).withMessage('Invalid frequency'),
  query('categories').optional().isString().withMessage('Categories must be a comma-separated string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { frequency, categories } = req.query;
    const categoryList = categories ? categories.split(',') : null;

    const digest = await notificationService.getNotificationDigest(
      req.user.id, 
      frequency, 
      categoryList
    );

    res.json({
      digest: {
        period: digest.period,
        summary: digest.summary,
        notifications: digest.notifications.map(notification => ({
          id: notification.id,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          timestamp: notification.created_at,
          actionUrl: notification.action_url,
          actionLabel: notification.action_label
        })),
        stats: {
          totalCount: digest.totalCount,
          byCategory: digest.byCategory,
          byPriority: digest.byPriority
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notification digest:', error);
    res.status(500).json({
      error: 'Failed to fetch notification digest',
      details: error.message
    });
  }
});

module.exports = router;