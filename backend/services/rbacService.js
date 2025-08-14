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

    // Use count: 'exact' to get total count even with limit
    let query = supabaseService.client.from('exchanges').select('*', { count: 'exact' });

    // Apply role-based filtering
    switch (user.role) {
      case 'admin':
        // Admins see all - no filter
        console.log('   ✓ Admin access granted - no filters');
        break;

      case 'coordinator':
        // Exchanges where they're coordinator (in coordinator_id field) OR participant
        console.log(`   ✓ Coordinator filter - user ID: ${user.id}`);
        
        // Get participant exchanges for coordinator
        const coordParticipantExchanges = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        const coordParticipantIds = coordParticipantExchanges.data?.map(p => p.exchange_id) || [];
        console.log(`   ✓ Coordinator participant in ${coordParticipantIds.length} exchanges: [${coordParticipantIds.join(', ')}]`);
        
        // Build OR query to check both coordinator_id field and participation
        let coordOrConditions = [];
        
        // Check if user is the coordinator in coordinator_id field
        coordOrConditions.push(`coordinator_id.eq.${user.id}`);
        
        // Add participant exchanges
        if (coordParticipantIds.length > 0) {
          coordOrConditions.push(`id.in.(${coordParticipantIds.join(',')})`);
        }
        
        if (coordOrConditions.length > 0) {
          query = query.or(coordOrConditions.join(','));
        } else {
          // No conditions matched, return empty
          return { data: [], count: 0 };
        }
        break;

      case 'client':
        // Exchanges where they're client OR participant
        // Check both user.id and user.contact_id for client_id field
        const clientUserId = user.id;
        const clientContactId = user.contact_id;
        
        console.log(`   ✓ Client filter - user ID: ${clientUserId}, contact ID: ${clientContactId}`);
        
        // Get participant exchanges
        console.log(`   🔍 Looking for participants with contact_id: ${clientContactId}`);
        
        // First try with contact_id only (since user_id column might not exist)
        const { data: participantExchanges, error: participantError } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id, contact_id, is_active')
          .eq('contact_id', clientContactId || clientUserId)
          .eq('is_active', true);
        
        if (participantError) {
          console.log(`   ❌ Error fetching participants:`, participantError);
        } else {
          console.log(`   📊 Raw participant query result:`, participantExchanges);
        }
        
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
          .eq('contact_id', tpContactId || tpUserId)
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
        // Agency sees exchanges from all their assigned third parties
        const agencyUserId = user.id;
        const agencyContactId = user.contact_id;
        
        console.log(`   ✓ Agency filter - user ID: ${agencyUserId}, contact ID: ${agencyContactId}`);
        
        // First, find all third parties assigned to this agency
        const { data: thirdPartyAssignments } = await supabaseService.client
          .from('agency_third_party_assignments')
          .select('third_party_contact_id, is_active')
          .eq('agency_contact_id', agencyContactId)  // Use contact ID for agency assignments
          .eq('is_active', true);
        
        if (!thirdPartyAssignments || thirdPartyAssignments.length === 0) {
          console.log('   ❌ No third party assignments found for agency');
          return { data: [], count: 0 };
        }
        
        const thirdPartyContactIds = thirdPartyAssignments.map(a => a.third_party_contact_id);
        console.log(`   ✓ Agency manages ${thirdPartyContactIds.length} third parties: [${thirdPartyContactIds.join(', ')}]`);
        
        // Get all exchanges where the third parties are participants
        const { data: agencyExchanges } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .in('contact_id', thirdPartyContactIds)
          .eq('is_active', true);
        
        const agencyExchangeIds = agencyExchanges?.map(p => p.exchange_id) || [];
        
        console.log(`   ✓ Agency can see ${agencyExchangeIds.length} exchanges: [${agencyExchangeIds.join(', ')}]`);
        
        if (agencyExchangeIds.length > 0) {
          query = query.in('id', agencyExchangeIds);
        } else {
          // Return empty result if no exchanges found
          return { data: [], count: 0 };
        }
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

    console.log(`   📊 RBAC Result: ${data?.length || 0} exchanges returned, total count: ${count}`);

    return { 
      data: data || [], 
      count: count || 0,  // This is the total count from the database
      returnedCount: data?.length || 0  // This is how many were actually returned
    };
  }

  /**
   * Check if user can access a specific exchange
   */
  async canUserAccessExchange(user, exchangeId) {
    if (!user || !exchangeId) return false;

    // Admin can access all
    if (user.role === 'admin') return true;

    // Check if user is a participant with proper permissions
    const { data: participant } = await supabaseService.client
      .from('exchange_participants')
      .select('id, role, permissions, is_active')
      .eq('exchange_id', exchangeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (participant) {
      // User is a participant, they have basic access
      return true;
    }

    // Fall back to role-based check
    const { data: exchanges } = await this.getExchangesForUser(user);
    return exchanges.some(ex => ex.id === exchangeId);
  }

  /**
   * Check if user has a specific permission for an exchange
   */
  async checkExchangePermission(user, exchangeId, permission) {
    if (!user || !exchangeId || !permission) return false;

    // Admin can do everything
    if (user.role === 'admin') return true;

    // Check participant permissions
    const { data: participant } = await supabaseService.client
      .from('exchange_participants')
      .select('id, role, permissions')
      .eq('exchange_id', exchangeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (participant && participant.permissions) {
      let permissions = {};
      try {
        permissions = typeof participant.permissions === 'string' 
          ? JSON.parse(participant.permissions) 
          : participant.permissions;
      } catch (error) {
        console.error('Error parsing participant permissions:', error);
      }

      // Check the specific permission
      return permissions[permission] === true;
    }

    // Check if coordinator has default permissions
    if (user.role === 'coordinator') {
      const { data: exchange } = await supabaseService.client
        .from('exchanges')
        .select('coordinator_id')
        .eq('id', exchangeId)
        .single();

      if (exchange && exchange.coordinator_id === user.id) {
        // Coordinators have all permissions on their exchanges by default
        return true;
      }
    }

    return false;
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

    let query = supabaseService.client.from('tasks').select('*', { count: 'exact' });

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

    const { data, error, count } = await query;

    if (error) {
      console.error('RBAC tasks query error:', error);
      throw error;
    }

    return { data: data || [], count: count || 0 };
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