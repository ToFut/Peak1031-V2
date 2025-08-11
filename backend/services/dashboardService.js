/**
 * Dashboard Service
 * Handles all dashboard-related database operations and business logic
 */

const databaseService = require('./database');

class DashboardService {
    /**
     * Get dashboard data based on user role
     */
    async getDashboardData(userId, userRole) {
        try {
            const dashboardData = {
                user: await this.getUserInfo(userId),
                stats: await this.getStatsByRole(userId, userRole),
                recentActivity: await this.getRecentActivity(userId, userRole),
                notifications: await this.getNotifications(userId),
                quickActions: this.getQuickActionsByRole(userRole)
            };

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
     * Get statistics based on user role
     */
    async getStatsByRole(userId, role) {
        const stats = {};

        try {
            switch (role) {
                case 'admin':
                    // Admin sees all system stats
                    const allUsers = await databaseService.getUsers({});
                    const allExchanges = await databaseService.getExchanges({});
                    const allTasks = await databaseService.getTasks({});
                    
                    stats.totalUsers = allUsers.length;
                    stats.totalExchanges = allExchanges.length;
                    stats.totalTasks = allTasks.length;
                    stats.activeExchanges = allExchanges.filter(e => e.status === 'active').length;
                    stats.pendingTasks = allTasks.filter(t => t.status === 'pending').length;
                    break;

                case 'coordinator':
                    // Coordinator sees exchanges they manage
                    const coordExchanges = await databaseService.getExchanges({
                        where: { coordinator_id: userId }
                    });
                    
                    stats.managedExchanges = coordExchanges.length;
                    stats.activeExchanges = coordExchanges.filter(e => e.status === 'active').length;
                    stats.completedExchanges = coordExchanges.filter(e => e.status === 'completed').length;
                    break;

                case 'client':
                    // Client sees their own exchanges
                    const clientExchanges = await databaseService.getExchanges({
                        where: { client_id: userId }
                    });
                    
                    stats.myExchanges = clientExchanges.length;
                    stats.activeExchanges = clientExchanges.filter(e => e.status === 'active').length;
                    stats.completedExchanges = clientExchanges.filter(e => e.status === 'completed').length;
                    break;

                case 'third_party':
                    // Third party sees assigned exchanges (read-only)
                    const participants = await databaseService.getExchangeParticipants({
                        where: { user_id: userId }
                    });
                    
                    stats.assignedExchanges = participants.length;
                    break;

                case 'agency':
                    // Agency sees their clients' exchanges
                    const agencyClients = await databaseService.getUsers({
                        where: { agency_id: userId }
                    });
                    
                    stats.totalClients = agencyClients.length;
                    stats.activeClients = agencyClients.filter(c => c.is_active).length;
                    break;

                default:
                    stats.message = 'No statistics available for this role';
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