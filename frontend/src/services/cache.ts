interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  lastAccessed: number;
  accessCount: number;
}

interface CacheOptions {
  maxAge?: number;
  maxItems?: number;
  priority?: 'high' | 'medium' | 'low';
  persistent?: boolean;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private maxItems = 1000;
  private readonly STORAGE_KEY = 'peak1031_cache';
  private readonly PERSISTENT_KEYS = new Set(['user-profile', 'exchanges-summary', 'users-list']);

  constructor() {
    this.loadPersistentCache();
    this.startCleanupInterval();
  }

  /**
   * Set cache item with intelligent options
   */
  set<T>(key: string, data: T, maxAge: number = 5 * 60 * 1000, options: CacheOptions = {}): void {
    const now = Date.now();
    const expiresAt = now + maxAge;
    
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt,
      lastAccessed: now,
      accessCount: 1
    };

    // Check if we need to evict items
    if (this.cache.size >= this.maxItems) {
      this.evictLeastUsed();
    }

    this.cache.set(key, item);
    
    // Persist if needed
    if (options.persistent || this.isPersistentKey(key)) {
      this.persistCache();
    }
  }

  /**
   * Get cache item with intelligent access tracking
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access tracking
    item.lastAccessed = Date.now();
    item.accessCount++;
    
    return item.data;
  }

  /**
   * Get cache item with metadata
   */
  getWithMetadata<T>(key: string): { data: T; metadata: { isStale: boolean; age: number; accessCount: number } } | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    const now = Date.now();
    const age = now - item.timestamp;
    const isStale = age > (item.expiresAt - item.timestamp) * 0.8; // Consider stale at 80% of max age

    // Update access tracking
    item.lastAccessed = now;
    item.accessCount++;
    
    return {
      data: item.data,
      metadata: {
        isStale,
        age,
        accessCount: item.accessCount
      }
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache item
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.isPersistentKey(key)) {
      this.persistCache();
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalItems: number;
    totalSize: number;
    oldestItem: number;
    newestItem: number;
    averageAge: number;
  } {
    const now = Date.now();
    const items = Array.from(this.cache.values());
    
    if (items.length === 0) {
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0,
        averageAge: 0
      };
    }

    const ages = items.map(item => now - item.timestamp);
    const totalSize = JSON.stringify(items).length;

    return {
      totalItems: items.length,
      totalSize,
      oldestItem: Math.min(...ages),
      newestItem: Math.max(...ages),
      averageAge: ages.reduce((sum, age) => sum + age, 0) / ages.length
    };
  }

  /**
   * Evict least used items (LRU strategy)
   */
  private evictLeastUsed(): void {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        // Sort by access count (ascending) then by last accessed (ascending)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.lastAccessed - b.lastAccessed;
      });

    // Remove 20% of items
    const toRemove = Math.ceil(items.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(items[i][0]);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Clean up expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Use Array.from to avoid TypeScript iteration issues
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache items`);
    }
  }

  /**
   * Check if key should be persisted
   */
  private isPersistentKey(key: string): boolean {
    return Array.from(this.PERSISTENT_KEYS).some(persistentKey => 
      key.includes(persistentKey)
    );
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    try {
      const persistentData: Record<string, CacheItem<any>> = {};
      
      // Use Array.from to avoid TypeScript iteration issues
      Array.from(this.cache.entries()).forEach(([key, item]) => {
        if (this.isPersistentKey(key)) {
          persistentData[key] = item;
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persistentData));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  /**
   * Load persistent cache from localStorage
   */
  private loadPersistentCache(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const persistentData: Record<string, CacheItem<any>> = JSON.parse(stored);
        const now = Date.now();
        
        Object.entries(persistentData).forEach(([key, item]) => {
          // Only load if not expired
          if (now < item.expiresAt) {
            this.cache.set(key, item);
          }
        });
        
        console.log(`📦 Loaded ${Object.keys(persistentData).length} persistent cache items`);
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  /**
   * Preload important data
   */
  async preload<T>(key: string, loader: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    // Check if already cached
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Load and cache
    const data = await loader();
    this.set(key, data, options.maxAge || 5 * 60 * 1000, options);
    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    const keys = Array.from(this.cache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => this.cache.delete(key));
    
    if (matchingKeys.length > 0) {
      this.persistCache();
      console.log(`🗑️ Invalidated ${matchingKeys.length} cache items matching pattern: ${pattern}`);
    }
    
    return matchingKeys.length;
  }
}

// Export singleton instance
export const generalCache = new CacheService();

// Export specialized cache instances for backward compatibility
export const documentsCache = generalCache;
export const exchangesCache = generalCache;
export const userCache = generalCache;