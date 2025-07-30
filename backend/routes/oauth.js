const express = require('express');
const router = express.Router();
const practicePartnerService = require('../services/practicePartnerService');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

/**
 * @route GET /api/oauth/practicepanther/authorize
 * @desc Generate PracticePanther OAuth authorization URL
 * @access Admin only
 */
router.get('/practicepanther/authorize', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const state = Math.random().toString(36).substring(7);
    const authUrl = practicePartnerService.generateAuthUrl(state);
    
    // Store state in session for security validation
    req.session.ppOAuthState = state;
    
    res.json({
      status: 'success',
      data: {
        authUrl: authUrl,
        state: state,
        message: 'Visit this URL to authorize PracticePanther access'
      }
    });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate authorization URL',
      error: error.message
    });
  }
});

/**
 * @route GET /api/oauth/practicepanther/callback
 * @desc Handle PracticePanther OAuth callback
 * @access Public (OAuth callback)
 */
router.get('/practicepanther/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('OAuth authorization error:', error);
      return res.status(400).json({
        status: 'error',
        message: `OAuth authorization failed: ${error}`,
        error: error
      });
    }
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'No authorization code received'
      });
    }
    
    // Validate state parameter (if session available)
    if (req.session && req.session.ppOAuthState && req.session.ppOAuthState !== state) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid state parameter - possible CSRF attack'
      });
    }
    
    console.log(`🔄 Processing OAuth callback with code: ${code.substring(0, 10)}...`);
    
    // Exchange authorization code for access token
    const tokenData = await practicePartnerService.exchangeCodeForToken(code, state);
    
    // Clear state from session
    if (req.session) {
      delete req.session.ppOAuthState;
    }
    
    res.json({
      status: 'success',
      message: 'PracticePanther authorization successful! You can now sync data.',
      data: {
        tokenReceived: !!tokenData.access_token,
        expiresIn: tokenData.expires_in,
        hasRefreshToken: !!tokenData.refresh_token
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process OAuth callback',
      error: error.message
    });
  }
});

/**
 * @route POST /api/oauth/practicepanther/test-token
 * @desc Test if current PracticePanther token is valid
 * @access Admin only
 */
router.post('/practicepanther/test-token', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const connectionResult = await practicePartnerService.testConnection();
    
    res.json({
      status: 'success',
      data: connectionResult
    });
  } catch (error) {
    console.error('Token test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Token test failed',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/oauth/practicepanther/revoke
 * @desc Revoke PracticePanther OAuth token
 * @access Admin only
 */
router.delete('/practicepanther/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Mark all PracticePanther tokens as inactive
    const { error } = await supabase
      .from('oauth_tokens')
      .update({ is_active: false })
      .eq('provider', 'practicepanther');

    if (error) {
      throw error;
    }

    // Clear tokens from service
    practicePartnerService.accessToken = null;
    practicePartnerService.tokenExpiry = null;

    console.log(`🗑️ PracticePanther tokens revoked by admin: ${req.user.id}`);

    res.json({
      status: 'success',
      message: 'PracticePanther authorization revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke authorization',
      error: error.message
    });
  }
});

/**
 * @route GET /api/oauth/status
 * @desc Get OAuth status for all providers
 * @access Admin only
 */
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('provider, expires_at, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const status = {};
    tokens?.forEach(token => {
      const isExpired = token.expires_at && new Date(token.expires_at) <= new Date();
      status[token.provider] = {
        authorized: token.is_active && !isExpired,
        expires_at: token.expires_at,
        authorized_at: token.created_at,
        expired: isExpired
      };
    });

    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Error getting OAuth status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get OAuth status',
      error: error.message
    });
  }
});

module.exports = router;