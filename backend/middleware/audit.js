// const { AuditLog } = require('../models'); // Disabled - using Supabase

const auditMiddleware = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Temporarily bypass audit middleware while migrating to Supabase
    next();
    return;
    
    // TODO: Implement Supabase audit logging
    const originalSend = res.send;
    
    res.send = function(data) {
      // Restore original send function
      res.send = originalSend;
      
      // Log the audit event
      if (req.user) {
        // AuditLog.create({
        //   userId: req.user.id,
        //   action: action,
        //   entityType: resourceType,
        //   entityId: req.params.id || null,
        //   ipAddress: req.ip,
        //   userAgent: req.get('User-Agent'),
        //   details: {
        //     method: req.method,
        //     path: req.path,
        //     status: res.statusCode,
        //     response_size: data ? JSON.stringify(data).length : 0
        //   }
        // }).catch(err => {
        //   console.error('Audit log error:', err);
        // });
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = auditMiddleware; 