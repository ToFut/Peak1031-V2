const { AuditLog } = require('../models');

const auditMiddleware = (action, resourceType = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Restore original send function
      res.send = originalSend;
      
      // Log the audit event
      if (req.user) {
        AuditLog.create({
          user_id: req.user.id,
          action: action,
          resource_type: resourceType,
          resource_id: req.params.id || null,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          details: {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            response_size: data ? JSON.stringify(data).length : 0
          }
        }).catch(err => {
          console.error('Audit log error:', err);
        });
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = auditMiddleware; 