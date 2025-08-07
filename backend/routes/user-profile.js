const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');
const AuditService = require('../services/audit');

/**
 * GET /api/user-profile/:userId?
 * Get comprehensive user profile with exchange analytics
 * If userId is provided, get that user's profile (admin only)
 * If no userId, get current user's profile
 */
router.get('/:userId?', async (req, res) => {
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
        exchanges = await databaseService.getExchanges({ limit: 1000 });
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
            limit: 1000
          });
        }
        console.log('✅ Client exchanges fetched:', exchanges.length);
      } else if (targetUser.role === 'coordinator') {
        console.log('🔍 Coordinator role - getting exchanges for user_id:', userId);
        // Coordinator sees assigned exchanges
        exchanges = await databaseService.getExchanges({
          where: { coordinator_id: userId },
          limit: 1000
        });
        console.log('✅ Coordinator exchanges fetched:', exchanges.length);
      } else {
        console.log('🔍 Other role - checking participations for contact_id:', userContactId);
        // Other roles - check participations
        try {
          exchangeParticipations = await databaseService.getExchangeParticipants({
            where: { contact_id: userContactId }
          });
          console.log('✅ Exchange participations fetched:', exchangeParticipations.length);
          const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
          if (exchangeIds.length > 0) {
            exchanges = await databaseService.getExchanges({
              where: { id: { in: exchangeIds } },
              limit: 1000
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
    
    // Get message activity if user has exchanges
    let messageStats = {
      totalMessages: 0,
      messagesLast30Days: 0,
      avgMessagesPerExchange: 0
    };
    
    if (exchanges.length > 0) {
      try {
        // Get all messages for user's exchanges
        const exchangeIds = exchanges.map(ex => ex.id);
        let allMessages = [];
        
        // For performance, batch the message queries
        for (const exchangeId of exchangeIds.slice(0, 20)) { // Limit to avoid timeouts
          try {
            const messages = await databaseService.getMessages({
              where: { exchange_id: exchangeId },
              limit: 100
            });
            allMessages = allMessages.concat(messages);
          } catch (msgErr) {
            console.warn(`Could not get messages for exchange ${exchangeId}:`, msgErr.message);
          }
        }
        
        messageStats = {
          totalMessages: allMessages.length,
          messagesLast30Days: allMessages.filter(msg => 
            new Date(msg.created_at) > thirtyDaysAgo
          ).length,
          avgMessagesPerExchange: exchanges.length > 0 ? Math.round(allMessages.length / exchanges.length) : 0
        };
      } catch (err) {
        console.warn('Could not calculate message stats:', err.message);
      }
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
    
    const profile = {
      user: userInfo,
      stats,
      statusDistribution: statusCounts,
      typeDistribution,
      messageStats,
      recentExchanges,
      monthlyActivity,
      participationCount: exchangeParticipations.length
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

/**
 * GET /api/user-profile/exchanges-summary
 * Get detailed exchanges summary for current user
 */
router.get('/exchanges-summary', async (req, res) => {
  try {
    console.log('📈 Getting detailed exchanges summary for:', req.user.email);
    
    const userId = req.user.id;
    const userContactId = req.user.contact_id;
    
    // Get user's exchanges based on role (same logic as main profile endpoint)
    let exchanges = [];
    
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      exchanges = await databaseService.getExchanges({ limit: 1000 });
    } else if (req.user.role === 'client') {
      exchanges = await databaseService.getExchanges({
        where: { client_id: userContactId },
        limit: 1000
      });
    } else if (req.user.role === 'coordinator') {
      exchanges = await databaseService.getExchanges({
        where: { coordinator_id: userId },
        limit: 1000
      });
    } else {
      try {
        const exchangeParticipations = await databaseService.getExchangeParticipants({
          where: { contact_id: userContactId }
        });
        const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
        if (exchangeIds.length > 0) {
          exchanges = await databaseService.getExchanges({
            where: { id: { in: exchangeIds } },
            limit: 1000
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
        createdAt: ex.created_at,
        propertyAddress: ex.property_address
      });
    });
    
    // Group by type
    exchanges.forEach(ex => {
      const type = ex.exchange_type || ex.type || 'standard';
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
        lastActivity: ex.updated_at || ex.created_at,
        propertyAddress: ex.property_address
      }));
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting exchanges summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load exchanges summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user-profile/:userId/exchanges-summary
 * Get detailed exchanges summary for specific user (admin only)
 */
router.get('/:userId/exchanges-summary', async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    let targetUser = req.user; // Default to current user
    
    // If requesting another user's summary
    if (requestedUserId && requestedUserId !== req.user.id) {
      // Only admins can view other user's profiles
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only administrators can view other user profiles'
        });
      }
      
      // Get the target user's information
      try {
        targetUser = await databaseService.getUserById(requestedUserId);
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'The requested user does not exist'
          });
        }
        console.log('📈 Admin getting exchanges summary for:', targetUser.email || 'Unknown');
      } catch (err) {
        console.error('Error fetching target user:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user',
          message: 'Could not retrieve target user information'
        });
      }
    } else {
      console.log('📈 Getting detailed exchanges summary for:', req.user.email);
    }
    
    const userId = targetUser.id;
    const userContactId = targetUser.contact_id;
    
    // Get target user's exchanges based on their role (same logic as main profile endpoint)
    let exchanges = [];
    
    if (targetUser.role === 'admin' || targetUser.role === 'staff') {
      exchanges = await databaseService.getExchanges({ limit: 1000 });
    } else if (targetUser.role === 'client') {
      console.log('🔍 Querying exchanges for client with client_id:', userContactId);
      if (!userContactId || userContactId === 'undefined') {
        console.log('❌ Invalid userContactId for client exchanges query:', userContactId);
        exchanges = []; // Return empty array for invalid contact ID
      } else {
        exchanges = await databaseService.getExchanges({
          where: { client_id: userContactId },
          limit: 1000
        });
      }
    } else if (targetUser.role === 'coordinator') {
      exchanges = await databaseService.getExchanges({
        where: { coordinator_id: userId },
        limit: 1000
      });
    } else {
      try {
        const exchangeParticipations = await databaseService.getExchangeParticipants({
          where: { contact_id: userContactId }
        });
        const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
        if (exchangeIds.length > 0) {
          exchanges = await databaseService.getExchanges({
            where: { id: { in: exchangeIds } },
            limit: 1000
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
        createdAt: ex.created_at,
        propertyAddress: ex.property_address
      });
    });
    
    // Group by type
    exchanges.forEach(ex => {
      const type = ex.exchange_type || ex.type || 'standard';
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
        lastActivity: ex.updated_at || ex.created_at,
        propertyAddress: ex.property_address
      }));
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting exchanges summary for user:', req.params.userId);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      requestedUserId: req.params.userId,
      userRole: req.user?.role
    });
    res.status(500).json({
      success: false,
      error: 'Failed to load exchanges summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;