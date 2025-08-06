import { cacheService } from './cache';
import { fallbackData } from './fallbackData';
import { apiService } from './api';

interface ApiOptions {
  useCache?: boolean;
  cacheDuration?: number;
  useFallback?: boolean;
  forceRefresh?: boolean;
}

class SmartApiService {
  private baseURL: string;
  private isOnline: boolean = true;
  private connectionListeners: ((online: boolean) => void)[] = [];

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    
    // Monitor connection status
    window.addEventListener('online', () => this.setConnectionStatus(true));
    window.addEventListener('offline', () => this.setConnectionStatus(false));
  }

  private setConnectionStatus(online: boolean) {
    this.isOnline = online;
    this.connectionListeners.forEach(listener => listener(online));
  }

  onConnectionChange(listener: (online: boolean) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private async tryFetch(endpoint: string, options: RequestInit = {}): Promise<Response | null> {
    try {
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          const newToken = localStorage.getItem('token');
          headers.Authorization = `Bearer ${newToken}`;
          return fetch(`${this.baseURL}${endpoint}`, { ...options, headers });
        }
      }

      return response;
    } catch (error) {
      console.error('API fetch error:', error);
      this.setConnectionStatus(false);
      return null;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
      }

      // If refresh fails, try auto-login
      return await this.autoLogin();
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private async autoLogin(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@peak1031.com',
          password: 'admin123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Auto-login error:', error);
    }
    return false;
  }

  async get<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
      useCache = true,
      cacheDuration = 5 * 60 * 1000, // 5 minutes
      useFallback = true,
      forceRefresh = false
    } = options;

    const cacheKey = `api:${endpoint}`;

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = cacheService.get<T>(cacheKey);
      if (cached) {
        console.log(`Using cached data for ${endpoint}`);
        return cached;
      }
    }

    // Try to fetch from API
    const response = await this.tryFetch(endpoint);
    
    if (response && response.ok) {
      this.setConnectionStatus(true);
      const data = await response.json();
      
      // Cache the successful response
      if (useCache) {
        cacheService.set(cacheKey, data, cacheDuration);
      }
      
      return data;
    }

    // If API fails, check cache again (even if expired)
    const expiredCache = cacheService.get<T>(cacheKey);
    if (expiredCache) {
      console.warn(`Using expired cache for ${endpoint} due to API failure`);
      return expiredCache;
    }

    // If no cache and useFallback is true, return fallback data
    if (useFallback) {
      console.warn(`Using fallback data for ${endpoint}`);
      return this.getFallbackData(endpoint) as T;
    }

    throw new Error(`Failed to fetch ${endpoint} and no fallback available`);
  }

  private getFallbackData(endpoint: string): any {
    // Parse endpoint to determine what data to return
    if (endpoint.includes('/contacts')) {
      return { contacts: fallbackData.contacts };
    } else if (endpoint.includes('/exchanges')) {
      return { exchanges: fallbackData.exchanges };
    } else if (endpoint.includes('/tasks')) {
      return { tasks: fallbackData.tasks };
    } else if (endpoint.includes('/documents')) {
      return { documents: fallbackData.documents };
    }
    
    return {};
  }

  async post<T>(endpoint: string, data: any, options: ApiOptions = {}): Promise<T> {
    const response = await this.tryFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response && response.ok) {
      this.setConnectionStatus(true);
      // Clear related caches
      this.clearRelatedCaches(endpoint);
      return response.json();
    }

    throw new Error(`Failed to POST to ${endpoint}`);
  }

  async put<T>(endpoint: string, data: any, options: ApiOptions = {}): Promise<T> {
    const response = await this.tryFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (response && response.ok) {
      this.setConnectionStatus(true);
      // Clear related caches
      this.clearRelatedCaches(endpoint);
      return response.json();
    }

    throw new Error(`Failed to PUT to ${endpoint}`);
  }

  async delete(endpoint: string): Promise<void> {
    const response = await this.tryFetch(endpoint, {
      method: 'DELETE'
    });

    if (response && response.ok) {
      this.setConnectionStatus(true);
      // Clear related caches
      this.clearRelatedCaches(endpoint);
      return;
    }

    throw new Error(`Failed to DELETE ${endpoint}`);
  }

  private clearRelatedCaches(endpoint: string) {
    // Clear caches related to the endpoint
    const keys = cacheService.keys();
    keys.forEach(key => {
      if (key.includes(endpoint.split('/')[1])) {
        cacheService.clear(key);
      }
    });
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  // Specific methods for common operations
  async getContacts(options?: ApiOptions) {
    const cacheKey = 'api:/contacts';
    
    // Check cache first
    if (options?.useCache !== false && !options?.forceRefresh) {
      const cached = cacheService.get<any>(cacheKey);
      if (cached) {
        console.log('📦 Using cached contacts');
        return cached;
      }
    }
    
    try {
      // Use the regular API service
      console.log('🔄 Fetching contacts from API...');
      const response = await apiService.getContacts();
      
      // Cache the response
      if (options?.useCache !== false) {
        cacheService.set(cacheKey, response, options?.cacheDuration);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch contacts:', error);
      
      // Try expired cache
      const expiredCache = cacheService.get<any>(cacheKey);
      if (expiredCache) {
        console.warn('⚠️ Using expired cache for contacts');
        return expiredCache;
      }
      
      // Use fallback
      if (options?.useFallback !== false) {
        console.warn('🔄 Using fallback data for contacts');
        return { contacts: fallbackData.contacts };
      }
      
      throw error;
    }
  }

  async getExchanges(options?: ApiOptions) {
    const cacheKey = 'api:/exchanges';
    
    // Check cache first
    if (options?.useCache !== false && !options?.forceRefresh) {
      const cached = cacheService.get<any>(cacheKey);
      if (cached) {
        console.log('📦 Using cached exchanges');
        return cached;
      }
    }
    
    try {
      // Use the regular API service
      console.log('🔄 Fetching exchanges from API...');
      const response = await apiService.getExchanges();
      
      // Cache the response
      if (options?.useCache !== false) {
        cacheService.set(cacheKey, response, options?.cacheDuration);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch exchanges:', error);
      
      // Try expired cache
      const expiredCache = cacheService.get<any>(cacheKey);
      if (expiredCache) {
        console.warn('⚠️ Using expired cache for exchanges');
        return expiredCache;
      }
      
      // Use fallback
      if (options?.useFallback !== false) {
        console.warn('🔄 Using fallback data for exchanges');
        return { exchanges: fallbackData.exchanges };
      }
      
      throw error;
    }
  }

  async getTasks(options?: ApiOptions) {
    const cacheKey = 'api:/tasks';
    
    // Check cache first
    if (options?.useCache !== false && !options?.forceRefresh) {
      const cached = cacheService.get<any>(cacheKey);
      if (cached) {
        console.log('📦 Using cached tasks');
        return cached;
      }
    }
    
    try {
      // Use the regular API service
      console.log('🔄 Fetching tasks from API...');
      const response = await apiService.getTasks();
      
      // Cache the response
      if (options?.useCache !== false) {
        cacheService.set(cacheKey, response, options?.cacheDuration);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
      
      // Try expired cache
      const expiredCache = cacheService.get<any>(cacheKey);
      if (expiredCache) {
        console.warn('⚠️ Using expired cache for tasks');
        return expiredCache;
      }
      
      // Use fallback
      if (options?.useFallback !== false) {
        console.warn('🔄 Using fallback data for tasks');
        return { tasks: fallbackData.tasks };
      }
      
      throw error;
    }
  }

  async getDocuments(options?: ApiOptions) {
    const cacheKey = 'api:/documents';
    
    // Check cache first
    if (options?.useCache !== false && !options?.forceRefresh) {
      const cached = cacheService.get<any>(cacheKey);
      if (cached) {
        console.log('📦 Using cached documents');
        return cached;
      }
    }
    
    try {
      // Use the regular API service
      console.log('🔄 Fetching documents from API...');
      const response = await apiService.getDocuments();
      
      // Cache the response
      if (options?.useCache !== false) {
        cacheService.set(cacheKey, response, options?.cacheDuration);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch documents:', error);
      
      // Try expired cache
      const expiredCache = cacheService.get<any>(cacheKey);
      if (expiredCache) {
        console.warn('⚠️ Using expired cache for documents');
        return expiredCache;
      }
      
      // Use fallback
      if (options?.useFallback !== false) {
        console.warn('🔄 Using fallback data for documents');
        return { documents: fallbackData.documents };
      }
      
      throw error;
    }
  }
}

export const smartApi = new SmartApiService();