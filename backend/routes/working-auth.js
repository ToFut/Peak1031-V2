const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const AuthService = require('../services/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzYyNjUsImV4cCI6MjA2OTMxMjI2NX0.0rJ7GjjsU1DcZEx9jFzJMKgiS6JN7c_PuHcfU1f2wsM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hybrid login endpoint: Try Supabase first, then local auth
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
    console.log(`🔐 Login attempt for: ${email}`);

    // Try Supabase authentication first
    try {
      const { data: { user: supabaseUser, session }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error && supabaseUser && session) {
        console.log(`✅ Supabase authentication successful for: ${email}`);
        
        // Sync/create user in local database
        let localUser = await User.findOne({ where: { email } });
        
        if (!localUser) {
          console.log(`Creating local user for: ${email}`);
          localUser = await User.create({
            id: supabaseUser.id,
            email: supabaseUser.email,
            passwordHash: 'supabase_managed',
            firstName: supabaseUser.user_metadata?.first_name || 'Admin',
            lastName: supabaseUser.user_metadata?.last_name || 'User',
            role: supabaseUser.user_metadata?.role || 'admin',
            isActive: true,
            emailVerified: true
          });
        }

        // Update last login
        await localUser.update({ lastLogin: new Date() });

        // Generate local JWT tokens
        const { token, refreshToken } = AuthService.generateTokens(localUser);

        console.log(`✅ Login successful for: ${email}`);

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
          token,
          refreshToken
        });
      }

      console.log('Supabase auth failed, trying local auth:', error?.message);
    } catch (supabaseError) {
      console.log('Supabase unavailable, trying local auth:', supabaseError.message);
    }

    // Fallback to local authentication
    const user = await AuthService.authenticateUser(email, password);
    const { token, refreshToken } = AuthService.generateTokens(user);

    console.log(`✅ Local authentication successful for: ${email}`);

    res.json({
      user: {
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
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: error.message
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
    const payload = AuthService.verifyRefreshToken(refreshToken);
    
    const user = await AuthService.getUserById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { token, refreshToken: newRefreshToken } = AuthService.generateTokens(user);

    res.json({
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('❌ Refresh token error:', error.message);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('👋 User logged out');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(payload.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    console.error('❌ Get current user error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;