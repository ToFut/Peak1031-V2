/**
 * Smart Data Fetching Utilities
 * Handles pagination, lazy loading, caching, and optimistic updates
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  status?: string;
  minValue?: number;
  maxValue?: number;
  exchangeType?: string;
  searchTerm?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  summary?: {
    totalValue: number;
    averageValue: number;
    statusCounts: Record<string, number>;
  };
}

export interface SmartFetchOptions extends PaginationOptions, FilterOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  retryCount?: number;
  abortSignal?: AbortSignal;
}

/**
 * Smart fetch with caching, retries, and error handling
 */
class SmartFetcher {
  private cache = new Map<string, { data: any; timestamp: number; expiry: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private defaultCacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from options
   */
  private generateCacheKey(endpoint: string, options: any): string {
    const optionsString = JSON.stringify(options, Object.keys(options).sort());
    return `${endpoint}:${btoa(optionsString)}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() < cached.expiry;
  }

  /**
   * Get data from cache
   */
  private getFromCache(cacheKey: string): any | null {
    if (!this.isCacheValid(cacheKey)) {
      this.cache.delete(cacheKey);
      return null;
    }
    return this.cache.get(cacheKey)?.data || null;
  }

  /**
   * Store data in cache
   */
  private setCache(cacheKey: string, data: any, timeout: number): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + timeout
    });
  }

  /**
   * Smart fetch with all features
   */
  async fetch<T>(
    endpoint: string, 
    options: SmartFetchOptions = {},
    fetchFn: (url: string, options: RequestInit) => Promise<Response>
  ): Promise<T> {
    const {
      enableCache = true,
      cacheTimeout = this.defaultCacheTimeout,
      retryCount = 3,
      abortSignal,
      page = 1,
      limit = 30,
      ...fetchOptions
    } = options;

    // Merge pagination options with fetch options
    const finalOptions = {
      page,
      limit,
      ...fetchOptions
    };

    const cacheKey = this.generateCacheKey(endpoint, finalOptions);

    // Return cached data if available and valid
    if (enableCache && this.isCacheValid(cacheKey)) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`📋 Returning cached data for ${endpoint}`);
        return cachedData;
      }
    }

    // Return pending request if one exists
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Returning pending request for ${endpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(
      endpoint,
      finalOptions,
      fetchFn,
      retryCount,
      abortSignal
    );

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      if (enableCache) {
        this.setCache(cacheKey, result, cacheTimeout);
      }

      return result;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute the actual request with retries
   */
  private async executeRequest<T>(
    endpoint: string,
    options: any,
    fetchFn: (url: string, options: RequestInit) => Promise<Response>,
    retryCount: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const url = this.buildUrl(endpoint, options);
        
        console.log(`🌐 Fetching ${endpoint} (attempt ${attempt}/${retryCount})`);

        const response = await fetchFn(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: abortSignal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Request failed');
        }

        console.log(`✅ Successfully fetched ${endpoint}`);
        return result.data || result;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if request was aborted
        if (abortSignal?.aborted) {
          throw new Error('Request was aborted');
        }

        // Don't retry client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retryCount) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying ${endpoint} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ Failed to fetch ${endpoint} after ${retryCount} attempts`);
    throw lastError!;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, options: any): string {
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
    const url = new URL(endpoint, baseUrl);

    // Add query parameters
    Object.keys(options).forEach(key => {
      const value = options[key];
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          url.searchParams.set(key, JSON.stringify(value));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });

    return url.toString();
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ Cleared ${keysToDelete.length} cache entries matching "${pattern}"`);
    } else {
      // Clear all cache
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }

  /**
   * Preload data for better UX
   */
  async preload(endpoint: string, options: SmartFetchOptions, fetchFn: (url: string, options: RequestInit) => Promise<Response>): Promise<void> {
    try {
      await this.fetch(endpoint, options, fetchFn);
      console.log(`📋 Preloaded data for ${endpoint}`);
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${endpoint}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; totalSize: number; hitRate: number } {
    const entries = this.cache.size;
    const totalSize = JSON.stringify(Array.from(this.cache.values())).length;
    
    // Calculate hit rate (simplified)
    const hitRate = 0; // Would need to track hits vs misses for accurate calculation

    return { entries, totalSize, hitRate };
  }
}

// Create singleton instance
export const smartFetcher = new SmartFetcher();

/**
 * Pagination utilities
 */
export class PaginationManager {
  private currentPage: number = 1;
  private limit: number = 30;
  private totalPages: number = 0;
  private total: number = 0;
  private hasNext: boolean = false;
  private hasPrevious: boolean = false;

  constructor(initialLimit: number = 30) {
    this.limit = initialLimit;
  }

  /**
   * Update pagination state from response
   */
  updateFromResponse(response: PaginatedResponse<any>): void {
    this.currentPage = response.pagination.currentPage;
    this.limit = response.pagination.limit;
    this.totalPages = response.pagination.totalPages;
    this.total = response.pagination.total;
    this.hasNext = response.pagination.hasNext;
    this.hasPrevious = response.pagination.hasPrevious;
  }

  /**
   * Get current pagination options
   */
  getOptions(): PaginationOptions {
    return {
      page: this.currentPage,
      limit: this.limit
    };
  }

  /**
   * Go to next page
   */
  nextPage(): PaginationOptions | null {
    if (!this.hasNext) return null;
    this.currentPage++;
    return this.getOptions();
  }

  /**
   * Go to previous page
   */
  previousPage(): PaginationOptions | null {
    if (!this.hasPrevious) return null;
    this.currentPage--;
    return this.getOptions();
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): PaginationOptions | null {
    if (page < 1 || page > this.totalPages) return null;
    this.currentPage = page;
    return this.getOptions();
  }

  /**
   * Change page size
   */
  changeLimit(newLimit: number): PaginationOptions {
    this.limit = Math.max(1, Math.min(newLimit, 100)); // Between 1 and 100
    this.currentPage = 1; // Reset to first page
    return this.getOptions();
  }

  /**
   * Get pagination info
   */
  getInfo(): {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    startItem: number;
    endItem: number;
  } {
    const startItem = (this.currentPage - 1) * this.limit + 1;
    const endItem = Math.min(this.currentPage * this.limit, this.total);

    return {
      currentPage: this.currentPage,
      limit: this.limit,
      total: this.total,
      totalPages: this.totalPages,
      hasNext: this.hasNext,
      hasPrevious: this.hasPrevious,
      startItem,
      endItem
    };
  }

  /**
   * Reset pagination
   */
  reset(): void {
    this.currentPage = 1;
    this.totalPages = 0;
    this.total = 0;
    this.hasNext = false;
    this.hasPrevious = false;
  }
}

/**
 * Debounced function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * Format large numbers for display
 */
export function formatValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get risk color based on level
 */
export function getRiskColor(riskLevel: string): string {
  switch (riskLevel.toLowerCase()) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'green';
    default: return 'gray';
  }
}

/**
 * Get timeline status color
 */
export function getTimelineColor(status: string): string {
  switch (status) {
    case 'OVERDUE_45':
    case 'OVERDUE_180':
      return 'red';
    case 'CRITICAL_45':
    case 'CRITICAL_180':
      return 'orange';
    case 'WARNING_45':
    case 'WARNING_180':
      return 'yellow';
    case 'COMPLETED':
      return 'green';
    default:
      return 'blue';
  }
}