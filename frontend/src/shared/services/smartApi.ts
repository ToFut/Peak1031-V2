import { apiService } from '@/shared/services/api';

interface ApiOptions {
  useCache?: boolean;
  cacheDuration?: number;
  useFallback?: boolean;
  forceRefresh?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface QueuedRequest {
  endpoint: string;
  method: string;
  data?: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class SmartApiService {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private offlineQueue: QueuedRequest[] = [];
  private isOnline: boolean = true;
  private connectionListeners: ((online: boolean) => void)[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    // Monitor connection status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }

  private handleOnline() {
    this.isOnline = true;
    this.connectionListeners.forEach(listener => listener(true));
    this.processOfflineQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.connectionListeners.forEach(listener => listener(false));
  }

  onConnectionChange(listener: (online: boolean) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return params ? `${endpoint}:${JSON.stringify(params)}` : endpoint;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number = 300000) { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private async retryWithBackoff(
    fn: () => Promise<any>,
    retryCount: number = 3,
    delay: number = 1000
  ): Promise<any> {
    let lastError: any;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  private dedupRequest(key: string, requestFn: () => Promise<any>): Promise<any> {
    const pending = this.pendingRequests.get(key);
    if (pending) return pending;
    
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }

  private async processOfflineQueue() {
    while (this.offlineQueue.length > 0 && this.isOnline) {
      const request = this.offlineQueue.shift();
      if (!request) continue;
      
      try {
        const result = await this.makeRequest(
          request.endpoint,
          request.method,
          request.data
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
  }

  private trackPerformance(endpoint: string, duration: number) {
    if (!this.performanceMetrics.has(endpoint)) {
      this.performanceMetrics.set(endpoint, []);
    }
    
    const metrics = this.performanceMetrics.get(endpoint)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getPerformanceMetrics(endpoint: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const metrics = this.performanceMetrics.get(endpoint);
    if (!metrics || metrics.length === 0) return null;
    
    const sum = metrics.reduce((a, b) => a + b, 0);
    return {
      average: sum / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics),
      count: metrics.length
    };
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      let response;
      
      switch (method) {
        case 'GET':
          response = await apiService.get(endpoint);
          break;
        case 'POST':
          response = await apiService.post(endpoint, data);
          break;
        case 'PUT':
          response = await apiService.put(endpoint, data);
          break;
        case 'DELETE':
          response = await apiService.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      const duration = Date.now() - startTime;
      this.trackPerformance(endpoint, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackPerformance(endpoint, duration);
      throw error;
    }
  }

  // Main API methods with smart features
  async getExchanges(options: ApiOptions = {}): Promise<any> {
    const endpoint = '/exchanges';
    const cacheKey = this.getCacheKey(endpoint);
    
    // Check cache first
    if (!options.forceRefresh && options.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    // Deduplicate concurrent requests
    return this.dedupRequest(cacheKey, async () => {
      try {
        const result = await this.retryWithBackoff(
          () => this.makeRequest(endpoint),
          options.retryCount,
          options.retryDelay
        );
        
        if (result.success && result.data) {
          this.setCache(cacheKey, result, options.cacheDuration);
          return result;
        }
        
        throw new Error(result.error || 'Failed to fetch exchanges');
      } catch (error) {
        // Return cached data if available on error
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        // Return fallback data if enabled
        if (options.useFallback !== false) {
          return { success: true, data: this.getFallbackExchanges() };
        }
        
        throw error;
      }
    });
  }

  async getContacts(options: ApiOptions = {}): Promise<any> {
    const endpoint = '/contacts';
    const cacheKey = this.getCacheKey(endpoint);
    
    if (!options.forceRefresh && options.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    return this.dedupRequest(cacheKey, async () => {
      try {
        const result = await this.retryWithBackoff(
          () => this.makeRequest(endpoint),
          options.retryCount,
          options.retryDelay
        );
        
        if (result.success && result.data) {
          this.setCache(cacheKey, result, options.cacheDuration);
          return result;
        }
        
        throw new Error(result.error || 'Failed to fetch contacts');
      } catch (error) {
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        if (options.useFallback !== false) {
          return { success: true, data: this.getFallbackContacts() };
        }
        
        throw error;
      }
    });
  }

  async getTasks(options: ApiOptions = {}): Promise<any> {
    const endpoint = '/tasks';
    const cacheKey = this.getCacheKey(endpoint);
    
    if (!options.forceRefresh && options.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    return this.dedupRequest(cacheKey, async () => {
      try {
        const result = await this.retryWithBackoff(
          () => this.makeRequest(endpoint),
          options.retryCount,
          options.retryDelay
        );
        
        if (result.success && result.data) {
          this.setCache(cacheKey, result, options.cacheDuration);
          return result;
        }
        
        throw new Error(result.error || 'Failed to fetch tasks');
      } catch (error) {
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        if (options.useFallback !== false) {
          return { success: true, data: this.getFallbackTasks() };
        }
        
        throw error;
      }
    });
  }

  async getDocuments(options: ApiOptions = {}): Promise<any> {
    const endpoint = '/documents';
    const cacheKey = this.getCacheKey(endpoint);
    
    if (!options.forceRefresh && options.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    return this.dedupRequest(cacheKey, async () => {
      try {
        const result = await this.retryWithBackoff(
          () => this.makeRequest(endpoint),
          options.retryCount,
          options.retryDelay
        );
        
        if (result.success && result.data) {
          this.setCache(cacheKey, result, options.cacheDuration);
          return result;
        }
        
        throw new Error(result.error || 'Failed to fetch documents');
      } catch (error) {
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        if (options.useFallback !== false) {
          return { success: true, data: [] };
        }
        
        throw error;
      }
    });
  }

  async getExchangeStats(options: ApiOptions = {}): Promise<any> {
    const endpoint = '/exchanges/stats';
    const cacheKey = this.getCacheKey(endpoint);
    
    if (!options.forceRefresh && options.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    return this.dedupRequest(cacheKey, async () => {
      try {
        const result = await this.retryWithBackoff(
          () => this.makeRequest(endpoint),
          options.retryCount,
          options.retryDelay
        );
        
        if (result.success && result.data) {
          this.setCache(cacheKey, result, options.cacheDuration);
          return result;
        }
        
        throw new Error(result.error || 'Failed to fetch stats');
      } catch (error) {
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        if (options.useFallback !== false) {
          return { 
            success: true, 
            data: {
              total: 0,
              active: 0,
              completed: 0,
              totalValue: 0
            }
          };
        }
        
        throw error;
      }
    });
  }

  async syncPracticePanther(options: ApiOptions = {}): Promise<any> {
    if (!this.isOnline) {
      return new Promise((resolve, reject) => {
        this.offlineQueue.push({
          endpoint: '/sync/practice-panther',
          method: 'POST',
          resolve,
          reject
        });
      });
    }
    
    return this.retryWithBackoff(
      () => this.makeRequest('/sync/practice-panther', 'POST'),
      options.retryCount || 5,
      options.retryDelay || 2000
    );
  }

  // Offline queue management
  queueOfflineRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({
        endpoint,
        method,
        data,
        resolve,
        reject
      });
    });
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Fallback data methods
  private getFallbackExchanges() {
    return [
      {
        id: '1',
        exchange_id: 'EX-2025-001',
        client_id: '1',
        status: 'active',
        relinquished_property: '123 Main St',
        relinquished_property_value: 500000,
        created_at: new Date().toISOString()
      }
    ];
  }

  private getFallbackContacts() {
    return [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        type: 'client'
      }
    ];
  }

  private getFallbackTasks() {
    return [
      {
        id: '1',
        title: 'Review Exchange Documents',
        status: 'pending',
        priority: 'high',
        created_at: new Date().toISOString()
      }
    ];
  }
}

export const smartApi = new SmartApiService();