/**
 * Contact Service - Handles contact management operations
 * Extracted from the monolithic API service
 */

import { Contact } from '../../types';
import { httpClient } from '../base/httpClient';
import { safeJsonParse } from '../../utils/validation';

export class ContactService {
  async getContacts(options?: { page?: number; limit?: number; search?: string }): Promise<Contact[]> {
    // Use pagination to prevent performance issues
    const { page = 1, limit = 50, search } = options || {};
    
    // Check if user is admin to request more contacts per page
    const userStr = localStorage.getItem('user');
    let userLimit = limit;
    
    if (userStr) {
      const user = safeJsonParse<{ role: string }>(userStr);
      if (user && user.role === 'admin') {
        userLimit = Math.min(limit, 100); // Admin gets more but still paginated
      }
    }
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: userLimit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }
    
    const endpoint = `/contacts?${params.toString()}`;
    
    const response = await httpClient.get<any>(endpoint);
    
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.contacts) {
      return response.contacts;
    } else if (response && response.data) {
      return response.data;
    }
    return [];
  }

  async getContact(id: string): Promise<Contact> {
    return httpClient.get<Contact>(`/contacts/${id}`);
  }

  async createContact(contactData: Partial<Contact>): Promise<Contact> {
    return httpClient.post<Contact>('/contacts', contactData);
  }

  async updateContact(id: string, contactData: Partial<Contact>): Promise<Contact> {
    return httpClient.put<Contact>(`/contacts/${id}`, contactData);
  }

  async deleteContact(id: string): Promise<void> {
    await httpClient.delete<void>(`/contacts/${id}`);
  }

  async searchContacts(query: string): Promise<Contact[]> {
    return httpClient.get<Contact[]>(`/contacts/search?q=${encodeURIComponent(query)}`);
  }
}

export const contactService = new ContactService();