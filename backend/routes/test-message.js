const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');

const router = express.Router();

// Test message creation endpoint
router.post('/test', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 TEST MESSAGE CREATION');
    console.log('User:', req.user.id, req.user.email, req.user.role);
    console.log('Full user object:', JSON.stringify(req.user, null, 2));
    
    // First verify the user exists in the database
    const dbUser = await databaseService.getUserById(req.user.id);
    console.log('🔍 Database user lookup:', dbUser ? 'Found' : 'Not found');
    
    if (!dbUser) {
      console.log('❌ User not found in database. Checking if it\'s a Supabase auth user...');
      
      // Try to find user by email instead
      const userByEmail = await databaseService.getUserByEmail(req.user.email);
      console.log('📧 User by email lookup:', userByEmail ? `Found with ID: ${userByEmail.id}` : 'Not found');
      
      if (userByEmail) {
        console.log('🔄 Using database user ID instead of JWT user ID');
        req.user.id = userByEmail.id;
      } else {
        return res.status(400).json({ 
          error: 'User not found in database',
          details: {
            jwt_user_id: req.user.id,
            jwt_email: req.user.email,
            message: 'The authenticated user ID does not exist in the database'
          }
        });
      }
    }
    
    // Create a simple test message
    const testMessage = {
      content: 'Test message from debug endpoint',
      exchange_id: req.body.exchange_id || req.body.exchangeId,
      sender_id: req.user.id,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read_by: []
    };
    
    console.log('Test message data:', testMessage);
    
    const result = await databaseService.createMessage(testMessage);
    
    console.log('Test message created:', result);
    
    res.json({ 
      success: true, 
      message: 'Test message created',
      data: result 
    });
  } catch (error) {
    console.error('TEST ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint to check users (no auth required)
router.get('/debug-users-noauth', async (req, res) => {
  try {
    console.log('🧪 DEBUG USERS ENDPOINT');
    
    const users = await databaseService.getUsers();
    console.log('All users in database:', users);
    
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active || user.isActive
      }))
    });
  } catch (error) {
    console.error('DEBUG USERS ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to decode JWT token (no auth required)
router.get('/debug-token-noauth', (req, res) => {
  try {
    console.log('🧪 DEBUG TOKEN ENDPOINT');
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;
    
    if (!token) {
      return res.json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Decode without verification to see contents
    const decoded = jwt.decode(token);
    console.log('Token contents:', decoded);
    
    // Also try to verify
    let verified = null;
    try {
      verified = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified:', verified);
    } catch (verifyError) {
      console.log('Token verification failed:', verifyError.message);
    }
    
    res.json({
      success: true,
      decoded: decoded,
      verified: verified,
      isExpired: decoded && decoded.exp && decoded.exp < Date.now() / 1000
    });
    
  } catch (error) {
    console.error('DEBUG TOKEN ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;