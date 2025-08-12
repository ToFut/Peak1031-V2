/**
 * Role-Based Access Control Middleware
 * Ensures users only access data they're authorized to see
 */

const supabaseService = require('../services/supabase');

/**
 * Apply role-based filtering to exchange queries
 */
async function applyExchangeFilters(query, user) {
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log(`🔒 Applying RBAC filters for ${user.role} user: ${user.email}`);

  switch (user.role) {
    case 'admin':
      // Admins see everything - no filter
      console.log('   ✓ Admin access - no filters applied');
      return query;

    case 'coordinator':
      // Coordinators only see exchanges they manage
      console.log('   ✓ Coordinator filter - only assigned exchanges');
      return query.eq('coordinator_id', user.id);

    case 'client':
      // Clients see exchanges where they're the client OR a participant
      const clientContactId = user.contact_id || user.id;
      
      // Get participant exchanges
      const { data: participantExchanges } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('contact_id', clientContactId)
        .eq('is_active', true);
      
      const participantIds = participantExchanges?.map(p => p.exchange_id) || [];
      
      console.log(`   ✓ Client filter - ${participantIds.length} participant exchanges`);
      
      if (participantIds.length > 0) {
        return query.or(`client_id.eq.${clientContactId},id.in.(${participantIds.join(',')})`);
      } else {
        return query.eq('client_id', clientContactId);
      }

    case 'third_party':
      // Third parties only see exchanges they're participants in
      const tpContactId = user.contact_id || user.id;
      
      const { data: tpExchanges } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('contact_id', tpContactId)
        .eq('is_active', true);
      
      const tpIds = tpExchanges?.map(p => p.exchange_id) || [];
      
      console.log(`   ✓ Third party filter - ${tpIds.length} participant exchanges only`);
      
      if (tpIds.length > 0) {
        return query.in('id', tpIds);
      } else {
        // No exchanges - return impossible condition
        return query.eq('id', '00000000-0000-0000-0000-000000000000');
      }

    case 'agency':
      // Agencies see exchanges for their managed clients
      // TODO: Implement agency client relationship
      console.log('   ⚠️ Agency filter not fully implemented');
      return query;

    default:
      console.log(`   ❌ Unknown role: ${user.role} - denying access`);
      // Unknown role - deny all access
      return query.eq('id', '00000000-0000-0000-0000-000000000000');
  }
}

/**
 * Middleware to enforce role-based access
 */
function enforceRBAC(resourceType) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Store the RBAC filter function on the request for use in routes
      req.applyRBACFilter = async (query) => {
        switch (resourceType) {
          case 'exchanges':
            return await applyExchangeFilters(query, req.user);
          
          case 'tasks':
            // TODO: Implement task filtering
            return query;
          
          case 'documents':
            // TODO: Implement document filtering
            return query;
          
          case 'messages':
            // TODO: Implement message filtering
            return query;
          
          default:
            return query;
        }
      };

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of roles that are allowed access
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied: ${req.user.role} not in allowed roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
}

module.exports = {
  enforceRBAC,
  applyExchangeFilters,
  requireRole
};