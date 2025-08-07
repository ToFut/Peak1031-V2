import { useState, useCallback } from 'react';
import { useCachedData } from '../../../hooks/useCachedData';
import { apiService } from '../../../services/api';
import { generalCache } from '../../../services/cache';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  assignee_name?: string;
  exchange_id?: string;
  exchange_name?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface CreateTaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  exchange_id?: string;
  due_date?: string;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  exchange_id?: string;
  due_date?: string;
}

export function useTasks() {
  const { data: tasks = [], loading, error, refetch } = useCachedData<Task[]>({
    cacheKey: 'tasks',
    endpoint: '/tasks',
    cacheInstance: generalCache,
    ttl: 2 * 60 * 1000, // 2 minutes
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createTask = useCallback(async (taskData: CreateTaskData) => {
    try {
      setCreating(true);
      const response = await apiService.post('/tasks', taskData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setCreating(false);
    }
  }, [refetch]);

  const updateTask = useCallback(async (taskId: string, taskData: UpdateTaskData) => {
    try {
      setUpdating(true);
      const response = await apiService.put(`/tasks/${taskId}`, taskData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [refetch]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setDeleting(true);
      const response = await apiService.delete(`/tasks/${taskId}`);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  // Task status updates
  const startTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { status: 'in_progress' });
  }, [updateTask]);

  const completeTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { 
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }, [updateTask]);

  const cancelTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { status: 'cancelled' });
  }, [updateTask]);

  const reassignTask = useCallback(async (taskId: string, assigneeId: string) => {
    return updateTask(taskId, { assignee_id: assigneeId });
  }, [updateTask]);

  // Filter tasks by status
  const getTasksByStatus = useCallback((status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  // Filter tasks by priority
  const getTasksByPriority = useCallback((priority: Task['priority']) => {
    return tasks.filter(task => task.priority === priority);
  }, [tasks]);

  // Filter tasks by assignee
  const getTasksByAssignee = useCallback((assigneeId: string) => {
    return tasks.filter(task => task.assignee_id === assigneeId);
  }, [tasks]);

  // Filter tasks by exchange
  const getTasksByExchange = useCallback((exchangeId: string) => {
    return tasks.filter(task => task.exchange_id === exchangeId);
  }, [tasks]);

  // Get overdue tasks
  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );
  }, [tasks]);

  // Get tasks due today
  const getTasksDueToday = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return tasks.filter(task => 
      task.due_date && 
      task.due_date.startsWith(todayStr) &&
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );
  }, [tasks]);

  // Get tasks due this week
  const getTasksDueThisWeek = useCallback(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) <= endOfWeek &&
      new Date(task.due_date) >= now &&
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );
  }, [tasks]);

  // Search tasks
  const searchTasks = useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.assignee_name?.toLowerCase().includes(term) ||
      task.exchange_name?.toLowerCase().includes(term)
    );
  }, [tasks]);

  // Bulk operations
  const bulkUpdateTasks = useCallback(async (taskIds: string[], updateData: UpdateTaskData) => {
    try {
      setUpdating(true);
      const response = await apiService.put('/tasks/bulk', {
        taskIds,
        updateData
      });
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [refetch]);

  const bulkDeleteTasks = useCallback(async (taskIds: string[]) => {
    try {
      setDeleting(true);
      const response = await apiService.delete('/tasks/bulk', {
        data: { taskIds }
      });
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  // Task statistics
  const getTaskStats = useCallback(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const cancelled = tasks.filter(task => task.status === 'cancelled').length;
    const overdue = getOverdueTasks().length;
    const dueToday = getTasksDueToday().length;

    return {
      total,
      completed,
      pending,
      inProgress,
      cancelled,
      overdue,
      dueToday,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [tasks, getOverdueTasks, getTasksDueToday]);

  return {
    tasks,
    loading,
    error,
    creating,
    updating,
    deleting,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    completeTask,
    cancelTask,
    reassignTask,
    getTasksByStatus,
    getTasksByPriority,
    getTasksByAssignee,
    getTasksByExchange,
    getOverdueTasks,
    getTasksDueToday,
    getTasksDueThisWeek,
    searchTasks,
    bulkUpdateTasks,
    bulkDeleteTasks,
    getTaskStats,
    refetch
  };
} 