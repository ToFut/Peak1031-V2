const express = require('express');
const router = express.Router();
const { Exchange, Contact, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const AuditService = require('../services/audit');

/**
 * Exchange Participants Routes
 * Handles secure access control for exchange-based chat and collaboration
 */

// Get exchange participants (who can access the exchange chat)
router.get('/:exchangeId/participants', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    // Find the exchange
    const exchange = await Exchange.findByPk(exchangeId, {
      include: [
        {
          model: Contact,
          as: 'client'
        },
        {
          model: User,
          as: 'coordinator'
        }
      ]
    });

    if (!exchange) {
      return res.status(404).json({ 
        error: 'Exchange not found',
        message: 'The requested exchange could not be found'
      });
    }

    // Check if user has access to this exchange
    const hasAccess = await checkExchangeAccess(userId, exchangeId, req.user.role);
    if (!hasAccess) {
      await AuditService.log({
        action: 'EXCHANGE_ACCESS_DENIED',
        entityType: 'exchange',
        entityId: exchangeId,
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: 'insufficient_permissions' }
      });

      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this exchange'
      });
    }

    // Build participants list
    const participants = [];

    // Add client (if exists)
    if (exchange.client) {
      participants.push({
        id: `contact_${exchange.client.id}`,
        role: 'client',
        contact: {
          id: exchange.client.id,
          firstName: exchange.client.firstName,
          lastName: exchange.client.lastName,
          email: exchange.client.email,
          company: exchange.client.company
        },
        permissions: {
          canView: true,
          canMessage: true,
          canUpload: true,
          canViewDocuments: true
        }
      });
    }

    // Add coordinator (if exists)
    if (exchange.coordinator) {
      participants.push({
        id: `user_${exchange.coordinator.id}`,
        role: 'coordinator',
        user: {
          id: exchange.coordinator.id,
          firstName: exchange.coordinator.firstName,
          lastName: exchange.coordinator.lastName,
          email: exchange.coordinator.email,
          role: exchange.coordinator.role
        },
        permissions: {
          canView: true,
          canMessage: true,
          canUpload: true,
          canViewDocuments: true,
          canManage: true
        }
      });
    }

    // Add admin users (they have access to all exchanges)
    const adminUsers = await User.findAll({
      where: { role: 'admin', isActive: true }
    });

    adminUsers.forEach(admin => {
      participants.push({
        id: `user_${admin.id}`,
        role: 'admin',
        user: {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role
        },
        permissions: {
          canView: true,
          canMessage: true,
          canUpload: true,
          canViewDocuments: true,
          canManage: true,
          canAdmin: true
        }
      });
    });

    // TODO: Add other participants from exchange_participants table
    // This would include attorneys, CPAs, QIs, agents, etc.
    // For now, we'll simulate with mock data from PP integration

    // Log access
    await AuditService.log({
      action: 'EXCHANGE_PARTICIPANTS_VIEWED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: userId,
      details: { participantCount: participants.length }
    });

    res.json(participants);

  } catch (error) {
    console.error('Error fetching exchange participants:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch exchange participants'
    });
  }
});

// Add participant to exchange
router.post('/:exchangeId/participants', authenticateToken, checkPermission('exchanges', 'write'), async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { contactId, userId, role, permissions } = req.body;

    // Validate required fields
    if (!role || (!contactId && !userId)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Role and either contactId or userId are required'
      });
    }

    // Check if exchange exists
    const exchange = await Exchange.findByPk(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // TODO: Create exchange_participants record
    // This would be implemented when we have the full exchange_participants table
    
    // For now, return success
    await AuditService.log({
      action: 'EXCHANGE_PARTICIPANT_ADDED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: req.user.id,
      details: { 
        addedContactId: contactId,
        addedUserId: userId,
        role,
        permissions
      }
    });

    res.json({ 
      message: 'Participant added successfully',
      participantId: contactId || userId
    });

  } catch (error) {
    console.error('Error adding exchange participant:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add participant'
    });
  }
});

// Remove participant from exchange
router.delete('/:exchangeId/participants/:participantId', authenticateToken, checkPermission('exchanges', 'write'), async (req, res) => {
  try {
    const { exchangeId, participantId } = req.params;

    // Check if exchange exists
    const exchange = await Exchange.findByPk(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // TODO: Remove from exchange_participants table
    
    await AuditService.log({
      action: 'EXCHANGE_PARTICIPANT_REMOVED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: req.user.id,
      details: { removedParticipantId: participantId }
    });

    res.json({ 
      message: 'Participant removed successfully'
    });

  } catch (error) {
    console.error('Error removing exchange participant:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove participant'
    });
  }
});

/**
 * Check if user has access to a specific exchange
 * This implements the security model for exchange-based chat
 */
async function checkExchangeAccess(userId, exchangeId, userRole) {
  try {
    // Admins and coordinators have access to all exchanges
    if (userRole === 'admin' || userRole === 'coordinator') {
      return true;
    }

    // Find the exchange
    const exchange = await Exchange.findByPk(exchangeId, {
      include: [
        {
          model: Contact,
          as: 'client'
        },
        {
          model: User,
          as: 'coordinator'
        }
      ]
    });

    if (!exchange) {
      return false;
    }

    // Check if user is the assigned coordinator
    if (exchange.coordinatorId === userId) {
      return true;
    }

    // TODO: Check exchange_participants table for explicit access
    // This would check if the user or their contact record is in the participants table
    
    // For now, return false for other users (they need explicit assignment)
    return false;

  } catch (error) {
    console.error('Error checking exchange access:', error);
    return false;
  }
}

module.exports = { router, checkExchangeAccess };