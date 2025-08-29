/**
 * Centralized Authorization Data Service
 * Provides role-based filtered data access across all endpoints
 */

const rbacService = require('../services/rbacService');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');

class AuthorizedDataService {
  
  /**
   * Get exchanges that the user is authorized to access
   */
  static async getAuthorizedExchanges(user, options = {}) {
    console.log(`🔒 Getting authorized exchanges for ${user.role}: ${user.email}`);
    
    if (user.role === 'admin') {
      // Admin sees all exchanges
      const result = await rbacService.getExchangesForUser(user, options);
      console.log(`  ✅ Admin access: ${result.count} exchanges`);
      return result;
    }
    
    // Non-admin users use RBAC filtering
    const result = await rbacService.getExchangesForUser(user, options);
    console.log(`  ✅ ${user.role} access: ${result.count} exchanges`);
    return result;
  }
  
  /**
   * Get users that the requesting user is authorized to see
   */
  static async getAuthorizedUsers(user, options = {}) {
    console.log(`🔒 Getting authorized users for ${user.role}: ${user.email}`);
    
    const { search = '', page = 1, limit = 20, role = null } = options;
    
    if (user.role === 'admin') {
      // Admin can see all users
      const allUsers = await databaseService.getUsers();
      console.log(`  ✅ Admin access: ${allUsers.length} total users`);
      
      // Apply filters
      let filteredUsers = allUsers;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = allUsers.filter(u => 
          u.email?.toLowerCase().includes(searchLower) ||
          u.first_name?.toLowerCase().includes(searchLower) ||
          u.last_name?.toLowerCase().includes(searchLower)
        );
      }
      if (role) {
        filteredUsers = filteredUsers.filter(u => u.role === role);
      }
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      
      return {
        data: paginatedUsers,
        total: filteredUsers.length,
        page,
        limit
      };
    }
    
    if (user.role === 'coordinator') {
      // Coordinator can see users in their managed exchanges
      const userExchanges = await this.getAuthorizedExchanges(user);
      const exchangeIds = userExchanges.data.map(e => e.id);
      
      if (exchangeIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      
      // Get participants from these exchanges
      const { data: participants } = await supabaseService.client
        .from('exchange_participants')
        .select('user_id, contact_id')
        .in('exchange_id', exchangeIds)
        .eq('is_active', true);
      
      const userIds = [...new Set(participants.map(p => p.user_id).filter(Boolean))];
      
      if (userIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      
      const allUsers = await databaseService.getUsers();
      const authorizedUsers = allUsers.filter(u => userIds.includes(u.id));
      
      console.log(`  ✅ Coordinator access: ${authorizedUsers.length} users from ${exchangeIds.length} exchanges`);
      return {
        data: authorizedUsers.slice((page - 1) * limit, page * limit),
        total: authorizedUsers.length,
        page,
        limit
      };
    }
    
    if (user.role === 'client' || user.role === 'third_party') {
      // Clients/Third parties can only see themselves and coordinators of their exchanges
      const userExchanges = await this.getAuthorizedExchanges(user);
      const exchanges = userExchanges.data || [];
      
      const coordinatorIds = [...new Set(exchanges.map(e => e.coordinator_id).filter(Boolean))];
      const allUsers = await databaseService.getUsers();
      
      // Include self and coordinators
      const authorizedUsers = allUsers.filter(u => 
        u.id === user.id || coordinatorIds.includes(u.id)
      );
      
      console.log(`  ✅ ${user.role} access: ${authorizedUsers.length} users (self + coordinators)`);
      return {
        data: authorizedUsers,
        total: authorizedUsers.length,
        page: 1,
        limit: authorizedUsers.length
      };
    }
    
    // Agency and other roles - return only self for now
    console.log(`  ⚠️  ${user.role} access: limited to self only`);
    return {
      data: [user],
      total: 1,
      page: 1,
      limit: 1
    };
  }
  
  /**
   * Get tasks that the user is authorized to access
   */
  static async getAuthorizedTasks(user, options = {}) {
    console.log(`🔒 Getting authorized tasks for ${user.role}: ${user.email}`);
    
    const { search, status, priority, exchangeId, assignedTo, page = 1, limit = 20 } = options;
    
    // First get authorized exchanges
    const userExchanges = await this.getAuthorizedExchanges(user);
    const authorizedExchangeIds = userExchanges.data.map(e => e.id);
    
    if (authorizedExchangeIds.length === 0) {
      console.log(`  ✅ ${user.role} access: 0 exchanges = 0 tasks`);
      return { data: [], total: 0, page, limit };
    }
    
    // Query tasks from authorized exchanges only
    let query = supabaseService.client
      .from('tasks')
      .select(`
        *,
        assignee:assigned_to (
          id,
          first_name,
          last_name,
          email
        ),
        exchange:exchange_id (
          id,
          exchange_number,
          status
        )
      `, { count: 'exact' })
      .in('exchange_id', authorizedExchangeIds);
    
    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    if (priority) {
      query = query.eq('priority', priority.toUpperCase());
    }
    if (exchangeId) {
      // Only allow if user has access to this specific exchange
      if (authorizedExchangeIds.includes(exchangeId)) {
        query = query.eq('exchange_id', exchangeId);
      } else {
        return { data: [], total: 0, page, limit };
      }
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('due_date', { ascending: true });
    
    const { data: tasks, count, error } = await query;
    
    if (error) {
      console.error('Error fetching authorized tasks:', error);
      throw error;
    }
    
    console.log(`  ✅ ${user.role} access: ${count} total tasks from ${authorizedExchangeIds.length} exchanges`);
    
    return {
      data: tasks || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }
  
  /**
   * Get documents that the user is authorized to access
   */
  static async getAuthorizedDocuments(user, options = {}) {
    console.log(`🔒 Getting authorized documents for ${user.role}: ${user.email}`);
    
    // Documents endpoint already implements proper RBAC filtering
    // This is just a wrapper for consistency
    const userExchanges = await this.getAuthorizedExchanges(user);
    const authorizedExchangeIds = userExchanges.data.map(e => e.id);
    
    if (authorizedExchangeIds.length === 0) {
      return { data: [], total: 0, page: 1, limit: 20 };
    }
    
    // Return the exchange IDs for document filtering
    console.log(`  ✅ ${user.role} can access documents from ${authorizedExchangeIds.length} exchanges`);
    return {
      allowedExchangeIds: authorizedExchangeIds,
      exchangeCount: authorizedExchangeIds.length
    };
  }
  
  /**
   * Check if user can access specific resource
   */
  static async canAccessResource(user, resourceType, resourceId) {
    console.log(`🔒 Checking ${user.role} access to ${resourceType}:${resourceId}`);
    
    if (user.role === 'admin') {
      return true;
    }
    
    switch (resourceType) {
      case 'exchange':
        const exchanges = await this.getAuthorizedExchanges(user);
        return exchanges.data.some(e => e.id === resourceId);
        
      case 'user':
        const users = await this.getAuthorizedUsers(user);
        return users.data.some(u => u.id === resourceId);
        
      default:
        return false;
    }
  }
}

module.exports = AuthorizedDataService;