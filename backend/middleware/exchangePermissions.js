const supabaseService = require('../services/supabase');

/**
 * Middleware to check exchange-specific participant permissions
 * Combines role-based permissions with individual participant permissions
 */

/**
 * Check if user has specific permission within an exchange
 * @param {string} permission - Permission to check (can_edit, can_delete, etc.)
 * @param {boolean} requireRolePermission - Whether system role permission is also required
 */
const requireExchangePermission = (permission, requireRolePermission = true) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const exchangeId = req.params.exchangeId || req.params.id || req.body.exchangeId;

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

      // Check if user is a participant in the exchange
      const { data: participants, error: participantsError } = await supabaseService.client
        .from('exchange_participants')
        .select('id, role, permissions, user_id, contact_id')
        .eq('exchange_id', exchangeId)
        .eq('is_active', true);

      if (participantsError) {
        console.error('Error fetching exchange participants:', participantsError);
        return res.status(500).json({
          error: 'Failed to verify permissions',
          code: 'PERMISSION_CHECK_FAILED'
        });
      }

      // Find user's participant record
      let userParticipant = null;
      
      if (participants) {
        // Check by user_id first
        userParticipant = participants.find(p => p.user_id === userId);
        
        // If not found and user has email, check by matching contact email
        if (!userParticipant && req.user.email) {
          // Get user's contact records to match with participants
          const { data: contacts } = await supabaseService.client
            .from('people')
            .select('id')
            .eq('email', req.user.email);
            
          if (contacts && contacts.length > 0) {
            const contactIds = contacts.map(c => c.id);
            userParticipant = participants.find(p => 
              p.contact_id && contactIds.includes(p.contact_id)
            );
          }
        }
      }

      // Check if user has access to the exchange
      const rbacService = require('../services/rbacService');
      const canAccess = await rbacService.canUserAccessExchange(req.user, exchangeId);
      
      if (!canAccess && !userParticipant) {
        console.log(`❌ Access denied for ${userRole} user ${req.user.email} to exchange ${exchangeId}`);
        return res.status(403).json({
          error: 'Access denied',
          code: 'EXCHANGE_ACCESS_DENIED',
          message: 'You do not have access to this exchange'
        });
      }

      // Parse participant permissions
      let exchangePermissions = {};
      if (userParticipant && userParticipant.permissions) {
        try {
          exchangePermissions = typeof userParticipant.permissions === 'string' 
            ? JSON.parse(userParticipant.permissions)
            : userParticipant.permissions;
        } catch (error) {
          console.error('Error parsing participant permissions:', error);
        }
      }

      // Define default permissions based on role
      const getDefaultPermissionsForRole = (role) => {
        const defaults = {
          admin: {
            can_edit: true,
            can_delete: true,
            can_add_participants: true,
            can_upload_documents: true,
            can_send_messages: true,
            can_view_overview: true,
            can_view_messages: true,
            can_view_tasks: true,
            can_create_tasks: true,
            can_edit_tasks: true,
            can_assign_tasks: true,
            can_view_documents: true,
            can_edit_documents: true,
            can_delete_documents: true,
            can_view_participants: true,
            can_manage_participants: true,
            can_view_financial: true,
            can_edit_financial: true,
            can_view_timeline: true,
            can_edit_timeline: true,
            can_view_reports: true
          },
          coordinator: {
            can_edit: true,
            can_delete: false,
            can_add_participants: true,
            can_upload_documents: true,
            can_send_messages: true,
            can_view_overview: true,
            can_view_messages: true,
            can_view_tasks: true,
            can_create_tasks: true,
            can_edit_tasks: true,
            can_assign_tasks: true,
            can_view_documents: true,
            can_edit_documents: true,
            can_delete_documents: false,
            can_view_participants: true,
            can_manage_participants: true,
            can_view_financial: true,
            can_edit_financial: true,
            can_view_timeline: true,
            can_edit_timeline: true,
            can_view_reports: true
          },
          client: {
            can_edit: true,
            can_delete: false, // Clients cannot delete by default
            can_add_participants: true,
            can_upload_documents: true,
            can_send_messages: true,
            can_view_overview: true,
            can_view_messages: true,
            can_view_tasks: true,
            can_create_tasks: true,
            can_edit_tasks: true,
            can_assign_tasks: true,
            can_view_documents: true,
            can_edit_documents: true,
            can_delete_documents: false,
            can_view_participants: true,
            can_manage_participants: true,
            can_view_financial: true,
            can_edit_financial: true,
            can_view_timeline: true,
            can_edit_timeline: true,
            can_view_reports: true
          },
          third_party: {
            can_edit: false,
            can_delete: false,
            can_add_participants: false,
            can_upload_documents: false,
            can_send_messages: false,
            can_view_overview: true, // Only view overview by default
            can_view_messages: false,
            can_view_tasks: false,
            can_create_tasks: false,
            can_edit_tasks: false,
            can_assign_tasks: false,
            can_view_documents: false,
            can_edit_documents: false,
            can_delete_documents: false,
            can_view_participants: false,
            can_manage_participants: false,
            can_view_financial: false,
            can_edit_financial: false,
            can_view_timeline: false,
            can_edit_timeline: false,
            can_view_reports: false
          },
          agency: {
            can_edit: false,
            can_delete: false,
            can_add_participants: false,
            can_upload_documents: false,
            can_send_messages: false,
            can_view_overview: true, // Only view overview by default
            can_view_messages: false,
            can_view_tasks: false,
            can_create_tasks: false,
            can_edit_tasks: false,
            can_assign_tasks: false,
            can_view_documents: false,
            can_edit_documents: false,
            can_delete_documents: false,
            can_view_participants: false,
            can_manage_participants: false,
            can_view_financial: false,
            can_edit_financial: false,
            can_view_timeline: false,
            can_edit_timeline: false,
            can_view_reports: false
          }
        };

        return defaults[role] || {
          can_edit: false,
          can_delete: false,
          can_add_participants: false,
          can_upload_documents: false,
          can_send_messages: false,
          can_view_overview: false,
          can_view_messages: false,
          can_view_tasks: false,
          can_create_tasks: false,
          can_edit_tasks: false,
          can_assign_tasks: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
          can_view_participants: false,
          can_manage_participants: false,
          can_view_financial: false,
          can_edit_financial: false,
          can_view_timeline: false,
          can_edit_timeline: false,
          can_view_reports: false
        };
      };

      // If no participant permissions found, use role defaults
      if (Object.keys(exchangePermissions).length === 0) {
        exchangePermissions = getDefaultPermissionsForRole(userRole);
      }

      // Check specific permission
      const hasExchangePermission = exchangePermissions[permission] === true;
      
      if (!hasExchangePermission) {
        console.log(`❌ Exchange permission denied: ${req.user.email} lacks '${permission}' in exchange ${exchangeId}`);
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'EXCHANGE_PERMISSION_DENIED',
          message: `You do not have '${permission}' permission for this exchange`,
          required: permission,
          exchangeId
        });
      }

      // Attach permission info to request for later use
      req.exchangeId = exchangeId;
      req.userParticipant = userParticipant;
      req.exchangePermissions = exchangePermissions;
      req.hasExchangePermission = (perm) => exchangePermissions[perm] === true;

      console.log(`✅ Exchange permission granted: ${req.user.email} has '${permission}' in exchange ${exchangeId}`);
      next();

    } catch (error) {
      console.error('Exchange permission middleware error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR',
        message: error.message
      });
    }
  };
};

/**
 * Pre-built permission middlewares for common actions
 */
const requireCanEdit = requireExchangePermission('can_edit');
const requireCanDelete = requireExchangePermission('can_delete');
const requireCanAddParticipants = requireExchangePermission('can_add_participants');
const requireCanUploadDocuments = requireExchangePermission('can_upload_documents');
const requireCanSendMessages = requireExchangePermission('can_send_messages');
const requireCanViewOverview = requireExchangePermission('can_view_overview');
const requireCanViewMessages = requireExchangePermission('can_view_messages');
const requireCanViewTasks = requireExchangePermission('can_view_tasks');
const requireCanCreateTasks = requireExchangePermission('can_create_tasks');
const requireCanEditTasks = requireExchangePermission('can_edit_tasks');
const requireCanAssignTasks = requireExchangePermission('can_assign_tasks');
const requireCanViewDocuments = requireExchangePermission('can_view_documents');
const requireCanEditDocuments = requireExchangePermission('can_edit_documents');
const requireCanDeleteDocuments = requireExchangePermission('can_delete_documents');
const requireCanViewParticipants = requireExchangePermission('can_view_participants');
const requireCanManageParticipants = requireExchangePermission('can_manage_participants');
const requireCanViewFinancial = requireExchangePermission('can_view_financial');
const requireCanEditFinancial = requireExchangePermission('can_edit_financial');
const requireCanViewTimeline = requireExchangePermission('can_view_timeline');
const requireCanEditTimeline = requireExchangePermission('can_edit_timeline');
const requireCanViewReports = requireExchangePermission('can_view_reports');

module.exports = {
  requireExchangePermission,
  requireCanEdit,
  requireCanDelete,
  requireCanAddParticipants,
  requireCanUploadDocuments,
  requireCanSendMessages,
  requireCanViewOverview,
  requireCanViewMessages,
  requireCanViewTasks,
  requireCanCreateTasks,
  requireCanEditTasks,
  requireCanAssignTasks,
  requireCanViewDocuments,
  requireCanEditDocuments,
  requireCanDeleteDocuments,
  requireCanViewParticipants,
  requireCanManageParticipants,
  requireCanViewFinancial,
  requireCanEditFinancial,
  requireCanViewTimeline,
  requireCanEditTimeline,
  requireCanViewReports
};