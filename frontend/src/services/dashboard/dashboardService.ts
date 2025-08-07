/**
 * Dashboard Service - Handles dashboard and analytics operations
 * Extracted from the monolithic API service
 */

import { AuditLog, SyncLog } from '../../types';
import { httpClient } from '../base/httpClient';

export class DashboardService {
  // Dashboard Overview
  async getDashboardOverview(): Promise<{
    exchanges: { total: number; active: number; completed: number };
    users: { total: number; active: number };
    tasks: { total: number; pending: number; completed: number };
  }> {
    return httpClient.get('/dashboard/overview');
  }

  async getExchangeMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    pending: number;
  }> {
    return httpClient.get('/dashboard/exchange-metrics');
  }

  async getDeadlines(): Promise<{
    deadlines: Array<{
      id: string;
      type: '45-day' | '180-day';
      deadline: string;
      exchangeName: string;
      daysRemaining?: number;
    }>;
  }> {
    return httpClient.get('/dashboard/deadlines');
  }

  async getFinancialSummary(): Promise<{
    totalValue: number;
    completedValue: number;
    pendingValue: number;
    averageExchangeValue: number;
  }> {
    return httpClient.get('/dashboard/financial-summary');
  }

  async getRecentActivity(): Promise<{
    activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
      exchangeId?: string;
    }>;
  }> {
    return httpClient.get('/dashboard/recent-activity');
  }

  async getAlerts(): Promise<{
    alerts: Array<{
      id: string;
      type: 'deadline' | 'compliance' | 'system';
      level: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      exchangeId?: string;
      deadline?: string;
      read: boolean;
    }>;
  }> {
    return httpClient.get('/dashboard/alerts');
  }

  async getUserActivity(): Promise<{
    activity: Array<{
      action: string;
      timestamp: string;
      details?: any;
    }>;
  }> {
    return httpClient.get('/dashboard/user-activity');
  }

  async getDashboardStats(): Promise<any> {
    return httpClient.get('/admin/stats');
  }

  // Audit and Sync Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return httpClient.get<AuditLog[]>('/admin/audit-logs');
  }

  async getAuditLogsFiltered(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    auditLogs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return httpClient.get(`/audit-logs${queryParams}`);
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    return httpClient.get<SyncLog[]>('/sync/logs');
  }

  // System Settings
  async getSystemSettings(): Promise<any> {
    return httpClient.get('/admin/system-settings');
  }

  async updateSystemSettings(settings: any): Promise<any> {
    return httpClient.put('/admin/system-settings', settings);
  }

  async getSettings(): Promise<any> {
    return httpClient.get('/settings');
  }

  async updateSettings(settings: any): Promise<any> {
    return httpClient.put('/settings', settings);
  }

  // Export Operations
  async bulkExportData(type: string, options?: any): Promise<Blob> {
    const endpoint = `/admin/export/${type}${options ? '?' + new URLSearchParams(options).toString() : ''}`;
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: options ? JSON.stringify(options) : undefined
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async exportEnterpriseData(type: string, filters?: any): Promise<Blob> {
    const endpoint = `/enterprise-exchanges/export/${type}`;
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: filters ? JSON.stringify(filters) : undefined
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}

export const dashboardService = new DashboardService();