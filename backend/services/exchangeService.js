const { supabaseAdmin } = require('../config/supabase');

/**
 * Unified Exchange Service
 * Consolidates all exchange-related business logic
 */
class ExchangeService {

  /**
   * Get all exchanges with pagination and filters
   * Now includes role-based filtering based on user assignments
   */
  static async getExchanges(organizationId, filters = {}, pagination = {}, user = null) {
    const { page = 1, limit = 30 } = pagination;
    const offset = (page - 1) * limit;

    console.log(`🔍 ExchangeService.getExchanges called with:`, {
      organizationId,
      userId: user?.id,
      userRole: user?.role,
      page,
      limit,
      offset,
      range: `${offset} to ${offset + parseInt(limit) - 1}`
    });

    try {
      let query = supabaseAdmin
        .from('exchanges')
        .select('*', { count: 'exact' });

      // Apply role-based filtering
      console.log('🔍 ExchangeService.getExchanges - User param:', user ? { id: user.id, role: user.role } : 'NULL/UNDEFINED');
      
      if (!user) {
        console.error('❌ ExchangeService: No user provided - this should not happen!');
        throw new Error('User authentication required');
      }
      
      if (user.role !== 'admin') {
        if (user.role === 'coordinator') {
          // Coordinators see exchanges they coordinate
          query = query.eq('coordinator_id', user.id);
        } else if (user.role === 'agency') {
          // Agencies see exchanges of third parties they're assigned to
          console.log('🔍 Agency user - finding third party exchanges');
          
          // First, get the agency user's contact ID (agencies are in contacts table)
          const { data: agencyUser } = await supabaseAdmin
            .from('users')
            .select('contact_id')
            .eq('id', user.id)
            .single();
          
          if (!agencyUser?.contact_id) {
            console.log('🔍 Agency user has no contact_id');
            return {
              exchanges: [],
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              total_pages: 0
            };
          }
          
          // Get third parties assigned to this agency
          const { data: thirdPartyAssignments } = await supabaseAdmin
            .from('third_party_assignments')
            .select('third_party_id')
            .eq('agency_id', agencyUser.contact_id)
            .eq('is_active', true);
          
          if (!thirdPartyAssignments || thirdPartyAssignments.length === 0) {
            console.log('🔍 Agency has no third party assignments');
            return {
              exchanges: [],
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              total_pages: 0
            };
          }
          
          const thirdPartyIds = thirdPartyAssignments.map(a => a.third_party_id);
          console.log('🔍 Agency has third parties:', thirdPartyIds);
          
          // Get exchanges where these third parties are participants
          const { data: participantData } = await supabaseAdmin
            .from('exchange_participants')
            .select('exchange_id')
            .in('contact_id', thirdPartyIds)
            .eq('is_active', true);
          
          const exchangeIds = [...new Set(participantData?.map(p => p.exchange_id) || [])];
          
          if (exchangeIds.length === 0) {
            console.log('🔍 No exchanges found for agency\'s third parties');
            return {
              exchanges: [],
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              total_pages: 0
            };
          }
          
          console.log(`🔍 Agency can see ${exchangeIds.length} exchanges`);
          query = query.in('id', exchangeIds);
          
        } else if (user.role === 'client' || user.role === 'third_party') {
          // Clients and Third Parties see only exchanges they're directly assigned to
          console.log(`🔍 Filtering exchanges for ${user.role} user: ${user.id}`);
          
          const { data: participantData, error: participantError } = await supabaseAdmin
            .from('exchange_participants')
            .select('exchange_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (participantError) {
            console.error('Error fetching participant exchanges:', participantError);
            throw participantError;
          }
          
          console.log(`🔍 Found ${participantData?.length || 0} participant assignments for user ${user.id}`);

          const exchangeIds = participantData?.map(p => p.exchange_id) || [];
          
          if (exchangeIds.length === 0) {
            // User has no assigned exchanges
            return {
              exchanges: [],
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              total_pages: 0
            };
          }

          query = query.in('id', exchangeIds);
        }
      }
      // Admins see all exchanges (no additional filter needed)

      // Apply filters
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters.coordinator_id) {
        query = query.eq('coordinator_id', filters.coordinator_id);
      }

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters.search) {
        // Search in exchange name, client names, and status
        query = query.or(`exchange_name.ilike.%${filters.search}%,status.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination - Supabase range is inclusive
      // Note: Supabase has a default limit of 1000 rows per query
      const endRange = offset + parseInt(limit) - 1;
      query = query.range(offset, endRange);

      const { data: exchanges, error, count } = await query;

      console.log(`🔍 ExchangeService query result: Found ${exchanges?.length || 0} exchanges, Total count: ${count}`);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Map fields for frontend compatibility without fetching relations (for performance)
      const mappedExchanges = (exchanges || []).map(exchange => ({
        ...exchange,
        name: exchange.exchange_name || exchange.exchangeName,
        exchangeName: exchange.exchange_name || exchange.exchangeName,
        fortyFiveDayDeadline: exchange.day_45_deadline || exchange.identification_deadline,
        oneEightyDayDeadline: exchange.day_180_deadline || exchange.exchange_completion_deadline,
        createdAt: exchange.created_at,
        updatedAt: exchange.updated_at
      }));

      return {
        exchanges: mappedExchanges,
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil((count || 0) / parseInt(limit))
      };

    } catch (error) {
      console.error('ExchangeService.getExchanges error:', error);
      throw error;
    }
  }

  /**
   * Get exchange statistics
   * Now includes role-based filtering
   */
  static async getExchangeStatistics(organizationId, user = null) {
    try {
      console.log('📊 Fetching exchange statistics for user:', user?.id, 'role:', user?.role);
      
      let query = supabaseAdmin.from('exchanges');
      let countQuery = supabaseAdmin.from('exchanges');

      // Apply role-based filtering
      console.log('🔍 ExchangeService.getExchangeStatistics - User param:', user ? { id: user.id, role: user.role } : 'NULL/UNDEFINED');
      
      if (!user) {
        console.error('❌ ExchangeService: No user provided for statistics - this should not happen!');
        throw new Error('User authentication required');
      }
      
      if (user.role !== 'admin') {
        if (user.role === 'coordinator') {
          // Coordinators see stats for exchanges they coordinate
          query = query.select('status, relinquished_sale_price').eq('coordinator_id', user.id);
          countQuery = countQuery.select('*', { count: 'exact', head: true }).eq('coordinator_id', user.id);
        } else if (user.role === 'agency') {
          // Agencies see stats for exchanges of their assigned third parties
          const { data: agencyUser } = await supabaseAdmin
            .from('users')
            .select('contact_id')
            .eq('id', user.id)
            .single();
          
          if (!agencyUser?.contact_id) {
            return {
              total: 0,
              active: 0,
              completed: 0,
              pending: 0,
              cancelled: 0,
              totalValue: 0
            };
          }
          
          // Get third parties assigned to this agency
          const { data: thirdPartyAssignments } = await supabaseAdmin
            .from('third_party_assignments')
            .select('third_party_id')
            .eq('agency_id', agencyUser.contact_id)
            .eq('is_active', true);
          
          if (!thirdPartyAssignments || thirdPartyAssignments.length === 0) {
            return {
              total: 0,
              active: 0,
              completed: 0,
              pending: 0,
              cancelled: 0,
              totalValue: 0
            };
          }
          
          const thirdPartyIds = thirdPartyAssignments.map(a => a.third_party_id);
          
          // Get exchanges where these third parties are participants
          const { data: participantData } = await supabaseAdmin
            .from('exchange_participants')
            .select('exchange_id')
            .in('contact_id', thirdPartyIds)
            .eq('is_active', true);
          
          const exchangeIds = [...new Set(participantData?.map(p => p.exchange_id) || [])];
          
          if (exchangeIds.length === 0) {
            return {
              total: 0,
              active: 0,
              completed: 0,
              pending: 0,
              cancelled: 0,
              totalValue: 0
            };
          }

          query = query.select('status, relinquished_sale_price').in('id', exchangeIds);
          countQuery = countQuery.select('*', { count: 'exact', head: true }).in('id', exchangeIds);
        } else if (user.role === 'client' || user.role === 'third_party') {
          // Get exchange IDs from exchange_participants for direct assignments
          const { data: participantData, error: participantError } = await supabaseAdmin
            .from('exchange_participants')
            .select('exchange_id')
            .eq('user_id', user.id)
            .is('removed_at', null);

          if (participantError) {
            console.error('Error fetching participant exchanges:', participantError);
            throw participantError;
          }

          const exchangeIds = participantData?.map(p => p.exchange_id) || [];
          
          if (exchangeIds.length === 0) {
            // User has no assigned exchanges
            return {
              total: 0,
              active: 0,
              completed: 0,
              pending: 0,
              cancelled: 0,
              totalValue: 0
            };
          }

          query = query.select('status, relinquished_sale_price').in('id', exchangeIds);
          countQuery = countQuery.select('*', { count: 'exact', head: true }).in('id', exchangeIds);
        }
      } else {
        // Admin sees all
        query = query.select('status, relinquished_sale_price');
        countQuery = countQuery.select('*', { count: 'exact', head: true });
      }
      
      // Get the total count
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        console.error('Error getting total count:', countError);
      }

      // Fetch only status and value fields for statistics
      const { data: exchanges, error } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Calculate statistics from the data
      let stats = {
        total: totalCount || 0,
        active: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0
      };

      if (exchanges && exchanges.length > 0) {
        console.log(`📊 Processing ${exchanges.length} exchanges for statistics`);
        
        exchanges.forEach(exchange => {
          // Count by status
          const status = (exchange.status || '').toLowerCase().trim();
          if (status === 'active') stats.active++;
          else if (status === 'completed') stats.completed++;
          else if (status === 'pending') stats.pending++;
          else if (status === 'cancelled') stats.cancelled++;
          
          // Sum exchange values
          if (exchange.relinquished_sale_price) {
            const price = parseFloat(exchange.relinquished_sale_price);
            if (!isNaN(price)) {
              stats.totalValue += price;
            }
          }
        });
        
        // Log sample of statuses for debugging
        const sampleStatuses = exchanges.slice(0, 10).map(e => e.status);
        console.log(`📊 Sample statuses:`, sampleStatuses);
      }

      console.log(`📊 Exchange Statistics:`, stats);
      return stats;
    } catch (error) {
      console.error('ExchangeService.getExchangeStatistics error:', error);
      throw error;
    }
  }

  /**
   * Get single exchange by ID
   */
  static async getExchangeById(exchangeId, organizationId) {
    try {
      const { data: exchange, error } = await supabaseAdmin
        .from('exchanges')
        .select(`
          *,
          client:contacts!exchanges_client_id_fkey(
            id,
            firstName:first_name,
            lastName:last_name,
            email,
            phone
          ),
          coordinator:users!exchanges_coordinator_id_fkey(
            id,
            firstName:first_name,
            lastName:last_name,
            email
          )
        `)
        .eq('id', exchangeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Exchange not found
        }
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Add computed fields
      if (exchange) {
        exchange.name = exchange.exchange_name || exchange.exchangeName;
        exchange.fortyFiveDayDeadline = exchange.day_45_deadline || exchange.identification_deadline;
        exchange.oneEightyDayDeadline = exchange.day_180_deadline || exchange.exchange_completion_deadline;
        exchange.propertySoldAddress = exchange.relinquished_property_address;
        exchange.propertySoldValue = exchange.relinquished_sale_price;
        exchange.propertyBoughtAddress = exchange.replacement_property_address;
        exchange.propertyBoughtValue = exchange.replacement_purchase_price;
        exchange.startDate = exchange.relinquished_closing_date;
        exchange.completionDate = exchange.exchange_completion_deadline;
        exchange.createdAt = exchange.created_at;
        exchange.updatedAt = exchange.updated_at;

        // Fetch participants
        try {
          const ExchangeParticipantService = require('./exchangeParticipantService');
          exchange.participants = await ExchangeParticipantService.getExchangeParticipants(exchangeId);
        } catch (participantError) {
          console.error('Error fetching participants:', participantError);
          exchange.participants = [];
        }
      }

      return exchange;

    } catch (error) {
      console.error('ExchangeService.getExchangeById error:', error);
      throw error;
    }
  }

  /**
   * Create new exchange
   */
  static async createExchange(exchangeData, createdByUserId) {
    try {
      const newExchange = {
        ...exchangeData,
        created_by_user_id: createdByUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: exchangeData.status || 'active'
      };

      const { data: exchange, error } = await supabaseAdmin
        .from('exchanges')
        .insert([newExchange])
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create exchange: ${error.message}`);
      }

      // Log activity
      await this.logActivity(exchange.id, 'exchange_created', 'Exchange created', createdByUserId);

      return exchange;

    } catch (error) {
      console.error('ExchangeService.createExchange error:', error);
      throw error;
    }
  }

  /**
   * Update exchange
   */
  static async updateExchange(exchangeId, updateData, updatedByUserId) {
    try {
      const updates = {
        ...updateData,
        updated_at: new Date().toISOString(),
        updated_by_user_id: updatedByUserId
      };

      const { data: exchange, error } = await supabaseAdmin
        .from('exchanges')
        .update(updates)
        .eq('id', exchangeId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update exchange: ${error.message}`);
      }

      // Log activity
      await this.logActivity(exchangeId, 'exchange_updated', 'Exchange updated', updatedByUserId);

      return exchange;

    } catch (error) {
      console.error('ExchangeService.updateExchange error:', error);
      throw error;
    }
  }

  /**
   * Delete/Archive exchange
   */
  static async deleteExchange(exchangeId, deletedByUserId) {
    try {
      // Soft delete by updating status
      const { data: exchange, error } = await supabaseAdmin
        .from('exchanges')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString(),
          updated_by_user_id: deletedByUserId
        })
        .eq('id', exchangeId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to archive exchange: ${error.message}`);
      }

      // Log activity
      await this.logActivity(exchangeId, 'exchange_archived', 'Exchange archived', deletedByUserId);

      return exchange;

    } catch (error) {
      console.error('ExchangeService.deleteExchange error:', error);
      throw error;
    }
  }

  /**
   * Get exchange timeline/activity
   */
  static async getExchangeTimeline(exchangeId) {
    try {
      const { data: timeline, error } = await supabaseAdmin
        .from('exchange_activities')
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch timeline: ${error.message}`);
      }

      return timeline || [];

    } catch (error) {
      console.error('ExchangeService.getExchangeTimeline error:', error);
      throw error;
    }
  }

  /**
   * Get exchange documents
   */
  static async getExchangeDocuments(exchangeId) {
    try {
      const { data: documents, error } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      return documents || [];

    } catch (error) {
      console.error('ExchangeService.getExchangeDocuments error:', error);
      throw error;
    }
  }


  /**
   * Log exchange activity
   */
  static async logActivity(exchangeId, activityType, description, userId) {
    try {
      const activity = {
        exchange_id: exchangeId,
        activity_type: activityType,
        description,
        user_id: userId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('exchange_activities')
        .insert([activity]);

      if (error) {
        console.warn('Failed to log activity:', error.message);
        // Don't throw error for logging failures
      }

    } catch (error) {
      console.warn('ExchangeService.logActivity error:', error.message);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get exchanges for specific user
   */
  static async getUserExchanges(userId, organizationId, filters = {}) {
    try {
      let query = supabaseAdmin
        .from('exchanges')
        .select('*')
        .eq('organization_id', organizationId);

      // Filter by user role
      query = query.or(`client_id.eq.${userId},coordinator_id.eq.${userId},created_by_user_id.eq.${userId}`);

      // Apply additional filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: exchanges, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user exchanges: ${error.message}`);
      }

      return exchanges || [];

    } catch (error) {
      console.error('ExchangeService.getUserExchanges error:', error);
      throw error;
    }
  }
}

module.exports = ExchangeService;