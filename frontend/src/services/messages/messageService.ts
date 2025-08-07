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
    return httpClient.post<Message>(`/exchanges/${exchangeId}/messages`, { content });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await httpClient.post<void>(`/messages/${messageId}/read`);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await httpClient.delete<void>(`/messages/${messageId}`);
  }

  async getMessagesByExchange(exchangeId: string): Promise<Message[]> {
    return httpClient.get<Message[]>(`/exchanges/${exchangeId}/messages`);
  }

  async getUnreadMessagesCount(): Promise<{ count: number }> {
    return httpClient.get<{ count: number }>('/messages/unread/count');
  }

  async markAllMessagesAsRead(exchangeId: string): Promise<void> {
    await httpClient.post<void>(`/exchanges/${exchangeId}/messages/mark-all-read`);
  }
}

export const messageService = new MessageService();