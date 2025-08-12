/**
 * Analytics Hook
 * Handles financial analytics, GPT queries, and enhanced dashboard data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartFetcher } from '../utils/smartFetching';

export interface FinancialOverview {
  totalValue: {
    relinquished: number;
    replacement: number;
    exchange: number;
  };
  averageValues: {
    relinquished: number;
    replacement: number;
    exchange: number;
  };
  statusBreakdown: {
    raw: Record<string, number>;
    percentages: Record<string, string>;
  };
  typeBreakdown: Record<string, number>;
  timelineAnalysis: {
    approaching45Day: number;
    approaching180Day: number;
    overdue45Day: number;
    overdue180Day: number;
    completed: number;
  };
  performanceMetrics: {
    totalExchanges: number;
    completionRate: string;
    averageCompletionTime: number | null;
    monthlyTrends: Array<{
      month: number;
      name: string;
      count: number;
      value: number;
    }>;
  };
  riskAnalysis: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  valueDistribution: {
    under_1M: number;
    '1M_to_5M': number;
    '5M_to_10M': number;
    '10M_to_25M': number;
    over_25M: number;
  };
  lastUpdated: string;
}

export interface ClassicQuery {
  key: string;
  name: string;
  description: string;
  resultType: 'single' | 'multiple';
}

export interface QueryResult {
  queryName?: string;
  originalQuery?: string;
  generatedSQL?: string;
  description?: string;
  resultType: 'single' | 'multiple';
  data: any[];
  executedAt: string;
  queryType: 'classic' | 'ai_generated';
  suggestions?: string[];
}

export interface DashboardStats {
  financial: {
    totalValue: number;
    averageValue: number;
    monthlyValue: number;
  };
  exchanges: {
    total: number;
    active: number;
    completed: number;
    completionRate: string;
  };
  timeline: {
    approaching45Day: number;
    approaching180Day: number;
    overdue: number;
  };
  risk: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  trends: Array<{
    month: number;
    name: string;
    count: number;
    value: number;
  }>;
  recentExchanges: any[];
  lastUpdated: string;
}

export interface UseAnalyticsOptions {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export interface UseAnalyticsReturn {
  // Financial data
  financialOverview: FinancialOverview | null;
  dashboardStats: DashboardStats | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Queries
  classicQueries: ClassicQuery[];
  queryResults: QueryResult[];
  queryLoading: boolean;
  queryError: string | null;
  querySuggestions: string[];
  
  // Actions
  refreshFinancialOverview: () => Promise<void>;
  refreshDashboardStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Query actions
  executeClassicQuery: (queryKey: string, params?: any) => Promise<QueryResult>;
  executeAIQuery: (naturalQuery: string) => Promise<QueryResult>;
  loadClassicQueries: () => Promise<void>;
  loadQuerySuggestions: (context?: any) => Promise<void>;
  clearQueryResults: () => void;
  
  // Utils
  clearCache: () => void;
  formatValue: (value: number) => string;
  getRiskColor: (level: string) => string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    enableAutoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableCache = true,
    cacheTimeout = 300000 // 5 minutes
  } = options;

  // Financial data state
  const [financialOverview, setFinancialOverview] = useState<FinancialOverview | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query state
  const [classicQueries, setClassicQueries] = useState<ClassicQuery[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querySuggestions, setQuerySuggestions] = useState<string[]>([]);

  // Refs
  const abortController = useRef<AbortController | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch financial overview
   */
  const fetchFinancialOverview = useCallback(async () => {
    try {
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      const token = localStorage.getItem('token');
      console.log('📊 Fetching financial overview...');
      console.log('Token available:', !!token);
      console.log('Token length:', token?.length || 0);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/financial-overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: abortController.current?.signal
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Analytics result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      const data = result.data;
      console.log('Setting financial overview data:', data);

      setFinancialOverview(data);
      setError(null);

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Failed to fetch financial overview:', error);
      setError(error.message || 'Failed to fetch financial overview');
    }
  }, [enableCache, cacheTimeout]);

  /**
   * Fetch dashboard stats
   */
  const fetchDashboardStats = useCallback(async () => {
    try {
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      console.log('📈 Fetching dashboard stats...');

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/dashboard-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: abortController.current?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      const data = result.data;

      setDashboardStats(data);
      setError(null);

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Failed to fetch dashboard stats:', error);
      setError(error.message || 'Failed to fetch dashboard stats');
    }
  }, [enableCache, cacheTimeout]);

  /**
   * Load initial data
   */
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchFinancialOverview(),
        fetchDashboardStats()
      ]);
    } catch (error: any) {
      console.error('Failed to load initial analytics data:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [fetchFinancialOverview, fetchDashboardStats]);

  /**
   * Refresh financial overview
   */
  const refreshFinancialOverview = useCallback(async () => {
    smartFetcher.clearCache('analytics/financial-overview');
    await fetchFinancialOverview();
  }, [fetchFinancialOverview]);

  /**
   * Refresh dashboard stats
   */
  const refreshDashboardStats = useCallback(async () => {
    smartFetcher.clearCache('analytics/dashboard-stats');
    await fetchDashboardStats();
  }, [fetchDashboardStats]);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    smartFetcher.clearCache('analytics/');
    await loadInitialData();
  }, [loadInitialData]);

  /**
   * Load classic queries
   */
  const loadClassicQueries = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/classic-queries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      const data = result.data;

      setClassicQueries(data);
    } catch (error: any) {
      console.error('Failed to load classic queries:', error);
    }
  }, []);

  /**
   * Execute classic query
   */
  const executeClassicQuery = useCallback(async (queryKey: string, params?: any): Promise<QueryResult> => {
    setQueryLoading(true);
    setQueryError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/classic-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ queryKey, params })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      const queryResult = result.data;
      setQueryResults(prev => [queryResult, ...(prev || []).slice(0, 9)]); // Keep last 10 results

      return queryResult;

    } catch (error: any) {
      console.error('Failed to execute classic query:', error);
      setQueryError(error.message || 'Failed to execute query');
      throw error;
    } finally {
      setQueryLoading(false);
    }
  }, []);

  /**
   * Execute AI-powered natural language query
   */
  const executeAIQuery = useCallback(async (naturalQuery: string): Promise<QueryResult> => {
    setQueryLoading(true);
    setQueryError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/ai-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ query: naturalQuery })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'AI query execution failed');
      }

      const queryResult = result.data;
      setQueryResults(prev => [queryResult, ...(prev || []).slice(0, 9)]); // Keep last 10 results

      return queryResult;

    } catch (error: any) {
      console.error('Failed to execute AI query:', error);
      setQueryError(error.message || 'Failed to execute AI query');
      throw error;
    } finally {
      setQueryLoading(false);
    }
  }, []);

  /**
   * Load query suggestions
   */
  const loadQuerySuggestions = useCallback(async (context?: any) => {
    try {
      const params = new URLSearchParams();
      if (context?.page) params.set('page', context.page);
      if (context?.recent) params.set('recent', JSON.stringify(context.recent));

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/analytics/query-suggestions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      const data = result.data;

      setQuerySuggestions(data);
    } catch (error: any) {
      console.error('Failed to load query suggestions:', error);
    }
  }, []);

  /**
   * Clear query results
   */
  const clearQueryResults = useCallback(() => {
    setQueryResults([]);
    setQueryError(null);
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    smartFetcher.clearCache('analytics/');
  }, []);

  /**
   * Format value for display
   */
  const formatValue = useCallback((value: number): string => {
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
  }, []);

  /**
   * Get risk color
   */
  const getRiskColor = useCallback((level: string): string => {
    switch (level.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  }, []);

  // Effects

  /**
   * Load initial data on mount
   */
  useEffect(() => {
    loadInitialData();
    loadClassicQueries();
    loadQuerySuggestions();
  }, [loadInitialData, loadClassicQueries, loadQuerySuggestions]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (enableAutoRefresh && refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        console.log('🔄 Auto-refreshing analytics...');
        refreshAll();
      }, refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [enableAutoRefresh, refreshInterval, refreshAll]);

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

  return {
    // Financial data
    financialOverview,
    dashboardStats,
    
    // State
    loading,
    error,
    
    // Queries
    classicQueries,
    queryResults,
    queryLoading,
    queryError,
    querySuggestions,
    
    // Actions
    refreshFinancialOverview,
    refreshDashboardStats,
    refreshAll,
    
    // Query actions
    executeClassicQuery,
    executeAIQuery,
    loadClassicQueries,
    loadQuerySuggestions,
    clearQueryResults,
    
    // Utils
    clearCache,
    formatValue,
    getRiskColor
  };
}