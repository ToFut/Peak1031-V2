const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const AuthService = require('../services/auth');
const databaseService = require('../services/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client - using service key for authentication
const supabaseUrl = process.env.SUPABASE_URL || 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.mYT5SDtRDQhwXgPKz4q1j1g4SL8GVBBLHyKqKxIL4dE';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
        
        // Get user details from database (not Supabase users table)
        const dbUser = await databaseService.getUserByEmail(email);
        
        if (!dbUser) {
          console.log('❌ User not found in database after Supabase auth');
          return res.status(401).json({ error: 'User not found in database' });
        }
        
        console.log('✅ User found in database:', dbUser.email, 'ID:', dbUser.id);
        
        // Generate local JWT tokens using the database user
        const { token, refreshToken } = AuthService.generateTokens(dbUser);

        console.log(`✅ Login successful for: ${email}`);

        return res.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            first_name: dbUser.first_name,
            last_name: dbUser.last_name,
            role: dbUser.role,
            is_active: dbUser.is_active,
            email_verified: dbUser.email_verified || true,
            two_fa_enabled: dbUser.two_fa_enabled || false,
            last_login: new Date(),
            created_at: dbUser.created_at,
            updated_at: dbUser.updated_at
          },
          token,
          refreshToken
        });
      }

      console.log('Supabase auth failed, trying local auth:', error?.message);
    } catch (supabaseError) {
      console.log('Supabase unavailable, trying local auth:', supabaseError.message);
    }

    // Fallback to database authentication
    console.log('🔍 Trying database authentication for:', email);
    const user = await databaseService.getUserByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    console.log('✅ User found in database:', user.email, 'ID:', user.id);
    console.log('🔍 User object keys:', Object.keys(user));
    console.log('🔍 Password hash exists:', !!user.password_hash);
    
    // Check password (assuming password_hash field)
    if (!user.password_hash) {
      console.log('⚠️ No password hash found, this might be a Supabase user');
      // For now, skip password validation for admin user
      if (user.email === 'admin@peak1031.com' && (password === 'admin123' || password === 'TempPass123!')) {
        console.log('✅ Using hardcoded admin credentials');
      } else {
        throw new Error('Invalid credentials - no password hash');
      }
    } else {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
    }
    
    console.log('✅ Password validated');
    
    // Generate tokens using the actual database user
    const { token, refreshToken } = AuthService.generateTokens(user);

    console.log(`✅ Database authentication successful for: ${email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        email_verified: user.email_verified || true,
        two_fa_enabled: user.two_fa_enabled || false,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at
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

// Remove duplicate - using the corrected version below

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify and decode token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 /auth/me: Token decoded, userId:', decoded.userId);
    
    // Get user from database
    const user = await databaseService.getUserById(decoded.userId);
    console.log('🔍 /auth/me: Database lookup result:', user ? 'Found' : 'Not found');
    console.log('🔍 /auth/me: User data keys:', user ? Object.keys(user) : 'N/A');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data (same format as login response)
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      email_verified: user.email_verified || true,
      two_fa_enabled: user.two_fa_enabled || false,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    });

  } catch (error) {
    console.error('❌ Get current user error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is malformed or invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await AuthService.getUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updatedProfile = await AuthService.updateUserProfile(req.user.id, req.body);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;