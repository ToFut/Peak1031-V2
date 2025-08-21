const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/database');

// Permission structure for exchanges
const DEFAULT_PERMISSIONS = {
  admin: {
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: true,
    can_add_participants: true,
    can_view_audit: true,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: true,
  },
  coordinator: {
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: true,
    can_add_participants: true,
    can_view_audit: true,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: true,
  },
  client: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: false,
  },
  third_party: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: false,
    can_download_documents: true,
    can_send_messages: false,
    can_add_tasks: false,
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: false,
    can_view_compliance: false,
    can_use_pin: false,
    can_delete_documents: false,
  },
  agency: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: false,
    can_download_documents: true,
    can_send_messages: false,
    can_add_tasks: false,
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: false,
    can_view_compliance: false,
    can_use_pin: false,
    can_delete_documents: false,
  }
};

// Get permissions for a user on a specific exchange
router.get('/exchanges/:exchangeId/permissions/:userId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, userId } = req.params;
    const requestingUserId = req.user.id;
    
    // Check if requesting user has access to this exchange
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
      
    if (exchangeError || !exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Get user's role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for custom permissions
    const { data: customPerms, error: customError } = await supabase
      .from('exchange_permissions')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('user_id', userId)
      .single();
    
    // Base permissions from role
    let permissions = DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.third_party;
    
    // Override with custom permissions if they exist
    if (customPerms) {
      permissions = {
        ...permissions,
        ...customPerms.permissions
      };
    }
    
    // Add tab visibility based on permissions
    permissions.tabs_visible = {
      overview: true,
      members: permissions.can_send_messages || permissions.can_add_tasks || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      tasks: permissions.can_add_tasks || permissions.can_view || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      documents: permissions.can_upload_documents || permissions.can_view || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      financial: permissions.can_view_financial || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      compliance: permissions.can_view_compliance || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      chat: permissions.can_send_messages || permissions.can_view || user.role === 'client' || user.role === 'admin' || user.role === 'coordinator',
      timeline: user.role === 'admin' || user.role === 'coordinator' || user.role === 'client',
      audit: permissions.can_view_audit || user.role === 'admin' || user.role === 'coordinator',
    };
    
    res.json({
      success: true,
      permissions,
      role: user.role,
      hasCustomPermissions: !!customPerms
    });
    
  } catch (error) {
    console.error('Error fetching exchange permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Update custom permissions for a user on an exchange (admin only)
router.post('/exchanges/:exchangeId/permissions/:userId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, userId } = req.params;
    const { permissions } = req.body;
    const requestingUserId = req.user.id;
    
    // Only admins can set custom permissions
    const { data: requestingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', requestingUserId)
      .single();
      
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can set custom permissions' });
    }
    
    // Upsert custom permissions
    const { data, error } = await supabase
      .from('exchange_permissions')
      .upsert({
        exchange_id: exchangeId,
        user_id: userId,
        permissions,
        updated_at: new Date().toISOString(),
        updated_by: requestingUserId
      }, {
        onConflict: 'exchange_id,user_id'
      });
      
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Permissions updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating exchange permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// Get all users with permissions for an exchange
router.get('/exchanges/:exchangeId/all-permissions', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const requestingUserId = req.user.id;
    
    // Check if requesting user is admin or coordinator
    const { data: requestingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', requestingUserId)
      .single();
      
    if (!requestingUser || (requestingUser.role !== 'admin' && requestingUser.role !== 'coordinator')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select('*, users(*)')
      .eq('exchange_id', exchangeId);
      
    if (participantsError) {
      throw participantsError;
    }
    
    // Get custom permissions
    const { data: customPerms, error: customError } = await supabase
      .from('exchange_permissions')
      .select('*')
      .eq('exchange_id', exchangeId);
      
    if (customError) {
      throw customError;
    }
    
    // Combine participant info with permissions
    const userPermissions = participants.map(participant => {
      const user = participant.users;
      const basePerms = DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.third_party;
      const customPerm = customPerms.find(p => p.user_id === user.id);
      
      return {
        userId: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        permissions: customPerm ? { ...basePerms, ...customPerm.permissions } : basePerms,
        hasCustomPermissions: !!customPerm
      };
    });
    
    res.json({
      success: true,
      permissions: userPermissions
    });
    
  } catch (error) {
    console.error('Error fetching all exchange permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

module.exports = router;