/**
 * Exchange Service - Handles all exchange-related operations
 * Extracted from the monolithic API service
 */

import { Exchange } from '../../types';
import { httpClient } from '../base/httpClient';

export class ExchangeService {
  async getExchanges(): Promise<Exchange[]> {
    // Check if user is admin to request all exchanges
    const userStr = localStorage.getItem('user');
    let limit = '20';
    let isAdmin = false;
    
    
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        
        if (user.role === 'admin') {
          limit = '5000'; // Admin gets ALL exchanges (we have 2885)
          isAdmin = true;
          
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    const endpoint = `/exchanges?limit=${limit}`;
    
    
    const response = await httpClient.get<any>(endpoint);
    
    // Handle both array response and paginated response
    if (Array.isArray(response)) {
      
      return response;
    } else if (response && response.exchanges) {
      
      return response.exchanges;
    } else {
      
      return [];
    }
  }

  async getExchange(id: string): Promise<Exchange> {
    return httpClient.get<Exchange>(`/exchanges/${id}`);
  }

  async createExchange(exchangeData: Partial<Exchange>): Promise<Exchange> {
    return httpClient.post<Exchange>('/exchanges', exchangeData);
  }

  async updateExchange(id: string, exchangeData: Partial<Exchange>): Promise<Exchange> {
    return httpClient.put<Exchange>(`/exchanges/${id}`, exchangeData);
  }

  async deleteExchange(id: string): Promise<void> {
    await httpClient.delete<void>(`/exchanges/${id}`);
  }

  async updateExchangeStatus(id: string, status: string): Promise<Exchange> {
    return httpClient.put<Exchange>(`/exchanges/${id}/status`, { status });
  }

  async getExchangeWorkflow(exchangeId: string): Promise<{
    currentStage: string;
    availableActions: string[];
    nextStages: string[];
    requirements: string[];
    progress: number;
  }> {
    return httpClient.get(`/exchanges/${exchangeId}/workflow`);
  }

  async bulkUpdateExchanges(itemIds: string[], updateData: any): Promise<Exchange[]> {
    return httpClient.put<Exchange[]>('/exchanges/bulk-update', {
      itemIds,
      updateData
    });
  }

  // Enterprise exchange methods
  async getEnterpriseExchange(exchangeId: string): Promise<any> {
    return httpClient.get<any>(`/enterprise-exchanges/${exchangeId}`);
  }

  async getEnterpriseExchanges(params?: any): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return httpClient.get<any>(`/enterprise-exchanges${queryString}`);
  }

  async getEnterpriseExchangeStats(): Promise<any> {
    return httpClient.get<any>('/enterprise-exchanges/dashboard/stats');
  }

  async advanceExchangeStage(exchangeId: string, data: { new_stage: string; reason: string }): Promise<any> {
    return httpClient.post<any>(`/enterprise-exchanges/${exchangeId}/advance-stage`, data);
  }

  async getExchangeTimeline(exchangeId: string): Promise<any> {
    return httpClient.get<any>(`/enterprise-exchanges/${exchangeId}/timeline`);
  }

  async getExchangeCompliance(exchangeId: string): Promise<any> {
    return httpClient.get<any>(`/enterprise-exchanges/${exchangeId}/compliance`);
  }

  async getExchangesWithLifecycle(params?: any): Promise<any> {
    // First try enterprise endpoint, fallback to regular
    try {
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      return await httpClient.get<any>(`/enterprise-exchanges${queryString}`);
    } catch (error) {
      // Fallback to regular exchanges endpoint
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      return await httpClient.get<any>(`/exchanges${queryString}`);
    }
  }
}

export const exchangeService = new ExchangeService();