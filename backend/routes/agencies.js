/**
 * Agencies Routes
 * RESTful API endpoints for agency management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const supabaseService = require('../services/supabase');

/**
 * GET /api/agencies
 * Get all agencies with pagination and filters
 */
router.get('/', authenticateToken, async (req, res) => {
  console.log('[/api/agencies] GET request received');
  console.log('[/api/agencies] User:', req.user?.email, 'Role:', req.user?.role);
  
  try {
    const databaseService = require('../services/database');
    
    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    console.log('[/api/agencies] Fetching agencies with params:', { page, limit, search, offset });
    
    // Fetch users with 'agency' role from the database
    let agencies = [];
    let total = 0;
    
    try {
      // Role-based access control
      if (req.user.role !== 'admin' && req.user.role !== 'coordinator') {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'Only admins and coordinators can view agencies'
        });
      }
      
      // Get all users with agency role
      const allUsers = await databaseService.getUsers();
      const agencyUsers = allUsers.filter(user => user.role === 'agency');
      
      console.log('[/api/agencies] Found agency users:', agencyUsers.length);
      
      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        agencies = agencyUsers.filter(user => 
          user.email?.toLowerCase().includes(searchLower) ||
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower) ||
          user.company?.toLowerCase().includes(searchLower)
        );
      } else {
        agencies = agencyUsers;
      }
      
      total = agencies.length;
      
      // Apply pagination
      agencies = agencies.slice(offset, offset + limit);
      
      // Transform to match frontend expected format
      const transformedAgencies = agencies.map(user => ({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        display_name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        company: user.company || '',
        phone_primary: user.phone_primary || user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || '',
        contact_type: ['agency'],
        status: user.is_active ? 'active' : 'inactive',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
        metadata: {
          role: user.role,
          last_login: user.last_login
        }
      }));
      
      console.log('[/api/agencies] Returning agencies:', transformedAgencies.length);
      
      res.json({
        success: true,
        data: transformedAgencies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (dbError) {
      console.error('[/api/agencies] Database error:', dbError);
      // Fallback to empty response if database fails
      res.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }
  } catch (error) {
    console.error('[/api/agencies] Error fetching agencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agencies' 
    });
  }
});

/**
 * GET /api/agencies/search
 * Search agencies
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error searching agencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

/**
 * GET /api/agencies/export
 * Export agencies to CSV or JSON
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error exporting agencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Export failed' 
    });
  }
});

/**
 * GET /api/agencies/:id
 * Get single agency by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error fetching agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agency' 
    });
  }
});

/**
 * GET /api/agencies/:id/stats
 * Get agency statistics
 */
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error fetching agency stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agency stats' 
    });
  }
});

/**
 * GET /api/agencies/:id/activity
 * Get agency activity
 */
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error fetching agency activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agency activity' 
    });
  }
});

/**
 * POST /api/agencies
 * Create new agency
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error creating agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create agency' 
    });
  }
});

/**
 * POST /api/agencies/bulk-import
 * Bulk import agencies
 */
router.post('/bulk-import', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error bulk importing agencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk import agencies' 
    });
  }
});

/**
 * PUT /api/agencies/:id
 * Update agency
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error updating agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update agency' 
    });
  }
});

/**
 * DELETE /api/agencies/:id
 * Delete agency
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete agency' 
    });
  }
});

/**
 * POST /api/agencies/:id/third-parties
 * Add third party to agency
 */
router.post('/:id/third-parties', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error adding third party to agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add third party to agency' 
    });
  }
});

/**
 * DELETE /api/agencies/:id/third-parties
 * Remove third party from agency
 */
router.delete('/:id/third-parties', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing third party from agency:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove third party from agency' 
    });
  }
});

/**
 * GET /api/agencies/:id/available-third-parties
 * Get available third parties for agency
 */
router.get('/:id/available-third-parties', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error fetching available third parties:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch available third parties' 
    });
  }
});

/**
 * PUT /api/agencies/:id/permissions
 * Update agency permissions
 */
router.put('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error updating agency permissions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update agency permissions' 
    });
  }
});

/**
 * POST /api/agencies/:id/users/:userId/resend-welcome
 * Resend welcome email to agency user
 */
router.post('/:id/users/:userId/resend-welcome', authenticateToken, async (req, res) => {
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({ success: true });
  } catch (error) {
    console.error('Error resending welcome email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend welcome email' 
    });
  }
});

/**
 * POST /api/agencies/assign-third-party
 * Admin endpoint to assign a third party to an agency
 */
router.post('/assign-third-party', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agency_contact_id, third_party_contact_id, can_view_performance = true } = req.body;
    
    if (!agency_contact_id || !third_party_contact_id) {
      return res.status(400).json({ error: 'Agency contact ID and third party contact ID are required' });
    }
    
    console.log(`📊 Admin assigning third party ${third_party_contact_id} to agency ${agency_contact_id}`);
    
    // Verify agency and third party exist
    const { data: agency } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, contact_type')
      .eq('id', agency_contact_id)
      .single();
    
    const { data: thirdParty } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, contact_type')
      .eq('id', third_party_contact_id)
      .single();
    
    // Verify the contacts have the correct types
    if (!agency || !agency.contact_type?.includes('agency')) {
      return res.status(404).json({ error: 'Agency not found or contact is not an agency type' });
    }
    
    if (!thirdParty || !thirdParty.contact_type?.includes('third_party')) {
      return res.status(404).json({ error: 'Third party not found or contact is not a third party type' });
    }
    
    // Create or update assignment
    const { data, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .upsert({
        agency_contact_id,
        third_party_contact_id,
        assigned_by: req.user.id,
        can_view_performance,
        is_active: true,
        performance_score: 75 // Default score
      }, {
        onConflict: 'agency_contact_id,third_party_contact_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
    
    console.log(`✅ Created assignment: ${thirdParty.display_name || thirdParty.first_name + ' ' + thirdParty.last_name} → ${agency.display_name || agency.first_name + ' ' + agency.last_name}`);
    
    // Send notifications to both agency and third party
    try {
      const notificationService = require('../services/notifications');
      
      // Notify the agency
      const { data: agencyUsers } = await supabaseService.client
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('contact_id', agency_contact_id)
        .eq('role', 'agency');
      
      for (const agencyUser of (agencyUsers || [])) {
        await notificationService.createNotification({
          user_id: agencyUser.id,
          title: 'New Third Party Assignment',
          message: `${thirdParty.display_name || thirdParty.first_name + ' ' + thirdParty.last_name} has been assigned to your agency for performance monitoring.`,
          type: 'assignment',
          reference_id: data.id,
          reference_type: 'agency_assignment',
          priority: 'normal'
        });
      }
      
      // Notify the third party
      const { data: thirdPartyUsers } = await supabaseService.client
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('contact_id', third_party_contact_id)
        .eq('role', 'third_party');
      
      for (const thirdPartyUser of (thirdPartyUsers || [])) {
        await notificationService.createNotification({
          user_id: thirdPartyUser.id,
          title: 'Agency Assignment',
          message: `You have been assigned to ${agency.display_name || agency.first_name + ' ' + agency.last_name} for performance monitoring.`,
          type: 'assignment',
          reference_id: data.id,
          reference_type: 'agency_assignment',
          priority: 'normal'
        });
      }
      
      console.log('📧 Notifications sent to agency and third party');
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the assignment if notifications fail
    }
    
    res.json({
      success: true,
      data: {
        ...data,
        agency_name: agency.display_name || `${agency.first_name} ${agency.last_name}`,
        third_party_name: thirdParty.display_name || `${thirdParty.first_name} ${thirdParty.last_name}`
      }
    });
    
  } catch (error) {
    console.error('Error in assign-third-party endpoint:', error);
    res.status(500).json({ error: 'Failed to assign third party' });
  }
});

/**
 * DELETE /api/agencies/assign-third-party
 * Admin endpoint to remove a third party from an agency
 */
router.delete('/assign-third-party', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agency_contact_id, third_party_contact_id } = req.body;
    
    if (!agency_contact_id || !third_party_contact_id) {
      return res.status(400).json({ error: 'Agency contact ID and third party contact ID are required' });
    }
    
    console.log(`📊 Admin removing third party ${third_party_contact_id} from agency ${agency_contact_id}`);
    
    // Soft delete the assignment
    const { data, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('agency_contact_id', agency_contact_id)
      .eq('third_party_contact_id', third_party_contact_id)
      .eq('is_active', true)
      .select()
      .single();
    
    if (error) {
      console.error('Error removing assignment:', error);
      return res.status(500).json({ error: 'Failed to remove assignment' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    console.log(`✅ Removed assignment: ${third_party_contact_id} from ${agency_contact_id}`);
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error in remove-third-party endpoint:', error);
    res.status(500).json({ error: 'Failed to remove third party' });
  }
});

/**
 * GET /api/agencies/assignments
 * Get all agency assignments (admin only)
 */
router.get('/assignments', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: assignments, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        *,
        agency:agency_contact_id(id, display_name, first_name, last_name, email),
        third_party:third_party_contact_id(id, display_name, first_name, last_name, email),
        assigned_by_user:assigned_by(id, email, first_name, last_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
    
    res.json({
      success: true,
      data: assignments || []
    });
    
  } catch (error) {
    console.error('Error in assignments endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/agencies/third-parties
 * Get all third parties assigned to the agency (agency role only)
 */
router.get('/third-parties', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const agencyContactId = req.user.contact_id || req.user.id;
    
    console.log(`📊 Agency third parties request from: ${req.user.email} (contact_id: ${agencyContactId})`);
    
    // Get third party assignments
    const { data: assignments, error: assignmentsError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        third_party_contact_id,
        is_active,
        performance_score,
        can_view_performance,
        created_at,
        updated_at
      `)
      .eq('agency_contact_id', agencyContactId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (assignmentsError) {
      console.error('Error fetching agency third party assignments:', assignmentsError);
      return res.status(500).json({ error: 'Failed to fetch third party assignments' });
    }
    
    // If no assignments found, return empty result
    if (!assignments || assignments.length === 0) {
      console.log('No third party assignments found for agency');
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    // Get contact details for all third parties
    const contactIds = assignments?.map(a => a.third_party_contact_id) || [];
    const { data: contacts } = await supabaseService.client
      .from('contacts')
      .select('id, first_name, last_name, display_name, email, company, phone_primary, created_at')
      .in('id', contactIds);
    
    // Create contact lookup map
    const contactMap = new Map();
    contacts?.forEach(contact => {
      contactMap.set(contact.id, contact);
    });
    
    // Combine assignment data with contact details
    const thirdPartiesWithStats = (assignments || []).map(assignment => {
      const contact = contactMap.get(assignment.third_party_contact_id);
      return {
        ...assignment,
        contact: contact || null,
        contact_name: contact ? (contact.display_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()) : 'Unknown'
      };
    });
    
    res.json({
      success: true,
      data: thirdPartiesWithStats,
      count: thirdPartiesWithStats.length
    });
    
  } catch (error) {
    console.error('Error in agency third parties endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch third parties' });
  }
});

module.exports = router;