import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../services/api';
import { roleBasedApiService } from '../../services/roleBasedApiService';

// Standard dashboard data types
export interface DashboardStats {
  exchanges: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    ppSynced?: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
    urgent?: number;
    thisWeek?: number;
  };
  documents?: {
    total: number;
    requireSignature?: number;
    recent: number;
  };
  messages?: {
    unread: number;
    recent: number;
  };
  users?: {
    total: number;
    active: number;
    admins?: number;
    clients?: number;
    coordinators?: number;
  };
  system?: {
    lastSync: string | null;
    syncStatus: 'success' | 'pending' | 'error';
    totalDocuments: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  };
}

export interface UseDashboardDataOptions {
  role: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  exchanges: any[];
  tasks: any[];
  documents: any[];
  messages: any[];
  users: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  syncPracticePanther: () => Promise<void>;
  syncing: boolean;
  clearCache: () => void;
}

// Cache for dashboard data to prevent unnecessary API calls
const dashboardCache = new Map<string, {
  data: any;
  timestamp: number;
  expiry: number;
}>();

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export const useDashboardData = (options: UseDashboardDataOptions): UseDashboardDataReturn => {
  const { role, autoRefresh = false, refreshInterval = 300000 } = options; // 5 minutes default
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Refs to prevent unnecessary re-renders
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate cache key based on role and options
  const getCacheKey = useCallback(() => {
    return `dashboard_${role}_${autoRefresh}_${refreshInterval}`;
  }, [role, autoRefresh, refreshInterval]);

  // Check if cache is valid
  const isCacheValid = useCallback((cacheKey: string) => {
    const cached = dashboardCache.get(cacheKey);
    if (!cached) return false;
    return Date.now() < cached.expiry;
  }, []);

  // Get data from cache
  const getFromCache = useCallback((cacheKey: string) => {
    if (!isCacheValid(cacheKey)) {
      dashboardCache.delete(cacheKey);
      return null;
    }
    return dashboardCache.get(cacheKey)?.data || null;
  }, [isCacheValid]);

  // Set cache data
  const setCache = useCallback((cacheKey: string, data: any) => {
    dashboardCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_DURATION
    });
  }, []);

  // Optimized data loading with caching
  const loadDashboardData = useCallback(async () => {
    // Prevent concurrent requests
    if (loadingRef.current) {
      console.log('🔄 Dashboard data loading already in progress, skipping...');
      return;
    }

    const cacheKey = getCacheKey();
    
    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('📋 Using cached dashboard data');
      setStats(cachedData.stats);
      setExchanges(cachedData.exchanges || []);
      setTasks(cachedData.tasks || []);
      setDocuments(cachedData.documents || []);
      setMessages(cachedData.messages || []);
      setUsers(cachedData.users || []);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Loading fresh dashboard data...');

      // Skip enhanced analytics endpoint - it might have inconsistent data
      // Go directly to dashboard overview which has proper RBAC
      /*
      try {
        const enhancedData = await apiService.getEnhancedDashboardStats();
        
        if (enhancedData && typeof enhancedData === 'object') {
          console.log('✅ Enhanced analytics data received');
          
          // Map enhanced response to standard format with richer data
          const mappedStats: DashboardStats = {
            exchanges: {
              total: enhancedData.exchanges?.total || 0,
              pending: enhancedData.exchanges?.pending || 0,
              active: enhancedData.exchanges?.active || 0,
              completed: enhancedData.exchanges?.completed || 0,
              ppSynced: 0,
            },
            tasks: {
              total: enhancedData.timeline?.total || 0,
              pending: enhancedData.timeline?.approaching45Day + enhancedData.timeline?.approaching180Day || 0,
              overdue: enhancedData.timeline?.overdue || 0,
              completed: enhancedData.exchanges?.completed || 0,
              urgent: enhancedData.risk?.high || 0,
              thisWeek: enhancedData.timeline?.approaching45Day || 0,
            },
            documents: {
              total: 0,
              requireSignature: 0,
              recent: 0,
            },
            messages: {
              unread: 0,
              recent: 0,
            },
            users: {
              total: 0,
              active: 0,
              admins: 0,
              clients: 0,
              coordinators: 0,
            },
            system: {
              lastSync: enhancedData.lastUpdated || null,
              syncStatus: 'success' as const,
              totalDocuments: 0,
              systemHealth: 'healthy' as const,
            },
          };

          const resultData = {
            stats: mappedStats,
            exchanges: enhancedData.recentExchanges || [],
            tasks: [],
            documents: [],
            messages: [],
            users: []
          };

          // Cache the result
          setCache(cacheKey, resultData);

          setStats(mappedStats);
          setExchanges(enhancedData.recentExchanges || []);
          setTasks([]);
          setDocuments([]);
          setMessages([]);
          setUsers([]);
          
          return; // Success with enhanced data
        }
      } catch (enhancedError) {
        console.log('⚠️ Enhanced analytics failed, falling back to standard:', enhancedError);
      }
      */

      // Use FAST dashboard overview endpoint for super quick loading
      try {
        console.log('⚡ Using FAST dashboard endpoint...');
        const response = await apiService.getFastDashboardOverview();
        
        console.log('📊 Raw dashboard response:', response);
        
        if (response && typeof response === 'object') {
          // Handle wrapped response structure { success: true, data: {...} }
          const overviewData = (response as any).data || response;
          
          console.log('✅ Dashboard overview data:', {
            hasData: !!overviewData,
            exchanges: overviewData.exchanges,
            stats: overviewData.stats,
            user: overviewData.user
          });
          
          // Debug: Log the exact total being received
          console.log('🔍 DEBUG - Exchange totals:', {
            'role': role,
            'cacheKey': getCacheKey(),
            'overviewData.exchanges.total': overviewData.exchanges?.total,
            'overviewData.stats.totalExchanges': overviewData.stats?.totalExchanges,
            'mappedTotal': (overviewData.exchanges as any)?.total || 0,
            'raw overviewData': overviewData
          });
          
          // Map V2 response to our standard format
          const mappedStats: DashboardStats = {
            exchanges: {
              total: (overviewData.exchanges as any)?.total || 0,
              pending: (overviewData.exchanges as any)?.pending || 0,
              active: (overviewData.exchanges as any)?.active || 0,
              completed: (overviewData.exchanges as any)?.completed || 0,
              ppSynced: (overviewData.exchanges as any)?.ppSynced || 0,
            },
            tasks: {
              total: (overviewData.tasks as any)?.total || 0,
              pending: (overviewData.tasks as any)?.pending || 0,
              overdue: (overviewData.tasks as any)?.overdue || 0,
              completed: (overviewData.tasks as any)?.completed || 0,
              urgent: (overviewData.tasks as any)?.urgent || 0,
              thisWeek: (overviewData.tasks as any)?.thisWeek || 0,
            },
            documents: (overviewData as any).documents ? {
              total: (overviewData as any).documents.total || 0,
              requireSignature: (overviewData as any).documents.requireSignature || 0,
              recent: (overviewData as any).documents.recent || 0,
            } : undefined,
            messages: (overviewData as any).messages ? {
              unread: (overviewData as any).messages.unread || 0,
              recent: (overviewData as any).messages.recent || 0,
            } : undefined,
            users: (overviewData as any).users ? {
              total: (overviewData as any).users.total || 0,
              active: (overviewData as any).users.active || 0,
              admins: (overviewData as any).users.admins || 0,
              clients: (overviewData as any).users.clients || 0,
              coordinators: (overviewData as any).users.coordinators || 0,
            } : undefined,
            system: (overviewData as any).system ? {
              lastSync: (overviewData as any).system.lastSync || null,
              syncStatus: (overviewData as any).system.syncStatus || 'success',
              totalDocuments: (overviewData as any).system.totalDocuments || 0,
              systemHealth: (overviewData as any).system.systemHealth || 'healthy',
            } : undefined,
          };

          const resultData = {
            stats: mappedStats,
            exchanges: (overviewData as any).exchangesList || [],
            tasks: (overviewData as any).tasksList || [],
            documents: (overviewData as any).documentsList || [],
            messages: (overviewData as any).messagesList || [],
            users: (overviewData as any).usersList || []
          };

          // Cache the result
          setCache(cacheKey, resultData);

          setStats(mappedStats);
          setExchanges((overviewData as any).exchangesList || []);
          setTasks((overviewData as any).tasksList || []);
          setDocuments((overviewData as any).documentsList || []);
          setMessages((overviewData as any).messagesList || []);
          setUsers((overviewData as any).usersList || []);
          
          console.log('✅ Dashboard data loaded successfully:', {
            exchanges: mappedStats.exchanges.total,
            tasks: mappedStats.tasks.total,
            role: role
          });
          
          return; // Success, no need for fallback
        }
      } catch (v2Error) {
        console.error('⚠️ V2 dashboard overview failed:', v2Error);
        // Don't fall back to broken client-side filtering
        throw v2Error;
      }

      // No fallback - dashboard overview endpoint should always work
      // The old fallback was using broken client-side filtering that showed all data

    } catch (err: any) {
      console.error('❌ Dashboard data loading failed:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [role, getCacheKey, getFromCache, setCache]);

  // Role-based data filtering - memoized
  const filterExchangesByRole = useCallback((exchanges: any[], userRole: string): any[] => {
    if (userRole === 'admin' || userRole === 'coordinator') {
      return exchanges; // Admin and coordinator see all
    }
    
    // Client and others see only their exchanges
    return exchanges.filter((exchange: any) => {
      return exchange.participants?.some((p: any) => p.userId === 'current_user_id'); // TODO: Use actual user ID
    });
  }, []);

  const filterTasksByRole = useCallback((tasks: any[], userRole: string): any[] => {
    if (userRole === 'admin' || userRole === 'coordinator') {
      return tasks; // Admin and coordinator see all
    }
    
    // Others see only assigned tasks
    return tasks.filter((task: any) => task.assignedTo === 'current_user_id'); // TODO: Use actual user ID
  }, []);

  // PracticePanther sync function - optimized
  const syncPracticePanther = useCallback(async () => {
    if (role !== 'admin') {
      throw new Error('Only admins can sync PracticePanther data');
    }

    if (syncing) {
      console.log('🔄 PracticePanther sync already in progress...');
      return;
    }

    setSyncing(true);
    try {
      console.log('🔄 Starting PracticePanther sync...');
      
      // Call the sync endpoint
      const response = await fetch('/api/admin/sync-practice-panther', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ PracticePanther sync completed:', result);

      // Clear cache and reload data to show updated information
      dashboardCache.clear();
      await loadDashboardData();
      
    } catch (error) {
      console.error('❌ PracticePanther sync failed:', error);
      setError(error instanceof Error ? error.message : 'PracticePanther sync failed');
    } finally {
      setSyncing(false);
    }
  }, [role, syncing, loadDashboardData]);

  // Optimized auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        // Only refresh if not currently loading
        if (!loadingRef.current) {
          loadDashboardData();
        }
      }, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, loadDashboardData]);

  // Initial load - only once
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Clear cache function
  const clearDashboardCache = useCallback(() => {
    console.log('🗑️ Clearing dashboard cache...');
    console.log('Current cache keys:', Array.from(dashboardCache.keys()));
    dashboardCache.clear();
    loadDashboardData();
  }, [loadDashboardData]);



  const returnValue: UseDashboardDataReturn = {
    stats,
    exchanges,
    tasks,
    documents,
    messages,
    users,
    loading,
    error,
    refreshData: loadDashboardData,
    syncPracticePanther,
    syncing,
    clearCache: clearDashboardCache
  };

  return returnValue;
};