/**
 * Agencies Routes
 * RESTful API endpoints for agency management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/agencies
 * Get all agencies with pagination and filters
 */
router.get('/', authenticateToken, async (req, res) => {
  console.log('[/api/agencies] GET request received');
  console.log('[/api/agencies] User:', req.user?.email, 'Role:', req.user?.role);
  
  try {
    // For now, return empty response to prevent frontend errors
    // This can be enhanced later with actual agency data
    res.json({
      success: true,
      data: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        totalPages: 0
      }
    });
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

module.exports = router;