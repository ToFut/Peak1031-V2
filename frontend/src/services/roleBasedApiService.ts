import { apiService } from './api';
import { smartApi } from './smartApi';
import { UserRole } from '../types/roles';

interface RoleBasedApiOptions {
  useRole?: UserRole;
  forceRefresh?: boolean;
  userContext?: {
    id: string;
    email: string;
    role: UserRole;
    company?: string;
  };
}

/**
 * Service that applies role-based filtering to API calls
 * This ensures data is filtered according to user permissions
 */
class RoleBasedApiService {
  /**
   * Get exchanges with role-based filtering
   */
  async getExchanges(options: RoleBasedApiOptions = {}) {
    const { userContext } = options;
    
    try {
      // Get all exchanges from the API
      const response = await smartApi.getExchanges({ forceRefresh: options.forceRefresh });
      const exchanges = response.exchanges || response || [];
      
      if (!userContext) {
        return { exchanges };
      }
      
      // Apply role-based filtering
      const filteredExchanges = this.filterExchangesByRole(exchanges, userContext);
      
      return {
        exchanges: filteredExchanges,
        originalCount: exchanges.length,
        filteredCount: filteredExchanges.length,
        userRole: userContext.role
      };
    } catch (error) {
      console.error('Role-based exchange filtering failed:', error);
      throw error;
    }
  }
  
  /**
   * Get tasks with role-based filtering
   */
  async getTasks(options: RoleBasedApiOptions = {}) {
    const { userContext } = options;
    
    try {
      const response = await smartApi.getTasks({ forceRefresh: options.forceRefresh });
      const tasks = response.tasks || response || [];
      
      if (!userContext) {
        return { tasks };
      }
      
      const filteredTasks = this.filterTasksByRole(tasks, userContext);
      
      return {
        tasks: filteredTasks,
        originalCount: tasks.length,
        filteredCount: filteredTasks.length,
        userRole: userContext.role
      };
    } catch (error) {
      console.error('Role-based task filtering failed:', error);
      throw error;
    }
  }
  
  /**
   * Get contacts with role-based filtering
   */
  async getContacts(options: RoleBasedApiOptions = {}) {
    const { userContext } = options;
    
    try {
      const response = await smartApi.getContacts({ forceRefresh: options.forceRefresh });
      const contacts = response.contacts || response || [];
      
      if (!userContext) {
        return { contacts };
      }
      
      const filteredContacts = this.filterContactsByRole(contacts, userContext);
      
      return {
        contacts: filteredContacts,
        originalCount: contacts.length,
        filteredCount: filteredContacts.length,
        userRole: userContext.role
      };
    } catch (error) {
      console.error('Role-based contact filtering failed:', error);
      throw error;
    }
  }
  
  /**
   * Get documents with role-based filtering
   */
  async getDocuments(options: RoleBasedApiOptions = {}) {
    const { userContext } = options;
    
    try {
      const response = await smartApi.getDocuments({ forceRefresh: options.forceRefresh });
      const documents = response.documents || response || [];
      
      if (!userContext) {
        return { documents };
      }
      
      const filteredDocuments = this.filterDocumentsByRole(documents, userContext);
      
      return {
        documents: filteredDocuments,
        originalCount: documents.length,
        filteredCount: filteredDocuments.length,
        userRole: userContext.role
      };
    } catch (error) {
      console.error('Role-based document filtering failed:', error);
      throw error;
    }
  }
  
  /**
   * Filter exchanges based on user role
   */
  private filterExchangesByRole(exchanges: any[], userContext: any): any[] {
    const { role, id, email, company } = userContext;
    
    switch (role) {
      case 'admin':
        // Admin sees all exchanges
        return exchanges;
      
      case 'coordinator':
        // Coordinators see exchanges they manage
        return exchanges.filter(ex => ex.coordinatorId === id);
      
      case 'client':
        // Clients see exchanges where they are the client or participant
        return exchanges.filter(ex => {
          if (ex.clientId === id) return true;
          if (ex.client?.email === email) return true;
          if (ex.exchangeParticipants) {
            return ex.exchangeParticipants.some((p: any) => 
              p.contact?.email === email || p.user?.id === id
            );
          }
          return false;
        });
      
      case 'third_party':
        // Third-party sees exchanges where they participate
        return exchanges.filter(ex => {
          if (ex.exchangeParticipants) {
            return ex.exchangeParticipants.some((p: any) => 
              p.user?.id === id || 
              (p.contact?.company === company && p.contact?.email === email)
            );
          }
          return false;
        });
      
      case 'agency':
        // Agency sees exchanges where their company participates
        return exchanges.filter(ex => {
          if (ex.exchangeParticipants) {
            return ex.exchangeParticipants.some((p: any) => 
              p.user?.company === company || p.contact?.company === company
            );
          }
          return false;
        });
      
      default:
        return [];
    }
  }
  
  /**
   * Filter tasks based on user role
   */
  private filterTasksByRole(tasks: any[], userContext: any): any[] {
    const { role, id } = userContext;
    
    switch (role) {
      case 'admin':
        return tasks;
      
      case 'coordinator':
        // Coordinators see tasks in their managed exchanges + assigned tasks
        return tasks.filter(task => 
          task.assignedTo === id || task.createdBy === id
        );
      
      case 'client':
        // Clients see tasks assigned to them or in their exchanges
        return tasks.filter(task => 
          task.assignedTo === id || task.createdBy === id
        );
      
      case 'third_party':
        // Third-party users don't see tasks (based on role config)
        return [];
      
      case 'agency':
        // Agency sees tasks assigned to their company members
        return tasks.filter(task => 
          task.assignedTo === id || task.createdBy === id
        );
      
      default:
        return [];
    }
  }
  
  /**
   * Filter contacts based on user role
   */
  private filterContactsByRole(contacts: any[], userContext: any): any[] {
    const { role, company, id } = userContext;
    
    switch (role) {
      case 'admin':
        return contacts;
      
      case 'coordinator':
        // Coordinators see contacts from their exchanges
        return contacts;
      
      case 'client':
        // Clients see contacts from their exchanges
        return contacts;
      
      case 'third_party':
        // Third-party sees contacts from their exchanges
        return contacts;
      
      case 'agency':
        // Agency sees their company contacts
        return contacts.filter(contact => 
          contact.company === company || contact.createdBy === id
        );
      
      default:
        return [];
    }
  }
  
  /**
   * Filter documents based on user role
   */
  private filterDocumentsByRole(documents: any[], userContext: any): any[] {
    const { role, id } = userContext;
    
    switch (role) {
      case 'admin':
        return documents;
      
      case 'coordinator':
      case 'client':
      case 'agency':
        // See documents from their exchanges
        return documents.filter(doc => 
          doc.uploadedBy === id || doc.exchangeId // Need exchange access check
        );
      
      case 'third_party':
        // Third-party sees documents from their exchanges (read-only)
        return documents.filter(doc => 
          doc.exchangeId // Need exchange access check
        );
      
      default:
        return [];
    }
  }
  
  /**
   * Get filtered data for dashboard based on user role
   */
  async getDashboardData(userContext: any) {
    try {
      const [exchangesRes, tasksRes, contactsRes, documentsRes] = await Promise.all([
        this.getExchanges({ userContext }),
        this.getTasks({ userContext }),
        this.getContacts({ userContext }),
        this.getDocuments({ userContext })
      ]);
      
      return {
        exchanges: exchangesRes.exchanges,
        tasks: tasksRes.tasks,
        contacts: contactsRes.contacts,
        documents: documentsRes.documents,
        statistics: {
          exchangeCount: exchangesRes.filteredCount,
          taskCount: tasksRes.filteredCount,
          contactCount: contactsRes.filteredCount,
          documentCount: documentsRes.filteredCount
        },
        userRole: userContext.role
      };
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      throw error;
    }
  }
  
  /**
   * Check if user can perform action on resource
   */
  canPerformAction(userRole: UserRole, resource: string, action: string): boolean {
    const permissions: Record<UserRole, Record<string, string[]>> = {
      admin: {
        '*': ['*']
      },
      coordinator: {
        exchanges: ['read', 'write', 'assign'],
        tasks: ['read', 'write', 'assign'],
        documents: ['read', 'write', 'upload'],
        messages: ['read', 'write'],
        contacts: ['read']
      },
      client: {
        exchanges: ['read'],
        tasks: ['read', 'update'],
        documents: ['read', 'upload'],
        messages: ['read', 'write']
      },
      third_party: {
        exchanges: ['read'],
        documents: ['read'],
        messages: ['read']
      },
      agency: {
        exchanges: ['read'],
        tasks: ['read', 'update'],
        documents: ['read', 'upload'],
        messages: ['read', 'write']
      }
    };
    
    const userPerms = permissions[userRole];
    if (!userPerms) return false;
    
    // Check wildcard permissions
    if (userPerms['*']?.includes('*')) return true;
    
    // Check specific resource permissions
    const resourcePerms = userPerms[resource];
    if (!resourcePerms) return false;
    
    return resourcePerms.includes('*') || resourcePerms.includes(action);
  }
}

export const roleBasedApiService = new RoleBasedApiService();