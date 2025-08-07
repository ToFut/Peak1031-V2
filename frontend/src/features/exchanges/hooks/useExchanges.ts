import { useState, useEffect, useCallback } from 'react';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';

interface UseExchangesState {
  exchanges: Exchange[];
  loading: boolean;
  error: string | null;
}

interface UseExchangesFilters {
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const useExchanges = (filters?: UseExchangesFilters) => {
  const [state, setState] = useState<UseExchangesState>({
    exchanges: [],
    loading: true,
    error: null,
  });

  // Load exchanges with filters
  const loadExchanges = useCallback(async (customFilters?: UseExchangesFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const filterParams = { ...filters, ...customFilters };
      const response = await apiService.getExchanges(filterParams);
      
      setState({
        exchanges: Array.isArray(response) ? response : response.exchanges || [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error loading exchanges:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load exchanges',
      }));
    }
  }, [filters]);

  // Get single exchange
  const getExchange = useCallback(async (id: string): Promise<Exchange | null> => {
    try {
      return await apiService.getExchange(id);
    } catch (error: any) {
      console.error('Error getting exchange:', error);
      return null;
    }
  }, []);

  // Create exchange
  const createExchange = useCallback(async (exchangeData: Partial<Exchange>): Promise<Exchange | null> => {
    try {
      const newExchange = await apiService.createExchange(exchangeData);
      
      // Optimistically update the local state
      setState(prev => ({
        ...prev,
        exchanges: [newExchange, ...prev.exchanges],
      }));
      
      return newExchange;
    } catch (error: any) {
      console.error('Error creating exchange:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to create exchange',
      }));
      return null;
    }
  }, []);

  // Update exchange
  const updateExchange = useCallback(async (id: string, updates: Partial<Exchange>): Promise<Exchange | null> => {
    try {
      const updatedExchange = await apiService.updateExchange(id, updates);
      
      // Optimistically update the local state
      setState(prev => ({
        ...prev,
        exchanges: prev.exchanges.map(exchange =>
          exchange.id === id ? { ...exchange, ...updatedExchange } : exchange
        ),
      }));
      
      return updatedExchange;
    } catch (error: any) {
      console.error('Error updating exchange:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to update exchange',
      }));
      return null;
    }
  }, []);

  // Delete exchange
  const deleteExchange = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiService.deleteExchange(id);
      
      // Optimistically update the local state
      setState(prev => ({
        ...prev,
        exchanges: prev.exchanges.filter(exchange => exchange.id !== id),
      }));
      
      return true;
    } catch (error: any) {
      console.error('Error deleting exchange:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to delete exchange',
      }));
      return false;
    }
  }, []);

  // Refresh exchanges
  const refresh = useCallback(() => {
    loadExchanges();
  }, [loadExchanges]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load exchanges on mount and when filters change
  useEffect(() => {
    loadExchanges();
  }, [loadExchanges]);

  return {
    exchanges: state.exchanges,
    loading: state.loading,
    error: state.error,
    loadExchanges,
    getExchange,
    createExchange,
    updateExchange,
    deleteExchange,
    refresh,
    clearError,
  };
};