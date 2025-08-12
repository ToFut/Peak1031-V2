/**
 * Task Service - Handles task management operations
 * Extracted from the monolithic API service
 */

import { Task } from '../../types';
import { httpClient } from '../base/httpClient';

export class TaskService {
  async getTasks(exchangeId?: string): Promise<Task[]> {
    const endpoint = exchangeId ? `/exchanges/${exchangeId}/tasks` : '/tasks';
    return httpClient.get<Task[]>(endpoint);
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