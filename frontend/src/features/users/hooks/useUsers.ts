import { useState, useCallback } from 'react';
import { useCachedData } from '../../../hooks/useCachedData';
import { apiService } from '../../../services/api';
import { generalCache } from '../../../services/cache';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  two_fa_enabled: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  password?: string;
}

interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  email_verified?: boolean;
  two_fa_enabled?: boolean;
}

export function useUsers() {
  const { data: users = [], loading, error, refetch } = useCachedData<User[]>({
    cacheKey: 'users',
    endpoint: '/users',
    cacheInstance: generalCache,
    ttl: 5 * 60 * 1000, // 5 minutes
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createUser = useCallback(async (userData: CreateUserData) => {
    try {
      setCreating(true);
      const response = await apiService.post('/users', userData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setCreating(false);
    }
  }, [refetch]);

  const updateUser = useCallback(async (userId: string, userData: UpdateUserData) => {
    try {
      setUpdating(true);
      const response = await apiService.put(`/users/${userId}`, userData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [refetch]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setDeleting(true);
      const response = await apiService.delete(`/users/${userId}`);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  const activateUser = useCallback(async (userId: string) => {
    return updateUser(userId, { is_active: true });
  }, [updateUser]);

  const deactivateUser = useCallback(async (userId: string) => {
    return updateUser(userId, { is_active: false });
  }, [updateUser]);

  const resetPassword = useCallback(async (userId: string) => {
    try {
      const response = await apiService.post(`/users/${userId}/reset-password`, {});
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const enableTwoFA = useCallback(async (userId: string) => {
    return updateUser(userId, { two_fa_enabled: true });
  }, [updateUser]);

  const disableTwoFA = useCallback(async (userId: string) => {
    return updateUser(userId, { two_fa_enabled: false });
  }, [updateUser]);

  // Filter users by role
  const getUsersByRole = useCallback((role: string) => {
    return users?.filter(user => user.role === role) || [];
  }, [users]);

  // Get active users
  const getActiveUsers = useCallback(() => {
    return users?.filter(user => user.is_active) || [];
  }, [users]);

  // Get inactive users
  const getInactiveUsers = useCallback(() => {
    return users?.filter(user => !user.is_active) || [];
  }, [users]);

  // Search users
  const searchUsers = useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return users?.filter(user => 
      (user.email || '').toLowerCase().includes(term) ||
      (user.first_name || '').toLowerCase().includes(term) ||
      (user.last_name || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term)
    ) || [];
  }, [users]);

  return {
    users,
    loading,
    error,
    creating,
    updating,
    deleting,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    resetPassword,
    enableTwoFA,
    disableTwoFA,
    getUsersByRole,
    getActiveUsers,
    getInactiveUsers,
    searchUsers,
    refetch
  };
} 