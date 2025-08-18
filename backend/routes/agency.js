/**
 * Agency Routes
 * API endpoints for agency role to manage third party assignments and view their portfolio
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const databaseService = require('../services/database');

/**
 * GET /api/agency/third-parties
 * Get third parties assigned to the current agency user
 */
router.get('/third-parties', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const userId = req.user.id;
    const userContactId = req.user.contact_id;

    if (!userContactId) {
      return res.json({ data: [], total: 0 });
    }

    // Get exchange participations for this agency user
    const exchangeParticipations = await databaseService.getExchangeParticipants({
      where: { contact_id: userContactId }
    });

    const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
    
    if (exchangeIds.length === 0) {
      return res.json({ data: [], total: 0 });
    }

    // Get all participants in these exchanges who are third parties
    const allParticipants = await databaseService.getExchangeParticipants({
      where: { exchange_id: { in: exchangeIds } }
    });

    // Get unique third party contact IDs
    const thirdPartyContactIds = [...new Set(allParticipants.map(p => p.contact_id))];

    // Get third party contact details
    const thirdParties = [];
    for (const contactId of thirdPartyContactIds) {
      if (contactId !== userContactId) { // Exclude self
        const contact = await databaseService.getContactById(contactId);
        if (contact) {
          thirdParties.push({
            id: contact.id,
            display_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
            email: contact.email,
            status: 'active'
          });
        }
      }
    }

    res.json({
      data: thirdParties,
      total: thirdParties.length
    });
  } catch (error) {
    console.error('Error fetching agency third parties:', error);
    res.status(500).json({ error: 'Failed to fetch third parties' });
  }
});

/**
 * GET /api/agency/clients-portfolio
 * Get clients portfolio for the current agency user
 */
router.get('/clients-portfolio', authenticateToken, requireRole(['agency']), async (req, res) => {
  try {
    const userId = req.user.id;
    const userContactId = req.user.contact_id;

    if (!userContactId) {
      return res.json({ data: [], total: 0 });
    }

    // Get exchange participations for this agency user
    const exchangeParticipations = await databaseService.getExchangeParticipants({
      where: { contact_id: userContactId }
    });

    const exchangeIds = exchangeParticipations.map(p => p.exchange_id);
    
    if (exchangeIds.length === 0) {
      return res.json({ data: [], total: 0 });
    }

    // Get exchanges where this agency is a participant
    const exchanges = await databaseService.getExchanges({
      where: { id: { in: exchangeIds } }
    });

    // Get client contacts for these exchanges
    const clientContactIds = [...new Set(exchanges.map(ex => ex.client_id).filter(Boolean))];

    const clients = [];
    for (const contactId of clientContactIds) {
      const contact = await databaseService.getContactById(contactId);
      if (contact) {
        const clientExchanges = exchanges.filter(ex => ex.client_id === contactId);
        clients.push({
          id: contact.id,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          email: contact.email,
          company: contact.company,
          exchanges_count: clientExchanges.length,
          active_exchanges: clientExchanges.filter(ex => ex.status === 'active' || ex.status === 'in_progress').length,
          total_value: clientExchanges.reduce((sum, ex) => sum + (ex.property_value || 0), 0)
        });
      }
    }

    res.json({
      data: clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Error fetching agency clients portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch clients portfolio' });
  }
});

module.exports = router;