const AuditService = require('../services/audit');

/**
 * Performance Monitoring Middleware
 * Tracks API response times, database queries, and other performance metrics
 */
const performanceMiddleware = () => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime();
    
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Track database queries if available
    const dbQueries = [];
    const dbStartTime = Date.now();

    // Override response methods to capture timing
    res.send = function(data) {
      const endTime = Date.now();
      const endHrTime = process.hrtime(startHrTime);
      const duration = endTime - startTime;
      const durationHr = (endHrTime[0] * 1000 + endHrTime[1] / 1000000).toFixed(2);

      // Log performance metrics
      logPerformanceMetrics({
        method: req.method,
        path: req.path,
        duration: duration,
        durationHr: parseFloat(durationHr),
        statusCode: res.statusCode,
        responseSize: data ? JSON.stringify(data).length : 0,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userId: req.user?.id,
        dbQueries: dbQueries,
        dbDuration: Date.now() - dbStartTime,
        timestamp: new Date().toISOString()
      });

      // Restore original method
      res.send = originalSend;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      const endTime = Date.now();
      const endHrTime = process.hrtime(startHrTime);
      const duration = endTime - startTime;
      const durationHr = (endHrTime[0] * 1000 + endHrTime[1] / 1000000).toFixed(2);

      // Log performance metrics
      logPerformanceMetrics({
        method: req.method,
        path: req.path,
        duration: duration,
        durationHr: parseFloat(durationHr),
        statusCode: res.statusCode,
        responseSize: data ? JSON.stringify(data).length : 0,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userId: req.user?.id,
        dbQueries: dbQueries,
        dbDuration: Date.now() - dbStartTime,
        timestamp: new Date().toISOString()
      });

      // Restore original method
      res.json = originalJson;
      return originalJson.call(this, data);
    };

    res.end = function(data) {
      const endTime = Date.now();
      const endHrTime = process.hrtime(startHrTime);
      const duration = endTime - startTime;
      const durationHr = (endHrTime[0] * 1000 + endHrTime[1] / 1000000).toFixed(2);

      // Log performance metrics
      logPerformanceMetrics({
        method: req.method,
        path: req.path,
        duration: duration,
        durationHr: parseFloat(durationHr),
        statusCode: res.statusCode,
        responseSize: data ? data.length : 0,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userId: req.user?.id,
        dbQueries: dbQueries,
        dbDuration: Date.now() - dbStartTime,
        timestamp: new Date().toISOString()
      });

      // Restore original method
      res.end = originalEnd;
      return originalEnd.call(this, data);
    };

    next();
  };
};

/**
 * Log performance metrics to audit system and console
 */
const logPerformanceMetrics = async (metrics) => {
  const {
    method,
    path,
    duration,
    durationHr,
    statusCode,
    responseSize,
    userAgent,
    ipAddress,
    userId,
    dbQueries,
    dbDuration,
    timestamp
  } = metrics;

  // Determine performance level
  let performanceLevel = 'good';
  if (duration > 5000) performanceLevel = 'critical';
  else if (duration > 2000) performanceLevel = 'warning';
  else if (duration > 1000) performanceLevel = 'slow';

  // Create performance log entry
  const performanceLog = {
    type: 'PERFORMANCE',
    method,
    path,
    duration,
    durationHr,
    statusCode,
    responseSize,
    performanceLevel,
    dbQueries: dbQueries.length,
    dbDuration,
    timestamp,
    userAgent,
    ipAddress,
    userId
  };

  // Log to console with color coding
  const color = performanceLevel === 'critical' ? '🔴' : 
                performanceLevel === 'warning' ? '🟡' : 
                performanceLevel === 'slow' ? '🟠' : '🟢';

  console.log(`${color} PERFORMANCE: ${method} ${path} - ${duration}ms (${durationHr}ms HR) - ${performanceLevel.toUpperCase()}`);

  // Log to audit system if performance is slow or critical
  if (performanceLevel !== 'good') {
    try {
      await AuditService.log({
        userId: userId || 'SYSTEM',
        action: 'PERFORMANCE_ISSUE',
        resourceType: 'api_endpoint',
        resourceId: null, // Don't use path as resourceId since it's not a valid UUID
        ipAddress,
        userAgent,
        details: {
          endpoint: path, // Store the path in details instead
          method,
          ...performanceLog,
          severity: performanceLevel,
          recommendations: getPerformanceRecommendations(performanceLog)
        }
      });
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  // Store in memory for real-time monitoring (optional)
  if (global.performanceMetrics) {
    global.performanceMetrics.push(performanceLog);
    
    // Keep only last 1000 entries
    if (global.performanceMetrics.length > 1000) {
      global.performanceMetrics = global.performanceMetrics.slice(-1000);
    }
  } else {
    global.performanceMetrics = [performanceLog];
  }
};

/**
 * Get performance recommendations based on metrics
 */
const getPerformanceRecommendations = (metrics) => {
  const recommendations = [];

  if (metrics.duration > 5000) {
    recommendations.push('Critical: Response time exceeds 5 seconds. Consider optimizing database queries or implementing caching.');
  } else if (metrics.duration > 2000) {
    recommendations.push('Warning: Response time exceeds 2 seconds. Review database queries and consider indexing.');
  } else if (metrics.duration > 1000) {
    recommendations.push('Slow: Response time exceeds 1 second. Consider optimizing the endpoint.');
  }

  if (metrics.dbQueries > 10) {
    recommendations.push('High number of database queries detected. Consider implementing query optimization or caching.');
  }

  if (metrics.responseSize > 1000000) {
    recommendations.push('Large response size detected. Consider implementing pagination or data filtering.');
  }

  return recommendations;
};

/**
 * Get performance statistics
 */
const getPerformanceStats = () => {
  if (!global.performanceMetrics) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      criticalRequests: 0,
      topSlowEndpoints: []
    };
  }

  const metrics = global.performanceMetrics;
  const totalRequests = metrics.length;
  const averageResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
  const slowRequests = metrics.filter(m => m.duration > 1000).length;
  const criticalRequests = metrics.filter(m => m.duration > 5000).length;

  // Get top slow endpoints
  const endpointStats = {};
  metrics.forEach(m => {
    const key = `${m.method} ${m.path}`;
    if (!endpointStats[key]) {
      endpointStats[key] = { count: 0, totalDuration: 0, avgDuration: 0 };
    }
    endpointStats[key].count++;
    endpointStats[key].totalDuration += m.duration;
  });

  Object.keys(endpointStats).forEach(key => {
    endpointStats[key].avgDuration = endpointStats[key].totalDuration / endpointStats[key].count;
  });

  const topSlowEndpoints = Object.entries(endpointStats)
    .map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    slowRequests,
    criticalRequests,
    topSlowEndpoints
  };
};

/**
 * Clear performance metrics
 */
const clearPerformanceMetrics = () => {
  global.performanceMetrics = [];
};

module.exports = {
  performanceMiddleware,
  getPerformanceStats,
  clearPerformanceMetrics
};



