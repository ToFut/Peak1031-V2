const { AuditLog } = require('../models');

class AuditService {
  static async log(data) {
    try {
      await AuditLog.create({
        user_id: data.userId,
        action: data.action,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        details: data.details || {}
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  static async getAuditLogs(filters = {}) {
    const where = {};
    
    if (filters.userId) where.user_id = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resource_type = filters.resourceType;
    if (filters.resourceId) where.resource_id = filters.resourceId;
    
    return await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });
  }
}

module.exports = AuditService; 