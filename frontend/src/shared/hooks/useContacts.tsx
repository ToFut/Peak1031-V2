import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/shared/services/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { Contact } from '@/shared/types/contact';

interface UseContactsReturn {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  createContact: (contact: Partial<Contact>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  getContact: (id: string) => Contact | undefined;
  searchContacts: (query: string) => Contact[];
  importContacts: (file: File) => Promise<void>;
  exportContacts: () => void;
  syncWithPracticePanther: () => Promise<void>;
  refreshContacts: () => Promise<void>;
}

export const useContacts = (): UseContactsReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/api/contacts');
      
      if (response.success && response.data) {
        setContacts(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch contacts');
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
      
      // Use cached data as fallback
      const cachedData = localStorage.getItem('contacts_cache');
      if (cachedData) {
        setContacts(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Cache contacts
  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem('contacts_cache', JSON.stringify(contacts));
    }
  }, [contacts]);

  // CRUD Operations
  const createContact = useCallback(async (contact: Partial<Contact>): Promise<Contact> => {
    try {
      const response = await apiService.post('/api/contacts', contact);
      if (response.success && response.data) {
        const newContact = response.data;
        setContacts(prev => [newContact, ...prev]);
        return newContact;
      }
      throw new Error(response.error || 'Failed to create contact');
    } catch (err) {
      console.error('Error creating contact:', err);
      throw err;
    }
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>): Promise<Contact> => {
    try {
      const response = await apiService.put(`/api/contacts/${id}`, updates);
      if (response.success && response.data) {
        const updatedContact = response.data;
        setContacts(prev => prev.map(c => 
          c.id === id ? updatedContact : c
        ));
        return updatedContact;
      }
      throw new Error(response.error || 'Failed to update contact');
    } catch (err) {
      console.error('Error updating contact:', err);
      throw err;
    }
  }, []);

  const deleteContact = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await apiService.delete(`/api/contacts/${id}`);
      if (response.success) {
        setContacts(prev => prev.filter(c => c.id !== id));
      } else {
        throw new Error(response.error || 'Failed to delete contact');
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      throw err;
    }
  }, []);

  const getContact = useCallback((id: string): Contact | undefined => {
    return contacts.find(c => c.id === id);
  }, [contacts]);

  // Search functionality
  const searchContacts = useCallback((query: string): Contact[] => {
    const searchLower = query.toLowerCase();
    return contacts.filter(contact => {
      return (
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.company?.toLowerCase().includes(searchLower)
      );
    });
  }, [contacts]);

  // Import contacts from CSV/Excel
  const importContacts = useCallback(async (file: File): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.post('/api/contacts/import', formData);
      if (response.success && response.data) {
        setContacts(prev => [...prev, ...response.data]);
      } else {
        throw new Error(response.error || 'Failed to import contacts');
      }
    } catch (err) {
      console.error('Error importing contacts:', err);
      throw err;
    }
  }, []);

  // Export contacts to CSV
  const exportContacts = useCallback(() => {
    try {
      const csvContent = [
        ['Name', 'Email', 'Phone', 'Company', 'Type', 'Created At'],
        ...contacts.map(c => [
          c.name || '',
          c.email || '',
          c.phone || '',
          c.company || '',
          c.type || '',
          c.created_at || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting contacts:', err);
      throw err;
    }
  }, [contacts]);

  // Sync with Practice Panther
  const syncWithPracticePanther = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiService.post('/api/contacts/sync-pp');
      if (response.success && response.data) {
        setContacts(response.data);
      } else {
        throw new Error(response.error || 'Failed to sync with Practice Panther');
      }
    } catch (err) {
      console.error('Error syncing with Practice Panther:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshContacts = useCallback(async (): Promise<void> => {
    await fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    getContact,
    searchContacts,
    importContacts,
    exportContacts,
    syncWithPracticePanther,
    refreshContacts
  };
};