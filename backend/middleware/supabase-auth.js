const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.mYT5SDtRDQhwXgPKz4q1j1g4SL8GVBBLHyKqKxIL4dE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * This bridges Supabase Auth with our backend user management
 */
const authenticateSupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No valid authorization token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Supabase JWT token
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Find or create corresponding user in our database
    let localUser = await User.findOne({ where: { email: supabaseUser.email } });
    
    if (!localUser) {
      // Create user profile if it doesn't exist
      // Extract role from Supabase user metadata or default to 'client'
      const role = supabaseUser.user_metadata?.role || 'client';
      const firstName = supabaseUser.user_metadata?.first_name || 
                        supabaseUser.email.split('@')[0].split('.')[0] || 'User';
      const lastName = supabaseUser.user_metadata?.last_name || 
                       supabaseUser.email.split('@')[0].split('.')[1] || '';

      localUser = await User.create({
        id: supabaseUser.id, // Use Supabase user ID
        email: supabaseUser.email,
        passwordHash: 'supabase_managed', // Not used for Supabase users
        firstName: firstName,
        lastName: lastName,
        role: role,
        isActive: true,
        emailVerified: supabaseUser.email_confirmed_at ? true : false,
        lastLogin: new Date()
      });

      console.log(`✅ Created user profile for ${supabaseUser.email} with role ${role}`);
    } else {
      // Update last login
      await localUser.update({ lastLogin: new Date() });
    }

    // Attach user to request
    req.user = localUser;
    req.supabaseUser = supabaseUser;

    next();
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
const getUserProfile = async (supabaseUserId) => {
  try {
    const user = await User.findByPk(supabaseUserId);
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

/**
 * Sync user metadata between Supabase and our database
 */
const syncUserMetadata = async (supabaseUserId, metadata) => {
  try {
    const user = await User.findByPk(supabaseUserId);
    if (user) {
      await user.update({
        firstName: metadata.first_name || user.firstName,
        lastName: metadata.last_name || user.lastName,
        role: metadata.role || user.role
      });
    }
    return user;
  } catch (error) {
    console.error('Error syncing user metadata:', error);
    throw error;
  }
};

module.exports = {
  authenticateSupabaseToken,
  getUserProfile,
  syncUserMetadata,
  supabase
};