const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');
const AuditService = require('../services/audit');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/user-profile/exchanges-summary
 * Get detailed exchanges summary for current user
 */
router.get('/exchanges-summary', authenticateToken, async (req, res) => {
  try {
    console.log('📈 Getting detailed exchanges summary for:', req.user.email);
    
    const userId = req.user.id;
    const userContactId = req.user.contact_id;
    
    // Get user's exchanges based on role (optimized for summary)
    let exchanges = [];
    
    // For summary, we only need basic fields to avoid timeout
    const basicFields = 'id,name,status,exchange_type,created_at,updated_at,completion_date';
    
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      exchanges = await databaseService.getExchanges({ 
        select: basicFields,
        limit: 1000, // Reduced limit
        orderBy: { column: 'updated_at', ascending: false }
      });
    } else if (req.user.role === 'client') {
      exchanges = await databaseService.getExchanges({
        select: basicFields,
        where: { client_id: userContactId },
        limit: 500
      });
    } else if (req.user.role === 'coordinator') {
      exchanges = await databaseService.getExchanges({
        select: basicFields,
        where: { coordinator_id: userId },
        limit: 500
      });
    } else {
      try {
        const exchangeParticipations = await databaseService.getExchangeParticipants({
          where: { contact_id: userContactId },
          limit: 100
        });
        const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
        if (exchangeIds.length > 0) {
          exchanges = await databaseService.getExchanges({
            select: basicFields,
            where: { id: { in: exchangeIds.slice(0, 50) } }, // Limit to first 50
            limit: 50
          });
        }
      } catch (err) {
        console.error('Error getting participations:', err.message);
      }
    }
    
    // Detailed exchange analysis
    const summary = {
      totalCount: exchanges.length,
      byStatus: {},
      byType: {},
      byCreationMonth: {},
      averageTimeframes: {},
      recentActivity: []
    };
    
    // Group by status
    exchanges.forEach(ex => {
      const status = ex.status || 'unknown';
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = [];
      }
      summary.byStatus[status].push({
        id: ex.id,
        name: ex.name,
        createdAt: ex.created_at
      });
    });
    
    // Group by type
    exchanges.forEach(ex => {
      const type = ex.exchange_type || 'standard';
      if (!summary.byType[type]) {
        summary.byType[type] = [];
      }
      summary.byType[type].push({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        createdAt: ex.created_at
      });
    });
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    summary.recentActivity = exchanges
      .filter(ex => new Date(ex.updated_at || ex.created_at) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 20)
      .map(ex => ({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        lastActivity: ex.updated_at || ex.created_at
      }));
    
    // Calculate average timeframes
    const completedExchanges = exchanges.filter(ex => ex.status === 'completed');
    if (completedExchanges.length > 0) {
      const timeframes = completedExchanges.map(ex => {
        const start = new Date(ex.created_at);
        const end = new Date(ex.completion_date || ex.updated_at);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // Days
      });
      
      summary.averageTimeframes = {
        averageDays: Math.round(timeframes.reduce((a, b) => a + b, 0) / timeframes.length),
        minDays: Math.min(...timeframes),
        maxDays: Math.max(...timeframes)
      };
    }
    
    // Group by creation month
    exchanges.forEach(ex => {
      const date = new Date(ex.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!summary.byCreationMonth[monthKey]) {
        summary.byCreationMonth[monthKey] = [];
      }
      summary.byCreationMonth[monthKey].push({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        createdAt: ex.created_at
      });
    });
    
    console.log('✅ Exchanges summary generated:', {
      totalCount: summary.totalCount,
      statusCounts: Object.keys(summary.byStatus).length,
      typeCounts: Object.keys(summary.byType).length,
      recentActivity: summary.recentActivity.length
    });
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting exchanges summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exchanges summary',
      message: error.message
    });
  }
});

/**
 * GET /api/user-profile/:userId/exchanges-summary
 * Get detailed exchanges summary for specific user (admin only)
 */
router.get('/:userId/exchanges-summary', authenticateToken, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    
    // Only admins can view other user's exchange summaries
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only administrators can view other user exchange summaries'
      });
    }
    
    // Get the target user's information
    const targetUser = await databaseService.getUserById(requestedUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    // Use the same logic as the main exchanges-summary route but for the target user
    const userId = targetUser.id;
    const userContactId = targetUser.contact_id;
    
    let exchanges = [];
    
    if (targetUser.role === 'admin' || targetUser.role === 'staff') {
      exchanges = await databaseService.getExchanges({ limit: 100 });
    } else if (targetUser.role === 'client') {
      exchanges = await databaseService.getExchanges({
        where: { client_id: userContactId },
        limit: 100
      });
    } else if (targetUser.role === 'coordinator') {
      exchanges = await databaseService.getExchanges({
        where: { coordinator_id: userId },
        limit: 100
      });
    } else {
      const exchangeParticipations = await databaseService.getExchangeParticipants({
        where: { contact_id: userContactId }
      });
      const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
      if (exchangeIds.length > 0) {
        exchanges = await databaseService.getExchanges({
          where: { id: { in: exchangeIds } },
          limit: 100
        });
      }
    }
    
    // Generate summary (same logic as above)
    const summary = {
      totalCount: exchanges.length,
      byStatus: {},
      byType: {},
      byCreationMonth: {},
      averageTimeframes: {},
      recentActivity: []
    };
    
    // Group by status
    exchanges.forEach(ex => {
      const status = ex.status || 'unknown';
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = [];
      }
      summary.byStatus[status].push({
        id: ex.id,
        name: ex.name,
        createdAt: ex.created_at
      });
    });
    
    // Group by type
    exchanges.forEach(ex => {
      const type = ex.exchange_type || 'standard';
      if (!summary.byType[type]) {
        summary.byType[type] = [];
      }
      summary.byType[type].push({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        createdAt: ex.created_at
      });
    });
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    summary.recentActivity = exchanges
      .filter(ex => new Date(ex.updated_at || ex.created_at) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 20)
      .map(ex => ({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        lastActivity: ex.updated_at || ex.created_at
      }));
    
    // Calculate average timeframes
    const completedExchanges = exchanges.filter(ex => ex.status === 'completed');
    if (completedExchanges.length > 0) {
      const timeframes = completedExchanges.map(ex => {
        const start = new Date(ex.created_at);
        const end = new Date(ex.completion_date || ex.updated_at);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // Days
      });
      
      summary.averageTimeframes = {
        averageDays: Math.round(timeframes.reduce((a, b) => a + b, 0) / timeframes.length),
        minDays: Math.min(...timeframes),
        maxDays: Math.max(...timeframes)
      };
    }
    
    // Group by creation month
    exchanges.forEach(ex => {
      const date = new Date(ex.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!summary.byCreationMonth[monthKey]) {
        summary.byCreationMonth[monthKey] = [];
      }
      summary.byCreationMonth[monthKey].push({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        createdAt: ex.created_at
      });
    });
    
    res.json({
      success: true,
      data: summary,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.first_name || targetUser.firstName,
        lastName: targetUser.last_name || targetUser.lastName,
        role: targetUser.role
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user exchanges summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user exchanges summary',
      message: error.message
    });
  }
});

/**
 * GET /api/user-profile/:userId?
 * Get comprehensive user profile with exchange analytics
 * If userId is provided, get that user's profile (admin only)
 * If no userId, get current user's profile
 */
router.get('/:userId?', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 USER PROFILE REQUEST START');
    console.log('🔍 Requested userId:', req.params.userId);
    console.log('🔍 Current user:', req.user?.email, 'ID:', req.user?.id, 'Role:', req.user?.role);
    
    const requestedUserId = req.params.userId;
    let targetUser = req.user; // Default to current user
    
    // If requesting another user's profile
    if (requestedUserId && requestedUserId !== req.user.id) {
      console.log('🔍 Admin requesting another user\'s profile');
      
      // Only admins can view other user's profiles
      if (req.user.role !== 'admin') {
        console.log('❌ Non-admin trying to access other user profile');
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only administrators can view other user profiles'
        });
      }
      
      // Get the target user's information
      try {
        console.log('🔍 Fetching target user with ID:', requestedUserId);
        targetUser = await databaseService.getUserById(requestedUserId);
        console.log('🔍 Target user fetched:', targetUser);
        
        if (!targetUser) {
          console.log('❌ Target user not found in database');
          return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'The requested user does not exist'
          });
        }
        console.log('✅ Target user found:', targetUser.email || targetUser.firstName || 'No email/name');
      } catch (err) {
        console.error('❌ Error fetching target user:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user',
          message: 'Could not retrieve target user information'
        });
      }
    } else {
      console.log('📊 Getting user profile for current user:', req.user.email);
    }
    
    console.log('🔍 Setting up user profile data...');
    const userId = targetUser.id;
    const userContactId = targetUser.contact_id || targetUser.id; // Fallback to user ID
    
    console.log('🔍 User data extraction:', {
      userId,
      userContactId,
      targetUserKeys: Object.keys(targetUser),
      targetUserSample: {
        id: targetUser.id,
        email: targetUser.email,
        first_name: targetUser.first_name,
        role: targetUser.role,
        contact_id: targetUser.contact_id
      }
    });
    
    // Get user basic info (use targetUser, not req.user)
    const userInfo = {
      id: targetUser.id,
      email: targetUser.email || targetUser.firstName + '@unknown.com', // Handle missing email
      firstName: targetUser.first_name || targetUser.firstName,
      lastName: targetUser.last_name || targetUser.lastName,
      role: targetUser.role || 'client',
      isActive: targetUser.is_active,
      lastLogin: targetUser.last_login,
      createdAt: targetUser.created_at
    };
    
    console.log('🔍 Fetching exchanges based on role...');
    // Get target user's exchanges based on their role
    let exchanges = [];
    let exchangeParticipations = [];
    
    try {
      if (targetUser.role === 'admin' || targetUser.role === 'staff') {
        console.log('🔍 Admin/staff role - getting all exchanges');
        // Admin user sees all exchanges
        exchanges = await databaseService.getExchanges({ limit: 100 });
        console.log('✅ Admin exchanges fetched:', exchanges.length);
      } else if (targetUser.role === 'client') {
        console.log('🔍 Client role - getting exchanges for contact_id:', userContactId);
        if (!userContactId || userContactId === 'undefined') {
          console.log('❌ Invalid userContactId for client exchanges query:', userContactId);
          exchanges = []; // Return empty array for invalid contact ID
        } else {
          // Client sees only their exchanges
          exchanges = await databaseService.getExchanges({
            where: { client_id: userContactId },
            limit: 100
          });
        }
        console.log('✅ Client exchanges fetched:', exchanges.length);
      } else if (targetUser.role === 'coordinator') {
        console.log('🔍 Coordinator role - getting exchanges for user_id:', userId);
        // Coordinator sees assigned exchanges
        exchanges = await databaseService.getExchanges({
          where: { coordinator_id: userId },
          limit: 100
        });
        console.log('✅ Coordinator exchanges fetched:', exchanges.length);
      } else if (targetUser.role === 'agency') {
        console.log('🔍 Agency role - getting exchanges for contact_id:', userContactId);
        // Agency users see exchanges where they are participants
        try {
          exchangeParticipations = await databaseService.getExchangeParticipants({
            where: { contact_id: userContactId }
          });
          console.log('✅ Agency exchange participations fetched:', exchangeParticipations.length);
          const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
          if (exchangeIds.length > 0) {
            exchanges = await databaseService.getExchanges({
              where: { id: { in: exchangeIds } },
              limit: 100
            });
            console.log('✅ Agency exchanges from participations fetched:', exchanges.length);
          }
        } catch (err) {
          console.error('❌ Error getting agency participations:', err.message);
          // Continue with empty exchanges
        }
      } else {
        console.log('🔍 Other role - checking participations for contact_id:', userContactId);
        // Other roles (like third_party) - check participations
        try {
          exchangeParticipations = await databaseService.getExchangeParticipants({
            where: { contact_id: userContactId }
          });
          console.log('✅ Exchange participations fetched:', exchangeParticipations.length);
          const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
          if (exchangeIds.length > 0) {
            exchanges = await databaseService.getExchanges({
              where: { id: { in: exchangeIds } },
              limit: 100
            });
            console.log('✅ Exchanges from participations fetched:', exchanges.length);
          }
        } catch (err) {
          console.error('❌ Error getting participations:', err.message);
          // Continue with empty exchanges
        }
      }
    } catch (exchangeError) {
      console.error('❌ Error fetching exchanges:', exchangeError);
      console.error('❌ Exchange error details:', {
        message: exchangeError.message,
        stack: exchangeError.stack,
        role: targetUser.role,
        userId,
        userContactId
      });
      // Continue with empty exchanges array
      exchanges = [];
    }
    
    console.log(`✅ Found ${exchanges.length} exchanges for user`);
    
    // Calculate exchange statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const stats = {
      totalExchanges: exchanges.length,
      activeExchanges: exchanges.filter(ex => ex.status === 'active' || ex.status === 'in_progress').length,
      completedExchanges: exchanges.filter(ex => ex.status === 'completed').length,
      pendingExchanges: exchanges.filter(ex => ex.status === 'pending' || ex.status === 'initiated').length,
      recentExchanges: exchanges.filter(ex => new Date(ex.created_at) > thirtyDaysAgo).length,
      exchangesLast90Days: exchanges.filter(ex => new Date(ex.created_at) > ninetyDaysAgo).length
    };
    
    // Status distribution
    const statusCounts = {};
    exchanges.forEach(ex => {
      const status = ex.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Recent exchanges (last 10)
    const recentExchanges = exchanges
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(ex => ({
        id: ex.id,
        name: ex.name,
        status: ex.status,
        createdAt: ex.created_at,
        updatedAt: ex.updated_at,
        propertyAddress: ex.property_address,
        exchangeType: ex.exchange_type
      }));
    
    // Get message activity if user has exchanges (optimized)
    let messageStats = {
      totalMessages: 0,
      messagesLast30Days: 0,
      avgMessagesPerExchange: 0
    };
    
    if (exchanges.length > 0) {
      try {
        // Get all messages for user's exchanges in a single optimized query
        const exchangeIds = exchanges.map(ex => ex.id).slice(0, 10); // Limit to 10 exchanges for performance
        
        if (exchangeIds.length > 0) {
          // Single batch query instead of sequential queries
          const allMessages = await databaseService.getMessages({
            where: { exchange_id: { in: exchangeIds } },
            limit: 500, // Reasonable limit for total messages
            orderBy: { column: 'created_at', ascending: false }
          });
          
          messageStats = {
            totalMessages: allMessages.length,
            messagesLast30Days: allMessages.filter(msg => 
              new Date(msg.created_at) > thirtyDaysAgo
            ).length,
            avgMessagesPerExchange: exchanges.length > 0 ? Math.round(allMessages.length / exchanges.length) : 0
          };
        }
      } catch (err) {
        console.warn('Could not calculate message stats:', err.message);
      }
    }
    
    // Get user audit activity and system usage stats
    let auditActivity = {
      totalActions: 0,
      actionsLast30Days: 0,
      actionBreakdown: {},
      recentActivity: [],
      systemUsageStats: {},
      loginHistory: []
    };
    
    try {
      console.log('🔍 Fetching audit logs for user:', userId);
      
      // Get audit logs for this user (optimized)
      const auditLogs = await AuditService.getAuditLogs({
        userId: userId,
        limit: 50 // Reduced limit for faster loading
      });
      
      // Skip the expensive details search for now to improve performance
      const uniqueLogs = auditLogs || [];
      
      console.log(`✅ Found ${uniqueLogs.length} audit logs for user`);
      
      if (uniqueLogs.length > 0) {
        auditActivity.totalActions = uniqueLogs.length;
        auditActivity.actionsLast30Days = uniqueLogs.filter(log => 
          new Date(log.created_at) > thirtyDaysAgo
        ).length;
        
        // Action breakdown
        const actionCounts = {};
        const entityCounts = {};
        const dailyActivity = {};
        
        uniqueLogs.forEach(log => {
          // Count actions
          actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
          
          // Count entity types
          if (log.entity_type) {
            entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
          }
          
          // Daily activity
          const day = new Date(log.created_at).toISOString().split('T')[0];
          dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        });
        
        auditActivity.actionBreakdown = actionCounts;
        auditActivity.entityBreakdown = entityCounts;
        auditActivity.dailyActivity = dailyActivity;
        
        // Recent activity (last 20 actions)
        auditActivity.recentActivity = uniqueLogs.slice(0, 20).map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          timestamp: log.created_at,
          details: log.details,
          ipAddress: log.ip_address,
          userAgent: log.user_agent
        }));
        
        // Login history (filter login/logout actions)
        auditActivity.loginHistory = uniqueLogs
          .filter(log => ['login', 'logout', 'token_refresh', 'auth_success', 'auth_failure'].includes(log.action))
          .slice(0, 10)
          .map(log => ({
            action: log.action,
            timestamp: log.created_at,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            details: log.details
          }));
        
        // System usage stats
        auditActivity.systemUsageStats = {
          mostUsedFeatures: Object.entries(entityCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([entity, count]) => ({ feature: entity, usage: count })),
          mostCommonActions: Object.entries(actionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([action, count]) => ({ action, count })),
          averageActionsPerDay: Object.keys(dailyActivity).length > 0 
            ? Math.round(uniqueLogs.length / Object.keys(dailyActivity).length) 
            : 0,
          activeDays: Object.keys(dailyActivity).length,
          lastActiveDate: uniqueLogs[0]?.created_at
        };
      }
      
    } catch (auditErr) {
      console.warn('Could not fetch audit activity:', auditErr.message);
    }
    
    // Exchange type distribution
    const typeDistribution = {};
    exchanges.forEach(ex => {
      const type = ex.exchange_type || ex.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    // Monthly activity (last 12 months)
    const monthlyActivity = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthlyExchanges = exchanges.filter(ex => {
        const created = new Date(ex.created_at);
        return created >= monthStart && created <= monthEnd;
      }).length;
      
      monthlyActivity.push({
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        exchanges: monthlyExchanges,
        date: date.toISOString()
      });
    }
    
    // Ensure auditActivity has all required properties with defaults
    const safeAuditActivity = {
      totalActions: 0,
      actionsLast30Days: 0,
      actionBreakdown: {},
      entityBreakdown: {},
      dailyActivity: {},
      recentActivity: [],
      systemUsageStats: {
        mostUsedFeatures: [],
        mostCommonActions: [],
        averageActionsPerDay: 0,
        activeDays: 0,
        lastActiveDate: null
      },
      loginHistory: [],
      ...auditActivity
    };

    const profile = {
      user: userInfo,
      stats,
      statusDistribution: statusCounts,
      typeDistribution,
      messageStats,
      recentExchanges,
      monthlyActivity,
      participationCount: exchangeParticipations.length,
      auditActivity: safeAuditActivity
    };
    
    // Log audit trail
    await AuditService.logUserAction(
      req.user.id,
      requestedUserId ? 'view_other_user_profile' : 'view_profile',
      'user',
      targetUser.id,
      req,
      { 
        exchangeCount: exchanges.length,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email
      }
    );
    
    console.log('✅ User profile compiled successfully');
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    console.error('❌ Full error stack:', error.stack);
    console.error('❌ Request details:', {
      userId: req.params.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role
    });
    res.status(500).json({
      success: false,
      error: 'Failed to load user profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;