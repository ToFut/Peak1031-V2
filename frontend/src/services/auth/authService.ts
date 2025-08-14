/**
 * Authentication Service - Handles all authentication operations
 * Extracted from the monolithic API service
 */

import { User, LoginCredentials, LoginResponse } from '../../types';
import { httpClient } from '../base/httpClient';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      
      
      
      const response = await httpClient.post<LoginResponse>('/auth/login', credentials);

      
      
      
      return response;
    } catch (error: any) {
      console.error('❌ Auth Service login error:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const user = await httpClient.get<User>('/auth/me');
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Use intelligent URL detection
      let baseUrl = process.env.REACT_APP_API_URL;
      
      if (!baseUrl) {
        const isProduction = window.location.hostname !== 'localhost';
        if (isProduction && window.location.hostname.includes('vercel.app')) {
          baseUrl = 'https://peak1031-production.up.railway.app/api';
        } else {
          baseUrl = 'http://localhost:5001/api';
        }
      }

      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  async setupTwoFactor(): Promise<{ secret: string }> {
    return httpClient.post('/auth/setup-2fa');
  }

  async verifyTwoFactor(code: string): Promise<{ message: string }> {
    return httpClient.post('/auth/verify-2fa', { code });
  }

  async forgotPassword(email: string): Promise<void> {
    await httpClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await httpClient.post('/auth/reset-password', { token, password });
  }
}

export const authService = new AuthService();