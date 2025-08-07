/**
 * Contact Service - Handles contact management operations
 * Extracted from the monolithic API service
 */

import { Contact } from '../../types';
import { httpClient } from '../base/httpClient';
import { safeJsonParse } from '../../utils/validation';

export class ContactService {
  async getContacts(): Promise<Contact[]> {
    // Check if user is admin to request all contacts
    const userStr = localStorage.getItem('user');
    let endpoint = '/contacts';
    
    if (userStr) {
      const user = safeJsonParse<{ role: string }>(userStr);
      if (user && user.role === 'admin') {
        endpoint = '/contacts?limit=2000'; // Admin gets ALL contacts
      }
    }
    
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