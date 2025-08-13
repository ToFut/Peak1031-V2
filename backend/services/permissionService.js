const supabaseService = require('./supabase');

/**
 * Permission Service for Exchange-Specific Access Control
 * Handles user permissions for documents, tasks, messages, and other features
 */
class PermissionService {
  constructor() {
    this.permissionTypes = [
      'view_overview',
      'view_messages',
      'send_messages',
      'view_tasks',
      'create_tasks',
      'edit_tasks',
      'assign_tasks',
      'view_documents',
      'upload_documents',
      'edit_documents',
      'delete_documents',
      'view_participants',
      'manage_participants',
      'view_financial',
      'edit_financial',
      'view_timeline',
      'edit_timeline',
      'view_reports',
      'admin_exchange'
    ];

    this.accessLevels = ['none', 'read', 'write', 'admin'];
  }

  /**
   * Check if user has specific permission for an exchange
   */
  async checkPermission(userId, exchangeId, permissionType) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('check_user_permission', {
          user_uuid: userId,
          exchange_uuid: exchangeId,
          permission_name: permissionType
        });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in checkPermission:', error);
      return false;
    }
  }

  /**
   * Get all accessible exchanges for a user with their permissions
   */
  async getUserAccessibleExchanges(userId) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('get_user_accessible_exchanges', {
          user_uuid: userId
        });

      if (error) {
        console.error('Error getting accessible exchanges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserAccessibleExchanges:', error);
      return [];
    }
  }

  /**
   * Get user's access level for a specific exchange
   */
  async getUserExchangeAccess(userId, exchangeId) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_exchange_access')
        .select('*')
        .eq('user_id', userId)
        .eq('exchange_id', exchangeId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error getting user exchange access:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserExchangeAccess:', error);
      return null;
    }
  }

  /**
   * Set user's access level for an exchange
   */
  async setUserExchangeAccess(userId, exchangeId, accessLevel, assignedBy, options = {}) {
    try {
      const accessData = {
        user_id: userId,
        exchange_id: exchangeId,
        access_level: accessLevel,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        is_active: true,
        notes: options.notes || null,
        custom_permissions: options.customPermissions || {}
      };

      const { data, error } = await supabaseService.client
        .from('user_exchange_access')
        .upsert(accessData)
        .select()
        .single();

      if (error) {
        console.error('Error setting user exchange access:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in setUserExchangeAccess:', error);
      return null;
    }
  }

  /**
   * Grant specific permission to user for an exchange
   */
  async grantPermission(userId, exchangeId, permissionType, grantedBy, options = {}) {
    try {
      const permissionData = {
        user_id: userId,
        exchange_id: exchangeId,
        permission_type: permissionType,
        granted: true,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: options.expiresAt || null,
        metadata: options.metadata || {}
      };

      const { data, error } = await supabaseService.client
        .from('user_exchange_permissions')
        .upsert(permissionData)
        .select()
        .single();

      if (error) {
        console.error('Error granting permission:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in grantPermission:', error);
      return null;
    }
  }

  /**
   * Revoke specific permission from user for an exchange
   */
  async revokePermission(userId, exchangeId, permissionType) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_exchange_permissions')
        .update({ granted: false })
        .eq('user_id', userId)
        .eq('exchange_id', exchangeId)
        .eq('permission_type', permissionType)
        .select();

      if (error) {
        console.error('Error revoking permission:', error);
        return false;
      }

      return data.length > 0;
    } catch (error) {
      console.error('Error in revokePermission:', error);
      return false;
    }
  }

  /**
   * Apply permission template to user for an exchange
   */
  async applyPermissionTemplate(templateName, userId, exchangeId, grantedBy) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('apply_permission_template', {
          template_name_param: templateName,
          user_uuid: userId,
          exchange_uuid: exchangeId,
          granted_by_uuid: grantedBy
        });

      if (error) {
        console.error('Error applying permission template:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in applyPermissionTemplate:', error);
      return false;
    }
  }

  /**
   * Get all permission templates
   */
  async getPermissionTemplates(organizationId = null) {
    try {
      let query = supabaseService.client
        .from('permission_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting permission templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPermissionTemplates:', error);
      return [];
    }
  }

  /**
   * Get user's permissions for a specific exchange
   */
  async getUserExchangePermissions(userId, exchangeId) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_exchange_permissions')
        .select('permission_type, granted, expires_at, metadata')
        .eq('user_id', userId)
        .eq('exchange_id', exchangeId)
        .eq('granted', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (error) {
        console.error('Error getting user exchange permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserExchangePermissions:', error);
      return [];
    }
  }

  /**
   * Get all users with access to an exchange
   */
  async getExchangeUsers(exchangeId) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_exchange_access')
        .select(`
          *,
          users!inner(
            id,
            email,
            first_name,
            last_name,
            role,
            is_active
          )
        `)
        .eq('exchange_id', exchangeId)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting exchange users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getExchangeUsers:', error);
      return [];
    }
  }

  /**
   * Remove user access from exchange
   */
  async removeUserFromExchange(userId, exchangeId) {
    try {
      // Deactivate access
      const { error: accessError } = await supabaseService.client
        .from('user_exchange_access')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('exchange_id', exchangeId);

      if (accessError) {
        console.error('Error removing user access:', accessError);
        return false;
      }

      // Revoke all permissions
      const { error: permError } = await supabaseService.client
        .from('user_exchange_permissions')
        .update({ granted: false })
        .eq('user_id', userId)
        .eq('exchange_id', exchangeId);

      if (permError) {
        console.error('Error revoking permissions:', permError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeUserFromExchange:', error);
      return false;
    }
  }

  /**
   * Check document access permission
   */
  async checkDocumentAccess(userId, documentId, accessType = 'read') {
    try {
      // Check if user has direct document permission
      const { data: docPerm, error: docError } = await supabaseService.client
        .from('document_permissions')
        .select('access_level, can_download, can_share')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .single();

      if (!docError && docPerm) {
        // Check if access level allows the requested action
        switch (accessType) {
          case 'read':
            return ['read', 'write', 'admin'].includes(docPerm.access_level);
          case 'write':
            return ['write', 'admin'].includes(docPerm.access_level);
          case 'admin':
            return docPerm.access_level === 'admin';
          case 'download':
            return docPerm.can_download;
          case 'share':
            return docPerm.can_share;
          default:
            return false;
        }
      }

      // Check exchange-level document permission
      const { data: document, error: docInfoError } = await supabaseService.client
        .from('documents')
        .select('exchange_id')
        .eq('id', documentId)
        .single();

      if (docInfoError || !document) {
        return false;
      }

      // Check exchange document permission
      const permissionMap = {
        'read': 'view_documents',
        'write': 'edit_documents',
        'admin': 'delete_documents',
        'download': 'view_documents',
        'share': 'edit_documents'
      };

      return await this.checkPermission(userId, document.exchange_id, permissionMap[accessType] || 'view_documents');
    } catch (error) {
      console.error('Error checking document access:', error);
      return false;
    }
  }

  /**
   * Set document-specific permissions
   */
  async setDocumentPermission(documentId, userId, accessLevel, grantedBy, options = {}) {
    try {
      const permissionData = {
        document_id: documentId,
        user_id: userId,
        access_level: accessLevel,
        can_download: options.canDownload !== false,
        can_share: options.canShare || false,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: options.expiresAt || null
      };

      const { data, error } = await supabaseService.client
        .from('document_permissions')
        .upsert(permissionData)
        .select()
        .single();

      if (error) {
        console.error('Error setting document permission:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in setDocumentPermission:', error);
      return null;
    }
  }

  /**
   * Get filtered data based on user permissions
   */
  async getFilteredExchangeData(userId, exchangeId) {
    try {
      const permissions = await this.getUserExchangePermissions(userId, exchangeId);
      const permissionTypes = permissions.map(p => p.permission_type);

      const result = {
        canViewOverview: permissionTypes.includes('view_overview'),
        canViewMessages: permissionTypes.includes('view_messages'),
        canSendMessages: permissionTypes.includes('send_messages'),
        canViewTasks: permissionTypes.includes('view_tasks'),
        canCreateTasks: permissionTypes.includes('create_tasks'),
        canEditTasks: permissionTypes.includes('edit_tasks'),
        canAssignTasks: permissionTypes.includes('assign_tasks'),
        canViewDocuments: permissionTypes.includes('view_documents'),
        canUploadDocuments: permissionTypes.includes('upload_documents'),
        canEditDocuments: permissionTypes.includes('edit_documents'),
        canDeleteDocuments: permissionTypes.includes('delete_documents'),
        canViewParticipants: permissionTypes.includes('view_participants'),
        canManageParticipants: permissionTypes.includes('manage_participants'),
        canViewFinancial: permissionTypes.includes('view_financial'),
        canEditFinancial: permissionTypes.includes('edit_financial'),
        canViewTimeline: permissionTypes.includes('view_timeline'),
        canEditTimeline: permissionTypes.includes('edit_timeline'),
        canViewReports: permissionTypes.includes('view_reports'),
        isExchangeAdmin: permissionTypes.includes('admin_exchange')
      };

      return result;
    } catch (error) {
      console.error('Error getting filtered exchange data:', error);
      return {};
    }
  }

  /**
   * Bulk assign users to exchange with template
   */
  async bulkAssignUsersToExchange(userAssignments, exchangeId, assignedBy) {
    try {
      const results = [];

      for (const assignment of userAssignments) {
        const { userId, template, accessLevel = 'read', notes } = assignment;

        // Set exchange access
        const accessResult = await this.setUserExchangeAccess(
          userId, 
          exchangeId, 
          accessLevel, 
          assignedBy,
          { notes }
        );

        if (accessResult && template) {
          // Apply permission template
          const templateResult = await this.applyPermissionTemplate(
            template,
            userId,
            exchangeId,
            assignedBy
          );

          results.push({
            userId,
            success: templateResult,
            accessLevel,
            template
          });
        } else {
          results.push({
            userId,
            success: !!accessResult,
            accessLevel,
            template: null
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk assign users:', error);
      return [];
    }
  }
}

module.exports = new PermissionService();