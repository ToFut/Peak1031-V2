/**
 * Agency Service
 * Professional service layer for agency management
 * Handles all business logic for agency operations
 */

const supabaseService = require('./supabase');
const AuditService = require('./audit');
const notificationService = require('./notifications');
const { v4: uuidv4 } = require('uuid');

class AgencyService {
  /**
   * Get all agencies with detailed information
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Agencies data with pagination
   */
  async getAllAgencies(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'desc',
        includeStats = true
      } = options;

      const offset = (page - 1) * limit;

      // Build base query
      let query = supabaseService.client
        .from('contacts')
        .select('*', { count: 'exact' });

      // Filter for agency type
      query = query.ilike('contact_type', '%agency%');

      // Apply search if provided
      if (search) {
        query = query.or(`display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: agencies, error, count } = await query;

      if (error) throw error;

      // Enhance with statistics if requested
      let enhancedAgencies = agencies || [];
      if (includeStats && agencies?.length > 0) {
        enhancedAgencies = await this.enhanceAgenciesWithStats(agencies);
      }

      return {
        success: true,
        data: enhancedAgencies,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error in getAllAgencies:', error);
      throw error;
    }
  }

  /**
   * Get single agency by ID with full details
   * @param {string} agencyId - Agency contact ID
   * @returns {Promise<Object>} Agency details
   */
  async getAgencyById(agencyId) {
    try {
      // Get agency contact
      const { data: agency, error } = await supabaseService.client
        .from('contacts')
        .select('*')
        .eq('id', agencyId)
        .single();

      if (error) throw error;
      if (!agency) throw new Error('Agency not found');

      // Get agency users
      const { data: users } = await supabaseService.client
        .from('users')
        .select('*')
        .eq('contact_id', agencyId)
        .eq('role', 'agency');

      // Get assigned third parties
      const { data: assignments } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select(`
          *,
          third_party:contacts!third_party_contact_id(*)
        `)
        .eq('agency_contact_id', agencyId)
        .eq('is_active', true);

      // Get performance metrics
      const stats = await this.getAgencyStats(agencyId);

      return {
        success: true,
        data: {
          ...agency,
          users: users || [],
          third_parties: assignments?.map(a => ({
            ...a.third_party,
            assignment_id: a.id,
            performance_score: a.performance_score,
            can_view_performance: a.can_view_performance
          })) || [],
          stats
        }
      };
    } catch (error) {
      console.error('Error in getAgencyById:', error);
      throw error;
    }
  }

  /**
   * Create a new agency with user account
   * @param {Object} agencyData - Agency information
   * @param {Object} userData - User account information
   * @returns {Promise<Object>} Created agency and user
   */
  async createAgency(agencyData, userData) {
    try {
      // Start transaction-like operation
      const results = {};

      // 1. Create contact for agency
      const contactData = {
        id: uuidv4(),
        first_name: agencyData.first_name,
        last_name: agencyData.last_name,
        display_name: agencyData.display_name || `${agencyData.first_name} ${agencyData.last_name}`,
        email: agencyData.email,
        company: agencyData.company,
        phone_primary: agencyData.phone,
        address: agencyData.address,
        city: agencyData.city,
        state: agencyData.state,
        zip: agencyData.zip,
        contact_type: ['agency'],
        status: 'active',
        metadata: {
          created_by: 'admin',
          creation_source: 'agency_management',
          ...agencyData.metadata
        }
      };

      const { data: contact, error: contactError } = await supabaseService.client
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (contactError) throw contactError;
      results.contact = contact;

      // 2. Create user account if userData provided
      if (userData && userData.email) {
        const userAccountData = {
          id: uuidv4(),
          email: userData.email,
          first_name: userData.first_name || agencyData.first_name,
          last_name: userData.last_name || agencyData.last_name,
          role: 'agency',
          contact_id: contact.id,
          status: 'active',
          permissions: userData.permissions || {
            can_view_third_parties: true,
            can_view_performance: true,
            can_manage_assignments: false
          }
        };

        // Create auth user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseService.client.auth.admin.createUser({
          email: userData.email,
          password: userData.password || this.generateSecurePassword(),
          email_confirm: true,
          user_metadata: {
            first_name: userAccountData.first_name,
            last_name: userAccountData.last_name,
            role: 'agency'
          }
        });

        if (authError) throw authError;

        // Link auth user to our users table
        userAccountData.id = authUser.user.id;
        
        const { data: user, error: userError } = await supabaseService.client
          .from('users')
          .insert(userAccountData)
          .select()
          .single();

        if (userError) throw userError;
        results.user = user;

        // Send welcome email
        await notificationService.sendAgencyWelcomeEmail({
          email: userData.email,
          name: `${userData.first_name} ${userData.last_name}`,
          temporaryPassword: userData.password || 'ChangeMe123!',
          loginUrl: process.env.FRONTEND_URL + '/login'
        });
      }

      // 3. Log audit event
      await AuditService.log({
        action: 'agency.created',
        entity_type: 'agency',
        entity_id: contact.id,
        details: {
          agency_name: contact.display_name,
          created_with_user: !!results.user
        }
      });

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error in createAgency:', error);
      throw error;
    }
  }

  /**
   * Update agency information
   * @param {string} agencyId - Agency contact ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated agency
   */
  async updateAgency(agencyId, updates) {
    try {
      const { data: existing } = await supabaseService.client
        .from('contacts')
        .select('*')
        .eq('id', agencyId)
        .single();

      if (!existing) throw new Error('Agency not found');

      // Update contact
      const { data: updated, error } = await supabaseService.client
        .from('contacts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', agencyId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await AuditService.log({
        action: 'agency.updated',
        entity_type: 'agency',
        entity_id: agencyId,
        details: {
          changes: updates,
          previous: existing
        }
      });

      return {
        success: true,
        data: updated
      };
    } catch (error) {
      console.error('Error in updateAgency:', error);
      throw error;
    }
  }

  /**
   * Delete or deactivate an agency
   * @param {string} agencyId - Agency contact ID
   * @param {boolean} hardDelete - Whether to permanently delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAgency(agencyId, hardDelete = false) {
    try {
      if (hardDelete) {
        // Permanent deletion
        const { error } = await supabaseService.client
          .from('contacts')
          .delete()
          .eq('id', agencyId);

        if (error) throw error;
      } else {
        // Soft delete - deactivate
        const { error } = await supabaseService.client
          .from('contacts')
          .update({
            status: 'inactive',
            deactivated_at: new Date().toISOString()
          })
          .eq('id', agencyId);

        if (error) throw error;

        // Deactivate all users
        await supabaseService.client
          .from('users')
          .update({ status: 'inactive' })
          .eq('contact_id', agencyId);

        // Deactivate all assignments
        await supabaseService.client
          .from('agency_third_party_assignments')
          .update({ is_active: false })
          .eq('agency_contact_id', agencyId);
      }

      // Log audit event
      await AuditService.log({
        action: hardDelete ? 'agency.deleted' : 'agency.deactivated',
        entity_type: 'agency',
        entity_id: agencyId
      });

      return {
        success: true,
        message: hardDelete ? 'Agency deleted successfully' : 'Agency deactivated successfully'
      };
    } catch (error) {
      console.error('Error in deleteAgency:', error);
      throw error;
    }
  }

  /**
   * Assign third parties to an agency
   * @param {string} agencyId - Agency contact ID
   * @param {Array<string>} thirdPartyIds - Third party contact IDs
   * @param {Object} options - Assignment options
   * @returns {Promise<Object>} Assignment results
   */
  async assignThirdParties(agencyId, thirdPartyIds, options = {}) {
    try {
      const { 
        can_view_performance = true,
        can_assign_exchanges = false,
        assigned_by = null 
      } = options;

      const assignments = thirdPartyIds.map(tpId => ({
        agency_contact_id: agencyId,
        third_party_contact_id: tpId,
        assigned_by,
        can_view_performance,
        can_assign_exchanges,
        is_active: true,
        performance_score: 75 // Default score
      }));

      const { data, error } = await supabaseService.client
        .from('agency_third_party_assignments')
        .upsert(assignments, {
          onConflict: 'agency_contact_id,third_party_contact_id'
        })
        .select();

      if (error) throw error;

      // Send notifications
      await this.sendAssignmentNotifications(agencyId, thirdPartyIds);

      // Log audit event
      await AuditService.log({
        action: 'agency.third_parties_assigned',
        entity_type: 'agency',
        entity_id: agencyId,
        details: {
          third_party_ids: thirdPartyIds,
          assignment_count: data.length
        }
      });

      return {
        success: true,
        data,
        message: `Successfully assigned ${data.length} third parties`
      };
    } catch (error) {
      console.error('Error in assignThirdParties:', error);
      throw error;
    }
  }

  /**
   * Remove third party assignments from an agency
   * @param {string} agencyId - Agency contact ID
   * @param {Array<string>} thirdPartyIds - Third party contact IDs to remove
   * @returns {Promise<Object>} Removal result
   */
  async removeThirdParties(agencyId, thirdPartyIds) {
    try {
      const { error } = await supabaseService.client
        .from('agency_third_party_assignments')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('agency_contact_id', agencyId)
        .in('third_party_contact_id', thirdPartyIds);

      if (error) throw error;

      // Log audit event
      await AuditService.log({
        action: 'agency.third_parties_removed',
        entity_type: 'agency',
        entity_id: agencyId,
        details: {
          third_party_ids: thirdPartyIds
        }
      });

      return {
        success: true,
        message: `Successfully removed ${thirdPartyIds.length} third party assignments`
      };
    } catch (error) {
      console.error('Error in removeThirdParties:', error);
      throw error;
    }
  }

  /**
   * Get agency statistics
   * @param {string} agencyId - Agency contact ID
   * @returns {Promise<Object>} Agency statistics
   */
  async getAgencyStats(agencyId) {
    try {
      // Get third party count
      const { count: thirdPartyCount } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('agency_contact_id', agencyId)
        .eq('is_active', true);

      // Get user count
      const { count: userCount } = await supabaseService.client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', agencyId)
        .eq('status', 'active');

      // Get exchange statistics through third parties
      const { data: assignments } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select('third_party_contact_id')
        .eq('agency_contact_id', agencyId)
        .eq('is_active', true);

      let exchangeStats = {
        total: 0,
        active: 0,
        completed: 0,
        totalValue: 0
      };

      if (assignments?.length > 0) {
        const thirdPartyIds = assignments.map(a => a.third_party_contact_id);
        
        const { data: exchanges } = await supabaseService.client
          .from('exchange_participants')
          .select(`
            exchanges!inner(
              id,
              status,
              property_value,
              exchange_value
            )
          `)
          .in('contact_id', thirdPartyIds)
          .eq('is_active', true);

        if (exchanges) {
          const uniqueExchanges = new Map();
          exchanges.forEach(ep => {
            if (ep.exchanges) {
              uniqueExchanges.set(ep.exchanges.id, ep.exchanges);
            }
          });

          const exchangeArray = Array.from(uniqueExchanges.values());
          exchangeStats.total = exchangeArray.length;
          exchangeStats.active = exchangeArray.filter(e => 
            ['active', 'in_progress'].includes(e.status?.toLowerCase())
          ).length;
          exchangeStats.completed = exchangeArray.filter(e => 
            e.status?.toLowerCase() === 'completed'
          ).length;
          exchangeStats.totalValue = exchangeArray.reduce((sum, e) => 
            sum + parseFloat(e.exchange_value || e.property_value || 0), 0
          );
        }
      }

      return {
        third_parties: thirdPartyCount || 0,
        users: userCount || 0,
        exchanges: exchangeStats,
        performance: {
          average_score: 75, // Calculate from assignments
          success_rate: exchangeStats.total > 0 
            ? Math.round((exchangeStats.completed / exchangeStats.total) * 100) 
            : 0
        }
      };
    } catch (error) {
      console.error('Error in getAgencyStats:', error);
      return {
        third_parties: 0,
        users: 0,
        exchanges: { total: 0, active: 0, completed: 0, totalValue: 0 },
        performance: { average_score: 0, success_rate: 0 }
      };
    }
  }

  /**
   * Enhance agencies with statistics
   * @private
   */
  async enhanceAgenciesWithStats(agencies) {
    try {
      const enhancedAgencies = await Promise.all(
        agencies.map(async (agency) => {
          const stats = await this.getAgencyStats(agency.id);
          return {
            ...agency,
            stats
          };
        })
      );
      return enhancedAgencies;
    } catch (error) {
      console.error('Error enhancing agencies with stats:', error);
      return agencies;
    }
  }

  /**
   * Send assignment notifications
   * @private
   */
  async sendAssignmentNotifications(agencyId, thirdPartyIds) {
    try {
      // Get agency details
      const { data: agency } = await supabaseService.client
        .from('contacts')
        .select('display_name, email')
        .eq('id', agencyId)
        .single();

      // Get third party details
      const { data: thirdParties } = await supabaseService.client
        .from('contacts')
        .select('id, display_name, email')
        .in('id', thirdPartyIds);

      // Send notifications to agency users
      const { data: agencyUsers } = await supabaseService.client
        .from('users')
        .select('id')
        .eq('contact_id', agencyId);

      for (const user of (agencyUsers || [])) {
        await notificationService.createNotification({
          user_id: user.id,
          title: 'New Third Party Assignments',
          message: `${thirdParties?.length || 0} third parties have been assigned to your agency`,
          type: 'assignment',
          priority: 'normal'
        });
      }

      // Send notifications to third party users
      for (const tp of (thirdParties || [])) {
        const { data: tpUsers } = await supabaseService.client
          .from('users')
          .select('id')
          .eq('contact_id', tp.id);

        for (const user of (tpUsers || [])) {
          await notificationService.createNotification({
            user_id: user.id,
            title: 'Agency Assignment',
            message: `You have been assigned to ${agency?.display_name || 'an agency'} for performance monitoring`,
            type: 'assignment',
            priority: 'normal'
          });
        }
      }
    } catch (error) {
      console.error('Error sending assignment notifications:', error);
    }
  }

  /**
   * Generate secure password
   * @private
   */
  generateSecurePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Bulk import agencies from CSV/JSON
   * @param {Array} agenciesData - Array of agency data
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async bulkImportAgencies(agenciesData, options = {}) {
    try {
      const { createUsers = false, sendWelcomeEmails = false } = options;
      const results = {
        success: [],
        failed: [],
        total: agenciesData.length
      };

      for (const agencyData of agenciesData) {
        try {
          const userData = createUsers && agencyData.email ? {
            email: agencyData.email,
            first_name: agencyData.first_name,
            last_name: agencyData.last_name,
            password: this.generateSecurePassword()
          } : null;

          const result = await this.createAgency(agencyData, userData);
          results.success.push({
            agency: agencyData.display_name || `${agencyData.first_name} ${agencyData.last_name}`,
            id: result.data.contact.id
          });
        } catch (error) {
          results.failed.push({
            agency: agencyData.display_name || `${agencyData.first_name} ${agencyData.last_name}`,
            error: error.message
          });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error in bulkImportAgencies:', error);
      throw error;
    }
  }

  /**
   * Enhance agencies with statistics
   * @param {Array} agencies - Array of agency contacts
   * @returns {Promise<Array>} Enhanced agencies with stats
   */
  async enhanceAgenciesWithStats(agencies) {
    try {
      console.log('Enhancing agencies with stats...');
      
      const enhancedAgencies = await Promise.all(
        agencies.map(async (agency) => {
          try {
            // Get agency users count
            const { data: users } = await supabaseService.client
              .from('users')
              .select('id')
              .eq('contact_id', agency.id)
              .eq('role', 'agency');

            // Get third party assignments
            const { data: assignments } = await supabaseService.client
              .from('agency_third_party_assignments')
              .select('third_party_contact_id')
              .eq('agency_contact_id', agency.id)
              .eq('is_active', true);

            // For now, return basic stats
            const stats = {
              third_parties: assignments?.length || 0,
              users: users?.length || 0,
              exchanges: {
                total: 0,
                active: 0,
                completed: 0,
                totalValue: 0
              },
              performance: {
                average_score: 0,
                success_rate: 0
              }
            };

            return {
              ...agency,
              stats
            };
          } catch (error) {
            console.error(`Error enhancing agency ${agency.id}:`, error);
            // Return agency without stats if enhancement fails
            return agency;
          }
        })
      );

      return enhancedAgencies;
    } catch (error) {
      console.error('Error in enhanceAgenciesWithStats:', error);
      // Return original agencies if enhancement fails completely
      return agencies;
    }
  }
}

module.exports = new AgencyService();