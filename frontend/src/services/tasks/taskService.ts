/**
 * Task Service - Handles task management operations
 * Extracted from the monolithic API service
 */

import { Task } from '../../types';
import { httpClient } from '../base/httpClient';

export class TaskService {
  async getTasks(exchangeId?: string): Promise<Task[]> {
    const endpoint = exchangeId ? `/tasks/exchange/${exchangeId}` : '/tasks';
    console.log('📡 TaskService: Making request to endpoint:', endpoint);
    
    try {
      const response = await httpClient.get<any>(endpoint);
      console.log('✅ TaskService: Raw API response:', {
        responseType: typeof response,
        hasSuccess: 'success' in response,
        hasTasks: 'tasks' in response,
        tasksLength: response?.tasks?.length,
        responseKeys: Object.keys(response || {}),
        response: response
      });
      
      // The backend returns { success: true, tasks: [...], total: number, ... }
      // Extract just the tasks array
      const tasks = response.tasks || response || [];
      console.log('✅ TaskService: Returning tasks:', {
        tasksLength: tasks?.length,
        tasksType: typeof tasks,
        isArray: Array.isArray(tasks)
      });
      
      return tasks;
    } catch (error) {
      console.error('❌ TaskService: Request failed:', error);
      throw error;
    }
  }

  async getTask(id: string): Promise<Task> {
    return httpClient.get<Task>(`/tasks/${id}`);
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    console.log('📋 TaskService: Creating task with data:', taskData);
    try {
      const result = await httpClient.post<Task>('/tasks', taskData);
      console.log('✅ TaskService: Task created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ TaskService: Task creation failed:', error);
      throw error;
    }
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    return httpClient.put<Task>(`/tasks/${id}`, taskData);
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    return httpClient.put<Task>(`/tasks/${id}/status`, { status });
  }

  async deleteTask(id: string): Promise<void> {
    await httpClient.delete<void>(`/tasks/${id}`);
  }

  async assignTask(taskId: string, userId: string): Promise<Task> {
    return httpClient.put<Task>(`/tasks/${taskId}/assign`, { userId });
  }

  async getTasksByExchange(exchangeId: string): Promise<Task[]> {
    return httpClient.get<Task[]>(`/exchanges/${exchangeId}/tasks`);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return httpClient.get<Task[]>(`/users/${userId}/tasks`);
  }

  async markTaskComplete(taskId: string): Promise<Task> {
    return this.updateTaskStatus(taskId, 'COMPLETED');
  }
}

export const taskService = new TaskService();