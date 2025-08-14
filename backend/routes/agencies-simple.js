/**
 * Simple Agencies Routes
 * Provides placeholder responses for agency-related API calls
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/agencies
 * Get all agencies with pagination and filters
 */
router.get('/', (req, res) => {
  console.log('[/api/agencies] GET request received');
  console.log('[/api/agencies] Query params:', req.query);
  
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
});

/**
 * GET /api/agencies/search
 * Search agencies
 */
router.get('/search', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * GET /api/agencies/export
 * Export agencies
 */
router.get('/export', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * GET /api/agencies/:id
 * Get single agency
 */
router.get('/:id', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * GET /api/agencies/:id/stats
 * Get agency stats
 */
router.get('/:id/stats', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * GET /api/agencies/:id/activity
 * Get agency activity
 */
router.get('/:id/activity', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * POST /api/agencies
 * Create agency
 */
router.post('/', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * POST /api/agencies/bulk-import
 * Bulk import agencies
 */
router.post('/bulk-import', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * PUT /api/agencies/:id
 * Update agency
 */
router.put('/:id', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * DELETE /api/agencies/:id
 * Delete agency
 */
router.delete('/:id', (req, res) => {
  res.json({ success: true });
});

/**
 * POST /api/agencies/:id/third-parties
 * Add third party to agency
 */
router.post('/:id/third-parties', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * DELETE /api/agencies/:id/third-parties
 * Remove third party from agency
 */
router.delete('/:id/third-parties', (req, res) => {
  res.json({ success: true });
});

/**
 * GET /api/agencies/:id/available-third-parties
 * Get available third parties
 */
router.get('/:id/available-third-parties', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * PUT /api/agencies/:id/permissions
 * Update agency permissions
 */
router.put('/:id/permissions', (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * POST /api/agencies/:id/users/:userId/resend-welcome
 * Resend welcome email
 */
router.post('/:id/users/:userId/resend-welcome', (req, res) => {
  res.json({ success: true });
});

module.exports = router;





