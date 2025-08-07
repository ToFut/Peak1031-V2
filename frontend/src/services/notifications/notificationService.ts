/**
 * Notification Service - Handles notification operations
 * Extracted from the monolithic API service
 */

import { httpClient } from '../base/httpClient';

export class NotificationService {
  async getNotifications(): Promise<any[]> {
    const response = await httpClient.get<{ notifications: any[] }>('/notifications');
    return response.notifications || [];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await httpClient.put<void>(`/notifications/${id}/read`);
  }

  async deleteNotification(id: string): Promise<void> {
    await httpClient.delete<void>(`/notifications/${id}`);
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return httpClient.get<{ count: number }>('/notifications/unread/count');
  }

  async markAllAsRead(): Promise<void> {
    await httpClient.post<void>('/notifications/mark-all-read');
  }

  async updateNotificationPreferences(preferences: {
    email: boolean;
    sms: boolean;
    deadlineAlerts: boolean;
    taskAssignments: boolean;
    exchangeUpdates: boolean;
  }): Promise<any> {
    return httpClient.post('/notifications/preferences', preferences);
  }

  async getNotificationPreferences(): Promise<{
    email: boolean;
    sms: boolean;
    deadlineAlerts: boolean;
    taskAssignments: boolean;
    exchangeUpdates: boolean;
  }> {
    return httpClient.get('/notifications/preferences');
  }

  async subscribeToExchangeNotifications(exchangeId: string): Promise<void> {
    await httpClient.post(`/exchanges/${exchangeId}/notifications/subscribe`);
  }

  async unsubscribeFromExchangeNotifications(exchangeId: string): Promise<void> {
    await httpClient.post(`/exchanges/${exchangeId}/notifications/unsubscribe`);
  }
}

export const notificationService = new NotificationService();