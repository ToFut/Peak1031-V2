/**
 * Message Service - Handles messaging operations
 * Extracted from the monolithic API service
 */

import { Message } from '../../types';
import { httpClient } from '../base/httpClient';

export class MessageService {
  async getMessages(exchangeId?: string): Promise<Message[]> {
    if (exchangeId) {
      return httpClient.get<Message[]>(`/messages/exchange/${exchangeId}`);
    } else {
      return httpClient.get<Message[]>('/messages');
    }
  }

  async getMessage(id: string): Promise<Message> {
    return httpClient.get<Message>(`/messages/${id}`);
  }

  async sendMessage(exchangeId: string, content: string): Promise<Message> {
    return httpClient.post<Message>('/messages', { exchangeId, content, messageType: 'text' });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await httpClient.post<void>(`/messages/${messageId}/read`);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await httpClient.delete<void>(`/messages/${messageId}`);
  }

  async getMessagesByExchange(exchangeId: string): Promise<Message[]> {
    return httpClient.get<Message[]>(`/messages/exchange/${exchangeId}`);
  }

  async getUnreadMessagesCount(): Promise<{ count: number }> {
    return httpClient.get<{ count: number }>('/messages/unread/count');
  }

  async markAllMessagesAsRead(exchangeId: string): Promise<void> {
    // This endpoint doesn't exist in backend yet, commenting out for now
    // await httpClient.post<void>(`/messages/exchange/${exchangeId}/mark-all-read`);
    console.warn('markAllMessagesAsRead not implemented in backend');
  }
}

export const messageService = new MessageService();