/**
 * Agency Routes
 * API endpoints for agency role to manage third party assignments and view their portfolio
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const supabaseService = require('../services/supabase');
const rbacService = require('../services/rbacService');

/**
 * GET /api/agency/third-parties
 * Get all third parties assigned to the agency with enhanced performance metrics
 */
router.get('/third-parties', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const agencyContactId = req.user.contact_id || req.user.id;
    
    console.log(`📊 Agency third parties request from: ${req.user.email} (contact_id: ${agencyContactId})`);
    
    // Get third party assignments
    const { data: assignments, error: assignmentsError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        third_party_contact_id,
        is_active,
        performance_score,
        can_view_performance,
        created_at,
        updated_at
      `)
      .eq('agency_contact_id', agencyContactId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (assignmentsError) {
      console.error('Error fetching agency third party assignments:', assignmentsError);
      return res.status(500).json({ error: 'Failed to fetch third party assignments' });
    }
    
    // If no assignments found, return empty result
    if (!assignments || assignments.length === 0) {
      console.log('No third party assignments found for agency');
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    // Get contact details for all third parties
    const contactIds = assignments?.map(a => a.third_party_contact_id) || [];
    const { data: contacts } = await supabaseService.client
      .from('contacts')
      .select('id, first_name, last_name, display_name, email, company, phone_primary, created_at')
      .in('id', contactIds);
    
    // Create contact lookup map
    const contactMap = new Map();
    contacts?.forEach(contact => {
      contactMap.set(contact.id, contact);
    });
    
    // For each third party, get their exchange statistics with enhanced performance metrics
    const thirdPartiesWithStats = await Promise.all(
      (assignments || []).map(async (assignment) => {
        const thirdPartyContactId = assignment.third_party_contact_id;
        const contact = contactMap.get(thirdPartyContactId);
        
        // Get exchanges for this third party with enhanced data
        const { data: participantExchanges } = await supabaseService.client
          .from('exchange_participants')
          .select(`
            exchange_id, 
            role,
            joined_at,
            exchanges!inner(
              id, 
              name, 
              display_name, 
              status, 
              client_name, 
              property_value, 
              relinquished_property_value,
              replacement_property_value,
              exchange_value,
              sale_date,
              identification_deadline,
              exchange_deadline,
              days_remaining,
              completion_percentage,
              created_at, 
              updated_at
            )
          `)
          .eq('contact_id', thirdPartyContactId)
          .eq('is_active', true);
        
        const exchanges = participantExchanges?.map(pe => ({
          ...pe.exchanges,
          participantRole: pe.role,
          joinedAt: pe.joined_at
        })) || [];
        
        // Enhanced statistics calculation
        const assignedExchanges = exchanges.length;
        const activeExchanges = exchanges.filter(ex => 
          ['active', 'in_progress', 'In Progress'].includes(ex.status)
        ).length;
        const completedExchanges = exchanges.filter(ex => 
          ['completed', 'COMPLETED', 'Completed'].includes(ex.status)
        ).length;
        const pendingExchanges = exchanges.filter(ex => 
          ['pending', 'on_hold'].includes(ex.status)
        ).length;
        
        // Calculate performance metrics
        const successRate = assignedExchanges > 0 ? (completedExchanges / assignedExchanges * 100) : 0;
        
        // Calculate total revenue from exchange values
        const totalRevenue = exchanges.reduce((sum, ex) => {
          const value = parseFloat(ex.exchange_value || ex.property_value || '0');
          return sum + value;
        }, 0);
        
        // Average time to completion for completed exchanges
        const completedWithDates = exchanges.filter(ex => 
          ex.status === 'completed' && ex.created_at && ex.updated_at
        );
        const avgCompletionTime = completedWithDates.length > 0 
          ? completedWithDates.reduce((sum, ex) => {
              const days = Math.ceil((new Date(ex.updated_at) - new Date(ex.created_at)) / (1000 * 60 * 60 * 24));
              return sum + days;
            }, 0) / completedWithDates.length
          : 0;
        
        // Upcoming deadlines (within 30 days)
        const upcomingDeadlines = exchanges.filter(ex => 
          ex.days_remaining !== null && ex.days_remaining <= 30 && ex.days_remaining > 0
        ).length;
        
        // Format revenue
        const formattedRevenue = totalRevenue > 1000000 
          ? `$${(totalRevenue / 1000000).toFixed(1)}M`
          : totalRevenue > 1000
          ? `$${(totalRevenue / 1000).toFixed(0)}K`
          : `$${totalRevenue.toFixed(0)}`;
        
        // Get last activity (most recent exchange update)
        const lastActivity = exchanges.length > 0 
          ? exchanges.reduce((latest, ex) => {
              return new Date(ex.updated_at) > new Date(latest.updated_at) ? ex : latest;
            }).updated_at
          : assignment.updated_at;
        
        // Calculate overall performance score
        const performanceScore = assignment.performance_score || Math.round(
          (successRate * 0.4) + 
          (activeExchanges > 0 ? 30 : 0) + 
          (avgCompletionTime > 0 && avgCompletionTime < 45 ? 20 : avgCompletionTime < 60 ? 10 : 0) +
          (upcomingDeadlines === 0 ? 10 : 0)
        );
        
        return {
          id: assignment.third_party_contact_id,
          contact_id: assignment.third_party_contact_id,
          name: contact ? (contact.display_name || `${contact.first_name} ${contact.last_name}`) : 'Unknown Contact',
          email: contact?.email || '',
          company: contact?.company || '',
          phone: contact?.phone_primary || '',
          
          // Assignment details
          assignment_date: assignment.assignment_date || assignment.created_at,
          can_view_performance: assignment.can_view_performance,
          
          // Exchange statistics
          assigned_exchanges: assignedExchanges,
          active_exchanges: activeExchanges,
          completed_exchanges: completedExchanges,
          pending_exchanges: pendingExchanges,
          
          // Performance metrics
          success_rate: Math.round(successRate),
          performance_score: performanceScore,
          total_revenue: formattedRevenue,
          total_revenue_numeric: totalRevenue,
          avg_completion_time: Math.round(avgCompletionTime),
          upcoming_deadlines: upcomingDeadlines,
          
          // Activity tracking
          last_activity: lastActivity,
          status: assignedExchanges > 0 ? 'active' : 'inactive',
          
          // Exchange details for preview
          exchanges: exchanges.slice(0, 5).map(ex => ({
            id: ex.id,
            title: ex.display_name || ex.name,
            client_name: ex.client_name,
            status: ex.status,
            value: ex.exchange_value || ex.property_value,
            days_remaining: ex.days_remaining,
            completion_percentage: ex.completion_percentage,
            created_at: ex.created_at,
            updated_at: ex.updated_at
          }))
        };
      })
    );
    
    // Sort by performance score descending
    thirdPartiesWithStats.sort((a, b) => b.performance_score - a.performance_score);
    
    console.log(`✅ Returning ${thirdPartiesWithStats.length} third parties with enhanced metrics for agency`);
    
    res.json({
      success: true,
      data: thirdPartiesWithStats,
      count: thirdPartiesWithStats.length
    });
    
  } catch (error) {
    console.error('Error in agency third-parties endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch third party data' });
  }
});

/**
 * GET /api/agency/exchanges
 * Get all exchanges visible to the agency (from all assigned third parties)
 */
router.get('/exchanges', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const { third_party_id } = req.query;
    
    console.log(`📊 Agency exchanges request from: ${req.user.email}, filter: ${third_party_id || 'all'}`);
    
    // Use RBAC service to get authorized exchanges
    const options = {
      limit: 100,
      orderBy: { column: 'updated_at', ascending: false }
    };
    
    const exchangesResult = await rbacService.getExchangesForUser(req.user, options);
    let exchanges = exchangesResult.data || [];
    
    // If filtering by specific third party, filter the results
    if (third_party_id) {
      const { data: filteredExchangeIds } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('contact_id', third_party_id)
        .eq('is_active', true);
      
      const allowedIds = filteredExchangeIds?.map(item => item.exchange_id) || [];
      exchanges = exchanges.filter(ex => allowedIds.includes(ex.id));
    }
    
    // Enhance exchanges with third party information
    const enhancedExchanges = await Promise.all(
      exchanges.map(async (exchange) => {
        // Get third party info for this exchange
        const { data: participants } = await supabaseService.client
          .from('exchange_participants')
          .select(`
            contact_id,
            contacts!inner(first_name, last_name, email, company)
          `)
          .eq('exchange_id', exchange.id)
          .eq('is_active', true);
        
        const thirdParty = participants?.[0];
        
        return {
          ...exchange,
          third_party: thirdParty ? {
            id: thirdParty.contact_id,
            name: `${thirdParty.contacts.first_name} ${thirdParty.contacts.last_name}`,
            email: thirdParty.contacts.email,
            company: thirdParty.contacts.company
          } : null
        };
      })
    );
    
    console.log(`✅ Returning ${enhancedExchanges.length} exchanges for agency`);
    
    res.json({
      success: true,
      data: enhancedExchanges,
      count: enhancedExchanges.length,
      total: exchangesResult.count
    });
    
  } catch (error) {
    console.error('Error in agency exchanges endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch agency exchanges' });
  }
});

/**
 * GET /api/agency/third-party/:id/performance
 * Get detailed performance metrics for a specific third party
 */
router.get('/third-party/:id/performance', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const { id } = req.params;
    const agencyContactId = req.user.contact_id || req.user.id;
    
    console.log(`📊 Agency third party performance request for: ${id}`);
    
    // Verify this third party is assigned to the agency
    const { data: assignment } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .eq('agency_contact_id', agencyContactId)
      .eq('third_party_contact_id', id)
      .eq('is_active', true)
      .single();
    
    if (!assignment) {
      return res.status(404).json({ error: 'Third party not found or not assigned to your agency' });
    }
    
    if (!assignment.can_view_performance) {
      return res.status(403).json({ error: 'Permission denied to view performance data for this third party' });
    }
    
    // Get detailed exchange data for performance analysis
    const { data: participantExchanges } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        exchange_id, 
        role,
        joined_at,
        responsiveness_score,
        engagement_score,
        satisfaction_score,
        exchanges!inner(
          id, 
          name, 
          display_name, 
          status, 
          client_name, 
          exchange_value,
          property_value,
          completion_percentage,
          sale_date,
          identification_deadline,
          exchange_deadline,
          days_remaining,
          created_at, 
          updated_at,
          priority,
          risk_level
        )
      `)
      .eq('contact_id', id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });
    
    const exchanges = participantExchanges?.map(pe => ({
      ...pe.exchanges,
      participantRole: pe.role,
      joinedAt: pe.joined_at,
      responsiveness_score: pe.responsiveness_score,
      engagement_score: pe.engagement_score,
      satisfaction_score: pe.satisfaction_score
    })) || [];
    
    // Calculate comprehensive performance metrics
    const totalExchanges = exchanges.length;
    const activeExchanges = exchanges.filter(ex => ['active', 'in_progress', 'In Progress'].includes(ex.status)).length;
    const completedExchanges = exchanges.filter(ex => ['completed', 'COMPLETED', 'Completed'].includes(ex.status)).length;
    const cancelledExchanges = exchanges.filter(ex => ['cancelled', 'failed'].includes(ex.status)).length;
    
    // Time-based analysis
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyExchanges = exchanges.filter(ex => {
      const created = new Date(ex.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }).length;
    
    // Risk analysis
    const highRiskExchanges = exchanges.filter(ex => ex.risk_level === 'high').length;
    const criticalDeadlines = exchanges.filter(ex => ex.days_remaining !== null && ex.days_remaining <= 7).length;
    
    // Financial performance
    const totalRevenue = exchanges.reduce((sum, ex) => sum + parseFloat(ex.exchange_value || ex.property_value || '0'), 0);
    const averageDealSize = totalExchanges > 0 ? totalRevenue / totalExchanges : 0;
    
    // Completion rate trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthExchanges = exchanges.filter(ex => {
        const created = new Date(ex.created_at);
        return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
      });
      const completed = monthExchanges.filter(ex => ['completed', 'COMPLETED'].includes(ex.status));
      
      monthlyTrends.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        total: monthExchanges.length,
        completed: completed.length,
        completion_rate: monthExchanges.length > 0 ? Math.round((completed.length / monthExchanges.length) * 100) : 0
      });
    }
    
    // Performance scores (from exchange participants)
    const scores = exchanges.filter(ex => ex.responsiveness_score || ex.engagement_score || ex.satisfaction_score);
    const avgResponsiveness = scores.length > 0 ? Math.round(scores.reduce((sum, ex) => sum + (ex.responsiveness_score || 0), 0) / scores.length) : null;
    const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((sum, ex) => sum + (ex.engagement_score || 0), 0) / scores.length) : null;
    const avgSatisfaction = scores.length > 0 ? Math.round(scores.reduce((sum, ex) => sum + (ex.satisfaction_score || 0), 0) / scores.length) : null;
    
    const performanceData = {
      overview: {
        total_exchanges: totalExchanges,
        active_exchanges: activeExchanges,
        completed_exchanges: completedExchanges,
        cancelled_exchanges: cancelledExchanges,
        success_rate: totalExchanges > 0 ? Math.round((completedExchanges / totalExchanges) * 100) : 0,
        monthly_exchanges: monthlyExchanges
      },
      financial: {
        total_revenue: totalRevenue,
        average_deal_size: averageDealSize,
        formatted_total_revenue: totalRevenue > 1000000 ? `$${(totalRevenue / 1000000).toFixed(1)}M` : `$${(totalRevenue / 1000).toFixed(0)}K`,
        formatted_average_deal: averageDealSize > 1000000 ? `$${(averageDealSize / 1000000).toFixed(1)}M` : `$${(averageDealSize / 1000).toFixed(0)}K`
      },
      risk_management: {
        high_risk_exchanges: highRiskExchanges,
        critical_deadlines: criticalDeadlines,
        risk_percentage: totalExchanges > 0 ? Math.round((highRiskExchanges / totalExchanges) * 100) : 0
      },
      performance_scores: {
        responsiveness: avgResponsiveness,
        engagement: avgEngagement,
        satisfaction: avgSatisfaction,
        overall_score: assignment.performance_score || Math.round(((avgResponsiveness || 70) + (avgEngagement || 70) + (avgSatisfaction || 70)) / 3)
      },
      trends: {
        monthly_completion: monthlyTrends,
        trend_direction: monthlyTrends.length >= 2 ? (
          monthlyTrends[monthlyTrends.length - 1].completion_rate > monthlyTrends[monthlyTrends.length - 2].completion_rate ? 'up' : 'down'
        ) : 'stable'
      },
      recent_exchanges: exchanges.slice(0, 10).map(ex => ({
        id: ex.id,
        title: ex.display_name || ex.name,
        client_name: ex.client_name,
        status: ex.status,
        value: ex.exchange_value || ex.property_value,
        completion_percentage: ex.completion_percentage,
        days_remaining: ex.days_remaining,
        priority: ex.priority,
        risk_level: ex.risk_level,
        created_at: ex.created_at,
        updated_at: ex.updated_at
      }))
    };
    
    res.json({
      success: true,
      data: performanceData
    });
    
  } catch (error) {
    console.error('Error in agency third party performance endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

/**
 * POST /api/agency/assign-third-party
 * Admin endpoint to assign a third party to an agency
 */
router.post('/assign-third-party', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agency_contact_id, third_party_contact_id, can_view_performance = true } = req.body;
    
    if (!agency_contact_id || !third_party_contact_id) {
      return res.status(400).json({ error: 'Agency contact ID and third party contact ID are required' });
    }
    
    console.log(`📊 Admin assigning third party ${third_party_contact_id} to agency ${agency_contact_id}`);
    
    // Verify agency and third party exist
    const { data: agency } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, contact_type')
      .eq('id', agency_contact_id)
      .single();
    
    const { data: thirdParty } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, contact_type')
      .eq('id', third_party_contact_id)
      .single();
    
    // Verify the contacts have the correct types
    if (!agency || !agency.contact_type?.includes('agency')) {
      return res.status(404).json({ error: 'Agency not found or contact is not an agency type' });
    }
    
    if (!thirdParty || !thirdParty.contact_type?.includes('third_party')) {
      return res.status(404).json({ error: 'Third party not found or contact is not a third party type' });
    }
    
    // Create or update assignment
    const { data, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .upsert({
        agency_contact_id,
        third_party_contact_id,
        assigned_by: req.user.id,
        can_view_performance,
        is_active: true,
        performance_score: 75 // Default score
      }, {
        onConflict: 'agency_contact_id,third_party_contact_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
    
    console.log(`✅ Created assignment: ${thirdParty.display_name || thirdParty.first_name + ' ' + thirdParty.last_name} → ${agency.display_name || agency.first_name + ' ' + agency.last_name}`);
    
    // Send notifications to both agency and third party
    try {
      const notificationService = require('../services/notifications');
      
      // Notify the agency
      const { data: agencyUsers } = await supabaseService.client
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('contact_id', agency_contact_id)
        .eq('role', 'agency');
      
      for (const agencyUser of (agencyUsers || [])) {
        await notificationService.createNotification({
          user_id: agencyUser.id,
          title: 'New Third Party Assignment',
          message: `${thirdParty.display_name || thirdParty.first_name + ' ' + thirdParty.last_name} has been assigned to your agency for performance monitoring.`,
          type: 'assignment',
          reference_id: data.id,
          reference_type: 'agency_assignment',
          priority: 'normal'
        });
      }
      
      // Notify the third party
      const { data: thirdPartyUsers } = await supabaseService.client
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('contact_id', third_party_contact_id)
        .eq('role', 'third_party');
      
      for (const thirdPartyUser of (thirdPartyUsers || [])) {
        await notificationService.createNotification({
          user_id: thirdPartyUser.id,
          title: 'Agency Assignment',
          message: `You have been assigned to ${agency.display_name || agency.first_name + ' ' + agency.last_name} for performance monitoring.`,
          type: 'assignment',
          reference_id: data.id,
          reference_type: 'agency_assignment',
          priority: 'normal'
        });
      }
      
      console.log('📧 Notifications sent to agency and third party');
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the assignment if notifications fail
    }
    
    res.json({
      success: true,
      data: {
        ...data,
        agency_name: agency.display_name || `${agency.first_name} ${agency.last_name}`,
        third_party_name: thirdParty.display_name || `${thirdParty.first_name} ${thirdParty.last_name}`
      }
    });
    
  } catch (error) {
    console.error('Error in assign-third-party endpoint:', error);
    res.status(500).json({ error: 'Failed to assign third party' });
  }
});

/**
 * DELETE /api/agency/assign-third-party
 * Admin endpoint to remove third party assignment from agency
 */
router.delete('/assign-third-party', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agency_contact_id, third_party_contact_id } = req.body;
    
    if (!agency_contact_id || !third_party_contact_id) {
      return res.status(400).json({ error: 'Agency contact ID and third party contact ID are required' });
    }
    
    console.log(`📊 Admin removing third party ${third_party_contact_id} from agency ${agency_contact_id}`);
    
    // Deactivate assignment instead of deleting for audit trail
    const { data, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('agency_contact_id', agency_contact_id)
      .eq('third_party_contact_id', third_party_contact_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error removing assignment:', error);
      return res.status(500).json({ error: 'Failed to remove assignment' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    console.log(`✅ Removed assignment successfully`);
    
    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
    
  } catch (error) {
    console.error('Error in remove assignment endpoint:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

/**
 * GET /api/agency/assignments
 * Admin endpoint to get all agency-third party assignments
 */
router.get('/assignments', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`📊 Admin requesting all agency assignments`);
    
    // Get all assignments first
    const { data: assignments, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
    
    // If no assignments, return empty
    if (!assignments || assignments.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    // Get all unique contact IDs
    const contactIds = new Set();
    const userIds = new Set();
    
    assignments.forEach(assignment => {
      contactIds.add(assignment.agency_contact_id);
      contactIds.add(assignment.third_party_contact_id);
      if (assignment.assigned_by) {
        userIds.add(assignment.assigned_by);
      }
    });
    
    // Fetch contacts
    const { data: contacts } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, email, company')
      .in('id', Array.from(contactIds));
    
    // Fetch users
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(userIds));
    
    // Create lookup maps
    const contactMap = new Map();
    contacts?.forEach(contact => {
      contactMap.set(contact.id, contact);
    });
    
    const userMap = new Map();
    users?.forEach(user => {
      userMap.set(user.id, user);
    });
    
    // Format the response
    const formattedAssignments = assignments?.map(assignment => {
      const agencyContact = contactMap.get(assignment.agency_contact_id);
      const thirdPartyContact = contactMap.get(assignment.third_party_contact_id);
      const assignedByUser = assignment.assigned_by ? userMap.get(assignment.assigned_by) : null;
      
      return {
        id: assignment.id,
        agency_contact_id: assignment.agency_contact_id,
        third_party_contact_id: assignment.third_party_contact_id,
        agency_name: agencyContact?.display_name || 
                    (agencyContact ? `${agencyContact.first_name} ${agencyContact.last_name}` : 'Unknown Agency'),
        agency_email: agencyContact?.email,
        agency_company: agencyContact?.company,
        third_party_name: thirdPartyContact?.display_name || 
                         (thirdPartyContact ? `${thirdPartyContact.first_name} ${thirdPartyContact.last_name}` : 'Unknown Third Party'),
        third_party_email: thirdPartyContact?.email,
        third_party_company: thirdPartyContact?.company,
        assigned_by: assignedByUser ? 
                     `${assignedByUser.first_name} ${assignedByUser.last_name}` : 'System',
        assignment_date: assignment.assignment_date || assignment.created_at,
        can_view_performance: assignment.can_view_performance,
        performance_score: assignment.performance_score,
        created_at: assignment.created_at
      };
    }) || [];
    
    console.log(`✅ Returning ${formattedAssignments.length} assignments`);
    
    res.json({
      success: true,
      data: formattedAssignments,
      count: formattedAssignments.length
    });
    
  } catch (error) {
    console.error('Error in assignments endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/agency/contacts
 * Admin endpoint to get agencies and third parties for assignment
 */
router.get('/contacts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.query;
    
    console.log(`📊 Admin requesting contacts of type: ${type || 'all'}`);
    
    let contactTypeFilter = [];
    if (type === 'agency') {
      contactTypeFilter = ['agency'];
    } else if (type === 'third_party') {
      contactTypeFilter = ['third_party'];
    }
    
    const { data: contacts, error } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, email, company, contact_type, created_at')
      .order('display_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }
    
    // Filter out contacts that don't have the right type (in case contains doesn't work as expected)
    const filteredContacts = contacts?.filter(contact => {
      if (type === 'agency') {
        return contact.contact_type?.includes('agency');
      } else if (type === 'third_party') {
        return contact.contact_type?.includes('third_party');
      }
      return true; // Return all if no type filter
    }) || [];
    
    console.log(`✅ Returning ${filteredContacts.length} contacts`);
    
    res.json({
      success: true,
      data: filteredContacts,
      count: filteredContacts.length
    });
    
  } catch (error) {
    console.error('Error in contacts endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/agency/stats
 * Get agency dashboard statistics
 */
router.get('/stats', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    console.log(`📊 Agency stats request from: ${req.user.email}`);
    
    const agencyContactId = req.user.contact_id || req.user.id;
    
    // Get third party count
    const { data: thirdParties, error: tpError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('third_party_contact_id')
      .eq('agency_contact_id', agencyContactId)
      .eq('is_active', true);
    
    if (tpError) {
      console.error('Error fetching third parties for stats:', tpError);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
    
    const totalThirdParties = thirdParties?.length || 0;
    const thirdPartyContactIds = thirdParties?.map(tp => tp.third_party_contact_id) || [];
    
    // Get exchanges for all third parties
    let totalExchanges = 0;
    let activeExchanges = 0;
    let completedExchanges = 0;
    let totalRevenue = 0;
    
    if (thirdPartyContactIds.length > 0) {
      const { data: exchanges } = await supabaseService.client
        .from('exchange_participants')
        .select(`
          exchange_id,
          exchanges!inner(id, status, property_value)
        `)
        .in('contact_id', thirdPartyContactIds)
        .eq('is_active', true);
      
      const uniqueExchanges = Array.from(
        new Map(exchanges?.map(item => [item.exchanges.id, item.exchanges]) || []).values()
      );
      
      totalExchanges = uniqueExchanges.length;
      activeExchanges = uniqueExchanges.filter(ex => ex.status === 'active' || ex.status === 'In Progress').length;
      completedExchanges = uniqueExchanges.filter(ex => ex.status === 'completed' || ex.status === 'COMPLETED').length;
      totalRevenue = uniqueExchanges.reduce((sum, ex) => sum + parseFloat(ex.property_value || '0'), 0);
    }
    
    const stats = {
      totalThirdParties,
      totalExchanges,
      activeExchanges,
      completedExchanges,
      pendingExchanges: totalExchanges - activeExchanges - completedExchanges,
      totalRevenue,
      formattedRevenue: totalRevenue > 1000000 
        ? `$${(totalRevenue / 1000000).toFixed(1)}M`
        : `$${(totalRevenue / 1000).toFixed(0)}K`,
      successRate: totalExchanges > 0 ? Math.round((completedExchanges / totalExchanges) * 100) : 0
    };
    
    console.log(`✅ Agency stats:`, stats);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error in agency stats endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch agency statistics' });
  }
});

module.exports = router;