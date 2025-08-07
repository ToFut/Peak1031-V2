/**
 * PracticePanther OAuth Token Manager
 * 
 * Manages PP OAuth tokens with automatic refresh based on their official documentation:
 * - Access tokens expire in 24 hours (86,400 seconds)
 * - Refresh tokens are valid for 60 days or until used
 * - Refresh endpoint: https://app.practicepanther.com/OAuth/Token
 * - Required params: grant_type=refresh_token, refresh_token, client_id, client_secret
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class PPTokenManager {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.clientId = process.env.PP_CLIENT_ID;
    this.clientSecret = process.env.PP_CLIENT_SECRET;
    this.provider = 'practicepanther';
    
    // PP API endpoints
    this.tokenEndpoint = 'https://app.practicepanther.com/OAuth/Token';
    this.authEndpoint = 'https://app.practicepanther.com/OAuth/Authorize';
    
    // Cache for current token
    this.currentToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get the current valid PP access token
   * Automatically refreshes if expired or expiring soon (within 5 minutes)
   */
  async getValidAccessToken() {
    try {
      // Check if we have a cached valid token
      if (this.currentToken && this.tokenExpiry && this.tokenExpiry > Date.now() + 300000) {
        console.log('🟢 PP: Using cached valid token');
        return this.currentToken;
      }

      // Get stored token from database
      const storedToken = await this.getStoredToken();
      
      if (!storedToken) {
        throw new Error('No PracticePanther token found. OAuth authorization required.');
      }

      // Check if stored token is still valid (with 5 minute buffer)
      const expiresAt = new Date(storedToken.expires_at).getTime();
      const now = Date.now();
      const fiveMinutesFromNow = now + 300000;
      
      if (expiresAt > fiveMinutesFromNow) {
        // Token is still valid
        console.log('🟢 PP: Using stored valid token');
        this.currentToken = storedToken.access_token;
        this.tokenExpiry = expiresAt;
        return this.currentToken;
      }

      // Token is expired or expiring soon - refresh it
      if (storedToken.refresh_token) {
        console.log('🔄 PP: Token expiring soon/expired, refreshing...');
        const newToken = await this.refreshToken(storedToken.refresh_token);
        
        if (newToken) {
          console.log('✅ PP: Token refreshed successfully');
          return newToken.access_token;
        }
      }

      throw new Error('PracticePanther token refresh failed. Re-authorization required.');
      
    } catch (error) {
      console.error('❌ PP: Error getting valid access token:', error.message);
      throw error;
    }
  }

  /**
   * Get stored token from Supabase
   */
  async getStoredToken() {
    try {
      // First try to get active token
      let { data, error } = await this.supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', this.provider)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If no active token, get the most recent valid token and activate it
      if (error || !data) {
        const { data: latestToken } = await this.supabase
          .from('oauth_tokens')
          .select('*')
          .eq('provider', this.provider)
          .not('refresh_token', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestToken) {
          // Activate this token
          await this.supabase
            .from('oauth_tokens')
            .update({ is_active: true })
            .eq('id', latestToken.id);
          
          console.log('✅ PP: Auto-activated latest token');
          return latestToken;
        }
      }

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ PP: No stored token found');
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ PP: Error getting stored token:', error.message);
      return null;
    }
  }

  /**
   * Refresh PP access token using refresh token
   * Based on PP documentation: POST to /OAuth/Token with grant_type=refresh_token
   */
  async refreshToken(refreshToken) {
    try {
      console.log('🔄 PP: Refreshing access token...');

      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const response = await axios.post(this.tokenEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Peak1031-Integration/1.0'
        },
        timeout: 30000
      });

      if (!response.data.access_token) {
        throw new Error('No access token in refresh response');
      }

      const tokenData = response.data;
      
      // Calculate expiry time (PP tokens expire in 86,400 seconds / 24 hours)
      const expiresIn = tokenData.expires_in || 86400; // Default to 24 hours
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Store the new token in database
      await this.storeToken({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
        token_type: tokenData.token_type || 'Bearer',
        expires_in: expiresIn,
        expires_at: expiresAt,
        scope: tokenData.scope
      });

      // Update cache
      this.currentToken = tokenData.access_token;
      this.tokenExpiry = expiresAt.getTime();

      console.log(`✅ PP: Token refreshed, expires at ${expiresAt.toISOString()}`);
      return {
        access_token: tokenData.access_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type || 'Bearer'
      };

    } catch (error) {
      console.error('❌ PP: Token refresh failed:', error.message);
      
      if (error.response?.data) {
        console.error('PP Refresh Error Details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // If refresh fails, the refresh token might be expired
      // Deactivate the stored token to force re-authorization
      await this.deactivateTokens();
      
      return null;
    }
  }

  /**
   * Store OAuth token in Supabase
   */
  async storeToken(tokenData) {
    try {
      console.log('💾 PP: Storing new token in database...');

      // First, deactivate all existing tokens for this provider
      await this.deactivateTokens();

      const tokenRecord = {
        provider: this.provider,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: tokenData.expires_at.toISOString(),
        scope: tokenData.scope || null,
        is_active: true,
        last_used_at: new Date().toISOString(),
        provider_data: {
          expires_in: tokenData.expires_in,
          refreshed_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('oauth_tokens')
        .insert(tokenRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ PP: Token stored successfully with ID:', data.id);
      return data;

    } catch (error) {
      console.error('❌ PP: Error storing token:', error.message);
      throw error;
    }
  }

  /**
   * Deactivate all tokens for this provider
   */
  async deactivateTokens() {
    try {
      const { error } = await this.supabase
        .from('oauth_tokens')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('provider', this.provider)
        .eq('is_active', true);

      if (error) {
        console.error('❌ PP: Error deactivating tokens:', error.message);
      }
    } catch (error) {
      console.error('❌ PP: Error deactivating tokens:', error.message);
    }
  }

  /**
   * Exchange authorization code for access token (initial OAuth flow)
   */
  async exchangeCodeForToken(authorizationCode, redirectUri) {
    try {
      console.log('🔄 PP: Exchanging authorization code for token...');

      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri
      });

      const response = await axios.post(this.tokenEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Peak1031-Integration/1.0'
        },
        timeout: 30000
      });

      if (!response.data.access_token) {
        throw new Error('No access token in authorization response');
      }

      const tokenData = response.data;
      const expiresIn = tokenData.expires_in || 86400;
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Store the initial token
      await this.storeToken({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: expiresIn,
        expires_at: expiresAt,
        scope: tokenData.scope
      });

      console.log('✅ PP: Initial OAuth token obtained and stored');
      return tokenData;

    } catch (error) {
      console.error('❌ PP: Code exchange failed:', error.message);
      if (error.response?.data) {
        console.error('PP Auth Error Details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(redirectUri, state = null) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'read write', // Adjust scope as needed
      ...(state && { state })
    });

    return `${this.authEndpoint}?${params.toString()}`;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed() {
    try {
      const { error } = await this.supabase
        .from('oauth_tokens')
        .update({ 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('provider', this.provider)
        .eq('is_active', true);

      if (error) {
        console.error('❌ PP: Error updating last used:', error.message);
      }
    } catch (error) {
      console.error('❌ PP: Error updating last used:', error.message);
    }
  }

  /**
   * Get token status for monitoring
   */
  async getTokenStatus() {
    try {
      const storedToken = await this.getStoredToken();
      
      if (!storedToken) {
        return { status: 'no_token', message: 'No token found' };
      }

      const expiresAt = new Date(storedToken.expires_at).getTime();
      const now = Date.now();
      const minutesUntilExpiry = Math.floor((expiresAt - now) / 60000);

      if (expiresAt <= now) {
        return { 
          status: 'expired', 
          message: `Token expired ${Math.abs(minutesUntilExpiry)} minutes ago`,
          expires_at: storedToken.expires_at,
          has_refresh_token: !!storedToken.refresh_token
        };
      } else if (minutesUntilExpiry < 60) {
        return { 
          status: 'expiring_soon', 
          message: `Token expires in ${minutesUntilExpiry} minutes`,
          expires_at: storedToken.expires_at,
          has_refresh_token: !!storedToken.refresh_token
        };
      } else {
        return { 
          status: 'valid', 
          message: `Token valid for ${Math.floor(minutesUntilExpiry / 60)} hours`,
          expires_at: storedToken.expires_at,
          has_refresh_token: !!storedToken.refresh_token
        };
      }
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = PPTokenManager;