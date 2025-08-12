/**
 * Enhanced Task Management Hook with Natural Language Processing and Auto-Complete
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { taskService } from '../services/tasks/taskService';
import { useAuth } from './useAuth';

export interface ParsedTask {
  originalText: string;
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  templateKey: string | null;
  extractedData: Record<string, any>;
  suggestedAssignee: string | null;
  suggestedDueDate: string | null;
  autoActions: string[];
  confidence: number;
}

export interface TaskTemplate {
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  requiredFields: string[];
  autoActions: string[];
  instructions: string;
}

export interface AutoCompleteAction {
  type: 'modal' | 'highlight' | 'navigation';
  component: string;
  props: Record<string, any>;
}

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: string;
  category: string;
  templateKey: string;
}

export const useEnhancedTasks = (exchangeId?: string) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naturalLanguageLoading, setNaturalLanguageLoading] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<Record<string, TaskTemplate>>({});
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [autoCompleteActions, setAutoCompleteActions] = useState<AutoCompleteAction[]>([]);

  // Load tasks
  const loadTasks = useCallback(async (_filters: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const tasks = await taskService.getTasks(exchangeId);
      setTasks(tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  // Load task templates
  const loadTaskTemplates = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/tasks/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaskTemplates(data.data || {});
      }
    } catch (err) {
      console.error('Failed to load task templates:', err);
    }
  }, []);

  // Load task suggestions
  const loadSuggestions = useCallback(async (context: { userId?: string } = {}) => {
    try {
      const params = new URLSearchParams();
      if (exchangeId) params.append('exchangeId', exchangeId);
      if (context.userId) params.append('userId', context.userId);

      const response = await fetch(`http://localhost:5001/api/tasks/suggestions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load task suggestions:', err);
    }
  }, [exchangeId]);

  // Parse natural language without creating task (for preview)
  const parseNaturalLanguage = useCallback(async (text: string, context: Record<string, any> = {}) => {
    setNaturalLanguageLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/tasks/parse-natural', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          exchangeId,
          ...context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse natural language');
      }

      setParsedTask(data.data);
      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse natural language';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setNaturalLanguageLoading(false);
    }
  }, [exchangeId]);

  // Create task from natural language
  const createFromNaturalLanguage = useCallback(async (text: string, context: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/tasks/natural-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          exchangeId,
          ...context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task from natural language');
      }

      // Refresh tasks list
      await loadTasks();
      
      // Set auto-complete actions if available
      if (data.data.autoActions) {
        setAutoCompleteActions(data.data.autoActions);
      }

      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exchangeId, loadTasks]);

  // Create multiple tasks from natural language
  const bulkCreateFromNaturalLanguage = useCallback(async (texts: string[], context: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/tasks/bulk-natural', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tasks: texts,
          exchangeId,
          ...context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tasks from natural language');
      }

      // Refresh tasks list
      await loadTasks();
      
      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tasks';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exchangeId, loadTasks]);

  // Extract tasks from chat message
  const extractFromChatMessage = useCallback(async (message: string, context: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/tasks/from-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message,
          exchangeId,
          ...context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract tasks from chat');
      }

      // Refresh tasks list if tasks were created
      if (data.data && data.data.length > 0) {
        await loadTasks();
      }
      
      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract tasks from chat';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exchangeId, loadTasks]);

  // Get auto-complete actions for a task
  const getAutoCompleteActions = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/tasks/${taskId}/auto-complete`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get auto-complete actions');
      }

      setAutoCompleteActions(data.data.autoActions || []);
      return data.data;

    } catch (err) {
      console.error('Failed to get auto-complete actions:', err);
      return null;
    }
  }, []);

  // Execute auto-complete action
  const executeAutoCompleteAction = useCallback(async (action: AutoCompleteAction) => {
    try {
      console.log('Executing auto-complete action:', action);
      
      // This would trigger the appropriate modal or action in the UI
      // The actual implementation depends on your modal/component management system
      
      // For now, we'll just dispatch a custom event that components can listen to
      const event = new CustomEvent('task-auto-complete', {
        detail: action
      });
      window.dispatchEvent(event);
      
      return true;
    } catch (err) {
      console.error('Failed to execute auto-complete action:', err);
      return false;
    }
  }, []);

  // Regular task CRUD operations (enhanced versions of existing methods)
  const createTask = useCallback(async (taskData: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await taskService.createTask({
        ...taskData,
        exchange_id: exchangeId || taskData.exchange_id
      });
      
      await loadTasks();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exchangeId, loadTasks]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await taskService.updateTask(taskId, updates);
      await loadTasks();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);

    try {
      await taskService.deleteTask(taskId);
      await loadTasks();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadTasks]);

  // Computed values
  const taskStats = useMemo(() => {
    // Ensure tasks is an array
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    
    const pending = tasksArray.filter(t => t.status === 'PENDING' || t.status === 'pending').length;
    const inProgress = tasksArray.filter(t => t.status === 'IN_PROGRESS' || t.status === 'in_progress').length;
    const completed = tasksArray.filter(t => t.status === 'COMPLETED' || t.status === 'completed').length;
    const overdue = tasksArray.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date() && (t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    }).length;

    return {
      total: tasksArray.length,
      pending,
      inProgress,
      completed,
      overdue,
      completionRate: tasksArray.length > 0 ? Math.round((completed / tasksArray.length) * 100) : 0
    };
  }, [tasks]);

  const tasksByPriority = useMemo(() => {
    // Ensure tasks is an array
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    
    return tasksArray.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  // Initialize
  useEffect(() => {
    loadTasks();
    loadTaskTemplates();
    loadSuggestions();
  }, [loadTasks, loadTaskTemplates, loadSuggestions]);

  return {
    // State
    tasks,
    loading,
    error,
    naturalLanguageLoading,
    parsedTask,
    taskTemplates,
    suggestions,
    autoCompleteActions,
    taskStats,
    tasksByPriority,

    // Actions
    loadTasks,
    parseNaturalLanguage,
    createFromNaturalLanguage,
    bulkCreateFromNaturalLanguage,
    extractFromChatMessage,
    getAutoCompleteActions,
    executeAutoCompleteAction,
    
    // Regular CRUD
    createTask,
    updateTask,
    deleteTask,
    
    // Utility
    loadSuggestions,
    clearError: () => setError(null),
    clearParsedTask: () => setParsedTask(null),
    clearAutoCompleteActions: () => setAutoCompleteActions([])
  };
};