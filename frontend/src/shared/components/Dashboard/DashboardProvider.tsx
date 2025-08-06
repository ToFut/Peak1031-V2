import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/shared/services/api';
import { smartApi } from '../../services/smartApi';
import { useAuth } from '@/shared/hooks/useAuth';

interface DashboardData {
  exchanges: any[];
  tasks: any[];
  documents: any[];
  contacts: any[];
  stats: {
    totalUsers: number;
    totalExchanges: number;
    activeExchanges: number;
    pendingTasks: number;
    completedThisMonth: number;
    totalValue: string;
    upcomingDeadlines: number;
    overdueItems: number;
  };
  loading: boolean;
  error: string | null;
}

interface DashboardContextType {
  data: DashboardData;
  refetch: () => Promise<void>;
  updateData: (updates: Partial<DashboardData>) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    exchanges: [],
    tasks: [],
    documents: [],
    contacts: [],
    stats: {
      totalUsers: 0,
      totalExchanges: 0,
      activeExchanges: 0,
      pendingTasks: 0,
      completedThisMonth: 0,
      totalValue: '$0',
      upcomingDeadlines: 0,
      overdueItems: 0,
    },
    loading: true,
    error: null,
  });

  const fetchDashboardData = async () => {
    if (!user) return;

    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Fetch data based on user role
      const promises: Promise<any>[] = [];
      
      // Everyone gets exchanges
      promises.push(smartApi.getExchanges({ useCache: user.role !== 'admin' }));
      
      // Admin gets additional data
      if (user.role === 'admin') {
        promises.push(
          smartApi.getExchangeStats(),
          smartApi.getUserStats(),
          smartApi.getSystemStats()
        );
      } else {
        // Non-admin users get role-specific data
        promises.push(smartApi.getTasks());
      }

      const results = await Promise.allSettled(promises);
      
      let exchanges: any[] = [];
      let tasks: any[] = [];
      let stats = data.stats;

      // Process results
      if (results[0].status === 'fulfilled') {
        exchanges = Array.isArray(results[0].value) 
          ? results[0].value 
          : results[0].value?.exchanges || [];
      }

      if (user.role === 'admin') {
        // Admin specific stats processing
        if (results[1].status === 'fulfilled') {
          const exchangeStats = results[1].value;
          stats = {
            ...stats,
            totalExchanges: exchangeStats.totalExchanges || exchangeStats.total || exchanges.length,
            activeExchanges: exchangeStats.activeExchanges || exchangeStats.active || 0,
            completedThisMonth: exchangeStats.completedThisMonth || 0,
            totalValue: exchangeStats.totalValue || '$0',
          };
        }
        
        if (results[2].status === 'fulfilled') {
          const userStats = results[2].value;
          stats = {
            ...stats,
            totalUsers: userStats.total || 0,
          };
        }
      } else {
        // Non-admin users
        if (results[1].status === 'fulfilled') {
          tasks = Array.isArray(results[1].value) 
            ? results[1].value 
            : results[1].value?.tasks || [];
        }
        
        // Calculate user-specific stats
        stats = {
          ...stats,
          totalExchanges: exchanges.length,
          activeExchanges: exchanges.filter((ex: any) => 
            ex.status === 'ACTIVE' || ex.status === '45D' || ex.status === '180D'
          ).length,
          pendingTasks: tasks.filter((task: any) => 
            task.status === 'PENDING' || task.status === 'IN_PROGRESS'
          ).length,
        };
      }

      setData(prev => ({
        ...prev,
        exchanges,
        tasks,
        stats,
        loading: false,
      }));

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data',
      }));
    }
  };

  const updateData = (updates: Partial<DashboardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const contextValue: DashboardContextType = {
    data,
    refetch: fetchDashboardData,
    updateData,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};