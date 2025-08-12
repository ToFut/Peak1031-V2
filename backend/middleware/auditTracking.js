const AuditService = require('../services/audit');

/**
 * Comprehensive Audit Tracking Middleware
 * Logs all backend requests with detailed information
 */
const auditTrackingMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Skip audit logging for certain paths
    const skipPaths = [
      '/api/health',
      '/api/audit/logs', // Prevent recursive logging
      '/api/audit/stats',
      '/api/notifications',
      '/socket.io'
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Capture request details
    const requestDetails = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      params: req.params,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'accept': req.get('Accept')
      },
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
      timestamp: new Date().toISOString()
    };

    // Override response methods to capture response data
    res.send = function(data) {
      captureResponse(data, 'send');
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      captureResponse(data, 'json');
      return originalJson.call(this, data);
    };

    res.end = function(data) {
      captureResponse(data, 'end');
      return originalEnd.call(this, data);
    };

    function captureResponse(data, method) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Determine action based on request
      let action = 'API_REQUEST';
      let entityType = 'endpoint';
      let entityId = null;

      // Extract action from path and method
      if (req.path.includes('/exchanges')) {
        entityType = 'exchange';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'EXCHANGE_VIEWED'; break;
          case 'POST': action = 'EXCHANGE_CREATED'; break;
          case 'PUT': action = 'EXCHANGE_UPDATED'; break;
          case 'DELETE': action = 'EXCHANGE_DELETED'; break;
        }
      } else if (req.path.includes('/documents')) {
        entityType = 'document';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'DOCUMENT_VIEWED'; break;
          case 'POST': action = 'DOCUMENT_UPLOADED'; break;
          case 'PUT': action = 'DOCUMENT_UPDATED'; break;
          case 'DELETE': action = 'DOCUMENT_DELETED'; break;
        }
      } else if (req.path.includes('/tasks')) {
        entityType = 'task';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'TASK_VIEWED'; break;
          case 'POST': action = 'TASK_CREATED'; break;
          case 'PUT': action = 'TASK_UPDATED'; break;
          case 'DELETE': action = 'TASK_DELETED'; break;
        }
      } else if (req.path.includes('/messages')) {
        entityType = 'message';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'MESSAGES_VIEWED'; break;
          case 'POST': action = 'MESSAGE_SENT'; break;
          case 'PUT': action = 'MESSAGE_UPDATED'; break;
          case 'DELETE': action = 'MESSAGE_DELETED'; break;
        }
      } else if (req.path.includes('/users')) {
        entityType = 'user';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'USER_VIEWED'; break;
          case 'POST': action = 'USER_CREATED'; break;
          case 'PUT': action = 'USER_UPDATED'; break;
          case 'DELETE': action = 'USER_DELETED'; break;
        }
      } else if (req.path.includes('/contacts')) {
        entityType = 'contact';
        if (req.params.id) entityId = req.params.id;
        
        switch (req.method) {
          case 'GET': action = 'CONTACT_VIEWED'; break;
          case 'POST': action = 'CONTACT_CREATED'; break;
          case 'PUT': action = 'CONTACT_UPDATED'; break;
          case 'DELETE': action = 'CONTACT_DELETED'; break;
        }
      } else if (req.path.includes('/auth')) {
        entityType = 'auth';
        
        if (req.path.includes('/login')) {
          action = 'USER_LOGIN';
        } else if (req.path.includes('/logout')) {
          action = 'USER_LOGOUT';
        } else if (req.path.includes('/register')) {
          action = 'USER_REGISTERED';
        } else if (req.path.includes('/password')) {
          action = 'PASSWORD_RESET';
        }
      } else if (req.path.includes('/sync')) {
        entityType = 'sync';
        action = 'SYNC_OPERATION';
      } else if (req.path.includes('/admin')) {
        entityType = 'admin';
        action = 'ADMIN_OPERATION';
      }

      // Prepare audit log data
      const auditData = {
        action,
        userId: req.user?.id || null,
        entityType,
        entityId,
        ipAddress: requestDetails.ip,
        userAgent: requestDetails.headers['user-agent'],
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          responseSize: data ? JSON.stringify(data).length : 0,
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
          body: req.method !== 'GET' ? req.body : undefined,
          userRole: req.user?.role,
          userEmail: req.user?.email,
          timestamp: requestDetails.timestamp
        }
      };

      // Log the audit event asynchronously (don't block response)
      if (req.user?.id) {
        AuditService.log(auditData).catch(error => {
          console.error('❌ Audit logging failed:', error);
        });
      }
    }

    next();
  };
};

/**
 * Specific audit middleware for sensitive operations
 */
const sensitiveOperationAudit = (operation, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(data) {
      logSensitiveOperation(operation, entityType, data);
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      logSensitiveOperation(operation, entityType, data);
      return originalJson.call(this, data);
    };

    function logSensitiveOperation(operation, entityType, responseData) {
      if (req.user?.id) {
        const auditData = {
          action: operation,
          userId: req.user.id,
          entityType,
          entityId: req.params.id || null,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            operation,
            entityType,
            userRole: req.user.role,
            userEmail: req.user.email,
            timestamp: new Date().toISOString(),
            success: res.statusCode < 400
          }
        };

        AuditService.log(auditData).catch(error => {
          console.error('❌ Sensitive operation audit logging failed:', error);
        });
      }
    }

    next();
  };
};

/**
 * User activity tracking middleware
 */
const userActivityTracking = () => {
  return async (req, res, next) => {
    if (req.user?.id) {
      // Track user activity for analytics
      const activityData = {
        action: 'USER_ACTIVITY',
        userId: req.user.id,
        entityType: 'user_activity',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        details: {
          method: req.method,
          path: req.path,
          userRole: req.user.role,
          userEmail: req.user.email,
          timestamp: new Date().toISOString(),
          sessionId: req.session?.id
        }
      };

      // Log user activity asynchronously
      AuditService.log(activityData).catch(error => {
        console.error('❌ User activity tracking failed:', error);
      });
    }

    next();
  };
};

/**
 * Security event tracking middleware
 */
const securityEventTracking = () => {
  return async (req, res, next) => {
    // Track security-related events
    const securityEvents = [
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'INVALID_TOKEN',
      'EXPIRED_TOKEN',
      'RATE_LIMIT_EXCEEDED',
      'SUSPICIOUS_ACTIVITY'
    ];

    // Check for security events in response
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(data) {
      checkSecurityEvents(data);
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      checkSecurityEvents(data);
      return originalJson.call(this, data);
    };

    function checkSecurityEvents(responseData) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const securityData = {
          action: res.statusCode === 401 ? 'UNAUTHORIZED_ACCESS_ATTEMPT' : 'FORBIDDEN_ACCESS_ATTEMPT',
          userId: req.user?.id || null,
          entityType: 'security',
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            userRole: req.user?.role || 'anonymous',
            userEmail: req.user?.email || 'anonymous',
            timestamp: new Date().toISOString(),
            headers: req.headers,
            body: req.body
          }
        };

        AuditService.log(securityData).catch(error => {
          console.error('❌ Security event tracking failed:', error);
        });
      }
    }

    next();
  };
};

module.exports = {
  auditTrackingMiddleware,
  sensitiveOperationAudit,
  userActivityTracking,
  securityEventTracking
};

