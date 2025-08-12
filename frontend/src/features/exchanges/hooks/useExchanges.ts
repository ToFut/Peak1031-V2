import { useState, useEffect, useCallback, useRef } from 'react';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { useSocketEvent } from '../../../hooks/useSocket';

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
  const hasFetchedRef = useRef(false);

  // Load exchanges with filters
  const loadExchanges = useCallback(async (customFilters?: UseExchangesFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // The API service getExchanges method doesn't accept parameters yet
      // So we get all exchanges and filter client-side for now
      const response = await apiService.getExchanges();
      
      const exchanges = Array.isArray(response) ? response : (response as any)?.exchanges || [];
      
      setState({
        exchanges,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('❌ useExchanges: Error loading exchanges:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load exchanges',
      }));
    }
  }, []);

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
      // TODO: apiService.deleteExchange doesn't exist yet - need to implement
      console.warn('Delete exchange not implemented yet');
      setState(prev => ({
        ...prev,
        error: 'Delete functionality not yet implemented',
      }));
      return false;
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

  // Listen for real-time participant changes that might affect exchange visibility
  useSocketEvent('participant_added', useCallback((data: any) => {
    console.log('🔔 useExchanges: Received participant_added event, refreshing exchanges...', data);
    // Refresh exchanges when someone is added as participant (user might see new exchanges)
    // Force immediate refresh without loading state to maintain UX
    setTimeout(() => loadExchanges(), 100);
  }, [loadExchanges]));

  useSocketEvent('participant_removed', useCallback((data: any) => {
    console.log('🔔 useExchanges: Received participant_removed event, refreshing exchanges...', data);
    // Refresh exchanges when someone is removed as participant (user might lose access)
    setTimeout(() => loadExchanges(), 100);
  }, [loadExchanges]));

  // Listen for invitation notifications to immediately refresh exchange list
  useSocketEvent('invitation_notification', useCallback((data: any) => {
    console.log('🔔 useExchanges: Received invitation_notification, refreshing exchanges immediately...', data);
    // Immediate refresh when user is invited to ensure they see the new exchange
    setTimeout(() => loadExchanges(), 200);
  }, [loadExchanges]));

  // Load exchanges on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadExchanges();
    }
  }, []); // Empty dependency array - only run on mount

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