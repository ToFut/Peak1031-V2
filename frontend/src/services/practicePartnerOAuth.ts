// import { supabase } from './supabase'; // TODO: Remove direct Supabase access - should use backend API

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
}

class PracticePartnerOAuthService {
  private config: OAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.REACT_APP_PP_CLIENT_ID || '',
      clientSecret: process.env.REACT_APP_PP_CLIENT_SECRET || '',
      redirectUri: process.env.REACT_APP_PP_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
      // Using EXACT URLs from PracticePanther documentation (lowercase oauth)
      authorizationUrl: 'https://app.practicepanther.com/oauth/authorize',
      tokenUrl: 'https://app.practicepanther.com/oauth/token'
    };
  }

  /**
   * OAuth Step 1 - Authorization
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store state parameter in sessionStorage for verification
   */
  private storeState(state: string): void {
    sessionStorage.setItem('pp_oauth_state', state);
  }

  /**
   * Verify state parameter matches stored value
   */
  private verifyState(receivedState: string): boolean {
    const storedState = sessionStorage.getItem('pp_oauth_state');
    sessionStorage.removeItem('pp_oauth_state');
    return storedState === receivedState;
  }

  /**
   * OAuth Step 1 - Generate authorization URL
   * Following PracticePanther documentation exactly
   */
  initiateOAuth(): string {
    const state = this.generateState();
    this.storeState(state);

    // Build URL exactly as specified in PracticePanther docs
    const params = new URLSearchParams({
      response_type: 'code',           // Always 'code' for authorization code flow
      client_id: this.config.clientId, // Your client_id from PracticePanther
      redirect_uri: this.config.redirectUri, // Must be registered with PracticePanther
      state: state                     // Anti-forgery token
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Redirect user to PracticePanther authorization page
   */
  redirectToAuthorization(): void {
    const authUrl = this.initiateOAuth();
    console.log('🔗 Redirecting to PracticePanther OAuth:', authUrl);
    window.location.href = authUrl;
  }

  /**
   * OAuth Step 2 - Token Exchange
   * Exchange authorization code for access tokens
   * Following PracticePanther documentation exactly
   */
  async exchangeCodeForToken(code: string, state: string): Promise<OAuthTokenResponse> {
    // Verify state parameter for CSRF protection
    if (!this.verifyState(state)) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Prepare token exchange request exactly as specified in PracticePanther docs
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',      // Always 'authorization_code' for this flow
      code: code,                           // The authorization code from Step 1
      redirect_uri: this.config.redirectUri, // Must match the redirect_uri from Step 1
      client_id: this.config.clientId,      // Your client_id
      client_secret: this.config.clientSecret // Your client_secret
    });

    console.log('🔄 Exchanging authorization code for tokens...');

    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', response.status, errorText);
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokens: OAuthTokenResponse = await response.json();
      console.log('✅ Token exchange successful');

      // Store tokens securely in Supabase
      await this.storeTokens(tokens);

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Store OAuth tokens securely in Supabase
   */
  private async storeTokens(tokenData: OAuthTokenResponse): Promise<void> {
    // const { data: { user } } = await supabase.auth.getUser(); // TODO: Use backend API
    const user = null; // Temporarily disabled
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    const { error } = await supabase
      .from('pp_oauth_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store OAuth tokens');
    }

    console.log('✅ Tokens stored securely in Supabase');
  }

  /**
   * Get current access token (refresh if needed)
   */
  async getAccessToken(): Promise<string | null> {
    // const { data: { user } } = await supabase.auth.getUser(); // TODO: Use backend API
    const user = null; // Temporarily disabled
    
    if (!user) {
      return null;
    }

    const { data: tokenData, error } = await supabase
      .from('pp_oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !tokenData) {
      return null;
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    if (now >= expiresAt) {
      // Token expired, try to refresh
      try {
        const newAccessToken = await this.refreshToken(tokenData.refresh_token);
        return newAccessToken;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return tokenData.access_token;
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    const refreshData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: refreshData.toString()
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens: OAuthTokenResponse = await response.json();
    await this.storeTokens(tokens);

    return tokens.access_token;
  }

  /**
   * Check if user has connected PracticePanther account
   */
  async isConnected(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  }

  /**
   * Disconnect PracticePanther account
   */
  async disconnect(): Promise<void> {
    // const { data: { user } } = await supabase.auth.getUser(); // TODO: Use backend API
    const user = null; // Temporarily disabled
    
    if (!user) {
      return;
    }

    const { error } = await supabase
      .from('pp_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error disconnecting:', error);
      throw new Error('Failed to disconnect PracticePanther account');
    }

    console.log('✅ PracticePanther account disconnected');
  }

  /**
   * Make authenticated request to PracticePanther API
   */
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      ...options.headers
    };

    return fetch(`https://app.practicepanther.com/api${endpoint}`, {
      ...options,
      headers
    });
  }

  /**
   * Get connection information
   */
  async getConnectionInfo(): Promise<{ connected: boolean; expiresAt?: string; userId?: string } | null> {
    // const { data: { user } } = await supabase.auth.getUser(); // TODO: Use backend API
    const user = null; // Temporarily disabled
    
    if (!user) {
      return null;
    }

    const { data: tokenData, error } = await supabase
      .from('pp_oauth_tokens')
      .select('expires_at')
      .eq('user_id', user.id)
      .single();

    if (error || !tokenData) {
      return { connected: false };
    }

    return {
      connected: true,
      expiresAt: tokenData.expires_at,
      userId: user.id
    };
  }
}

export const practicePartnerOAuth = new PracticePartnerOAuthService();
export default practicePartnerOAuth; 