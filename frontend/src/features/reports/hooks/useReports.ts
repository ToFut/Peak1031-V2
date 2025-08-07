import { useState, useCallback } from 'react';
import { useCachedData } from '../../../hooks/useCachedData';
import { apiService } from '../../../services/api';
import { generalCache } from '../../../services/cache';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  exchangeId?: string;
  userId?: string;
  category?: string;
  status?: string;
}

interface ExchangeReport {
  totalExchanges: number;
  activeExchanges: number;
  completedExchanges: number;
  totalValue: number;
  averageValue: number;
  exchangesByStatus: Record<string, number>;
  exchangesByMonth: Record<string, number>;
}

interface DocumentReport {
  totalDocuments: number;
  documentsByCategory: Record<string, number>;
  totalStorageUsed: number;
  recentUploads: number;
  documentsByMonth: Record<string, number>;
}

interface UserReport {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  recentLogins: number;
  userActivity: Record<string, number>;
}

interface TaskReport {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByAssignee: Record<string, number>;
}

export function useReports() {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Get exchange report data
  const { data: exchangeReport, loading: exchangeLoading, error: exchangeError, refetch: refetchExchange } = useCachedData<ExchangeReport>({
    cacheKey: 'exchange-report',
    endpoint: '/reports/exchanges',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  // Get document report data
  const { data: documentReport, loading: documentLoading, error: documentError, refetch: refetchDocument } = useCachedData<DocumentReport>({
    cacheKey: 'document-report',
    endpoint: '/reports/documents',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  // Get user report data
  const { data: userReport, loading: userLoading, error: userError, refetch: refetchUser } = useCachedData<UserReport>({
    cacheKey: 'user-report',
    endpoint: '/reports/users',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  // Get task report data
  const { data: taskReport, loading: taskLoading, error: taskError, refetch: refetchTask } = useCachedData<TaskReport>({
    cacheKey: 'task-report',
    endpoint: '/reports/tasks',
    cacheInstance: generalCache,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  const generateCustomReport = useCallback(async (filters: ReportFilters, reportType: string) => {
    try {
      setGenerating(true);
      const response = await apiService.post('/reports/custom', {
        filters,
        reportType
      });
      return response;
    } catch (error) {
      throw error;
    } finally {
      setGenerating(false);
    }
  }, []);

  const exportReport = useCallback(async (reportType: string, format: 'pdf' | 'csv' | 'excel', filters?: ReportFilters) => {
    try {
      setExporting(true);
      const response = await apiService.post('/reports/export', {
        reportType,
        format,
        filters
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setExporting(false);
    }
  }, []);

  const refreshAllReports = useCallback(async () => {
    await Promise.all([
      refetchExchange(),
      refetchDocument(),
      refetchUser(),
      refetchTask()
    ]);
  }, [refetchExchange, refetchDocument, refetchUser, refetchTask]);

  // Get dashboard summary
  const getDashboardSummary = useCallback(() => {
    if (!exchangeReport || !documentReport || !userReport || !taskReport) {
      return null;
    }

    return {
      totalExchanges: exchangeReport.totalExchanges,
      totalDocuments: documentReport.totalDocuments,
      totalUsers: userReport.totalUsers,
      totalTasks: taskReport.totalTasks,
      activeExchanges: exchangeReport.activeExchanges,
      completedTasks: taskReport.completedTasks,
      totalStorageUsed: documentReport.totalStorageUsed,
      recentUploads: documentReport.recentUploads
    };
  }, [exchangeReport, documentReport, userReport, taskReport]);

  // Check if any reports are loading
  const isLoading = exchangeLoading || documentLoading || userLoading || taskLoading;

  // Check if any reports have errors
  const hasError = exchangeError || documentError || userError || taskError;

  return {
    // Report data
    exchangeReport,
    documentReport,
    userReport,
    taskReport,
    
    // Loading states
    isLoading,
    exchangeLoading,
    documentLoading,
    userLoading,
    taskLoading,
    generating,
    exporting,
    
    // Error states
    hasError,
    exchangeError,
    documentError,
    userError,
    taskError,
    
    // Actions
    generateCustomReport,
    exportReport,
    refreshAllReports,
    getDashboardSummary,
    
    // Individual refetch functions
    refetchExchange,
    refetchDocument,
    refetchUser,
    refetchTask
  };
} 