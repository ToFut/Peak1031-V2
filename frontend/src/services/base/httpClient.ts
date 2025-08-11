/**
 * Base HTTP Client - Handles all HTTP operations with authentication
 * Replaces the request method from the monolithic API service
 */

export class HttpClient {
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  private getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}, isRetry: boolean = false): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      // Handle 401 with refresh token retry
      if (response.status === 401 && localStorage.getItem('refreshToken') && !isRetry) {
        console.warn('🔄 Got 401, attempting token refresh for:', endpoint);
        try {
          await this.refreshToken();
          console.log('✅ Token refresh successful, retrying request');
          return await this.request<T>(endpoint, options, true);
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          console.error('Endpoint that caused logout:', endpoint);
          // Only logout if this is a critical endpoint, not for optional requests
          if (!endpoint.includes('analytics') && !endpoint.includes('stats')) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Authentication failed. Please login again.');
        }
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    
    return data.data || data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
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
  }
}

export const httpClient = new HttpClient();