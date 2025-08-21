const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth');
const { authenticateToken } = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');
const securityAuditService = require('../services/securityAuditService');

const router = express.Router();

// Helper function to get client IP
function getClientIp(req) {
  // Check for forwarded IPs (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Fall back to connection remote address
  return req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress || 
         '0.0.0.0';
}

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  let userId = null;
  let loginSuccess = false;
  let failureReason = null;

  try {
    console.log('\n🔐 AUTH ROUTE: Login attempt received');
    console.log('📧 Email:', req.body.email);
    console.log('🌐 IP Address:', ipAddress);
    console.log('📱 User Agent:', userAgent);
    console.log('🔍 Request body keys:', Object.keys(req.body));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      failureReason = 'Validation failed';
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, twoFactorCode } = req.body;
    console.log('✅ Validation passed, attempting authentication...');

    // Try to get user ID even if authentication fails (for audit logging)
    try {
      const userLookup = await AuthService.getUserByEmail(email);
      if (userLookup) {
        userId = userLookup.id;
      }
    } catch (lookupError) {
      // Ignore lookup errors
    }

    // Authenticate user
    let user;
    try {
      user = await AuthService.authenticateUser(email, password);
      console.log('✅ User authenticated:', user.email, 'Role:', user.role);
      userId = user.id; // Update with actual user ID
    } catch (authError) {
      failureReason = 'Invalid credentials';
      
      // Log failed login attempt
      if (userId) {
        await securityAuditService.logLoginEvent({
          userId,
          eventType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason
        });
      }
      
      throw authError;
    }

    // Check if account is security locked
    if (user.security_locked) {
      failureReason = 'Account locked for security';
      await securityAuditService.logLoginEvent({
        userId: user.id,
        eventType: 'failed_login',
        ipAddress,
        userAgent,
        success: false,
        failureReason
      });
      return res.status(403).json({ 
        error: 'Account has been locked for security reasons. Please contact support.',
        securityLocked: true 
      });
    }

    // Check if forced password reset is required
    if (user.force_password_reset) {
      await securityAuditService.logLoginEvent({
        userId: user.id,
        eventType: 'login',
        ipAddress,
        userAgent,
        success: true,
        sessionId: null
      });
      return res.status(403).json({ 
        error: 'Password reset required',
        forcePasswordReset: true,
        temporaryToken: AuthService.generatePasswordResetToken(user.email)
      });
    }

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
        failureReason = 'Invalid 2FA code';
        await securityAuditService.logLoginEvent({
          userId: user.id,
          eventType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason
        });
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate tokens
    console.log('🔑 Generating tokens...');
    const { token, refreshToken } = AuthService.generateTokens(user);
    console.log('✅ Tokens generated successfully');

    // Log successful login
    loginSuccess = true;
    await securityAuditService.logLoginEvent({
      userId: user.id,
      eventType: 'login',
      ipAddress,
      userAgent,
      success: true,
      sessionId: token.substring(0, 20) // Store partial token as session ID
    });

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
    
    // Log failed attempt if we haven't already
    if (!loginSuccess && userId && !failureReason) {
      await securityAuditService.logLoginEvent({
        userId,
        eventType: 'failed_login',
        ipAddress,
        userAgent,
        success: false,
        failureReason: error.message
      });
    }
    
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
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role = 'client' } = req.body;
    
    console.log('📝 Registration attempt from IP:', ipAddress);
    console.log('📧 Email:', email);
    console.log('👤 Role:', role);
    
    // Create user
    const user = await AuthService.createUser({
      email,
      password,
      firstName,
      lastName,
      role
    });

    // Log registration event
    await securityAuditService.logLoginEvent({
      userId: user.id,
      eventType: 'register',
      ipAddress,
      userAgent,
      success: true,
      sessionId: null
    });

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user);

    // Log initial login after registration
    await securityAuditService.logLoginEvent({
      userId: user.id,
      eventType: 'login',
      ipAddress,
      userAgent,
      success: true,
      sessionId: token.substring(0, 20)
    });

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
router.post('/logout', authenticateToken, async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    // Log logout event
    await securityAuditService.logLoginEvent({
      userId: req.user.id,
      eventType: 'logout',
      ipAddress,
      userAgent,
      success: true
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout tracking error:', error);
    // Still return success even if tracking fails
    res.json({ message: 'Logged out successfully' });
  }
});

// Forgot password endpoint
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const result = await AuthService.generatePasswordResetToken(email);
    
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
router.post('/reset-password', [
  body('token').isLength({ min: 1 }),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const result = await AuthService.resetPassword(token, password);
    
    // Log password reset event if we have a user ID
    if (result.userId) {
      await securityAuditService.logLoginEvent({
        userId: result.userId,
        eventType: 'password_reset',
        ipAddress,
        userAgent,
        success: true
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const profile = await AuthService.getUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error in /me route:', error);
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
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
  body('company').optional().trim(),
  body('timezone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedProfile = await AuthService.updateUserProfile(req.user.id, req.body);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
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

// Setup SMS 2FA
router.post('/setup-sms-2fa', authenticateToken, [
  body('phoneNumber').isLength({ min: 10 }).withMessage('Valid phone number required')
], async (req, res) => {
  try {
    console.log('📱 SMS 2FA setup route hit');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;
    console.log('📱 Setting up SMS 2FA for user:', req.user.id, 'phone:', phoneNumber);
    const result = await AuthService.setupSmsTwoFactor(req.user.id, phoneNumber);
    console.log('📱 SMS 2FA setup result:', result);
    res.json(result);
  } catch (error) {
    console.error('SMS 2FA setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send SMS 2FA code
router.post('/send-sms-2fa', authenticateToken, async (req, res) => {
  try {
    const result = await AuthService.sendSmsTwoFactorCode(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Send SMS 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify SMS 2FA code
router.post('/verify-sms-2fa', authenticateToken, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.body;
    const result = await AuthService.verifySmsTwoFactor(req.user.id, code);
    res.json(result);
  } catch (error) {
    console.error('Verify SMS 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disable SMS 2FA
router.post('/disable-sms-2fa', authenticateToken, [
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    const result = await AuthService.disableSmsTwoFactor(req.user.id, password);
    res.json(result);
  } catch (error) {
    console.error('Disable SMS 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
