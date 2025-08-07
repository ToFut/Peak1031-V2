import { useState, useCallback } from 'react';
import { useCachedData } from '../../../hooks/useCachedData';
import { apiService } from '../../../services/api';
import { generalCache } from '../../../services/cache';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  exchange_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateContactData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  exchange_id?: string;
}

interface UpdateContactData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  exchange_id?: string;
  is_active?: boolean;
}

export function useContacts() {
  const { data: contacts = [], loading, error, refetch } = useCachedData<Contact[]>({
    cacheKey: 'contacts',
    endpoint: '/contacts',
    cacheInstance: generalCache,
    ttl: 5 * 60 * 1000, // 5 minutes
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createContact = useCallback(async (contactData: CreateContactData) => {
    try {
      setCreating(true);
      const response = await apiService.post('/contacts', contactData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setCreating(false);
    }
  }, [refetch]);

  const updateContact = useCallback(async (contactId: string, contactData: UpdateContactData) => {
    try {
      setUpdating(true);
      const response = await apiService.post(`/contacts/${contactId}`, contactData);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [refetch]);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      setDeleting(true);
      const response = await apiService.delete(`/contacts/${contactId}`);
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  const activateContact = useCallback(async (contactId: string) => {
    return updateContact(contactId, { is_active: true });
  }, [updateContact]);

  const deactivateContact = useCallback(async (contactId: string) => {
    return updateContact(contactId, { is_active: false });
  }, [updateContact]);

  // Filter contacts by exchange
  const getContactsByExchange = useCallback((exchangeId: string) => {
    return contacts?.filter(contact => contact.exchange_id === exchangeId) || [];
  }, [contacts]);

  // Get active contacts
  const getActiveContacts = useCallback(() => {
    return contacts?.filter(contact => contact.is_active) || [];
  }, [contacts]);

  // Get inactive contacts
  const getInactiveContacts = useCallback(() => {
    return contacts?.filter(contact => !contact.is_active) || [];
  }, [contacts]);

  // Search contacts
  const searchContacts = useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return contacts?.filter(contact => 
      contact.email.toLowerCase().includes(term) ||
      contact.first_name.toLowerCase().includes(term) ||
      contact.last_name.toLowerCase().includes(term) ||
      contact.company?.toLowerCase().includes(term) ||
      contact.role?.toLowerCase().includes(term)
    ) || [];
  }, [contacts]);

  // Get contacts by company
  const getContactsByCompany = useCallback((company: string) => {
    return contacts?.filter(contact => contact.company === company) || [];
  }, [contacts]);

  // Get contacts by role
  const getContactsByRole = useCallback((role: string) => {
    return contacts?.filter(contact => contact.role === role) || [];
  }, [contacts]);

  // Bulk operations
  const bulkUpdateContacts = useCallback(async (contactIds: string[], updateData: UpdateContactData) => {
    try {
      setUpdating(true);
      const response = await apiService.post('/contacts/bulk', {
        contactIds,
        updateData
      });
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [refetch]);

  const bulkDeleteContacts = useCallback(async (contactIds: string[]) => {
    try {
      setDeleting(true);
      const response = await apiService.delete('/contacts/bulk');
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  // Import contacts
  const importContacts = useCallback(async (contactsData: CreateContactData[]) => {
    try {
      setCreating(true);
      const response = await apiService.post('/contacts/import', { contacts: contactsData });
      await refetch(); // Refresh the cache
      return response;
    } catch (error) {
      throw error;
    } finally {
      setCreating(false);
    }
  }, [refetch]);

  // Export contacts
  const exportContacts = useCallback(async (format: 'csv' | 'excel' = 'csv', filters?: any) => {
    try {
      const response = await apiService.post('/contacts/export', {
        format,
        filters
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    contacts,
    loading,
    error,
    creating,
    updating,
    deleting,
    createContact,
    updateContact,
    deleteContact,
    activateContact,
    deactivateContact,
    getContactsByExchange,
    getActiveContacts,
    getInactiveContacts,
    searchContacts,
    getContactsByCompany,
    getContactsByRole,
    bulkUpdateContacts,
    bulkDeleteContacts,
    importContacts,
    exportContacts,
    refetch
  };
} 