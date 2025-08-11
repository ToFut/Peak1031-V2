/**
 * Dashboard Routes
 * Provides role-based dashboard data for all user types
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');
const auditService = require('../services/audit');

/**
 * GET /api/dashboard
 * Get main dashboard data based on user role
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Dashboard request from user:', req.user.email, 'Role:', req.user.role);
        
        // Log dashboard access
        await auditService.logUserAction(
            req.user.id,
            'view_dashboard',
            'dashboard',
            null,
            req,
            { role: req.user.role }
        );

        // Get dashboard data based on role
        const dashboardData = await dashboardService.getDashboardData(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/overview
 * Get dashboard overview data based on user role
 */
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Dashboard overview request from user:', req.user.email, 'Role:', req.user.role);
        
        // Log dashboard access
        await auditService.logUserAction(
            req.user.id,
            'view_dashboard_overview',
            'dashboard',
            null,
            req,
            { role: req.user.role }
        );

        // Get dashboard data based on role
        const dashboardData = await dashboardService.getDashboardData(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard overview',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard
 * Get dashboard data based on user role
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Dashboard request from user:', req.user.email, 'Role:', req.user.role);
        
        // Log dashboard access
        await auditService.logUserAction(
            req.user.id,
            'view_dashboard',
            'dashboard',
            null,
            req,
            { role: req.user.role }
        );

        // Get dashboard data based on role
        const dashboardData = await dashboardService.getDashboardData(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/stats
 * Get role-specific statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await dashboardService.getStatsByRole(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            stats,
            role: req.user.role,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity based on role
 */
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const activity = await dashboardService.getRecentActivity(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            activity,
            count: activity.length,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/notifications
 * Get user notifications
 */
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await dashboardService.getNotifications(req.user.id);

        res.json({
            success: true,
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/quick-actions
 * Get role-specific quick actions
 */
router.get('/quick-actions', authenticateToken, async (req, res) => {
    try {
        const quickActions = dashboardService.getQuickActionsByRole(req.user.role);

        res.json({
            success: true,
            quickActions,
            role: req.user.role,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Quick actions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quick actions',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/metrics
 * Get detailed metrics based on role
 */
router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const metrics = await dashboardService.getRoleMetrics(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            metrics,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            message: error.message
        });
    }
});

module.exports = router;