const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth');
const { authenticateToken } = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    console.log('\n🔐 AUTH ROUTE: Login attempt received');
    console.log('📧 Email:', req.body.email);
    console.log('🔍 Request body keys:', Object.keys(req.body));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, twoFactorCode } = req.body;
    console.log('✅ Validation passed, attempting authentication...');

    // Authenticate user
    const user = await AuthService.authenticateUser(email, password);
    console.log('✅ User authenticated:', user.email, 'Role:', user.role);

    // Check 2FA if enabled
    if (user.twoFaEnabled) {
      if (!twoFactorCode) {
        return res.status(401).json({ 
          error: '2FA code required',
          requiresTwoFactor: true 
        });
      }

      const isValidTwoFactor = await AuthService.verifyTwoFactor(user.id, twoFactorCode);
      if (!isValidTwoFactor) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate tokens
    console.log('🔑 Generating tokens...');
    const { token, refreshToken } = AuthService.generateTokens(user);
    console.log('✅ Tokens generated successfully');

    const responseData = {
      user: transformToCamelCase(user.toJSON ? user.toJSON() : user),
      token,
      refreshToken
    };
    console.log('📤 Sending login response for:', responseData.user.email);
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ AUTH ROUTE ERROR:', error.message);
    console.error('🔍 Full error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Registration endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').isLength({ min: 1 }),
  body('lastName').isLength({ min: 1 }),
  body('role').optional().isIn(['admin', 'client', 'coordinator', 'third_party', 'agency'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role = 'client' } = req.body;
    
    // Create user
    const user = await AuthService.createUser({
      email,
      password,
      firstName,
      lastName,
      role
    });

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user);

    res.status(201).json({
      user: transformToCamelCase(user.toJSON ? user.toJSON() : user),
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
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
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  // In a real application, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(transformToCamelCase(user.toJSON()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Setup 2FA
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  try {
    const secret = await AuthService.setupTwoFactor(req.user.id);
    res.json({ secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify 2FA
router.post('/verify-2fa', authenticateToken, [
  body('code').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.body;
    const isValid = await AuthService.verifyTwoFactor(req.user.id, code);

    if (isValid) {
      res.json({ message: '2FA verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid 2FA code' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 