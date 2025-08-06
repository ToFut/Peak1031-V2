// Updated buildExchangeWhereClause function that uses user.contact_id

/**
 * Helper function to build where clause based on user role and filters
 */
async function buildExchangeWhereClause(user, filters) {
  const whereClause = {};
  const { Op } = require('sequelize');
  
  // Base active filter
  if (!filters.include_inactive) {
    whereClause.is_active = true;
  }
  
  // Role-based filtering
  if (user.role === 'client') {
    // NEW: Use the user's linked contact_id directly
    if (user.contact_id) {
      console.log(`✅ User ${user.email} has linked contact: ${user.contact_id}`);
      
      // Find exchanges where this contact is either the primary client or a participant
      const participants = await databaseService.getExchangeParticipants({
        where: { contact_id: user.contact_id }
      });
      
      const exchangeIds = participants.map(p => p.exchange_id);
      console.log(`📋 Contact is participant in ${exchangeIds.length} exchanges`);
      
      // Include exchanges where they are the primary client OR a participant
      if (exchangeIds.length > 0) {
        whereClause[Op.or] = [
          { client_id: user.contact_id },
          { id: { [Op.in]: exchangeIds } }
        ];
      } else {
        // Only show exchanges where they are the primary client
        whereClause.client_id = user.contact_id;
      }
    } else {
      // FALLBACK: Try to find contact by email (for backward compatibility)
      try {
        const contacts = await databaseService.getContacts({ where: { email: user.email } });
        const contact = contacts && contacts.length > 0 ? contacts[0] : null;
        
        if (contact) {
          console.log(`⚠️ Found contact by email for ${user.email}: ${contact.id} - User should be linked!`);
          
          // Update the user with the contact_id for future requests
          await databaseService.updateUser(user.id, { contact_id: contact.id });
          
          // Continue with the logic
          const participants = await databaseService.getExchangeParticipants({
            where: { contact_id: contact.id }
          });
          
          const exchangeIds = participants.map(p => p.exchange_id);
          
          if (exchangeIds.length > 0) {
            whereClause[Op.or] = [
              { client_id: contact.id },
              { id: { [Op.in]: exchangeIds } }
            ];
          } else {
            whereClause.client_id = contact.id;
          }
        } else {
          // If no contact found, show no exchanges
          whereClause.id = null; // This ensures no exchanges are returned
          console.log(`❌ No contact found for client user: ${user.email}`);
        }
      } catch (error) {
        console.error('Error finding contact for client:', error);
        whereClause.id = null; // Show no exchanges on error
      }
    }
  } else if (user.role === 'coordinator') {
    // Coordinators see assigned exchanges
    whereClause.coordinator_id = user.id;
  } else if (user.role === 'third_party' || user.role === 'agency') {
    // Third parties and agencies see exchanges they participate in
    if (user.contact_id) {
      // Find exchanges where their contact is a participant
      const participants = await databaseService.getExchangeParticipants({
        where: { contact_id: user.contact_id }
      });
      
      const exchangeIds = participants.map(p => p.exchange_id);
      
      if (exchangeIds.length > 0) {
        whereClause.id = { [Op.in]: exchangeIds };
      } else {
        whereClause.id = null; // No exchanges
      }
    } else {
      // Check by user_id in participants
      const participants = await databaseService.getExchangeParticipants({
        where: { user_id: user.id }
      });
      
      const exchangeIds = participants.map(p => p.exchange_id);
      
      if (exchangeIds.length > 0) {
        whereClause.id = { [Op.in]: exchangeIds };
      } else {
        whereClause.id = null; // No exchanges
      }
    }
  }
  // Admin and staff see all exchanges (no additional filtering)
  
  // Apply additional filters
  if (filters.status) {
    whereClause.status = filters.status;
  }
  if (filters.priority) {
    whereClause.priority = filters.priority;
  }
  if (filters.coordinator_id) {
    whereClause.coordinator_id = filters.coordinator_id;
  }
  if (filters.client_id) {
    whereClause.client_id = filters.client_id;
  }
  
  // Search functionality
  if (filters.search) {
    const searchOr = [
      { name: { [Op.iLike]: `%${filters.search}%` } },
      { exchange_name: { [Op.iLike]: `%${filters.search}%` } }
    ];
    
    // Add exchange_number and notes only if they exist in the schema
    if (filters.includeExchangeNumber !== false) {
      searchOr.push({ exchange_number: { [Op.iLike]: `%${filters.search}%` } });
    }
    if (filters.includeNotes !== false) {
      searchOr.push({ notes: { [Op.iLike]: `%${filters.search}%` } });
    }
    
    // Merge with existing OR conditions if any
    if (whereClause[Op.or]) {
      whereClause[Op.and] = [
        { [Op.or]: whereClause[Op.or] },
        { [Op.or]: searchOr }
      ];
      delete whereClause[Op.or];
    } else {
      whereClause[Op.or] = searchOr;
    }
  }
  
  return whereClause;
}

// Export for use in other files
module.exports = { buildExchangeWhereClause };