// const { AuditLog } = require('../models'); // Disabled - using Supabase

class AuditService {
  static async log(data) {
    try {
      // Temporarily skip audit logging while we migrate to Supabase
      console.log('📝 Audit log (skipped):', data.action);
      return;
      
      // TODO: Implement Supabase audit logging
      // Only create audit log if userId is provided
      if (!data.userId) {
        console.log('⚠️ Audit log skipped - no userId provided');
        return;
      }

      // await AuditLog.create({
      //   userId: data.userId,
      //   action: data.action,
      //   entityType: data.resourceType,
      //   entityId: data.resourceId,
      //   ipAddress: data.ipAddress,
      //   userAgent: data.userAgent,
      //   details: data.details || {}
      // });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  static async getAuditLogs(filters = {}) {
    // Temporarily return empty array while we migrate to Supabase
    console.log('📝 Audit logs query (skipped)');
    return [];
    
    // TODO: Implement Supabase audit log query
    // const where = {};
    // 
    // if (filters.userId) where.userId = filters.userId;
    // if (filters.action) where.action = filters.action;
    // if (filters.resourceType) where.entityType = filters.resourceType;
    // if (filters.resourceId) where.entityId = filters.resourceId;
    // 
    // return await AuditLog.findAll({
    //   where,
    //   order: [['createdAt', 'DESC']],
    //   limit: filters.limit || 100,
    //   offset: filters.offset || 0
    // });
  }
}

module.exports = AuditService; 