const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const AuthService = require('../services/auth');

// Initialize Supabase (with fallback for when it's unavailable)
const supabaseUrl = process.env.SUPABASE_URL || 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.mYT5SDtRDQhwXgPKz4q1j1g4SL8GVBBLHyKqKxIL4dE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Hybrid authentication middleware that supports both Supabase and local JWT tokens
 */
const authenticateHybridToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No valid authorization token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // First, try to authenticate as a Supabase token
    try {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (!error && supabaseUser) {
        // Find corresponding user in our database
        const localUser = await User.findOne({ where: { email: supabaseUser.email } });
        
        if (localUser) {
          req.user = localUser;
          req.supabaseUser = supabaseUser;
          req.authType = 'supabase';
          return next();
        }
      }
    } catch (supabaseError) {
      // Supabase authentication failed, try local JWT
      console.log('Supabase token validation failed, trying local JWT:', supabaseError.message);
    }

    // Fallback to local JWT authentication
    try {
      const payload = AuthService.verifyToken(token);
      const localUser = await User.findByPk(payload.userId);
      
      if (!localUser || !localUser.isActive) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not found or inactive'
        });
      }

      req.user = localUser;
      req.authType = 'local';
      return next();
      
    } catch (jwtError) {
      console.error('Local JWT validation failed:', jwtError.message);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Get user profile data compatible with our frontend
 */
const getUserProfile = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFaEnabled: user.twoFaEnabled || false,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

module.exports = {
  authenticateHybridToken,
  getUserProfile,
  supabase
};