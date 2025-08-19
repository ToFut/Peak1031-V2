const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const AuditService = require('../services/audit');
const supabaseService = require('../services/supabase');
const NotificationService = require('../services/notifications');

const router = express.Router();

/**
 * GET /api/user-audit/my-activity
 * Get current user's activity history
 */
router.get('/my-activity', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      entityType, 
      startDate, 
      endDate,
      search 
    } = req.query;

    console.log(`📝 USER AUDIT: ${req.user.role} user ${req.user.email} requesting their activity`);

    // Base filter - user can only see their own activities
    let filters = { userId: req.user.id };

    // Apply additional filters
    if (action) {
      filters.action = action;
    }
    if (entityType) {
      filters.entityType = entityType;
    }
    if (startDate) {
      filters.created_at = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (filters.created_at) {
        filters.created_at.$lte = new Date(endDate);
      } else {
        filters.created_at = { $lte: new Date(endDate) };
      }
    }

    // Get user's audit logs
    const auditLogs = await AuditService.getAuditLogs({
      ...filters,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Apply search filter if provided
    let filteredLogs = auditLogs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = auditLogs.filter(log => 
        log.action?.toLowerCase().includes(searchLower) ||
        log.entity_type?.toLowerCase().includes(searchLower) ||
        log.details?.message?.toLowerCase().includes(searchLower)
      );
    }

    // Get user's activity statistics
    const activityStats = await getUserActivityStats(req.user.id);

    res.json({
      success: true,
      data: filteredLogs,
      statistics: activityStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user activity:', error);
    res.status(500).json({
      error: 'Failed to fetch user activity',
      message: error.message
    });
  }
});

/**
 * GET /api/user-audit/assigned-activities
 * Get activities related to user's assignments (exchanges, tasks, etc.)
 */
router.get('/assigned-activities', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      entityType, 
      startDate, 
      endDate 
    } = req.query;

    console.log(`📝 ASSIGNED AUDIT: ${req.user.role} user ${req.user.email} requesting assigned activities`);

    let filters = {};

    // Get user's assignments based on role
    switch (req.user.role) {
      case 'admin':
        // Admin sees all activities
        break;

      case 'coordinator':
        // Get exchanges managed by this coordinator
        const { data: managedExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .eq('coordinator_id', req.user.id);
        
        const managedExchangeIds = managedExchanges?.map(e => e.id) || [];
        
        filters = {
          entityType: 'exchange',
          entityId: { $in: managedExchangeIds }
        };
        break;

      case 'agency':
        // Get client exchanges for this agency
        const { data: agencyClients } = await supabaseService.client
          .from('contacts')
          .select('id')
          .eq('agency_id', req.user.id);
        
        const clientIds = agencyClients?.map(c => c.id) || [];
        
        const { data: clientExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .in('client_id', clientIds);
        
        const clientExchangeIds = clientExchanges?.map(e => e.id) || [];
        
        filters = {
          entityType: 'exchange',
          entityId: { $in: clientExchangeIds }
        };
        break;

      case 'client':
      case 'third_party':
        // Get exchanges where user is a participant
        const { data: userExchanges } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('user_id', req.user.id);
        
        const userExchangeIds = userExchanges?.map(e => e.exchange_id) || [];
        
        filters = {
          entityType: 'exchange',
          entityId: { $in: userExchangeIds }
        };
        break;

      default:
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Your role does not have access to assigned activities'
        });
    }

    // Apply additional filters
    if (action) {
      filters.action = action;
    }
    if (entityType) {
      filters.entityType = entityType;
    }
    if (startDate) {
      filters.created_at = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (filters.created_at) {
        filters.created_at.$lte = new Date(endDate);
      } else {
        filters.created_at = { $lte: new Date(endDate) };
      }
    }

    // Get assigned activities
    const assignedActivities = await AuditService.getAuditLogs({
      ...filters,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: assignedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: assignedActivities.length,
        totalPages: Math.ceil(assignedActivities.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching assigned activities:', error);
    res.status(500).json({
      error: 'Failed to fetch assigned activities',
      message: error.message
    });
  }
});

/**
 * GET /api/user-audit/notifications
 * Get user's audit-related notifications
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    console.log(`📝 AUDIT NOTIFICATIONS: ${req.user.role} user ${req.user.email} requesting notifications`);

    // Get user's notifications
    const notifications = await NotificationService.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      types: ['audit', 'assignment', 'exchange', 'task', 'document']
    });

    res.json({
      success: true,
      data: notifications.notifications,
      pagination: notifications.pagination
    });

  } catch (error) {
    console.error('❌ Error fetching audit notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

/**
 * PUT /api/user-audit/notifications/:id/read
 * Mark notification as read
 */
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await NotificationService.markNotificationAsRead(id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

/**
 * PUT /api/user-audit/notifications/read-all
 * Mark all user's notifications as read
 */
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await NotificationService.markAllNotificationsAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark notifications as read',
      message: error.message
    });
  }
});

/**
 * GET /api/user-audit/summary
 * Get user's activity summary and statistics
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    console.log(`📝 AUDIT SUMMARY: ${req.user.role} user ${req.user.email} requesting summary`);

    const summary = await getUserAuditSummary(req.user.id, req.user.role);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Error fetching audit summary:', error);
    res.status(500).json({
      error: 'Failed to fetch audit summary',
      message: error.message
    });
  }
});

// Helper function to get user activity statistics
async function getUserActivityStats(userId) {
  try {
    // Get user's audit logs for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentLogs } = await supabaseService.client
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const stats = {
      totalActions: recentLogs?.length || 0,
      actionsByType: {},
      actionsByEntity: {},
      recentActivity: recentLogs?.slice(0, 10) || []
    };

    // Group by action type
    recentLogs?.forEach(log => {
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
      stats.actionsByEntity[log.entity_type] = (stats.actionsByEntity[log.entity_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    return {
      totalActions: 0,
      actionsByType: {},
      actionsByEntity: {},
      recentActivity: []
    };
  }
}

// Helper function to get user audit summary
async function getUserAuditSummary(userId, userRole) {
  try {
    const summary = {
      totalActions: 0,
      actionsThisWeek: 0,
      actionsThisMonth: 0,
      topActions: [],
      recentExchanges: [],
      pendingTasks: 0,
      unreadNotifications: 0
    };

    // Get basic stats
    const { data: allLogs } = await supabaseService.client
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId);

    summary.totalActions = allLogs?.length || 0;

    // Get weekly and monthly stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { data: weeklyLogs } = await supabaseService.client
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    const { data: monthlyLogs } = await supabaseService.client
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', monthAgo.toISOString());

    summary.actionsThisWeek = weeklyLogs?.length || 0;
    summary.actionsThisMonth = monthlyLogs?.length || 0;

    // Get top actions
    const actionCounts = {};
    allLogs?.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    summary.topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    // Get unread notifications count
    const { data: unreadNotifications } = await supabaseService.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false);

    summary.unreadNotifications = unreadNotifications?.length || 0;

    return summary;
  } catch (error) {
    console.error('Error getting user audit summary:', error);
    return {
      totalActions: 0,
      actionsThisWeek: 0,
      actionsThisMonth: 0,
      topActions: [],
      recentExchanges: [],
      pendingTasks: 0,
      unreadNotifications: 0
    };
  }
}

module.exports = router;















