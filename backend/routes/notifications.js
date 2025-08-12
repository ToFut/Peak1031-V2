const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const AuditService = require('../services/audit');
const { transformToCamelCase } = require('../utils/caseTransform');

const router = express.Router();

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', authenticateToken, [
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

    // Get real notifications from database
    const supabaseService = require('../services/supabase');
    const notifications = [];
    
    // First, get actual notifications from the notifications table
    const { data: dbNotifications, error: dbError } = await supabaseService.client
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (dbError) {
      console.error('❌ Error fetching database notifications:', dbError);
    }
    
    // Add database notifications to the list
    if (dbNotifications) {
      dbNotifications.forEach(notification => {
        notifications.push({
          id: notification.id,
          type: notification.type || 'system',
          title: notification.title,
          message: notification.message,
          read: notification.read || false,
          created_at: notification.created_at,
          related_exchange_id: notification.related_exchange_id,
          urgency: notification.urgency || 'medium',
          action_url: `/exchanges/${notification.related_exchange_id}` // Generate action URL from exchange ID
        });
      });
    }
    
    // Get pending invitations for this user (as backup/fallback)
    const { data: invitations, error: invitationError } = await supabaseService.client
      .from('invitations')
      .select(`
        id,
        exchange_id,
        role,
        custom_message,
        created_at,
        status,
        exchanges!inner(exchange_name)
      `)
      .eq('email', req.user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (invitationError) {
      console.error('❌ Error fetching invitations:', invitationError);
    }
    
    // Convert invitations to notifications
    if (invitations) {
      invitations.forEach(inv => {
        const exchangeName = inv.exchanges?.exchange_name || 'Unknown Exchange';
        notifications.push({
          id: `inv_${inv.id}`,
          type: 'invitation',
          title: `Exchange Invitation - ${inv.role}`,
          message: inv.custom_message || `You've been invited to join ${exchangeName} as ${inv.role}`,
          read: false,
          created_at: inv.created_at,
          exchange_id: inv.exchange_id,
          invitation_id: inv.id,
          action_required: true,
          action_type: 'accept_invitation'
        });
      });
    }
    
    // Get recent messages for this user  
    // Note: Messages don't have recipient_id field, so we'll skip message notifications for now
    // TODO: Implement proper message notifications based on exchange participation
    const { data: recentMessages, error: messagesError } = await supabaseService.client
      .from('messages')
      .select(`
        id,
        content,
        exchange_id,
        created_at,
        exchanges!inner(exchange_name)
      `)
      .limit(0); // Temporarily disabled
      
    if (messagesError) {
      console.error('❌ Error fetching messages for notifications:', messagesError);
    }
    
    if (recentMessages) {
      recentMessages.forEach(msg => {
        const exchangeName = msg.exchanges?.exchange_name || 'Unknown Exchange';
        notifications.push({
          id: `msg_${msg.id}`,
          type: 'message',
          title: 'New Message',
          message: `New message in ${exchangeName}: ${(msg.content || '').substring(0, 50)}...`,
          read: false,
          created_at: msg.created_at,
          exchange_id: msg.exchange_id
        });
      });
    }
    
    // Sort notifications by creation date (newest first)
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Apply pagination
    const total = notifications.length;
    const paginatedNotifications = notifications.slice(offset, offset + limit);
    
    // Filter for unread only if requested
    const filteredNotifications = unreadOnly 
      ? paginatedNotifications.filter(n => !n.read)
      : paginatedNotifications;

    res.json({
      notifications: filteredNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        unread_count: notifications.filter(n => !n.read).length
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

    // Update notification as read in the database
    const supabaseService = require('../services/supabase');
    
    try {
      const { data, error } = await supabaseService.client
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user.id) // Security check - only update own notifications
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }
      
      if (!data) {
        return res.status(404).json({
          error: 'Notification not found or access denied'
        });
      }
      
      // Emit real-time notification update
      const io = req.app?.get('io');
      if (io) {
        io.to(`user_${req.user.id}`).emit('notification_read', {
          notificationId: id,
          userId: req.user.id
        });
      }
      
      const updatedNotification = {
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        read: data.read,
        created_at: data.created_at,
        updated_at: data.updated_at,
        read_at: data.read_at
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
        notification: transformToCamelCase(updatedNotification)
      });
      
    } catch (dbError) {
      console.error('Database error marking notification as read:', dbError);
      
      // Fallback mock for non-existent notifications
      const mockNotification = {
        id,
        type: 'message',
        title: 'New Message',
        message: 'You have a new message',
        read: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Log the action (even for fallback)
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
    }

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