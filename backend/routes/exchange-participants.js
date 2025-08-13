const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const databaseService = require('../services/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Exchange Participants Routes
 * Handles secure access control for exchange-based chat and collaboration
 */

// Get exchange participants (who can access the exchange chat)
router.get('/:exchangeId/participants', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    // Find the exchange using Supabase
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ 
        error: 'Exchange not found',
        message: 'The requested exchange could not be found'
      });
    }

    // Get exchange participants
    const participants = await supabaseService.getExchangeParticipants({
      where: { exchangeId }
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
router.post('/:exchangeId/participants', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { contactId, userId, role, permissions } = req.body;
    
    console.log('📝 Adding participant to exchange:', { exchangeId, contactId, userId, role });

    // Validate required fields
    if (!role || (!contactId && !userId)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Role and either contactId or userId are required'
      });
    }

    // Check if exchange exists using Supabase
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Determine if the provided ID is a user ID or contact ID
    let finalUserId = userId;
    let finalContactId = contactId;
    
    // If contactId is provided, check if it's actually a user ID
    if (contactId && !userId) {
      const possibleUser = await supabaseService.getUserById(contactId);
      if (possibleUser) {
        console.log('📋 Detected user ID provided as contactId, correcting...', {
          providedId: contactId,
          userFound: possibleUser.first_name + ' ' + possibleUser.last_name
        });
        finalUserId = contactId;
        finalContactId = null;
      }
    }

    // Check if participant already exists
    const existingParticipants = await supabaseService.getExchangeParticipants({
      where: { exchangeId }
    });
    
    const isAlreadyParticipant = existingParticipants.some(p => 
      (finalContactId && p.contact_id === finalContactId) || 
      (finalUserId && p.user_id === finalUserId)
    );
    
    if (isAlreadyParticipant) {
      return res.status(409).json({
        error: 'Participant already exists',
        message: 'This contact/user is already a participant in this exchange'
      });
    }

    // Create exchange participant record based on simple schema (migration 004)
    const participantData = {
      exchange_id: exchangeId,
      role: role,
      permissions: JSON.stringify(permissions || {})
    };
    
    // Add either contact_id or user_id, not both
    if (finalUserId) {
      participantData.user_id = finalUserId;
    } else if (finalContactId) {
      participantData.contact_id = finalContactId;
    }
    
    console.log('💾 Creating participant with data:', participantData);

    const result = await supabaseService.createExchangeParticipant(participantData);
    console.log('✅ Participant added successfully:', result);

    // Emit real-time event for participant addition and auto-join user if online
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting participant_added to exchange_${exchangeId}`);
      
      // Auto-join the new participant to the exchange room if they're currently online
      if (finalUserId) {
        // Find all sockets for this user and add them to the exchange room
        const connectedSockets = Array.from(io.sockets.sockets.values());
        const userSockets = connectedSockets.filter(s => s.user?.id === finalUserId);
        
        for (const socket of userSockets) {
          socket.join(`exchange_${exchangeId}`);
          socket.join(`exchange-${exchangeId}`);
          console.log(`🚀 Auto-joined user ${finalUserId} to exchange ${exchangeId} rooms (socket: ${socket.id})`);
        }
        
        if (userSockets.length > 0) {
          // Notify the user they've been added to the exchange
          io.to(`user_${finalUserId}`).emit('exchange_joined', {
            exchangeId: exchangeId,
            message: 'You have been added to this exchange',
            addedBy: req.user.id
          });
        }
      }
      
      io.to(`exchange_${exchangeId}`).emit('participant_added', {
        exchangeId: exchangeId,
        participantId: result.id,
        participant: result,
        addedBy: req.user.id
      });
      
      // Also emit to all connected users in the exchange (fallback)
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });
      
      participants.forEach(participant => {
        if (participant.user_id) {
          io.to(`user_${participant.user_id}`).emit('participant_added', {
            exchangeId: exchangeId,
            participantId: result.id,
            participant: result,
            addedBy: req.user.id
          });
        }
      });
    } else {
      console.warn('⚠️ Socket.IO not available for real-time participant notification');
    }

    res.json({ 
      message: 'Participant added successfully',
      participantId: result.id,
      participant: result
    });

  } catch (error) {
    console.error('❌ Error adding exchange participant:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add participant',
      details: error.message
    });
  }
});

// Remove participant from exchange
router.delete('/:exchangeId/participants/:participantId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, participantId } = req.params;

    // Check if exchange exists
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Remove participant from exchange_participants table
    await supabaseService.delete('exchange_participants', {
      where: { id: participantId, exchange_id: exchangeId }
    });

    // Emit real-time event for participant removal
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting participant_removed to exchange_${exchangeId}`);
      io.to(`exchange_${exchangeId}`).emit('participant_removed', {
        exchangeId: exchangeId,
        participantId: participantId,
        removedBy: req.user.id
      });
      
      // Also emit to all connected users in the exchange (fallback)
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });
      
      participants.forEach(participant => {
        if (participant.user_id) {
          io.to(`user_${participant.user_id}`).emit('participant_removed', {
            exchangeId: exchangeId,
            participantId: participantId,
            removedBy: req.user.id
          });
        }
      });
    } else {
      console.warn('⚠️ Socket.IO not available for real-time participant removal notification');
    }

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

module.exports = router;