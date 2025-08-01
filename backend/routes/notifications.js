const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { User } = require('../models');
const { requireRole } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const AuditService = require('../services/audit');
const { transformToCamelCase } = require('../utils/caseTransform');

const router = express.Router();

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('unread_only').optional().isBoolean().withMessage('Unread only must be boolean')
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
    const unreadOnly = req.query.unread_only === 'true';

    // For now, return mock notifications since we don't have a Notification model yet
    const mockNotifications = [
      {
        id: '1',
        type: 'message',
        title: 'New Message',
        message: 'You have a new message in Exchange ABC-123',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        exchange_id: 'exchange-1'
      },
      {
        id: '2',
        type: 'task',
        title: 'Task Due Soon',
        message: 'Task "Review Documents" is due tomorrow',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        exchange_id: 'exchange-1'
      },
      {
        id: '3',
        type: 'system',
        title: 'System Update',
        message: 'System maintenance scheduled for tonight',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        exchange_id: null
      }
    ];

    let filteredNotifications = mockNotifications;
    if (unreadOnly) {
      filteredNotifications = mockNotifications.filter(n => !n.read);
    }

    // Simulate pagination
    const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

    // Log the action
    if (req.user?.id) {
      await AuditService.log({
        action: 'NOTIFICATIONS_VIEWED',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { page, limit, unreadOnly }
      });
    }

    // Transform to camelCase for frontend consistency
    const transformedNotifications = paginatedNotifications.map(transformToCamelCase);

    res.json({
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (req.user?.id) {
      await AuditService.log({
        action: 'NOTIFICATIONS_VIEW_ERROR',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { error: error.message }
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch notifications'
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', [
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

    // Mock implementation - in real app, update notification in database
    const mockNotification = {
      id,
      type: 'message',
      title: 'New Message',
      message: 'You have a new message',
      read: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Log the action
    if (req.user?.id) {
      await AuditService.log({
        action: 'NOTIFICATION_MARKED_READ',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { notificationId: id }
      });
    }

    res.json({
      notification: transformToCamelCase(mockNotification)
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (req.user?.id) {
      await AuditService.log({
        action: 'NOTIFICATION_READ_ERROR',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { notificationId: req.params.id, error: error.message }
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to mark notification as read'
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
router.put('/mark-all-read', async (req, res) => {
  try {
    // Mock implementation - in real app, update all user notifications in database
    const updatedCount = 5; // Mock count

    // Log the action
    if (req.user?.id) {
      await AuditService.log({
        action: 'ALL_NOTIFICATIONS_MARKED_READ',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { updatedCount }
      });
    }

    res.json({
      message: 'All notifications marked as read',
      updatedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    if (req.user?.id) {
      await AuditService.log({
        action: 'ALL_NOTIFICATIONS_READ_ERROR',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { error: error.message }
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to mark all notifications as read'
    });
  }
});

module.exports = router;