import { useState, useEffect } from 'react';
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
}

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

  // V2 API with V1 fallback pattern (from EnhancedAdminDashboard)
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try V2 dashboard overview endpoint first
      try {
        
        const overviewData = await apiService.getDashboardOverview();
        
        if (overviewData && typeof overviewData === 'object') {
          
          
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

          setStats(mappedStats);
          
          // Set individual data arrays if provided
          if ((overviewData as any).exchangesList) setExchanges((overviewData as any).exchangesList);
          if ((overviewData as any).tasksList) setTasks((overviewData as any).tasksList);
          if ((overviewData as any).documentsList) setDocuments((overviewData as any).documentsList);
          if ((overviewData as any).messagesList) setMessages((overviewData as any).messagesList);
          if ((overviewData as any).usersList) setUsers((overviewData as any).usersList);
          
          return; // Success, no need for fallback
        }
      } catch (v2Error) {
        
      }

      // Fallback to V1 individual calls (Enhanced pattern)
      
      
      const apiToUse = role === 'admin' ? apiService : roleBasedApiService;
      
      // Load all data in parallel for better performance
      const [exchangesRes, tasksRes, docsRes, messagesRes, usersRes] = await Promise.allSettled([
        apiToUse.getExchanges().catch(err => {
          
          return [];
        }),
        apiToUse.getTasks().catch(err => {
          
          return [];
        }),
        Promise.resolve([]), // Documents placeholder
        Promise.resolve([]), // Messages placeholder  
        Promise.resolve([])  // Users placeholder
      ]);

      // Extract data from settled promises
      const exchangesResult = exchangesRes.status === 'fulfilled' ? exchangesRes.value : { exchanges: [] };
      const tasksResult = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
      const documentsData = docsRes.status === 'fulfilled' ? docsRes.value : [];
      const messagesData = messagesRes.status === 'fulfilled' ? messagesRes.value : [];
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value : [];

      // Extract exchanges array from the result object
      const exchangesData = Array.isArray(exchangesResult) ? exchangesResult : (exchangesResult as any).exchanges || [];
      const tasksData = Array.isArray(tasksResult) ? tasksResult : [];

      // Filter data based on role and user permissions
      const filteredExchanges = filterExchangesByRole(exchangesData, role);
      const filteredTasks = filterTasksByRole(tasksData, role);

      setExchanges(filteredExchanges);
      setTasks(filteredTasks);
      setDocuments(documentsData);
      setMessages(messagesData);
      setUsers(usersData);

      // Calculate stats from individual data
      const now = new Date();
      const calculatedStats: DashboardStats = {
        exchanges: {
          total: filteredExchanges.length,
          pending: filteredExchanges.filter((e: any) => e.status === 'PENDING').length,
          active: filteredExchanges.filter((e: any) => e.status === 'In Progress' || e.status === '45D' || e.status === '180D').length,
          completed: filteredExchanges.filter((e: any) => e.status === 'COMPLETED').length,
          ppSynced: filteredExchanges.filter((e: any) => e.ppId).length,
        },
        tasks: {
          total: filteredTasks.length,
          pending: filteredTasks.filter((t: any) => t.status === 'PENDING').length,
          overdue: filteredTasks.filter((t: any) => {
            if (!t.dueDate || t.status === 'COMPLETED') return false;
            return new Date(t.dueDate) < now;
          }).length,
          completed: filteredTasks.filter((t: any) => t.status === 'COMPLETED').length,
          urgent: filteredTasks.filter((t: any) => t.priority === 'HIGH' && t.status !== 'COMPLETED').length,
          thisWeek: filteredTasks.filter((t: any) => {
            if (!t.dueDate) return false;
            const taskDate = new Date(t.dueDate);
            const weekFromNow = new Date();
            weekFromNow.setDate(now.getDate() + 7);
            return taskDate <= weekFromNow && taskDate >= now;
          }).length,
        },
      };

      // Add role-specific stats
      if (documentsData.length > 0) {
        calculatedStats.documents = {
          total: documentsData.length,
          requireSignature: documentsData.filter((d: any) => d.requiresSignature).length,
          recent: documentsData.filter((d: any) => {
            const docDate = new Date(d.createdAt || d.uploadDate);
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return docDate >= weekAgo;
          }).length,
        };
      }

      if (messagesData.length > 0) {
        calculatedStats.messages = {
          unread: messagesData.filter((m: any) => !m.isRead).length,
          recent: messagesData.filter((m: any) => {
            const msgDate = new Date(m.createdAt);
            const dayAgo = new Date();
            dayAgo.setDate(now.getDate() - 1);
            return msgDate >= dayAgo;
          }).length,
        };
      }

      if (role === 'admin' && usersData.length > 0) {
        calculatedStats.users = {
          total: usersData.length,
          active: usersData.filter((u: any) => u.isActive).length,
          admins: usersData.filter((u: any) => u.role === 'admin').length,
          clients: usersData.filter((u: any) => u.role === 'client').length,
          coordinators: usersData.filter((u: any) => u.role === 'coordinator').length,
        };

        calculatedStats.system = {
          lastSync: (exchangesResult as any).lastSyncTime || null,
          syncStatus: 'success',
          totalDocuments: documentsData.length,
          systemHealth: 'healthy',
        };
      }

      setStats(calculatedStats);

    } catch (err: any) {
      console.error('❌ Dashboard data loading failed:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Role-based data filtering
  const filterExchangesByRole = (exchanges: any[], userRole: string): any[] => {
    if (userRole === 'admin' || userRole === 'coordinator') {
      return exchanges; // Admin and coordinator see all
    }
    
    // Client and others see only their exchanges
    return exchanges.filter((exchange: any) => {
      return exchange.participants?.some((p: any) => p.userId === 'current_user_id'); // TODO: Use actual user ID
    });
  };

  const filterTasksByRole = (tasks: any[], userRole: string): any[] => {
    if (userRole === 'admin' || userRole === 'coordinator') {
      return tasks; // Admin and coordinator see all
    }
    
    // Others see only assigned tasks
    return tasks.filter((task: any) => task.assignedTo === 'current_user_id'); // TODO: Use actual user ID
  };

  // PracticePanther sync function (from EnhancedAdminDashboard)
  const syncPracticePanther = async () => {
    if (role !== 'admin') {
      throw new Error('Only admins can sync PracticePanther data');
    }

    setSyncing(true);
    try {
      await apiService.post('/sync/all', {});
      await loadDashboardData(); // Refresh data after sync
    } catch (err: any) {
      console.error('PracticePanther sync failed:', err);
      throw new Error('Failed to sync PracticePanther data');
    } finally {
      setSyncing(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(loadDashboardData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [role]);

  return {
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
    syncing
  };
};