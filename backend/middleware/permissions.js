const permissionService = require('../services/permissionService');

/**
 * Permission Middleware for Exchange-Specific Access Control
 */

/**
 * Check if user has specific permission for an exchange
 */
const requireExchangePermission = (permissionType) => {
  // Map old permission names to new ones for backward compatibility
  const permissionMap = {
    'upload_documents': 'can_upload_documents',
    'send_messages': 'can_send_messages',
    'edit': 'can_edit',
    'delete': 'can_delete',
    'add_participants': 'can_add_participants'
  };
  
  const actualPermission = permissionMap[permissionType] || permissionType;
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const exchangeId = req.params.exchangeId || req.body.exchangeId || req.query.exchangeId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!exchangeId) {
        return res.status(400).json({
          error: 'Exchange ID required',
          code: 'EXCHANGE_ID_REQUIRED'
        });
      }

      // Admin users bypass all permission checks
      if (userRole === 'admin') {
        console.log(`✅ Admin user ${req.user.email} granted access to exchange ${exchangeId}`);
        req.exchangeId = exchangeId;
        req.isSystemAdmin = true;
        return next();
      }

      // Check permission using RBAC service for consistency
      const rbacService = require('../services/rbacService');
      const hasAccess = await rbacService.canUserAccessExchange(req.user, exchangeId);

      if (!hasAccess) {
        console.log(`❌ Access denied for ${req.user.role} user ${req.user.email} to exchange ${exchangeId}`);
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permissionType,
          exchangeId
        });
      }

      // For non-admin users, also check specific permission if needed
      const hasPermission = await permissionService.checkPermission(userId, exchangeId, actualPermission);

      if (!hasPermission) {
        console.log(`❌ Permission '${permissionType}' (mapped to '${actualPermission}') denied for ${req.user.role} user ${req.user.email} on exchange ${exchangeId}`);
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permissionType,
          exchangeId
        });
      }

      // Add permission info to request
      req.exchangePermissions = await permissionService.getFilteredExchangeData(userId, exchangeId);
      req.exchangeId = exchangeId;

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check if user has access to an exchange (any level)
 */
const requireExchangeAccess = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const exchangeId = req.params.exchangeId || req.body.exchangeId || req.query.exchangeId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!exchangeId) {
        return res.status(400).json({
          error: 'Exchange ID required',
          code: 'EXCHANGE_ID_REQUIRED'
        });
      }

      // Check if user has any access to the exchange
      const access = await permissionService.getUserExchangeAccess(userId, exchangeId);

      if (!access || !access.is_active) {
        return res.status(403).json({
          error: 'No access to this exchange',
          code: 'EXCHANGE_ACCESS_DENIED',
          exchangeId
        });
      }

      // Add access info to request
      req.exchangeAccess = access;
      req.exchangePermissions = await permissionService.getFilteredExchangeData(userId, exchangeId);
      req.exchangeId = exchangeId;

      next();
    } catch (error) {
      console.error('Exchange access middleware error:', error);
      res.status(500).json({
        error: 'Access check failed',
        code: 'ACCESS_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check document access permission
 */
const requireDocumentAccess = (accessType = 'read') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const documentId = req.params.id || req.params.documentId || req.body.documentId || req.query.documentId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!documentId) {
        return res.status(400).json({
          error: 'Document ID required',
          code: 'DOCUMENT_ID_REQUIRED'
        });
      }

      // Admin users bypass all document access checks
      if (req.user?.role === 'admin') {
        console.log(`✅ Admin user ${req.user.email} granted document access to ${documentId}`);
        req.documentId = documentId;
        req.documentAccess = accessType;
        req.isSystemAdmin = true;
        return next();
      }

      // Check document access
      const hasAccess = await permissionService.checkDocumentAccess(userId, documentId, accessType);

      if (!hasAccess) {
        console.log(`❌ Document access '${accessType}' denied for ${req.user.role} user ${req.user.email} on document ${documentId}`);
        return res.status(403).json({
          error: 'Insufficient document permissions',
          code: 'DOCUMENT_ACCESS_DENIED',
          required: accessType,
          documentId
        });
      }

      req.documentId = documentId;
      req.documentAccess = accessType;

      next();
    } catch (error) {
      console.error('Document access middleware error:', error);
      res.status(500).json({
        error: 'Document access check failed',
        code: 'DOCUMENT_ACCESS_CHECK_ERROR'
      });
    }
  };
};

/**
 * Filter data based on user permissions
 */
const filterByPermissions = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Get user's accessible exchanges
      const accessibleExchanges = await permissionService.getUserAccessibleExchanges(userId);
      
      req.accessibleExchanges = accessibleExchanges;
      req.accessibleExchangeIds = accessibleExchanges.map(e => e.exchange_id);

      next();
    } catch (error) {
      console.error('Filter permissions middleware error:', error);
      res.status(500).json({
        error: 'Permission filter failed',
        code: 'PERMISSION_FILTER_ERROR'
      });
    }
  };
};

/**
 * Check if user can manage exchange participants
 */
const requireParticipantManagement = () => {
  return requireExchangePermission('manage_participants');
};

/**
 * Check if user can view financial information
 */
const requireFinancialAccess = () => {
  return requireExchangePermission('view_financial');
};

/**
 * Check if user is exchange admin or system admin
 */
const requireExchangeAdmin = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const exchangeId = req.params.exchangeId || req.body.exchangeId || req.query.exchangeId;

      // System admins have access to everything
      if (userRole === 'admin') {
        req.isSystemAdmin = true;
        req.isExchangeAdmin = true;
        return next();
      }

      if (!exchangeId) {
        return res.status(400).json({
          error: 'Exchange ID required',
          code: 'EXCHANGE_ID_REQUIRED'
        });
      }

      // Check exchange admin permission
      const isExchangeAdmin = await permissionService.checkPermission(userId, exchangeId, 'admin_exchange');

      if (!isExchangeAdmin) {
        return res.status(403).json({
          error: 'Exchange admin access required',
          code: 'EXCHANGE_ADMIN_REQUIRED',
          exchangeId
        });
      }

      req.isSystemAdmin = false;
      req.isExchangeAdmin = true;
      
      next();
    } catch (error) {
      console.error('Exchange admin middleware error:', error);
      res.status(500).json({
        error: 'Admin check failed',
        code: 'ADMIN_CHECK_ERROR'
      });
    }
  };
};

/**
 * Add user's exchange permissions to request for easy access
 */
const addExchangePermissions = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const exchangeId = req.params.exchangeId || req.body.exchangeId || req.query.exchangeId;

      if (userId && exchangeId) {
        req.exchangePermissions = await permissionService.getFilteredExchangeData(userId, exchangeId);
        req.exchangeId = exchangeId;
      }

      next();
    } catch (error) {
      console.error('Add exchange permissions middleware error:', error);
      // Don't fail the request, just continue without permissions
      next();
    }
  };
};

/**
 * Permission presets for common operations
 */
const permissions = {
  // Exchange permissions
  viewExchange: requireExchangePermission('view_overview'),
  editExchange: requireExchangeAdmin(),
  
  // Message permissions
  viewMessages: requireExchangePermission('view_messages'),
  sendMessages: requireExchangePermission('send_messages'),
  
  // Task permissions
  viewTasks: requireExchangePermission('view_tasks'),
  createTasks: requireExchangePermission('create_tasks'),
  editTasks: requireExchangePermission('edit_tasks'),
  assignTasks: requireExchangePermission('assign_tasks'),
  
  // Document permissions
  viewDocuments: requireExchangePermission('view_documents'),
  uploadDocuments: requireExchangePermission('upload_documents'),
  editDocuments: requireExchangePermission('edit_documents'),
  deleteDocuments: requireExchangePermission('delete_documents'),
  
  // Document access levels
  readDocument: requireDocumentAccess('read'),
  writeDocument: requireDocumentAccess('write'),
  adminDocument: requireDocumentAccess('admin'),
  downloadDocument: requireDocumentAccess('download'),
  shareDocument: requireDocumentAccess('share'),
  
  // Participant permissions
  viewParticipants: requireExchangePermission('view_participants'),
  manageParticipants: requireParticipantManagement(),
  
  // Financial permissions
  viewFinancial: requireFinancialAccess(),
  editFinancial: requireExchangePermission('edit_financial'),
  
  // Timeline permissions
  viewTimeline: requireExchangePermission('view_timeline'),
  editTimeline: requireExchangePermission('edit_timeline'),
  
  // Report permissions
  viewReports: requireExchangePermission('view_reports'),
  
  // General access checks
  exchangeAccess: requireExchangeAccess(),
  exchangeAdmin: requireExchangeAdmin(),
  addPermissions: addExchangePermissions(),
  filterData: filterByPermissions()
};

module.exports = {
  requireExchangePermission,
  requireExchangeAccess,
  requireDocumentAccess,
  requireParticipantManagement,
  requireFinancialAccess,
  requireExchangeAdmin,
  addExchangePermissions,
  filterByPermissions,
  permissions
};