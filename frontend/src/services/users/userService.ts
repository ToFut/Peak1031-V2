/**
 * User Service - Handles user management operations
 * Extracted from the monolithic API service
 */

import { User } from '../../types';
import { httpClient } from '../base/httpClient';

export class UserService {
  async getUsers(): Promise<User[]> {
    return httpClient.get<User[]>('/admin/users');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return httpClient.post<User>('/auth/register', userData);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return httpClient.put<User>(`/admin/users/${id}`, userData);
  }

  async deleteUser(id: string): Promise<void> {
    await httpClient.delete<void>(`/admin/users/${id}`);
  }

  async activateUser(userId: string): Promise<User> {
    return httpClient.post<User>(`/admin/users/${userId}/activate`);
  }

  async deactivateUser(userId: string): Promise<User> {
    return httpClient.post<User>(`/admin/users/${userId}/deactivate`);
  }

  async getUserPermissions(): Promise<{ role: string; permissions: string[] }> {
    return httpClient.get<{ role: string; permissions: string[] }>('/auth/permissions');
  }

  async updateUserProfile(userData: Partial<User>): Promise<User> {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser.id) {
      throw new Error('No current user found');
    }
    
    return this.updateUser(currentUser.id, userData);
  }
}

export const userService = new UserService();