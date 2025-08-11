const supabaseService = require('./supabase');

class AuditService {
  static async log(data) {
    try {
      console.log('📝 Creating audit log:', data.action);
      
      if (!data.userId) {
        console.log('⚠️ Audit log skipped - no userId provided');
        return;
      }

      // Validate and clean entity_id - only accept valid UUIDs
      let entityId = data.resourceId || data.entityId;
      if (entityId && typeof entityId === 'string') {
        // Check if it's a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(entityId)) {
          console.log('⚠️ Invalid UUID format for entity_id:', entityId, '- setting to null');
          entityId = null;
        }
      } else if (entityId && typeof entityId !== 'string') {
        entityId = null;
      }

      const auditData = {
        person_id: null, // Set to null to avoid foreign key constraint issues
        action: data.action,
        entity_type: data.resourceType || data.entityType || 'SYSTEM', // Provide default to satisfy not-null constraint
        entity_id: entityId, // Use cleaned entityId
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        details: {
          ...data.details,
          userId: data.userId, // Store userId in details instead
          originalEntityId: data.resourceId || data.entityId // Store original value in details for reference
        },
        created_at: new Date().toISOString()
      };

      const { data: result, error } = await supabaseService.client
        .from('audit_logs')
        .insert([auditData])
        .select();

      if (error) {
        console.error('❌ Audit log creation failed:', error);
        return null;
      }

      console.log('✅ Audit log created successfully');
      return result[0];
    } catch (error) {
      console.error('❌ Audit log error:', error);
      return null;
    }
  }

  static async getAuditLogs(filters = {}) {
    try {
      console.log('📝 Querying audit logs with filters:', filters);
      
      let query = supabaseService.client
        .from('audit_logs')
        .select(`
          *,
          users:person_id (
            first_name,
            last_name,
            email
          )
        `);

      // Apply filters
      if (filters.userId) {
        query = query.eq('person_id', filters.userId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.resourceType || filters.entityType) {
        query = query.eq('entity_type', filters.resourceType || filters.entityType);
      }
      if (filters.resourceId || filters.entityId) {
        query = query.eq('entity_id', filters.resourceId || filters.entityId);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // Apply ordering and pagination
      query = query.order('created_at', { ascending: false });
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch audit logs:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} audit logs`);
      return data || [];
    } catch (error) {
      console.error('❌ Audit logs query error:', error);
      return [];
    }
  }

  static async getAuditStats(filters = {}) {
    try {
      console.log('📊 Getting audit statistics');
      
      let query = supabaseService.client
        .from('audit_logs')
        .select('action, entity_type, created_at', { count: 'exact' });

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Failed to fetch audit stats:', error);
        return { total: 0, actionStats: {}, entityStats: {} };
      }

      // Calculate statistics
      const actionStats = {};
      const entityStats = {};

      data?.forEach(log => {
        actionStats[log.action] = (actionStats[log.action] || 0) + 1;
        entityStats[log.entity_type] = (entityStats[log.entity_type] || 0) + 1;
      });

      return {
        total: count || 0,
        actionStats,
        entityStats,
        timeRange: {
          start: filters.startDate,
          end: filters.endDate
        }
      };
    } catch (error) {
      console.error('❌ Audit stats error:', error);
      return { total: 0, actionStats: {}, entityStats: {} };
    }
  }

  // Helper method to log common actions
  static async logUserAction(userId, action, resourceType, resourceId, req = null, details = {}) {
    return await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      details
    });
  }

  // Helper method to log authentication events
  static async logAuth(userId, action, req = null, details = {}) {
    return await this.logUserAction(userId, action, 'auth', userId, req, details);
  }

  // Helper method to log API access
  static async logApiAccess(userId, endpoint, method, statusCode, req = null) {
    return await this.logUserAction(userId, 'api_access', 'endpoint', endpoint, req, {
      method,
      statusCode,
      endpoint
    });
  }
}

module.exports = AuditService; 