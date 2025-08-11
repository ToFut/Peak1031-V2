/**
 * Smart Exchanges Hook
 * Handles paginated exchanges with lazy loading, filtering, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartFetcher, PaginationManager, PaginatedResponse, FilterOptions, debounce } from '../utils/smartFetching';
import { Exchange } from '../types';

export interface ExchangeSummary {
  totalValue: number;
  averageValue: number;
  statusCounts: Record<string, number>;
}

export interface UseSmartExchangesOptions {
  initialLimit?: number;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export interface UseSmartExchangesReturn {
  // Data
  exchanges: Exchange[];
  summary: ExchangeSummary | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: ReturnType<PaginationManager['getInfo']>;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Filters
  filters: FilterOptions;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  setSortBy: (field: string, order?: 'asc' | 'desc') => Promise<void>;
  
  // Utils
  getExchangeById: (id: string) => Exchange | undefined;
  clearCache: () => void;
}

export function useSmartExchanges(options: UseSmartExchangesOptions = {}): UseSmartExchangesReturn {
  const {
    initialLimit = 30,
    enableAutoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableCache = true,
    cacheTimeout = 300000 // 5 minutes
  } = options;

  // State
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [summary, setSummary] = useState<ExchangeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterOptions>({});
  const [sortBy, setSortByState] = useState('created_at');
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');

  // Refs
  const paginationManager = useRef(new PaginationManager(initialLimit));
  const abortController = useRef<AbortController | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const isLoadingMore = useRef(false);

  /**
   * Fetch exchanges from API
   */
  const fetchExchanges = useCallback(async (append = false) => {
    try {
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      if (!append) {
        setLoading(true);
        setError(null);
      }

      const options = {
        ...paginationManager.current.getOptions(),
        ...filters,
        sortBy,
        sortOrder,
        enableCache,
        cacheTimeout,
        abortSignal: abortController.current.signal
      };

      console.log('📊 Fetching exchanges with options:', options);

      const token = localStorage.getItem('token');
      
      // Fall back to regular exchanges endpoint if no token or analytics fails
      const endpoint = token 
        ? `/analytics/exchanges?${new URLSearchParams(options as any).toString()}`
        : `/exchanges?limit=${options.limit || 30}`;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        signal: abortController.current?.signal
      });

      if (!response.ok) {
        // If analytics endpoint fails with 401, fall back to regular exchanges
        if (response.status === 401 && endpoint.includes('analytics')) {
          console.warn('Analytics endpoint requires authentication, falling back to regular exchanges');
          const fallbackResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/exchanges?limit=${options.limit || 30}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: abortController.current?.signal
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
          }
          
          const fallbackResult = await fallbackResponse.json();
          const paginatedResponse = {
            data: fallbackResult.exchanges || fallbackResult || [],
            pagination: {
              currentPage: 1,
              limit: options.limit || 30,
              total: (fallbackResult.exchanges || fallbackResult || []).length,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false
            }
          };
          
          paginationManager.current.updateFromResponse(paginatedResponse);
          
          if (append && paginatedResponse.pagination.currentPage > 1) {
            setExchanges(prev => [...prev, ...paginatedResponse.data]);
          } else {
            setExchanges(paginatedResponse.data);
          }
          
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
       
       // Handle both analytics and regular exchange responses
      let paginatedResponse: PaginatedResponse<Exchange>;
      if (result?.success && result?.data) {
        const payload = result.data;
        if (Array.isArray(payload?.data)) {
          // { success: true, data: { data: Exchange[], pagination, summary? } }
          paginatedResponse = {
            data: payload.data as Exchange[],
            pagination: payload.pagination || {
              currentPage: 1,
              limit: options.limit || 30,
              total: (payload.data as Exchange[]).length,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false
            },
            summary: payload.summary
          };
        } else if (Array.isArray(payload)) {
          // { success: true, data: Exchange[] }
          paginatedResponse = {
            data: payload as Exchange[],
            pagination: {
              currentPage: 1,
              limit: options.limit || 30,
              total: (payload as Exchange[]).length,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false
            }
          };
        } else {
          // Unknown payload shape, fallback to empty
          paginatedResponse = {
            data: [],
            pagination: {
              currentPage: 1,
              limit: options.limit || 30,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false
            }
          };
        }
      } else if (result?.exchanges && result?.pagination) {
        // Regular exchanges endpoint format with pagination
        paginatedResponse = {
          data: result.exchanges as Exchange[],
          pagination: {
            currentPage: result.pagination.currentPage || 1,
            limit: result.pagination.itemsPerPage || options.limit || 30,
            total: result.pagination.totalItems || (result.exchanges as Exchange[]).length,
            totalPages: result.pagination.totalPages || Math.ceil((result.exchanges as Exchange[]).length / (options.limit || 30)),
            hasNext: result.pagination.hasNext || false,
            hasPrevious: result.pagination.hasPrevious || false
          }
        };
      } else if (result?.exchanges) {
        // Regular exchanges endpoint format without pagination
        paginatedResponse = {
          data: result.exchanges as Exchange[],
          pagination: {
            currentPage: 1,
            limit: options.limit || 30,
            total: (result.exchanges as Exchange[]).length,
            totalPages: Math.ceil((result.exchanges as Exchange[]).length / (options.limit || 30)),
            hasNext: false,
            hasPrevious: false
          }
        };
      } else {
        const arr = Array.isArray(result) ? (result as Exchange[]) : [];
        paginatedResponse = {
          data: arr,
          pagination: {
            currentPage: 1,
            limit: options.limit || 30,
            total: arr.length,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false
          }
        };
      }

      // Update pagination state
      paginationManager.current.updateFromResponse(paginatedResponse);

      if (append && paginatedResponse.pagination.currentPage > 1) {
        // Append new data (lazy loading)
        setExchanges(prev => {
          const existingIds = new Set(prev.map((e: Exchange) => e.id));
          const newExchanges = paginatedResponse.data.filter((e: Exchange) => !existingIds.has(e.id));
          return [...prev, ...newExchanges];
        });
      } else {
        // Replace data (new search/filter)
        setExchanges(paginatedResponse.data);
      }

      setSummary(paginatedResponse.summary || null);
      setError(null);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Failed to fetch exchanges:', error);
      setError(error.message || 'Failed to fetch exchanges');
      
      if (!append) {
        setExchanges([]);
        setSummary(null);
      }
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [filters, sortBy, sortOrder, enableCache, cacheTimeout]);

  /**
   * Debounced fetch to avoid too many requests
   */
  const debouncedFetch = useCallback(
    debounce((append = false) => fetchExchanges(append), 300),
    [fetchExchanges]
  );

  /**
   * Load more exchanges (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore.current || !paginationManager.current.getInfo().hasNext) {
      return;
    }

    const nextOptions = paginationManager.current.nextPage();
    if (!nextOptions) return;

    isLoadingMore.current = true;
    await fetchExchanges(true); // Append mode
  }, [fetchExchanges]);

  /**
   * Refresh current data
   */
  const refresh = useCallback(async () => {
    smartFetcher.clearCache('analytics/exchanges');
    paginationManager.current.reset();
    await fetchExchanges(false);
  }, [fetchExchanges]);

  /**
   * Go to specific page
   */
  const goToPage = useCallback(async (page: number) => {
    const pageOptions = paginationManager.current.goToPage(page);
    if (!pageOptions) return;

    setExchanges([]); // Clear current data
    await fetchExchanges(false);
  }, [fetchExchanges]);

  /**
   * Go to next page
   */
  const nextPage = useCallback(async () => {
    const nextOptions = paginationManager.current.nextPage();
    if (!nextOptions) return;

    setExchanges([]); // Clear current data
    await fetchExchanges(false);
  }, [fetchExchanges]);

  /**
   * Go to previous page
   */
  const previousPage = useCallback(async () => {
    const prevOptions = paginationManager.current.previousPage();
    if (!prevOptions) return;

    setExchanges([]); // Clear current data
    await fetchExchanges(false);
  }, [fetchExchanges]);

  /**
   * Change page size
   */
  const setPageSize = useCallback(async (size: number) => {
    paginationManager.current.changeLimit(size);
    setExchanges([]); // Clear current data
    await fetchExchanges(false);
  }, [fetchExchanges]);

  /**
   * Set filters
   */
  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    paginationManager.current.reset();
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFiltersState({});
    paginationManager.current.reset();
  }, []);

  /**
   * Set sort configuration
   */
  const setSortBy = useCallback(async (field: string, order: 'asc' | 'desc' = 'desc') => {
    setSortByState(field);
    setSortOrderState(order);
    paginationManager.current.reset();
    setExchanges([]); // Clear current data
  }, []);

  /**
   * Get exchange by ID
   */
  const getExchangeById = useCallback((id: string) => {
    return exchanges.find(exchange => exchange.id === id);
  }, [exchanges]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    smartFetcher.clearCache('analytics/exchanges');
  }, []);

  // Effects

  /**
   * Fetch data when filters or sorting changes
   */
  useEffect(() => {
    debouncedFetch(false);
  }, [debouncedFetch]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (enableAutoRefresh && refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        console.log('🔄 Auto-refreshing exchanges...');
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [enableAutoRefresh, refreshInterval, refresh]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  const pagination = paginationManager.current ? paginationManager.current.getInfo() : {
    currentPage: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
    startItem: 0,
    endItem: 0
  };

  return {
    // Data
    exchanges,
    summary,
    
    // State
    loading,
    error,
    
    // Pagination
    pagination,
    hasNext: pagination.hasNext,
    hasPrevious: pagination.hasPrevious,
    
    // Filters
    filters,
    
    // Actions
    loadMore,
    refresh,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    setFilters,
    clearFilters,
    setSortBy,
    
    // Utils
    getExchangeById,
    clearCache
  };
}