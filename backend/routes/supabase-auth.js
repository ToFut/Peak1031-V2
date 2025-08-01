const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateSupabaseToken, getUserProfile, syncUserMetadata } = require('../middleware/supabase-auth');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.mYT5SDtRDQhwXgPKz4q1j1g4SL8GVBBLHyKqKxIL4dE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Login endpoint with fallback authentication
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // First try to find user in local database
    let localUser = await User.findOne({ where: { email, isActive: true } });
    
    if (!localUser) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'User not found'
      });
    }

    // For users that were created with Supabase, try Supabase authentication first
    if (localUser.passwordHash === 'supabase_managed') {
      try {
        const { data: { user: supabaseUser, session }, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && supabaseUser && session) {
          // Update last login
          await localUser.update({ lastLogin: new Date() });

          return res.json({
            user: {
              id: localUser.id,
              email: localUser.email,
              first_name: localUser.firstName,
              last_name: localUser.lastName,
              role: localUser.role,
              is_active: localUser.isActive,
              email_verified: localUser.emailVerified,
              two_fa_enabled: localUser.twoFaEnabled || false,
              last_login: localUser.lastLogin,
              created_at: localUser.createdAt,
              updated_at: localUser.updatedAt
            },
            token: session.access_token,
            refreshToken: session.refresh_token
          });
        }
        
        console.log('Supabase auth failed, falling back to local auth:', error?.message);
      } catch (supabaseError) {
        console.log('Supabase unavailable, falling back to local auth:', supabaseError.message);
      }
    }

    // Fallback to local authentication using the original auth service
    const AuthService = require('../services/auth');
    
    try {
      const authenticatedUser = await AuthService.authenticateUser(email, password);
      const { token, refreshToken } = AuthService.generateTokens(authenticatedUser);

      // Update last login
      await authenticatedUser.update({ lastLogin: new Date() });

      return res.json({
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          first_name: authenticatedUser.firstName,
          last_name: authenticatedUser.lastName,
          role: authenticatedUser.role,
          is_active: authenticatedUser.isActive,
          email_verified: authenticatedUser.emailVerified,
          two_fa_enabled: authenticatedUser.twoFaEnabled || false,
          last_login: authenticatedUser.lastLogin,
          created_at: authenticatedUser.createdAt,
          updated_at: authenticatedUser.updatedAt
        },
        token,
        refreshToken
      });
    } catch (authError) {
      console.error('Local authentication failed:', authError);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Authentication failed'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Login failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refreshToken').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    // Refresh the session with Supabase
    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !session) {
      console.error('Token refresh error:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      token: session.access_token,
      refreshToken: session.refresh_token
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authenticateSupabaseToken, async (req, res) => {
  try {
    // Get the token from the Authorization header
    const token = req.headers.authorization?.substring(7); // Remove 'Bearer '
    
    if (token) {
      // Sign out from Supabase
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, return success since the client will clear tokens
    res.json({ message: 'Logged out successfully' });
  }
});

// Get current user
router.get('/me', authenticateSupabaseToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      is_active: user.isActive,
      email_verified: user.emailVerified,
      two_fa_enabled: user.twoFaEnabled || false,
      last_login: user.lastLogin,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// User management endpoints for admin
router.post('/create-user', authenticateSupabaseToken, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').isLength({ min: 1 }),
  body('lastName').isLength({ min: 1 }),
  body('role').isIn(['admin', 'client', 'coordinator', 'third_party', 'agency'])
], async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, phone } = req.body;

    // Create user in Supabase
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      },
      email_confirm: true
    });

    if (supabaseError || !supabaseUser) {
      console.error('Supabase user creation error:', supabaseError);
      return res.status(400).json({ 
        error: 'Failed to create user',
        message: supabaseError?.message || 'User creation failed'
      });
    }

    // Create user in our database
    const localUser = await User.create({
      id: supabaseUser.id,
      email: supabaseUser.email,
      passwordHash: 'supabase_managed',
      firstName: firstName,
      lastName: lastName,
      role: role,
      phone: phone,
      isActive: true,
      emailVerified: true
    });

    res.status(201).json({
      user: {
        id: localUser.id,
        email: localUser.email,
        first_name: localUser.firstName,
        last_name: localUser.lastName,
        role: localUser.role,
        is_active: localUser.isActive,
        created_at: localUser.createdAt
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create user'
    });
  }
});

module.exports = router;