import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';

export interface DashboardStats {
  exchanges: {
    total: number;
    active: number;
    completed: number;
    pending: number;
  };
  tasks: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  documents: {
    total: number;
    recent: number;
    pending_signature: number;
  };
  messages: {
    total: number;
    unread: number;
  };
  users?: {
    total: number;
    active: number;
  };
  thirdParties?: {
    total: number;
  };
  system?: {
    systemHealth: string;
    lastSync: string | null;
    totalDocuments: number;
  };
}

interface UseDashboardDataOptions {
  role?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useDashboardData = (options: UseDashboardDataOptions = {}) => {
  const { role, autoRefresh = false, refreshInterval = 300000 } = options;
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [statsRes, exchangesRes, tasksRes, docsRes, messagesRes] = await Promise.all([
        apiService.get('/dashboard/stats').catch(() => ({ data: null })),
        apiService.get('/exchanges?limit=20').catch(() => ({ data: [] })),
        apiService.get('/tasks?limit=20').catch(() => ({ data: [] })),
        apiService.get('/documents?limit=20').catch(() => ({ data: [] })),
        apiService.get('/messages/recent?limit=20').catch(() => ({ data: [] }))
      ]);
      
      // Process stats
      const statsData = statsRes.data || {
        exchanges: { total: 0, active: 0, completed: 0, pending: 0 },
        tasks: { total: 0, pending: 0, completed: 0, overdue: 0 },
        documents: { total: 0, recent: 0, pending_signature: 0 },
        messages: { total: 0, unread: 0 }
      };
      
      // Calculate stats from actual data if not provided
      if (exchangesRes.data && Array.isArray(exchangesRes.data)) {
        statsData.exchanges = {
          total: exchangesRes.data.length,
          active: exchangesRes.data.filter((e: any) => e.status === 'IN_PROGRESS' || e.status === 'ACTIVE').length,
          completed: exchangesRes.data.filter((e: any) => e.status === 'COMPLETED').length,
          pending: exchangesRes.data.filter((e: any) => e.status === 'PENDING').length
        };
      }
      
      if (tasksRes.data && Array.isArray(tasksRes.data)) {
        const now = new Date();
        statsData.tasks = {
          total: tasksRes.data.length,
          pending: tasksRes.data.filter((t: any) => t.status === 'PENDING').length,
          completed: tasksRes.data.filter((t: any) => t.status === 'COMPLETED').length,
          overdue: tasksRes.data.filter((t: any) => {
            const dueDate = t.dueDate || t.due_date;
            return dueDate && new Date(dueDate) < now && t.status !== 'COMPLETED';
          }).length
        };
      }
      
      if (docsRes.data && Array.isArray(docsRes.data)) {
        statsData.documents = {
          total: docsRes.data.length,
          recent: docsRes.data.filter((d: any) => {
            const created = new Date(d.created_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return created > weekAgo;
          }).length,
          pending_signature: docsRes.data.filter((d: any) => d.status === 'pending_signature').length
        };
      }
      
      if (messagesRes.data && Array.isArray(messagesRes.data)) {
        const userId = localStorage.getItem('userId');
        statsData.messages = {
          total: messagesRes.data.length,
          unread: messagesRes.data.filter((m: any) => 
            userId && !m.read_by?.includes(userId)
          ).length
        };
      }
      
      setStats(statsData);
      setExchanges(exchangesRes.data || []);
      setTasks(tasksRes.data || []);
      setDocuments(docsRes.data || []);
      setMessages(messagesRes.data || []);
      
      // Fetch users if admin
      if (role === 'admin') {
        try {
          const usersRes = await apiService.get('/users');
          setUsers(usersRes.data || []);
          if (statsData) {
            statsData.users = {
              total: usersRes.data?.length || 0,
              active: usersRes.data?.filter((u: any) => u.status === 'active').length || 0
            };
          }
        } catch (err) {
          console.error('Failed to fetch users:', err);
        }
      }
      
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [role]);

  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const syncPracticePanther = useCallback(async () => {
    try {
      setSyncing(true);
      await apiService.post('/sync/practice-panther', {});
      await fetchDashboardData();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [fetchDashboardData]);

  const clearCache = useCallback(() => {
    // Clear any local storage cache
    localStorage.removeItem('dashboardCache');
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  return {
    stats,
    exchanges,
    tasks,
    documents,
    messages,
    users,
    loading,
    error,
    refreshData,
    syncPracticePanther,
    syncing,
    clearCache
  };
};