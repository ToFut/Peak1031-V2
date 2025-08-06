import { useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRolePermissions } from '@/shared/hooks/useRolePermissions';

export interface UseRoleBasedDataReturn {
  filterExchanges: (exchanges: any[]) => any[];
  filterTasks: (tasks: any[]) => any[];
  filterContacts: (contacts: any[]) => any[];
  filterDocuments: (documents: any[]) => any[];
  filterMessages: (messages: any[]) => any[];
  getVisibleColumns: (resource: string) => string[];
  getDefaultFilters: () => Record<string, any>;
}

export const useRoleBasedData = (): UseRoleBasedDataReturn => {
  const { user } = useAuth();
  const { permissions, canView } = useRolePermissions();

  const filterExchanges = useMemo(() => (exchanges: any[]) => {
    if (!user || !exchanges?.length) return [];

    const viewPermission = permissions.exchanges.view;
    
    switch (viewPermission) {
      case 'all':
        return exchanges;
      
      case 'assigned':
        return exchanges.filter((ex: any) => {
          // Client or assigned participant
          if (ex.clientId === user.id) return true;
          if (ex.coordinatorId === user.id) return true;
          if (ex.exchangeParticipants) {
            return ex.exchangeParticipants.some((p: any) => 
              p.contact?.email === user.email || p.user?.id === user.id
            );
          }
          return false;
        });
      
      case 'managed':
        return exchanges.filter((ex: any) => ex.coordinatorId === user.id);
      
      case 'participating':
        return exchanges.filter((ex: any) => {
          if (ex.exchangeParticipants) {
            return ex.exchangeParticipants.some((p: any) => 
              p.user?.id === user.id || 
              (user.role === 'third_party' && p.contact?.company === user?.company) ||
              (user.role === 'agency' && p.user?.company === user?.company)
            );
          }
          return false;
        });
      
      default:
        return [];
    }
  }, [user, permissions.exchanges.view]);

  const filterTasks = useMemo(() => (tasks: any[]) => {
    if (!user || !tasks?.length) return [];

    const viewPermission = permissions.tasks.view;
    
    switch (viewPermission) {
      case 'all':
        return tasks;
      
      case 'assigned':
        return tasks.filter((task: any) => 
          task.assignedTo === user.id || task.createdBy === user.id
        );
      
      case 'managed':
        // For coordinators: tasks in exchanges they manage
        return tasks.filter((task: any) => {
          if (task.assignedTo === user.id || task.createdBy === user.id) return true;
          // Add logic to check if task belongs to managed exchange
          return false;
        });
      
      case 'none':
      default:
        return [];
    }
  }, [user, permissions.tasks.view]);

  const filterContacts = useMemo(() => (contacts: any[]) => {
    if (!user || !contacts?.length) return [];

    const viewPermission = permissions.contacts.view;
    
    switch (viewPermission) {
      case 'all':
        return contacts;
      
      case 'assigned':
        // Contacts from user's exchanges
        return contacts.filter((contact: any) => {
          // This would need exchange data to properly filter
          return true; // Placeholder
        });
      
      case 'company':
        return contacts.filter((contact: any) => 
          contact.company === user?.company || 
          contact.createdBy === user.id
        );
      
      case 'none':
      default:
        return [];
    }
  }, [user, permissions.contacts.view]);

  const filterDocuments = useMemo(() => (documents: any[]) => {
    if (!user || !documents?.length) return [];

    const viewPermission = permissions.documents.view;
    
    switch (viewPermission) {
      case 'all':
        return documents;
      
      case 'assigned':
        return documents.filter((doc: any) => 
          doc.uploadedBy === user.id || 
          doc.exchangeId // Documents from user's exchanges
        );
      
      case 'none':
      default:
        return [];
    }
  }, [user, permissions.documents.view]);

  const filterMessages = useMemo(() => (messages: any[]) => {
    if (!user || !messages?.length) return [];

    const viewPermission = permissions.messages.view;
    
    switch (viewPermission) {
      case 'all':
        return messages;
      
      case 'assigned':
        return messages.filter((msg: any) => 
          msg.senderId === user.id || 
          msg.recipientId === user.id ||
          msg.participants?.includes(user.id)
        );
      
      case 'none':
      default:
        return [];
    }
  }, [user, permissions.messages.view]);

  const getVisibleColumns = (resource: string): string[] => {
    // Define visible columns based on role
    const columnConfigs: Record<string, Record<string, string[]>> = {
      exchanges: {
        admin: ['name', 'status', 'client', 'coordinator', 'created', 'actions'],
        coordinator: ['name', 'status', 'client', 'progress', 'due_date', 'actions'],
        client: ['name', 'status', 'coordinator', 'progress', 'next_steps'],
        third_party: ['name', 'status', 'our_role', 'progress'],
        agency: ['name', 'status', 'our_services', 'client', 'progress']
      },
      tasks: {
        admin: ['title', 'assignee', 'exchange', 'due_date', 'status', 'actions'],
        coordinator: ['title', 'assignee', 'exchange', 'due_date', 'priority', 'actions'],
        client: ['title', 'due_date', 'status', 'progress'],
        third_party: ['title', 'due_date', 'status'],
        agency: ['title', 'assignee', 'due_date', 'status', 'actions']
      }
    };

    const userRole = user?.role || 'client';
    return columnConfigs[resource]?.[userRole] || [];
  };

  const getDefaultFilters = (): Record<string, any> => {
    const userRole = user?.role || 'client';
    
    const defaultFilters: Record<string, Record<string, any>> = {
      admin: {
        exchanges: { status: 'all' },
        tasks: { status: 'pending' }
      },
      coordinator: {
        exchanges: { status: 'active', coordinator: user?.id },
        tasks: { status: 'pending', assigned_to: user?.id }
      },
      client: {
        exchanges: { participant: user?.id },
        tasks: { assigned_to: user?.id, status: 'pending' }
      },
      third_party: {
        exchanges: { participant: user?.id, status: 'active' },
        tasks: { assigned_to: user?.id }
      },
      agency: {
        exchanges: { company: user?.company, status: 'active' },
        tasks: { company: user?.company, status: 'pending' }
      }
    };

    return defaultFilters[userRole] || {};
  };

  return {
    filterExchanges,
    filterTasks,
    filterContacts,
    filterDocuments,
    filterMessages,
    getVisibleColumns,
    getDefaultFilters
  };
};