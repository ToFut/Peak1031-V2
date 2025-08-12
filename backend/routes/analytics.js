/**
 * Enhanced Analytics Routes
 * Provides advanced exchange analytics, financial metrics, and AI-powered queries
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const gptQueryService = require('../services/gptQueryService');
const rbacService = require('../services/rbacService');
const router = express.Router();

/**
 * GET /api/analytics/financial-overview
 * Get financial overview with RBAC filtering
 */
router.get('/financial-overview', authenticateToken, async (req, res) => {
  try {
    console.log('💰 Fetching financial overview for', req.user?.email, 'Role:', req.user?.role);
    
    // Pass user context to analytics service for RBAC
    const overview = await analyticsService.getFinancialOverview({ user: req.user });
    
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
    
    // Pass user context to analytics service for RBAC
    const overview = await analyticsService.getQuickOverview({ user: req.user });
    
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

/**
 * GET /api/analytics/classic-queries
 * Get list of available pre-built queries
 */
router.get('/classic-queries', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching classic queries for', req.user?.email);
    
    const queries = gptQueryService.getClassicQueries();
    
    res.json({
      success: true,
      data: queries,
      count: queries.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Classic queries error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/query-suggestions
 * Get query suggestions based on context
 */
router.get('/query-suggestions', authenticateToken, async (req, res) => {
  try {
    console.log('💡 Fetching query suggestions for', req.user?.email);
    
    const context = {
      userRole: req.user?.role,
      currentPage: req.query.page,
      recentQueries: req.query.recent ? JSON.parse(req.query.recent) : []
    };
    
    const suggestions = gptQueryService.getQuerySuggestions(context);
    
    res.json({
      success: true,
      data: suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Query suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/analytics/classic-query
 * Execute a pre-built classic query
 */
router.post('/classic-query', authenticateToken, async (req, res) => {
  try {
    const { queryKey, params } = req.body;

    if (!queryKey) {
      return res.status(400).json({
        success: false,
        error: 'Query key is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔍 Executing classic query: ${queryKey}`);
    
    const result = await gptQueryService.executeClassicQuery(queryKey, params);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Classic query execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/analytics/ai-query
 * Execute natural language query using AI
 */
router.post('/ai-query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Natural language query is required',
        timestamp: new Date().toISOString()
      });
    }

    // Limit query length for security
    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query too long. Please keep it under 500 characters.',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🤖 Executing AI query: "${query}"`);
    
    const result = await gptQueryService.executeNaturalLanguageQuery(query);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI query execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

