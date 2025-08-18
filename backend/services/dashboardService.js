/**
 * Dashboard Service
 * Handles all dashboard-related database operations and business logic
 */

// Ensure environment variables are loaded
require('dotenv').config();

const databaseService = require('./database');
const rbacService = require('./rbacService');

class DashboardService {
    /**
     * Get dashboard data based on user role
     */
    async getDashboardData(userId, userRole) {
        try {
            const user = await this.getUserInfo(userId);
            const stats = await this.getStatsByRole(userId, userRole);
            const recentActivity = await this.getRecentActivity(userId, userRole);
            const notifications = await this.getNotifications(userId);
            const quickActions = this.getQuickActionsByRole(userRole);

            // Format the response to match what the frontend expects
            const dashboardData = {
                user,
                stats,
                recentActivity,
                notifications,
                quickActions,
                
                // Frontend-expected format for dashboard overview
                exchanges: {
                    total: stats.totalExchanges || stats.myExchanges || stats.managedExchanges || stats.assignedExchanges || 0,
                    active: stats.activeExchanges || 0,
                    completed: stats.completedExchanges || 0,
                    pending: stats.pendingExchanges || 0,
                    ppSynced: 0
                },
                tasks: {
                    total: stats.totalTasks || 0,
                    pending: stats.pendingTasks || 0,
                    completed: stats.completedTasks || 0,
                    overdue: 0,
                    urgent: 0,
                    thisWeek: 0
                },
                documents: {
                    total: 0,
                    requireSignature: 0,
                    recent: 0
                },
                messages: {
                    unread: 0,
                    recent: 0
                },
                users: {
                    total: stats.totalUsers || 0,
                    active: 0,
                    admins: 0,
                    clients: 0,
                    coordinators: 0
                },
                system: {
                    lastSync: null,
                    syncStatus: 'success',
                    totalDocuments: 0,
                    systemHealth: 'healthy'
                },
                
                // Lists for the frontend (empty for now, will be populated by specific role-filtered endpoints)
                exchangesList: [],
                tasksList: [],
                documentsList: [],
                messagesList: [],
                usersList: []
            };

            console.log(`📊 Dashboard response for ${userRole}: ${dashboardData.exchanges.total} exchanges`);
            return dashboardData;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get user information for dashboard
     */
    async getUserInfo(userId) {
        try {
            const user = await databaseService.getUsers({
                where: { id: userId },
                limit: 1
            });

            if (user && user.length > 0) {
                return {
                    id: user[0].id,
                    email: user[0].email,
                    firstName: user[0].first_name,
                    lastName: user[0].last_name,
                    role: user[0].role,
                    lastLogin: user[0].last_login,
                    isActive: user[0].is_active
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    /**
     * Get statistics based on user role - USING RBAC SERVICE FOR CONSISTENCY
     */
    async getStatsByRole(userId, role) {
        const stats = {};

        try {
            // Create user object for RBAC service
            const user = await databaseService.getUserById(userId);
            if (!user) {
                return { error: 'User not found' };
            }

            // Only log in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`📊 Dashboard stats request for ${role} user: ${user.email}`);
            }

            switch (role) {
                case 'admin':
                    // Admin sees all system stats - use RBAC service for consistency
                    const adminExchanges = await rbacService.getExchangesForUser(user);
                    const adminTasks = await rbacService.getTasksForUser(user);
                    const allUsers = await databaseService.getUsers({});
                    
                    stats.totalUsers = allUsers.length;
                    stats.totalExchanges = adminExchanges.count || 0;  // Use count from RBAC
                    stats.totalTasks = adminTasks.count || 0;
                    
                    // For status counts, we'll use the returned data (limited to 1000)
                    // TODO: Implement separate count queries for accurate status counts
                    const exchanges = adminExchanges.data || [];
                    const tasks = adminTasks.data || [];
                    stats.activeExchanges = exchanges.filter(e => e.status === 'active' || e.status === 'In Progress').length;
                    stats.pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'PENDING').length;
                    
                    console.log(`   ✅ Admin stats: ${stats.totalExchanges} total exchanges, ${stats.totalUsers} users`);
                    break;

                case 'coordinator':
                case 'client':
                case 'third_party':
                case 'agency':
                    // Use RBAC service to get authorized exchanges
                    const userExchanges = await rbacService.getExchangesForUser(user);
                    const userExchangeData = userExchanges.data || [];
                    const totalExchangeCount = userExchanges.count || 0;  // Use the total count from DB
                    
                    console.log(`   ✅ RBAC filtered: ${totalExchangeCount} total exchanges for ${role} (${userExchangeData.length} returned)`);
                    
                    // Get tasks for user's exchanges
                    let userTasks = [];
                    if (totalExchangeCount > 0) {
                        userTasks = await rbacService.getTasksForUser(user);
                    }
                    
                    // Build role-appropriate stats - use the total count, not array length
                    stats.totalExchanges = totalExchangeCount;
                    stats.activeExchanges = userExchangeData.filter(e => e.status === 'active' || e.status === 'In Progress').length;
                    stats.completedExchanges = userExchangeData.filter(e => e.status === 'completed' || e.status === 'COMPLETED').length;
                    stats.pendingExchanges = userExchangeData.filter(e => e.status === 'pending' || e.status === 'PENDING').length;
                    
                    // Task stats - use count if available
                    if (userTasks && userTasks.data) {
                        const tasks = userTasks.data;
                        stats.totalTasks = userTasks.count || tasks.length;
                        // For now, use the returned data for status counts
                        // TODO: Implement separate count queries for accurate status counts
                        stats.pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'PENDING').length;
                        stats.completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'COMPLETED').length;
                    } else {
                        stats.totalTasks = 0;
                        stats.pendingTasks = 0;
                        stats.completedTasks = 0;
                    }
                    
                    // Role-specific naming
                    if (role === 'coordinator') {
                        stats.managedExchanges = stats.totalExchanges;
                    } else if (role === 'client') {
                        stats.myExchanges = stats.totalExchanges;
                    } else if (role === 'third_party') {
                        stats.assignedExchanges = stats.totalExchanges;
                    }
                    
                    console.log(`   📈 ${role} stats: ${stats.totalExchanges} exchanges, ${stats.totalTasks} tasks`);
                    break;

                default:
                    stats.message = 'No statistics available for this role';
                    console.log(`   ❌ Unknown role: ${role}`);
            }

            return stats;
        } catch (error) {
            console.error('Error fetching stats by role:', error);
            return { error: 'Failed to fetch statistics' };
        }
    }

    /**
     * Get recent activity based on user role
     */
    async getRecentActivity(userId, role) {
        try {
            const activities = [];

            // Get recent messages
            const messages = await databaseService.getMessages({
                where: role === 'admin' ? {} : { sender_id: userId },
                limit: 5,
                orderBy: { column: 'created_at', ascending: false }
            });

            messages.forEach(msg => {
                activities.push({
                    type: 'message',
                    description: `Message sent`,
                    timestamp: msg.created_at,
                    details: { id: msg.id, content: msg.content?.substring(0, 50) }
                });
            });

            // Get recent documents
            const documents = await databaseService.getDocuments({
                where: role === 'admin' ? {} : { uploaded_by: userId },
                limit: 5,
                orderBy: { column: 'created_at', ascending: false }
            });

            documents.forEach(doc => {
                activities.push({
                    type: 'document',
                    description: `Document uploaded: ${doc.filename}`,
                    timestamp: doc.created_at,
                    details: { id: doc.id, filename: doc.filename }
                });
            });

            // Sort by timestamp
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return activities.slice(0, 10); // Return top 10 recent activities
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            return [];
        }
    }

    /**
     * Get notifications for user
     */
    async getNotifications(userId) {
        try {
            // This would typically fetch from a notifications table
            // For now, return mock notifications
            return [
                {
                    id: 1,
                    type: 'info',
                    message: 'Welcome to Peak 1031 Dashboard',
                    timestamp: new Date(),
                    read: false
                }
            ];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    /**
     * Get quick actions based on role
     */
    getQuickActionsByRole(role) {
        const actionsByRole = {
            admin: [
                { action: 'create_user', label: 'Create New User', icon: 'user-plus' },
                { action: 'create_exchange', label: 'Create Exchange', icon: 'plus-circle' },
                { action: 'view_audit_logs', label: 'View Audit Logs', icon: 'list' },
                { action: 'sync_pp_data', label: 'Sync PracticePanther', icon: 'sync' }
            ],
            coordinator: [
                { action: 'create_exchange', label: 'Create Exchange', icon: 'plus-circle' },
                { action: 'assign_users', label: 'Assign Users', icon: 'users' },
                { action: 'view_tasks', label: 'View Tasks', icon: 'tasks' }
            ],
            client: [
                { action: 'view_exchanges', label: 'My Exchanges', icon: 'folder' },
                { action: 'upload_document', label: 'Upload Document', icon: 'upload' },
                { action: 'send_message', label: 'Send Message', icon: 'message' }
            ],
            third_party: [
                { action: 'view_exchanges', label: 'View Exchanges', icon: 'eye' },
                { action: 'view_documents', label: 'View Documents', icon: 'file' }
            ],
            agency: [
                { action: 'view_clients', label: 'View Clients', icon: 'users' },
                { action: 'view_reports', label: 'View Reports', icon: 'chart' }
            ]
        };

        return actionsByRole[role] || [];
    }

    /**
     * Get role-specific metrics
     */
    async getRoleMetrics(userId, role) {
        try {
            const metrics = {
                role,
                timestamp: new Date(),
                data: {}
            };

            switch (role) {
                case 'admin':
                    const users = await databaseService.getUsers({});
                    metrics.data = {
                        totalUsers: users.length,
                        activeUsers: users.filter(u => u.is_active).length,
                        byRole: {
                            admin: users.filter(u => u.role === 'admin').length,
                            coordinator: users.filter(u => u.role === 'coordinator').length,
                            client: users.filter(u => u.role === 'client').length,
                            third_party: users.filter(u => u.role === 'third_party').length,
                            agency: users.filter(u => u.role === 'agency').length
                        }
                    };
                    break;

                case 'coordinator':
                    const coordExchanges = await databaseService.getExchanges({
                        where: { coordinator_id: userId }
                    });
                    metrics.data = {
                        totalExchanges: coordExchanges.length,
                        byStatus: {
                            pending: coordExchanges.filter(e => e.status === 'pending').length,
                            active: coordExchanges.filter(e => e.status === 'active').length,
                            completed: coordExchanges.filter(e => e.status === 'completed').length
                        }
                    };
                    break;

                default:
                    metrics.data = { message: 'Metrics available for this role' };
            }

            return metrics;
        } catch (error) {
            console.error('Error fetching role metrics:', error);
            throw error;
        }
    }
}

module.exports = new DashboardService();