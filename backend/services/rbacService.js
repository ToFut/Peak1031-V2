/**
 * RBAC Service
 * Centralized role-based access control for all data queries
 */

const supabaseService = require('./supabase');

class RBACService {
  /**
   * Get exchanges that the user is authorized to see
   */
  async getExchangesForUser(user, options = {}) {
    if (!user) {
      throw new Error('User is required for RBAC filtering');
    }

    console.log(`🔒 RBAC: Getting exchanges for ${user.role} user: ${user.email}`);

    let query = supabaseService.client.from('exchanges').select('*');

    // Apply role-based filtering
    switch (user.role) {
      case 'admin':
        // Admins see all - no filter
        console.log('   ✓ Admin access granted - no filters');
        break;

      case 'coordinator':
        // Only exchanges they coordinate
        console.log(`   ✓ Coordinator filter - user ID: ${user.id}`);
        query = query.eq('coordinator_id', user.id);
        break;

      case 'client':
        // Exchanges where they're client OR participant
        // Check both user.id and user.contact_id for client_id field
        const clientUserId = user.id;
        const clientContactId = user.contact_id;
        
        console.log(`   ✓ Client filter - user ID: ${clientUserId}, contact ID: ${clientContactId}`);
        
        // Get participant exchanges
        const { data: participantExchanges } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .or(`contact_id.eq.${clientContactId || clientUserId},user_id.eq.${clientUserId}`)
          .eq('is_active', true);
        
        const participantIds = participantExchanges?.map(p => p.exchange_id) || [];
        
        console.log(`   ✓ Client filter - participant in ${participantIds.length} exchanges: [${participantIds.join(', ')}]`);
        
        // Build OR query to check both user ID and contact ID as client, plus participation
        let orConditions = [];
        
        // Check if user is the client (try both user.id and contact_id)
        orConditions.push(`client_id.eq.${clientUserId}`);
        if (clientContactId && clientContactId !== clientUserId) {
          orConditions.push(`client_id.eq.${clientContactId}`);
        }
        
        // Add participant exchanges
        if (participantIds.length > 0) {
          orConditions.push(`id.in.(${participantIds.join(',')})`);
        }
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        } else {
          // No conditions matched, return empty
          return { data: [], count: 0 };
        }
        break;

      case 'third_party':
        // Only participant exchanges
        const tpUserId = user.id;
        const tpContactId = user.contact_id;
        
        console.log(`   ✓ Third party filter - user ID: ${tpUserId}, contact ID: ${tpContactId}`);
        
        const { data: tpExchanges } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .or(`contact_id.eq.${tpContactId || tpUserId},user_id.eq.${tpUserId}`)
          .eq('is_active', true);
        
        const tpIds = tpExchanges?.map(p => p.exchange_id) || [];
        
        console.log(`   ✓ Third party filter - participant in ${tpIds.length} exchanges: [${tpIds.join(', ')}]`);
        
        if (tpIds.length > 0) {
          query = query.in('id', tpIds);
        } else {
          // Return empty result
          return { data: [], count: 0 };
        }
        break;

      case 'agency':
        // TODO: Implement agency filtering
        console.log('   ⚠️ Agency filtering not implemented');
        break;

      default:
        console.log(`   ❌ Unknown role: ${user.role} - denying access`);
        return { data: [], count: 0 };
    }

    // Apply additional filters from options
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.orderBy) {
      query = query.order(options.orderBy.column || 'created_at', { 
        ascending: options.orderBy.ascending !== false 
      });
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('RBAC query error:', error);
      throw error;
    }

    console.log(`   📊 RBAC Result: ${data?.length || 0} exchanges returned`);

    return { data: data || [], count: count || data?.length || 0 };
  }

  /**
   * Check if user can access a specific exchange
   */
  async canUserAccessExchange(user, exchangeId) {
    if (!user || !exchangeId) return false;

    // Admin can access all
    if (user.role === 'admin') return true;

    const { data: exchanges } = await this.getExchangesForUser(user);
    return exchanges.some(ex => ex.id === exchangeId);
  }

  /**
   * Get tasks for user with RBAC
   */
  async getTasksForUser(user, options = {}) {
    if (!user) {
      throw new Error('User is required for RBAC filtering');
    }

    // First get authorized exchanges
    const { data: authorizedExchanges } = await this.getExchangesForUser(user);
    const exchangeIds = authorizedExchanges.map(ex => ex.id);

    if (exchangeIds.length === 0 && user.role !== 'admin') {
      return { data: [], count: 0 };
    }

    let query = supabaseService.client.from('tasks').select('*');

    // Filter by authorized exchanges
    if (user.role !== 'admin') {
      query = query.in('exchange_id', exchangeIds);
    }

    // Additional filters
    if (options.exchangeId) {
      query = query.eq('exchange_id', options.exchangeId);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('RBAC tasks query error:', error);
      throw error;
    }

    return { data: data || [], count: data?.length || 0 };
  }

  /**
   * Get documents for user with RBAC
   */
  async getDocumentsForUser(user, options = {}) {
    if (!user) {
      throw new Error('User is required for RBAC filtering');
    }

    // First get authorized exchanges
    const { data: authorizedExchanges } = await this.getExchangesForUser(user);
    const exchangeIds = authorizedExchanges.map(ex => ex.id);

    if (exchangeIds.length === 0 && user.role !== 'admin') {
      return { data: [], count: 0 };
    }

    let query = supabaseService.client.from('documents').select('*');

    // Filter by authorized exchanges
    if (user.role !== 'admin') {
      query = query.in('exchange_id', exchangeIds);
    }

    // Additional filters
    if (options.exchangeId) {
      query = query.eq('exchange_id', options.exchangeId);
    }
    if (options.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('RBAC documents query error:', error);
      throw error;
    }

    return { data: data || [], count: data?.length || 0 };
  }

  /**
   * Get messages for user with RBAC
   */
  async getMessagesForUser(user, options = {}) {
    if (!user) {
      throw new Error('User is required for RBAC filtering');
    }

    // First get authorized exchanges
    const { data: authorizedExchanges } = await this.getExchangesForUser(user);
    const exchangeIds = authorizedExchanges.map(ex => ex.id);

    if (exchangeIds.length === 0 && user.role !== 'admin') {
      return { data: [], count: 0 };
    }

    let query = supabaseService.client.from('messages').select('*');

    // Filter by authorized exchanges
    if (user.role !== 'admin') {
      query = query.in('exchange_id', exchangeIds);
    }

    // Additional filters
    if (options.exchangeId) {
      query = query.eq('exchange_id', options.exchangeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('RBAC messages query error:', error);
      throw error;
    }

    return { data: data || [], count: data?.length || 0 };
  }
}

module.exports = new RBACService();