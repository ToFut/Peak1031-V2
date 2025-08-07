/**
 * Authentication Service - Handles all authentication operations
 * Extracted from the monolithic API service
 */

import { User, LoginCredentials, LoginResponse } from '../../types';
import { httpClient } from '../base/httpClient';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 Auth Service: Starting login process...');
      console.log('📧 Email:', credentials.email);
      
      const response = await httpClient.post<LoginResponse>('/auth/login', credentials);

      console.log('✅ Auth Service: Login successful!');
      console.log('👤 User:', response.user.email, 'Role:', response.user.role);
      console.log('🔑 Token received:', response.token ? 'Yes' : 'No');
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

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/refresh`, {
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