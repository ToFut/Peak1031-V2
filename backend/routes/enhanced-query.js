/**
 * Enhanced Query Routes
 * 
 * Routes for the enhanced OSS LLM query service with full database indexing
 * and comprehensive schema understanding.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ossLLMService = require('../services/oss-llm-query');
const enhancedSchemaService = require('../services/enhanced-database-schema');

/**
 * POST /api/enhanced-query/process
 * Process natural language query with enhanced context
 */
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
        message: 'Please provide a natural language query to process'
      });
    }

    console.log(`🔍 Enhanced query from user ${req.user.id}:`, query);
    
    const startTime = Date.now();
    const result = await ossLLMService.processQuery(query, req.user.id);
    const totalTime = Date.now() - startTime;
    
    // Add user context and role information
    const enhancedResult = {
      ...result,
      userContext: {
        userId: req.user.id,
        userRole: req.user.role,
        processingTime: totalTime
      },
      metadata: {
        queryType: 'enhanced',
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
    };

    res.json(enhancedResult);
    
  } catch (error) {
    console.error('❌ Enhanced query processing failed:', error);
    res.status(500).json({
      error: 'Query processing failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/enhanced-query/schema
 * Get comprehensive database schema for LLM understanding
 */
router.get('/schema', authenticateToken, async (req, res) => {
  try {
    const { includeContext = false } = req.query;
    
    const schema = await enhancedSchemaService.getFullSchema();
    
    let response = {
      schema: {
        tableCount: Object.keys(schema.tables).length,
        relationshipCount: schema.relationships.length,
        indexCount: Object.keys(schema.indexes.search_indexes || {}).length,
        lastUpdated: schema.database.lastUpdated
      },
      statistics: await enhancedSchemaService.getSchemaStatistics()
    };
    
    // Include full context only if requested (admin users typically)
    if (includeContext && req.user.role === 'admin') {
      response.fullSchema = schema;
      response.schemaContext = await enhancedSchemaService.getSchemaContextForLLM();
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Schema retrieval failed:', error);
    res.status(500).json({
      error: 'Schema retrieval failed',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-query/suggestions
 * Get intelligent query suggestions based on user role and popular queries
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, category = null } = req.query;
    
    const suggestions = await ossLLMService.getQuerySuggestions(
      parseInt(limit), 
      req.user.id
    );
    
    // Filter by category if requested
    const filteredSuggestions = category ? 
      suggestions.filter(s => s.category === category) : 
      suggestions;
    
    const response = {
      suggestions: filteredSuggestions,
      categories: [...new Set(suggestions.map(s => s.category))],
      userRole: req.user.role,
      totalSuggestions: suggestions.length
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Query suggestions failed:', error);
    res.status(500).json({
      error: 'Failed to get query suggestions',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-query/statistics
 * Get query service performance statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to view detailed statistics
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admin users can view detailed statistics'
      });
    }
    
    const stats = ossLLMService.getQueryStatistics();
    const cacheMetrics = ossLLMService.getCacheMetrics();
    
    res.json({
      ...stats,
      cacheMetrics,
      systemHealth: {
        modelLoaded: stats.modelLoaded,
        lastQuery: stats.recentQueries.length > 0 ? 
          stats.recentQueries[stats.recentQueries.length - 1].timestamp : null
      }
    });
    
  } catch (error) {
    console.error('❌ Statistics retrieval failed:', error);
    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * POST /api/enhanced-query/cache/clear
 * Clear query cache (admin only)
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admin users can clear the cache'
      });
    }
    
    ossLLMService.clearCache();
    
    res.json({
      success: true,
      message: 'Query cache cleared successfully',
      clearedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-query/popular
 * Get popular queries for insights
 */
router.get('/popular', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const stats = ossLLMService.getQueryStatistics();
    const popularQueries = stats.popularQueries.slice(0, parseInt(limit));
    
    res.json({
      popularQueries,
      totalQueries: stats.totalQueries,
      period: 'all_time' // Could be enhanced to support time periods
    });
    
  } catch (error) {
    console.error('❌ Popular queries retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to get popular queries',
      message: error.message
    });
  }
});

/**
 * POST /api/enhanced-query/feedback
 * Submit feedback on query results
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { queryId, query, helpful, feedback, suggestedQuery } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required for feedback'
      });
    }
    
    // Record feedback for learning
    await ossLLMService.learnFromQuery(
      query,
      null, // SQL not available in feedback context
      helpful,
      {
        feedback,
        suggestedQuery,
        userId: req.user.id,
        timestamp: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      thankyou: 'Your feedback helps improve the query service'
    });
    
  } catch (error) {
    console.error('❌ Feedback submission failed:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-query/health
 * Health check endpoint for the enhanced query service
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        ossLLMService: ossLLMService.modelLoaded ? 'loaded' : 'not_loaded',
        enhancedSchema: 'available',
        cache: 'active'
      }
    };
    
    // Test basic functionality
    try {
      await enhancedSchemaService.getSchemaStatistics();
      health.services.enhancedSchema = 'operational';
    } catch (error) {
      health.services.enhancedSchema = 'error';
      health.status = 'degraded';
    }
    
    res.json(health);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;