import { apiService } from './api';

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
}

export interface OAuthConnectionStatus {
  connected: boolean;
  expiresAt?: string;
  userId?: string;
}

class OAuthService {
  // Get OAuth connection status from backend
  async getConnectionStatus(): Promise<OAuthConnectionStatus> {
    try {
      const response = await apiService.get('/oauth/status');
      return response;
    } catch (error) {
      console.error('Error getting OAuth status:', error);
      return { connected: false };
    }
  }

  // Get OAuth authorization URL from backend
  async getAuthorizationUrl(scopes: string[] = []): Promise<string> {
    try {
      const response = await apiService.post('/oauth/authorize', { scopes });
      return response.url;
    } catch (error) {
      console.error('Error getting authorization URL:', error);
      throw error;
    }
  }

  // Exchange authorization code for tokens via backend
  async exchangeCodeForTokens(code: string, state?: string): Promise<OAuthToken> {
    try {
      const response = await apiService.post('/oauth/callback', { code, state });
      return response;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Refresh tokens via backend
  async refreshTokens(): Promise<OAuthToken> {
    try {
      const response = await apiService.post('/oauth/refresh', {});
      return response;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  // Disconnect OAuth via backend
  async disconnect(): Promise<void> {
    try {
      await apiService.post('/oauth/disconnect', {});
    } catch (error) {
      console.error('Error disconnecting OAuth:', error);
      throw error;
    }
  }

  // Check if tokens are expired
  isTokenExpired(expiresAt: string): boolean {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    return expirationDate <= now;
  }

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiration(expiresAt: string): number {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    return expirationDate.getTime() - now.getTime();
  }
}

export const oauthService = new OAuthService();
export default oauthService; 