const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getPerformanceStats, clearPerformanceMetrics } = require('../middleware/performance');
const AuditService = require('../services/audit');

const router = express.Router();

/**
 * GET /api/performance/stats
 * Get current performance statistics
 */
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = getPerformanceStats();
    
    // Get recent performance issues from audit logs
    const recentIssues = await AuditService.getAuditLogs({
      action: 'PERFORMANCE_ISSUE',
      limit: 50
    });

    // Calculate performance trends
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyIssues = recentIssues.filter(issue => 
      new Date(issue.created_at) > oneHourAgo
    );

    const dailyIssues = recentIssues.filter(issue => 
      new Date(issue.created_at) > oneDayAgo
    );

    const performanceData = {
      current: stats,
      trends: {
        hourly: {
          totalIssues: hourlyIssues.length,
          criticalIssues: hourlyIssues.filter(i => i.details?.severity === 'critical').length,
          warningIssues: hourlyIssues.filter(i => i.details?.severity === 'warning').length,
          slowIssues: hourlyIssues.filter(i => i.details?.severity === 'slow').length
        },
        daily: {
          totalIssues: dailyIssues.length,
          criticalIssues: dailyIssues.filter(i => i.details?.severity === 'critical').length,
          warningIssues: dailyIssues.filter(i => i.details?.severity === 'warning').length,
          slowIssues: dailyIssues.filter(i => i.details?.severity === 'slow').length
        }
      },
      recentIssues: recentIssues.slice(0, 10).map(issue => ({
        id: issue.id,
        timestamp: issue.created_at,
        method: issue.details?.method,
        path: issue.details?.path,
        duration: issue.details?.duration,
        severity: issue.details?.severity,
        recommendations: issue.details?.recommendations || []
      })),
      systemHealth: {
        status: stats.criticalRequests > 0 ? 'critical' : 
                stats.slowRequests > 10 ? 'warning' : 'healthy',
        lastUpdated: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/issues
 * Get performance issues with filtering
 */
router.get('/issues', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      severity, 
      startDate, 
      endDate, 
      path, 
      limit = 100, 
      offset = 0 
    } = req.query;

    const filters = {
      action: 'PERFORMANCE_ISSUE',
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (severity) {
      // Filter by severity in details
      filters.severity = severity;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const issues = await AuditService.getAuditLogs(filters);

    // Apply additional filters
    let filteredIssues = issues;

    if (severity) {
      filteredIssues = filteredIssues.filter(issue => 
        issue.details?.severity === severity
      );
    }

    if (path) {
      filteredIssues = filteredIssues.filter(issue => 
        issue.details?.path?.includes(path)
      );
    }

    const formattedIssues = filteredIssues.map(issue => ({
      id: issue.id,
      timestamp: issue.created_at,
      method: issue.details?.method,
      path: issue.details?.path,
      duration: issue.details?.duration,
      durationHr: issue.details?.durationHr,
      statusCode: issue.details?.statusCode,
      responseSize: issue.details?.responseSize,
      severity: issue.details?.severity,
      performanceLevel: issue.details?.performanceLevel,
      dbQueries: issue.details?.dbQueries,
      dbDuration: issue.details?.dbDuration,
      recommendations: issue.details?.recommendations || [],
      userAgent: issue.details?.userAgent,
      ipAddress: issue.details?.ipAddress,
      userId: issue.details?.userId
    }));

    res.json({
      success: true,
      data: {
        issues: formattedIssues,
        total: formattedIssues.length,
        filters: {
          severity,
          startDate,
          endDate,
          path
        }
      }
    });
  } catch (error) {
    console.error('Performance issues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/endpoints
 * Get performance data by endpoint
 */
router.get('/endpoints', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = getPerformanceStats();
    
    // Group issues by endpoint
    const endpointStats = {};
    
    if (global.performanceMetrics) {
      global.performanceMetrics.forEach(metric => {
        const key = `${metric.method} ${metric.path}`;
        if (!endpointStats[key]) {
          endpointStats[key] = {
            endpoint: key,
            method: metric.method,
            path: metric.path,
            totalRequests: 0,
            totalDuration: 0,
            avgDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            slowRequests: 0,
            criticalRequests: 0,
            errorRequests: 0,
            totalResponseSize: 0,
            avgResponseSize: 0
          };
        }

        const stat = endpointStats[key];
        stat.totalRequests++;
        stat.totalDuration += metric.duration;
        stat.minDuration = Math.min(stat.minDuration, metric.duration);
        stat.maxDuration = Math.max(stat.maxDuration, metric.duration);
        
        if (metric.duration > 1000) stat.slowRequests++;
        if (metric.duration > 5000) stat.criticalRequests++;
        if (metric.statusCode >= 400) stat.errorRequests++;
        
        stat.totalResponseSize += metric.responseSize;
      });

      // Calculate averages
      Object.values(endpointStats).forEach(stat => {
        stat.avgDuration = Math.round(stat.totalDuration / stat.totalRequests);
        stat.avgResponseSize = Math.round(stat.totalResponseSize / stat.totalRequests);
        stat.minDuration = stat.minDuration === Infinity ? 0 : stat.minDuration;
      });
    }

    const sortedEndpoints = Object.values(endpointStats)
      .sort((a, b) => b.avgDuration - a.avgDuration);

    res.json({
      success: true,
      data: {
        endpoints: sortedEndpoints,
        summary: {
          totalEndpoints: sortedEndpoints.length,
          averageResponseTime: stats.averageResponseTime,
          totalRequests: stats.totalRequests
        }
      }
    });
  } catch (error) {
    console.error('Performance endpoints error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/performance/clear
 * Clear performance metrics
 */
router.post('/clear', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    clearPerformanceMetrics();
    
    res.json({
      success: true,
      message: 'Performance metrics cleared successfully'
    });
  } catch (error) {
    console.error('Clear performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/health
 * Get system health status
 */
router.get('/health', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = getPerformanceStats();
    
    // Determine overall health status
    let healthStatus = 'healthy';
    let healthScore = 100;
    const issues = [];

    if (stats.criticalRequests > 0) {
      healthStatus = 'critical';
      healthScore -= 50;
      issues.push(`${stats.criticalRequests} critical performance issues detected`);
    }

    if (stats.slowRequests > 10) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      healthScore -= 25;
      issues.push(`${stats.slowRequests} slow requests detected`);
    }

    if (stats.averageResponseTime > 2000) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      healthScore -= 15;
      issues.push(`Average response time is ${stats.averageResponseTime}ms`);
    }

    const healthData = {
      status: healthStatus,
      score: Math.max(0, healthScore),
      issues,
      metrics: {
        totalRequests: stats.totalRequests,
        averageResponseTime: stats.averageResponseTime,
        slowRequests: stats.slowRequests,
        criticalRequests: stats.criticalRequests
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Performance health error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;




