/**
 * Agencies Routes
 * RESTful API endpoints for agency management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const agencyService = require('../services/agencyService');
const AuditService = require('../services/audit');

/**
 * GET /api/agencies
 * Get all agencies with pagination and filters
 */
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  console.log('[/api/agencies] GET request received');
  console.log('[/api/agencies] User:', req.user?.email, 'Role:', req.user?.role);
  console.log('[/api/agencies] Query params:', req.query);
  
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search || '',
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc',
      includeStats: req.query.includeStats !== 'false'
    };

    console.log('[/api/agencies] Calling agencyService.getAllAgencies with:', options);
    const result = await agencyService.getAllAgencies(options);
    console.log('[/api/agencies] Service returned:', { success: result.success, dataCount: result.data?.length });
    res.json(result);
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
router.get('/search', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const result = await agencyService.getAllAgencies({
      search: q,
      limit: 50,
      includeStats: false
    });

    res.json({ success: true, data: result.data });
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
router.get('/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const result = await agencyService.getAllAgencies({
      limit: 1000,
      includeStats: true
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="agencies_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(result.data);
    } else {
      // CSV format
      const csv = convertToCSV(result.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="agencies_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    }
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
router.get('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await agencyService.getAgencyById(req.params.id);
    res.json(result);
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
router.get('/:id/stats', authenticateToken, requireRole(['admin', 'agency']), async (req, res) => {
  try {
    // Check if agency is accessing their own stats
    if (req.user.role === 'agency' && req.user.contact_id !== req.params.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const stats = await agencyService.getAgencyStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching agency stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

/**
 * GET /api/agencies/:id/activity
 * Get agency activity log
 */
router.get('/:id/activity', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get activity from audit logs
    const activities = await AuditService.getAuditLogs({
      entityType: 'agency',
      entityId: req.params.id,
      limit: parseInt(days) * 10 // Approximate entries per day
    });
    
    res.json({ 
      success: true, 
      data: activities 
    });
  } catch (error) {
    console.error('Error fetching agency activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch activity' 
    });
  }
});

/**
 * POST /api/agencies
 * Create new agency
 */
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agencyData, userData } = req.body;
    
    if (!agencyData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agency data is required' 
      });
    }

    const result = await agencyService.createAgency(agencyData, userData);
    
    // Log creation
    await AuditService.log({
      user_id: req.user.id,
      action: 'agency.created',
      entity_type: 'agency',
      entity_id: result.data.contact.id,
      details: { agency_name: agencyData.display_name || `${agencyData.first_name} ${agencyData.last_name}` }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating agency:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create agency' 
    });
  }
});

/**
 * POST /api/agencies/bulk-import
 * Bulk import agencies
 */
router.post('/bulk-import', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agencies, options } = req.body;
    
    if (!agencies || !Array.isArray(agencies)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agencies array is required' 
      });
    }

    const result = await agencyService.bulkImportAgencies(agencies, options);
    
    // Log import
    await AuditService.log({
      user_id: req.user.id,
      action: 'agencies.bulk_imported',
      entity_type: 'system',
      details: { 
        total: result.results.total,
        success: result.results.success.length,
        failed: result.results.failed.length
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error bulk importing agencies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bulk import failed' 
    });
  }
});

/**
 * PUT /api/agencies/:id
 * Update agency
 */
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const updates = req.body;
    
    const result = await agencyService.updateAgency(req.params.id, updates);
    
    // Log update
    await AuditService.log({
      user_id: req.user.id,
      action: 'agency.updated',
      entity_type: 'agency',
      entity_id: req.params.id,
      details: { updates }
    });

    res.json(result);
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
 * Delete or deactivate agency
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const hardDelete = req.query.hard === 'true';
    
    const result = await agencyService.deleteAgency(req.params.id, hardDelete);
    
    // Log deletion
    await AuditService.log({
      user_id: req.user.id,
      action: hardDelete ? 'agency.deleted' : 'agency.deactivated',
      entity_type: 'agency',
      entity_id: req.params.id
    });

    res.json(result);
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
 * Assign third parties to agency
 */
router.post('/:id/third-parties', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { thirdPartyIds, can_view_performance, can_assign_exchanges } = req.body;
    
    if (!thirdPartyIds || !Array.isArray(thirdPartyIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Third party IDs array is required' 
      });
    }

    const result = await agencyService.assignThirdParties(
      req.params.id, 
      thirdPartyIds,
      {
        can_view_performance,
        can_assign_exchanges,
        assigned_by: req.user.id
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error assigning third parties:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign third parties' 
    });
  }
});

/**
 * DELETE /api/agencies/:id/third-parties
 * Remove third parties from agency
 */
router.delete('/:id/third-parties', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { thirdPartyIds } = req.body;
    
    if (!thirdPartyIds || !Array.isArray(thirdPartyIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Third party IDs array is required' 
      });
    }

    const result = await agencyService.removeThirdParties(req.params.id, thirdPartyIds);
    res.json(result);
  } catch (error) {
    console.error('Error removing third parties:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove third parties' 
    });
  }
});

/**
 * GET /api/agencies/:id/available-third-parties
 * Get third parties available for assignment
 */
router.get('/:id/available-third-parties', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const supabaseService = require('../services/supabase');
    
    // Get all third party contacts
    const { data: thirdParties } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, email, company')
      .contains('contact_type', ['third_party'])
      .order('display_name');

    // Get already assigned third parties
    const { data: assignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('third_party_contact_id')
      .eq('agency_contact_id', req.params.id)
      .eq('is_active', true);

    const assignedIds = new Set(assignments?.map(a => a.third_party_contact_id) || []);
    
    // Filter out already assigned
    const available = thirdParties?.filter(tp => !assignedIds.has(tp.id)) || [];

    res.json({ 
      success: true, 
      data: available 
    });
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
router.put('/:id/permissions', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Permissions object is required' 
      });
    }

    // Update permissions in metadata
    const result = await agencyService.updateAgency(req.params.id, {
      metadata: { permissions }
    });

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update permissions' 
    });
  }
});

/**
 * POST /api/agencies/:id/users/:userId/resend-welcome
 * Resend welcome email to agency user
 */
router.post('/:id/users/:userId/resend-welcome', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const notificationService = require('../services/notifications');
    const supabaseService = require('../services/supabase');
    
    // Get user details
    const { data: user } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('id', req.params.userId)
      .eq('contact_id', req.params.id)
      .single();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Send welcome email
    await notificationService.sendAgencyWelcomeEmail({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      temporaryPassword: 'Use password reset to set new password',
      loginUrl: process.env.FRONTEND_URL + '/login'
    });

    res.json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    });
  } catch (error) {
    console.error('Error resending welcome email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send welcome email' 
    });
  }
});

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = [
    'Name',
    'Email',
    'Company',
    'Phone',
    'Address',
    'City',
    'State',
    'ZIP',
    'Status',
    'Third Parties',
    'Active Exchanges',
    'Total Revenue',
    'Performance Score',
    'Created Date'
  ];

  const rows = data.map(agency => [
    agency.display_name || `${agency.first_name} ${agency.last_name}`,
    agency.email || '',
    agency.company || '',
    agency.phone_primary || '',
    agency.address || '',
    agency.city || '',
    agency.state || '',
    agency.zip || '',
    agency.status || '',
    agency.stats?.third_parties || 0,
    agency.stats?.exchanges.active || 0,
    agency.stats?.exchanges.totalValue || 0,
    agency.stats?.performance.average_score || 0,
    new Date(agency.created_at).toLocaleDateString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

module.exports = router;