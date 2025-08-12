/**
 * AdminGPT Routes - Natural Language Database Query Interface
 * 
 * This module provides endpoints for AI-powered database querying using
 * a local open-source 20B parameter language model. Features include:
 * - Natural language to SQL conversion
 * - Usage statistics tracking
 * - Query suggestions and insights
 * - Report generation
 * 
 * Security: All endpoints require admin authentication
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');

// Simple permission check function
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For admin features, only allow admin users
    if (req.user.role === 'admin') {
      console.log(`🔐 Admin permission granted: ${req.user.role} user accessing ${resource} with ${action} permission`);
      next();
    } else {
      console.log(`❌ Admin permission denied: ${req.user.role} user accessing ${resource} with ${action} permission`);
      res.status(403).json({ error: 'Admin access required' });
    }
  };
};
const databaseService = require('../services/database');
const ossLLMQueryService = require('../services/oss-llm-query');

const router = express.Router();

// GPT Usage Statistics
router.get('/usage', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    // Mock data for now - in production, this would come from a GPT usage tracking table
    const usageStats = {
      usage: {
        totalQueries: 145,
        thisMonth: 42,
        avgResponseTime: 2.3,
        successRate: 98.2
      },
      topQueries: [
        {
          query: "Show me all exchanges from last month",
          count: 12,
          avgResponseTime: 1.8
        },
        {
          query: "Which users are most active?",
          count: 8,
          avgResponseTime: 2.1
        },
        {
          query: "List overdue tasks",
          count: 6,
          avgResponseTime: 1.5
        }
      ]
    };

    res.json(usageStats);
  } catch (error) {
    console.error('Error fetching GPT usage stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GPT Query Suggestions  
router.get('/suggestions', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    // Get learned suggestions from the OSS LLM Query Service
    const learnedSuggestions = await ossLLMQueryService.getQuerySuggestions();
    
    const suggestions = {
      suggestions: learnedSuggestions.length > 0 ? learnedSuggestions : [
        "Show me all active exchanges",
        "List users who joined this month", 
        "Find exchanges with overdue tasks",
        "Show document upload statistics",
        "Which coordinators are handling the most exchanges?",
        "List exchanges by status",
        "Show me recent system activity",
        "Find users with incomplete profiles",
        "Display task completion rates by user",
        "Show exchanges created in the last 30 days"
      ]
    };

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Natural Language Query Processing
router.post('/query', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🤖 Processing GPT query with OSS LLM: "${query}"`);

    // Use the OSS LLM Query Service for real natural language to SQL translation
    const queryResult = await ossLLMQueryService.processQuery(query, req.user?.id);

    res.json({
      query: queryResult.originalQuery,
      results: queryResult.results,
      explanation: queryResult.explanation,
      suggestedActions: queryResult.suggestedActions || [],
      generatedSQL: queryResult.generatedSQL, // Include for transparency
      executionTime: queryResult.executionTime,
      rowCount: queryResult.rowCount,
      error: queryResult.error || null
    });

  } catch (error) {
    console.error('Error processing GPT query:', error);
    res.status(500).json({ 
      error: error.message,
      query,
      results: [],
      explanation: "An error occurred while processing your query.",
      suggestedActions: [
        "Try rephrasing your question",
        "Use simpler terms",
        "Ask about specific data like 'exchanges', 'users', or 'tasks'"
      ]
    });
  }
});

// GPT Insights Generation
router.get('/insights/:exchangeId?', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    const { exchangeId } = req.params;

    // Generate insights based on data analysis
    const insights = await generateInsights(exchangeId);

    res.json({
      insights: insights.insights,
      summary: insights.summary
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// GPT Report Generation
router.post('/reports', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    const { reportType, parameters } = req.body;

    console.log(`🤖 Generating AI-powered report: ${reportType}`);

    // Use the enhanced OSS LLM service for report generation
    const report = await ossLLMQueryService.generateReport(reportType, parameters);

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating GPT report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available report types
router.get('/reports/types', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    const reportTypes = [
      {
        id: 'system_health',
        name: 'System Health Report',
        description: 'Comprehensive analysis of system performance, user activity, and operational metrics',
        category: 'Operations',
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'user_activity',
        name: 'User Activity Report',
        description: 'Detailed analysis of user engagement, login patterns, and productivity metrics',
        category: 'Analytics',
        estimatedTime: '1-2 minutes'
      },
      {
        id: 'exchange_performance',
        name: 'Exchange Performance Report',
        description: 'Analysis of exchange lifecycle, completion rates, and bottleneck identification',
        category: 'Business',
        estimatedTime: '2-4 minutes'
      },
      {
        id: 'audit_summary',
        name: 'Security Audit Report',
        description: 'Security and compliance analysis based on audit logs and user activities',
        category: 'Security',
        estimatedTime: '1-3 minutes'
      },
      {
        id: 'predictive_analytics',
        name: 'Predictive Analytics Report',
        description: 'AI-powered predictions for system load, user behavior, and business trends',
        category: 'Advanced',
        estimatedTime: '3-5 minutes'
      }
    ];

    res.json({
      success: true,
      reportTypes
    });

  } catch (error) {
    console.error('Error fetching report types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get report templates
router.get('/reports/templates', authenticateToken, checkPermission('system', 'view_analytics'), async (req, res) => {
  try {
    const templates = [
      {
        id: 'weekly_summary',
        name: 'Weekly Summary',
        description: 'Automated weekly report including key metrics and trends',
        frequency: 'weekly',
        parameters: {
          timeRange: '7d',
          includeCharts: true,
          sections: ['exchanges', 'users', 'tasks']
        }
      },
      {
        id: 'monthly_executive',
        name: 'Monthly Executive Report',
        description: 'High-level monthly report for executive review',
        frequency: 'monthly',
        parameters: {
          timeRange: '30d',
          includeCharts: true,
          executiveSummary: true,
          sections: ['performance', 'growth', 'issues']
        }
      },
      {
        id: 'performance_deep_dive',
        name: 'Performance Deep Dive',
        description: 'Detailed analysis of system and user performance',
        frequency: 'on-demand',
        parameters: {
          detailLevel: 'high',
          includeRecommendations: true,
          benchmarkComparison: true
        }
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize OSS LLM Query Service on startup
(async () => {
  try {
    await ossLLMQueryService.initialize();
    console.log('✅ OSS LLM Query Service initialized for admin GPT routes');
  } catch (error) {
    console.warn('⚠️ OSS LLM Query Service initialization failed:', error.message);
  }
})();

// Helper function to generate insights
async function generateInsights(exchangeId) {
  try {
    const insights = [];
    
    if (exchangeId) {
      // Exchange-specific insights
      const exchange = await databaseService.getExchangeById(exchangeId);
      const tasks = await databaseService.getTasks({ where: { exchange_id: exchangeId } });
      
      if (tasks.length === 0) {
        insights.push({
          category: "Tasks",
          insight: "This exchange has no tasks assigned yet",
          severity: "medium",
          actionable: true,
          suggestedAction: "Create initial tasks to begin the exchange process"
        });
      }
      
      return {
        insights,
        summary: `Analysis of exchange ${exchange?.name || exchangeId} shows ${insights.length} actionable insights.`
      };
    } else {
      // System-wide insights
      const exchanges = await databaseService.getExchanges({ limit: 100 });
      const users = await databaseService.getUsers({ limit: 100 });
      
      const activeExchanges = exchanges.filter(e => e.status === 'ACTIVE').length;
      const totalExchanges = exchanges.length;
      
      if (activeExchanges / totalExchanges < 0.3) {
        insights.push({
          category: "System Health",
          insight: "Low percentage of active exchanges detected",
          severity: "high",
          actionable: true,
          suggestedAction: "Review exchange workflow and identify bottlenecks"
        });
      }
      
      const recentUsers = users.filter(u => {
        const userDate = new Date(u.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return userDate > weekAgo;
      }).length;
      
      if (recentUsers > 10) {
        insights.push({
          category: "User Growth",
          insight: `High user registration activity: ${recentUsers} new users this week`,
          severity: "low",
          actionable: true,
          suggestedAction: "Prepare onboarding resources for new user influx"
        });
      }
      
      return {
        insights,
        summary: `System analysis reveals ${insights.length} insights across ${totalExchanges} exchanges and ${users.length} users.`
      };
    }
  } catch (error) {
    console.error('Error generating insights:', error);
    return {
      insights: [],
      summary: "Unable to generate insights due to an error."
    };
  }
}

// Helper function to generate GPT reports
async function generateGPTReport(reportType, parameters) {
  try {
    const startTime = Date.now();
    
    let report = {
      title: '',
      content: '',
      data: [],
      charts: []
    };

    switch (reportType) {
      case 'exchange_summary':
        const exchanges = await databaseService.getExchanges({ limit: 50 });
        report.title = 'Exchange Summary Report';
        report.content = `Analysis of ${exchanges.length} exchanges in the system.`;
        report.data = exchanges.map(e => ({
          name: e.name,
          status: e.status,
          created: e.created_at
        }));
        break;

      case 'user_activity':
        const users = await databaseService.getUsers({ limit: 50 });
        report.title = 'User Activity Report';
        report.content = `User engagement analysis for ${users.length} registered users.`;
        report.data = users.map(u => ({
          email: u.email,
          role: u.role,
          lastLogin: u.last_login,
          active: u.is_active
        }));
        break;

      default:
        report.title = 'Custom Report';
        report.content = 'Report generated based on provided parameters.';
        report.data = [];
    }

    return {
      report,
      metadata: {
        generatedAt: new Date().toISOString(),
        parameters: parameters || {},
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

module.exports = router;