/**
 * Enhanced Analytics Routes
 * Provides advanced exchange analytics, financial metrics, and AI-powered queries
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const rbacService = require('../services/rbacService');
const router = express.Router();

/**
 * GET /api/analytics/financial-overview
 * Get financial overview with RBAC filtering
 */
router.get('/financial-overview', authenticateToken, async (req, res) => {
  try {
    console.log('💰 Fetching financial overview for', req.user?.email, 'Role:', req.user?.role);
    
    // Get exchanges the user can access
    const userExchanges = await rbacService.getExchangesForUser(req.user, {
      includeParticipant: true
    });
    
    const exchangeIds = userExchanges.data.map(e => e.id);
    
    const overview = await analyticsService.getFinancialOverview({ exchangeIds, userRole: req.user.role });
    
    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/dashboard-stats
 * Get dashboard statistics with RBAC filtering
 */
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📈 Fetching dashboard stats for', req.user?.email, 'Role:', req.user?.role);
    
    // Get exchanges the user can access
    const userExchanges = await rbacService.getExchangesForUser(req.user, {
      includeParticipant: true
    });
    
    const exchangeIds = userExchanges.data.map(e => e.id);
    
    const overview = await analyticsService.getQuickOverview({ exchangeIds, userRole: req.user.role });
    
    const stats = {
      financial: {
        totalValue: overview.totalValue || 0,
        averageValue: overview.averageValue || 0,
        monthlyValue: overview.monthlyValue || 0
      },
      exchanges: {
        total: overview.totalExchanges || 0,
        active: overview.activeExchanges || 0,
        completed: overview.completedExchanges || 0,
        completionRate: overview.completionRate || 0
      },
      timeline: {
        approaching45Day: overview.approaching45Day || 0,
        approaching180Day: overview.approaching180Day || 0,
        overdue: overview.overdueCount || 0
      },
      risk: {
        high: overview.highRisk || 0,
        medium: overview.mediumRisk || 0,
        low: overview.lowRisk || 0,
        total: overview.totalExchanges || 0
      },
      trends: overview.trends || [],
      recentExchanges: [],
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/analytics/clear-cache
 * Clear analytics cache (admin only)
 */
router.post('/clear-cache', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }

    analyticsService.clearCache();
    
    res.json({
      success: true,
      message: 'Analytics cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

