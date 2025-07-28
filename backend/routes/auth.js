const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, twoFactorCode } = req.body;

    // Authenticate user
    const user = await AuthService.authenticateUser(email, password);

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
    const { token, refreshToken } = AuthService.generateTokens(user);

    res.json({
      user: user.toJSON(),
      token,
      refreshToken
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
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

    res.json({ user: user.toJSON() });
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