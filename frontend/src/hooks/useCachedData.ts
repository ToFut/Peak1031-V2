import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { generalCache } from '../services/cache';

interface UseCachedDataOptions {
  cacheKey: string;
  endpoint: string;
  cacheInstance?: any;
  ttl?: number;
  dependencies?: any[];
  immediate?: boolean;
  transform?: (data: any) => any;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function useCachedData<T = any>({
  cacheKey,
  endpoint,
  cacheInstance = generalCache,
  ttl,
  dependencies = [],
  immediate = true,
  transform
}: UseCachedDataOptions): UseCachedDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && cacheInstance.has(cacheKey)) {
      const cachedData = cacheInstance.get(cacheKey) as T;
      if (cachedData) {
        setData(transform ? transform(cachedData) : cachedData);
        setError(null);
        return;
      }
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(endpoint);

      const responseData = response.data || response;
      const transformedData = transform ? transform(responseData) : responseData;

      // Cache the data
      cacheInstance.set(cacheKey, responseData, ttl);
      
      setData(transformedData);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error(`Error fetching data for ${cacheKey}:`, err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [cacheKey, endpoint, cacheInstance, ttl, transform]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const clearCache = useCallback(() => {
    cacheInstance.delete(cacheKey);
    setData(null);
  }, [cacheInstance, cacheKey]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

// Specialized hooks for common data types
export function useDocuments(filter: string = 'all') {
  return useCachedData({
    cacheKey: `documents-${filter}`,
    endpoint: filter !== 'all' ? `/documents?category=${filter}` : '/documents',
    cacheInstance: generalCache,
    ttl: 2 * 60 * 1000, // 2 minutes
    dependencies: [filter]
  });
}

export function useExchanges() {
  return useCachedData({
    cacheKey: 'exchanges',
    endpoint: '/exchanges',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
    transform: (data) => data.exchanges || data || []
  });
}

export function useUserProfile(userId: string) {
  return useCachedData({
    cacheKey: `user-${userId}`,
    endpoint: `/users/${userId}`,
    cacheInstance: generalCache,
    ttl: 30 * 60 * 1000, // 30 minutes
    dependencies: [userId]
  });
}

export function useFolders() {
  return useCachedData({
    cacheKey: 'folders',
    endpoint: '/folders',
    cacheInstance: generalCache,
    ttl: 5 * 60 * 1000, // 5 minutes
    transform: (data) => data.folders || data || []
  });
}

export function useTemplates() {
  return useCachedData({
    cacheKey: 'document-templates',
    endpoint: '/documents/templates',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
    transform: (data) => data.templates || data || []
  });
} 