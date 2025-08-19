/**
 * useAgencies Hook
 * Professional custom hook for agency management
 * Provides state management and operations for agencies
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agencyApi, Agency, AgencyListParams, CreateAgencyRequest, AssignThirdPartiesRequest } from '../services/agencyApi';
import { useAuth } from './useAuth';

// Hook return type
interface UseAgenciesReturn {
  // State
  agencies: Agency[];
  selectedAgency: Agency | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: AgencyListParams;
  
  // Actions
  loadAgencies: (params?: AgencyListParams) => Promise<void>;
  selectAgency: (agencyId: string | null) => Promise<void>;
  createAgency: (request: CreateAgencyRequest) => Promise<Agency>;
  updateAgency: (agencyId: string, updates: Partial<Agency>) => Promise<Agency>;
  deleteAgency: (agencyId: string, hardDelete?: boolean) => Promise<void>;
  assignThirdParties: (agencyId: string, request: AssignThirdPartiesRequest) => Promise<void>;
  removeThirdParties: (agencyId: string, thirdPartyIds: string[]) => Promise<void>;
  searchAgencies: (query: string) => Promise<void>;
  exportAgencies: (format?: 'csv' | 'json') => Promise<void>;
  refreshAgency: (agencyId: string) => Promise<void>;
  setFilters: (filters: AgencyListParams) => void;
  clearError: () => void;
  
  // Computed
  hasMore: boolean;
  isAdmin: boolean;
  canManageAgencies: boolean;
}

/**
 * Custom hook for agency management
 */
export function useAgencies(): UseAgenciesReturn {
  const { user } = useAuth();
  
  // State
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<AgencyListParams>({
    page: 1,
    limit: 20,
    includeStats: true
  });

  // Computed values
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const canManageAgencies = useMemo(() => 
    user?.role === 'admin', 
    [user]
  );
  const hasMore = useMemo(() => 
    pagination.page < pagination.totalPages, 
    [pagination]
  );

  /**
   * Load agencies with filters
   */
  const loadAgencies = useCallback(async (params?: AgencyListParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = params || filters;
      console.log('[useAgencies] Loading agencies with params:', queryParams);
      const response = await agencyApi.getAgencies(queryParams);
      console.log('[useAgencies] Agencies response:', response);
      
      if (response.success) {
        setAgencies(response.data);
        setPagination(response.pagination);
        if (params) {
          setFilters(params);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agencies');
      console.error('[useAgencies] Error loading agencies:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Select an agency and load its details
   */
  const selectAgency = useCallback(async (agencyId: string | null) => {
    if (!agencyId) {
      setSelectedAgency(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.getAgencyById(agencyId);
      
      if (response.success) {
        setSelectedAgency(response.data);
        
        // Update in list if present
        setAgencies(prev => prev.map(agency => 
          agency.id === agencyId ? response.data : agency
        ));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agency details');
      console.error('Error loading agency:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new agency
   */
  const createAgency = useCallback(async (request: CreateAgencyRequest): Promise<Agency> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.createAgency(request);
      
      if (response.success) {
        // Reload agencies to include the new one
        await loadAgencies();
        return response.data.contact;
      }
      
      throw new Error('Failed to create agency');
    } catch (err: any) {
      setError(err.message || 'Failed to create agency');
      console.error('Error creating agency:', err);
      throw new Error(err.message || 'Failed to create agency');
    } finally {
      setLoading(false);
    }
  }, [loadAgencies]);

  /**
   * Update existing agency
   */
  const updateAgency = useCallback(async (agencyId: string, updates: Partial<Agency>): Promise<Agency> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.updateAgency(agencyId, updates);
      
      if (response.success) {
        // Update in state
        setAgencies(prev => prev.map(agency => 
          agency.id === agencyId ? response.data : agency
        ));
        
        if (selectedAgency?.id === agencyId) {
          setSelectedAgency(response.data);
        }
        
        return response.data;
      }
      
      throw new Error('Failed to update agency');
    } catch (err: any) {
      setError(err.message || 'Failed to update agency');
      console.error('Error updating agency:', err);
      throw new Error(err.message || 'Failed to update agency');
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  /**
   * Delete or deactivate agency
   */
  const deleteAgency = useCallback(async (agencyId: string, hardDelete: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.deleteAgency(agencyId, hardDelete);
      
      if (response.success) {
        if (hardDelete) {
          // Remove from state
          setAgencies(prev => prev.filter(agency => agency.id !== agencyId));
        } else {
          // Mark as inactive
          setAgencies(prev => prev.map(agency => 
            agency.id === agencyId ? { ...agency, status: 'inactive' as const } : agency
          ));
        }
        
        if (selectedAgency?.id === agencyId) {
          setSelectedAgency(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete agency');
      console.error('Error deleting agency:', err);
      throw new Error(err.message || 'Failed to delete agency');
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  /**
   * Assign third parties to agency
   */
  const assignThirdParties = useCallback(async (agencyId: string, request: AssignThirdPartiesRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.assignThirdParties(agencyId, request);
      
      if (response.success) {
        // Refresh agency to get updated third parties
        await selectAgency(agencyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign third parties');
      console.error('Error assigning third parties:', err);
      throw new Error(err.message || 'Failed to assign third parties');
    } finally {
      setLoading(false);
    }
  }, [selectAgency]);

  /**
   * Remove third parties from agency
   */
  const removeThirdParties = useCallback(async (agencyId: string, thirdPartyIds: string[]) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agencyApi.removeThirdParties(agencyId, thirdPartyIds);
      
      if (response.success) {
        // Refresh agency to get updated third parties
        await selectAgency(agencyId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove third parties');
      console.error('Error removing third parties:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectAgency]);

  /**
   * Search agencies
   */
  const searchAgencies = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!query.trim()) {
        await loadAgencies();
        return;
      }
      
      const results = await agencyApi.searchAgencies(query);
      setAgencies(results);
      setPagination(prev => ({ ...prev, total: results.length, totalPages: 1 }));
    } catch (err: any) {
      setError(err.message || 'Failed to search agencies');
      console.error('Error searching agencies:', err);
    } finally {
      setLoading(false);
    }
  }, [loadAgencies]);

  /**
   * Export agencies
   */
  const exportAgencies = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      setLoading(true);
      setError(null);
      
      const blob = await agencyApi.exportAgencies(format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agencies_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export agencies');
      console.error('Error exporting agencies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh single agency
   */
  const refreshAgency = useCallback(async (agencyId: string) => {
    try {
      const response = await agencyApi.getAgencyById(agencyId);
      
      if (response.success) {
        setAgencies(prev => prev.map(agency => 
          agency.id === agencyId ? response.data : agency
        ));
        
        if (selectedAgency?.id === agencyId) {
          setSelectedAgency(response.data);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing agency:', err);
    }
  }, [selectedAgency]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load initial data
   */
  useEffect(() => {
    if (canManageAgencies) {
      loadAgencies();
    }
  }, [canManageAgencies]);

  return {
    // State
    agencies,
    selectedAgency,
    loading,
    error,
    pagination,
    filters,
    
    // Actions
    loadAgencies,
    selectAgency,
    createAgency,
    updateAgency,
    deleteAgency,
    assignThirdParties,
    removeThirdParties,
    searchAgencies,
    exportAgencies,
    refreshAgency,
    setFilters,
    clearError,
    
    // Computed
    hasMore,
    isAdmin,
    canManageAgencies
  };
}

// Export default
export default useAgencies;