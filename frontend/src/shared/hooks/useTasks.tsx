import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/shared/services/api';
import { useSocket } from '@/shared/hooks/useSocket';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  exchange_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  tags?: string[];
  attachments?: string[];
}

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: Task['status']) => Promise<void>;
  assignTask: (id: string, userId: string) => Promise<void>;
  getTasksByExchange: (exchangeId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  refreshTasks: () => Promise<void>;
}

export const useTasks = (): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/api/tasks');
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on('task:update', (data: { type: string; task: Task }) => {
      if (data.type === 'created') {
        setTasks(prev => [data.task, ...prev]);
      } else if (data.type === 'updated') {
        setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
      } else if (data.type === 'deleted') {
        setTasks(prev => prev.filter(t => t.id !== data.task.id));
      }
    });
    return () => { socket.off('task:update'); };
  }, [socket]);

  const createTask = useCallback(async (task: Partial<Task>): Promise<Task> => {
    const response = await apiService.post('/api/tasks', task);
    if (response.success && response.data) {
      const newTask = response.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    }
    throw new Error('Failed to create task');
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<Task> => {
    const response = await apiService.put(`/api/tasks/${id}`, updates);
    if (response.success && response.data) {
      const updatedTask = response.data;
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    }
    throw new Error('Failed to update task');
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const response = await apiService.delete(`/api/tasks/${id}`);
    if (response.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  const moveTask = useCallback(async (id: string, status: Task['status']): Promise<void> => {
    await updateTask(id, { status });
  }, [updateTask]);

  const assignTask = useCallback(async (id: string, userId: string): Promise<void> => {
    await updateTask(id, { assigned_to: userId });
  }, [updateTask]);

  const getTasksByExchange = useCallback((exchangeId: string): Task[] => {
    return tasks.filter(t => t.exchange_id === exchangeId);
  }, [tasks]);

  const getTasksByStatus = useCallback((status: Task['status']): Task[] => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const refreshTasks = useCallback(async (): Promise<void> => {
    await fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    assignTask,
    getTasksByExchange,
    getTasksByStatus,
    refreshTasks
  };
};