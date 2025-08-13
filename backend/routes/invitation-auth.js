const express = require('express');
const router = express.Router();
const InvitationAuthService = require('../services/invitationAuthService');
const { authenticate } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for sensitive endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OTP requests, please try again later'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signup attempts per hour
  message: 'Too many signup attempts, please try again later'
});

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// =============================================
// INVITATION MANAGEMENT ROUTES
// =============================================

/**
 * Create a new invitation
 * POST /api/invitation-auth/invite
 */
router.post(
  '/invite',
  authenticate,
  [
    body('exchange_id').isUUID().withMessage('Valid exchange ID required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role').isIn(['client', 'coordinator', 'third_party', 'agency']).optional(),
    body('message').isString().trim().optional(),
    body('expires_in_days').isInt({ min: 1, max: 30 }).optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exchange_id, email, role, message, expires_in_days } = req.body;
      
      const result = await InvitationAuthService.createInvitation({
        exchange_id,
        email,
        role: role || 'client',
        invited_by_id: req.user.id,
        message,
        expires_in_days: expires_in_days || 7
      });

      res.json(result);
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create invitation' 
      });
    }
  }
);

/**
 * Bulk invite multiple users
 * POST /api/invitation-auth/bulk-invite
 */
router.post(
  '/bulk-invite',
  authenticate,
  [
    body('exchange_id').isUUID().withMessage('Valid exchange ID required'),
    body('emails').isArray().withMessage('Emails must be an array'),
    body('emails.*').isEmail().normalizeEmail().withMessage('All emails must be valid'),
    body('role').isIn(['client', 'coordinator', 'third_party', 'agency']).optional(),
    body('message').isString().trim().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exchange_id, emails, role, message } = req.body;
      
      const results = await InvitationAuthService.bulkInvite({
        exchange_id,
        emails,
        role: role || 'client',
        invited_by_id: req.user.id,
        message
      });

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Error in bulk invite:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send invitations' 
      });
    }
  }
);

/**
 * Get invitations for an exchange
 * GET /api/invitation-auth/exchange/:exchangeId/invitations
 */
router.get(
  '/exchange/:exchangeId/invitations',
  authenticate,
  [
    param('exchangeId').isUUID().withMessage('Valid exchange ID required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const invitations = await InvitationAuthService.getExchangeInvitations(
        req.params.exchangeId
      );
      
      res.json({
        success: true,
        invitations
      });
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch invitations' 
      });
    }
  }
);

/**
 * Cancel an invitation
 * POST /api/invitation-auth/invitation/:invitationId/cancel
 */
router.post(
  '/invitation/:invitationId/cancel',
  authenticate,
  [
    param('invitationId').isUUID().withMessage('Valid invitation ID required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await InvitationAuthService.cancelInvitation(
        req.params.invitationId,
        req.user.id
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cancel invitation' 
      });
    }
  }
);

// =============================================
// ONBOARDING ROUTES (Public)
// =============================================

/**
 * Validate invitation token
 * GET /api/invitation-auth/validate/:token
 */
router.get(
  '/validate/:token',
  [
    param('token').isString().isLength({ min: 32, max: 64 }).withMessage('Invalid token format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await InvitationAuthService.validateInvitationToken(req.params.token);
      
      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        invitation: {
          email: result.invitation.email,
          role: result.invitation.role,
          exchange: result.invitation.exchanges,
          invited_by: result.invitation.invited_by
        }
      });
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to validate invitation' 
      });
    }
  }
);

/**
 * Accept invitation and create account
 * POST /api/invitation-auth/accept
 */
router.post(
  '/accept',
  signupLimiter,
  [
    body('token').isString().isLength({ min: 32, max: 64 }).withMessage('Invalid token'),
    body('password').isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }).withMessage('Password must be strong'),
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('first_name').isString().trim().notEmpty().withMessage('First name required'),
    body('last_name').isString().trim().notEmpty().withMessage('Last name required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { token, password, phone, first_name, last_name } = req.body;
      
      const result = await InvitationAuthService.acceptInvitation({
        token,
        password,
        phone,
        first_name,
        last_name
      });

      res.json(result);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to accept invitation' 
      });
    }
  }
);

/**
 * Verify phone OTP
 * POST /api/invitation-auth/verify-phone
 */
router.post(
  '/verify-phone',
  otpLimiter,
  [
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('token').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { phone, token } = req.body;
      
      const result = await InvitationAuthService.verifyPhoneOTP({
        phone,
        token
      });

      res.json(result);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify OTP' 
      });
    }
  }
);

/**
 * Resend OTP
 * POST /api/invitation-auth/resend-otp
 */
router.post(
  '/resend-otp',
  otpLimiter,
  [
    body('phone').isMobilePhone().withMessage('Valid phone number required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await InvitationAuthService.resendPhoneOTP(req.body.phone);
      res.json(result);
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to resend OTP' 
      });
    }
  }
);

/**
 * Complete onboarding
 * POST /api/invitation-auth/complete-onboarding
 */
router.post(
  '/complete-onboarding',
  authenticate,
  [
    body('preferences').isObject().optional(),
    body('notifications_enabled').isBoolean().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await InvitationAuthService.completeOnboarding(
        req.user.id,
        req.body
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete onboarding' 
      });
    }
  }
);

module.exports = router;