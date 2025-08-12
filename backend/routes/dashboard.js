/**
 * Dashboard Routes
 * Provides role-based dashboard data for all user types
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');
const fastDashboardService = require('../services/fastDashboardService');
const AuditService = require('../services/audit');

/**
 * GET /api/dashboard
 * Get main dashboard data based on user role
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Dashboard request from user:', req.user.email, 'Role:', req.user.role);
        
        // Log dashboard access
        await AuditService.logUserAction(
            req.user.id,
            'view_dashboard',
            'dashboard',
            null,
            req,
            { role: req.user.role }
        );

        // Use fast dashboard service for quick loading (check query param)
        const useFast = req.query.fast !== 'false'; // Default to fast unless explicitly disabled
        
        const dashboardData = useFast 
            ? await fastDashboardService.getFastDashboardData(req.user.id, req.user.role)
            : await dashboardService.getDashboardData(req.user.id, req.user.role);

        // Extra logging to debug 1000 issue
        console.log('📤 Sending dashboard response:', {
            userEmail: req.user.email,
            userRole: req.user.role,
            'exchanges.total': dashboardData.exchanges.total,
            'stats.totalExchanges': dashboardData.stats?.totalExchanges,
            timestamp: new Date().toISOString()
        });
        
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
 * Get dashboard overview data based on user role (FAST VERSION)
 */
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        console.log('⚡ FAST Dashboard overview request from user:', req.user.email, 'Role:', req.user.role);
        
        // Skip audit logging for performance (or make it async)
        // await AuditService.logUserAction(
        //     req.user.id,
        //     'view_dashboard_overview',
        //     'dashboard',
        //     null,
        //     req,
        //     { role: req.user.role }
        // );

        // Use fast dashboard service for quick loading
        const dashboardData = await fastDashboardService.getFastDashboardData(
            req.user.id,
            req.user.role
        );

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Fast dashboard overview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard overview',
            message: error.message
        });
    }
});

/**
 * GET /api/dashboard/fast
 * Super fast dashboard endpoint optimized for initial page load
 */
router.get('/fast', authenticateToken, async (req, res) => {
    try {
        console.log('⚡ SUPER FAST Dashboard request from user:', req.user.email, 'Role:', req.user.role);
        
        const startTime = Date.now();
        
        // Use fast dashboard service - no audit logging for max speed
        const dashboardData = await fastDashboardService.getFastDashboardData(
            req.user.id,
            req.user.role
        );
        
        const loadTime = Date.now() - startTime;
        console.log(`⚡ Fast dashboard loaded in ${loadTime}ms`);

        res.json({
            success: true,
            data: dashboardData,
            loadTime: `${loadTime}ms`,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Super fast dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch fast dashboard',
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