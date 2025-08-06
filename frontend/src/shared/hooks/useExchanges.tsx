import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/shared/services/api';
import { useSocket } from '@/shared/hooks/useSocket';
import { useAuth } from '@/shared/hooks/useAuth';
import { Exchange } from '@/shared/types/exchange';

interface UseExchangesReturn {
  exchanges: Exchange[];
  loading: boolean;
  error: string | null;
  createExchange: (exchange: Partial<Exchange>) => Promise<Exchange>;
  updateExchange: (id: string, updates: Partial<Exchange>) => Promise<Exchange>;
  deleteExchange: (id: string) => Promise<void>;
  getExchange: (id: string) => Exchange | undefined;
  refreshExchanges: () => Promise<void>;
  filteredExchanges: Exchange[];
  setFilter: (filter: ExchangeFilter) => void;
}

interface ExchangeFilter {
  status?: string;
  clientId?: string;
  dateRange?: { start: Date; end: Date };
  search?: string;
}

export const useExchanges = (): UseExchangesReturn => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExchangeFilter>({});
  const { user } = useAuth();
  const socket = useSocket();

  // Fetch exchanges with caching
  const fetchExchanges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/api/exchanges');
      
      if (response.success && response.data) {
        setExchanges(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch exchanges');
      }
    } catch (err) {
      console.error('Error fetching exchanges:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exchanges');
      // Use fallback data if available
      const cachedData = localStorage.getItem('exchanges_cache');
      if (cachedData) {
        setExchanges(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleExchangeUpdate = (data: { type: string; exchange: Exchange }) => {
      if (data.type === 'created') {
        setExchanges(prev => [data.exchange, ...prev]);
      } else if (data.type === 'updated') {
        setExchanges(prev => prev.map(e => 
          e.id === data.exchange.id ? data.exchange : e
        ));
      } else if (data.type === 'deleted') {
        setExchanges(prev => prev.filter(e => e.id !== data.exchange.id));
      }
    };

    socket.on('exchange:update', handleExchangeUpdate);

    return () => {
      socket.off('exchange:update', handleExchangeUpdate);
    };
  }, [socket]);

  // Cache exchanges in localStorage
  useEffect(() => {
    if (exchanges.length > 0) {
      localStorage.setItem('exchanges_cache', JSON.stringify(exchanges));
    }
  }, [exchanges]);

  // CRUD Operations
  const createExchange = useCallback(async (exchange: Partial<Exchange>): Promise<Exchange> => {
    try {
      const response = await apiService.post('/api/exchanges', exchange);
      if (response.success && response.data) {
        const newExchange = response.data;
        setExchanges(prev => [newExchange, ...prev]);
        return newExchange;
      }
      throw new Error(response.error || 'Failed to create exchange');
    } catch (err) {
      console.error('Error creating exchange:', err);
      throw err;
    }
  }, []);

  const updateExchange = useCallback(async (id: string, updates: Partial<Exchange>): Promise<Exchange> => {
    try {
      const response = await apiService.put(`/api/exchanges/${id}`, updates);
      if (response.success && response.data) {
        const updatedExchange = response.data;
        setExchanges(prev => prev.map(e => 
          e.id === id ? updatedExchange : e
        ));
        return updatedExchange;
      }
      throw new Error(response.error || 'Failed to update exchange');
    } catch (err) {
      console.error('Error updating exchange:', err);
      throw err;
    }
  }, []);

  const deleteExchange = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await apiService.delete(`/api/exchanges/${id}`);
      if (response.success) {
        setExchanges(prev => prev.filter(e => e.id !== id));
      } else {
        throw new Error(response.error || 'Failed to delete exchange');
      }
    } catch (err) {
      console.error('Error deleting exchange:', err);
      throw err;
    }
  }, []);

  const getExchange = useCallback((id: string): Exchange | undefined => {
    return exchanges.find(e => e.id === id);
  }, [exchanges]);

  const refreshExchanges = useCallback(async (): Promise<void> => {
    await fetchExchanges();
  }, [fetchExchanges]);

  // Role-based filtering
  const filteredExchanges = exchanges.filter(exchange => {
    // Apply role-based filtering
    if (user?.role === 'client' && exchange.client_id !== user.id) {
      return false;
    }
    if (user?.role === 'third_party' && !exchange.third_party_ids?.includes(user.id)) {
      return false;
    }

    // Apply custom filters
    if (filter.status && exchange.status !== filter.status) {
      return false;
    }
    if (filter.clientId && exchange.client_id !== filter.clientId) {
      return false;
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        exchange.exchange_id?.toLowerCase().includes(searchLower) ||
        exchange.relinquished_property?.toLowerCase().includes(searchLower) ||
        exchange.replacement_property?.toLowerCase().includes(searchLower)
      );
    }
    if (filter.dateRange) {
      const exchangeDate = new Date(exchange.created_at);
      return exchangeDate >= filter.dateRange.start && exchangeDate <= filter.dateRange.end;
    }

    return true;
  });

  return {
    exchanges: filteredExchanges,
    loading,
    error,
    createExchange,
    updateExchange,
    deleteExchange,
    getExchange,
    refreshExchanges,
    filteredExchanges,
    setFilter
  };
};