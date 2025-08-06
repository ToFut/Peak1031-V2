import { apiService } from '@/shared/services/api';
import { smartApi } from './smartApi';

interface RoleBasedOptions {
  role?: string;
  permissions?: string[];
  filters?: any;
}

class RoleBasedApiService {
  private userRole: string | null = null;
  private userPermissions: string[] = [];

  setUserContext(role: string, permissions: string[] = []) {
    this.userRole = role;
    this.userPermissions = permissions;
  }

  private applyRoleFilters(endpoint: string, options: RoleBasedOptions = {}) {
    const role = options.role || this.userRole;
    const filters = { ...options.filters };

    // Apply role-specific filters
    switch (role) {
      case 'client':
        if (endpoint.includes('exchanges')) {
          filters.client_only = true;
        }
        if (endpoint.includes('documents')) {
          filters.client_accessible = true;
        }
        break;
      
      case 'third_party':
        if (endpoint.includes('exchanges')) {
          filters.assigned_only = true;
        }
        if (endpoint.includes('documents')) {
          filters.third_party_accessible = true;
        }
        break;
      
      case 'coordinator':
        // Coordinators see their assigned items
        if (endpoint.includes('exchanges')) {
          filters.coordinator_assigned = true;
        }
        break;
      
      case 'admin':
        // Admins see everything, no filters needed
        break;
    }

    return filters;
  }

  async getExchanges(options: RoleBasedOptions = {}) {
    const filters = this.applyRoleFilters('/exchanges', options);
    
    try {
      const response = await smartApi.getExchanges({
        ...options,
        useFallback: true
      });
      
      if (response.success && response.data) {
        // Apply client-side filtering if needed
        let data = response.data;
        
        if (filters.client_only) {
          const userId = localStorage.getItem('user_id');
          data = data.filter((ex: any) => ex.client_id === userId);
        }
        
        if (filters.assigned_only) {
          const userId = localStorage.getItem('user_id');
          data = data.filter((ex: any) => 
            ex.third_party_ids?.includes(userId) || 
            ex.assigned_to === userId
          );
        }
        
        return { success: true, data };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch exchanges' };
    }
  }

  async getContacts(options: RoleBasedOptions = {}) {
    const filters = this.applyRoleFilters('/contacts', options);
    
    try {
      const response = await smartApi.getContacts({
        ...options,
        useFallback: true
      });
      
      if (response.success && response.data) {
        let data = response.data;
        
        // Apply role-based filtering
        if (this.userRole === 'client') {
          // Clients only see their own contacts
          const userId = localStorage.getItem('user_id');
          data = data.filter((contact: any) => 
            contact.owner_id === userId || 
            contact.shared_with?.includes(userId)
          );
        }
        
        return { success: true, data };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch contacts' };
    }
  }

  async getTasks(options: RoleBasedOptions = {}) {
    const filters = this.applyRoleFilters('/tasks', options);
    
    try {
      const response = await smartApi.getTasks({
        ...options,
        useFallback: true
      });
      
      if (response.success && response.data) {
        let data = response.data;
        
        // Apply role-based filtering
        if (this.userRole === 'client') {
          // Clients only see tasks related to their exchanges
          const userId = localStorage.getItem('user_id');
          data = data.filter((task: any) => 
            task.client_id === userId || 
            task.visible_to_client === true
          );
        } else if (this.userRole === 'third_party') {
          // Third parties see assigned tasks
          const userId = localStorage.getItem('user_id');
          data = data.filter((task: any) => 
            task.assigned_to === userId ||
            task.third_party_ids?.includes(userId)
          );
        }
        
        return { success: true, data };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tasks' };
    }
  }

  async getDocuments(options: RoleBasedOptions = {}) {
    const filters = this.applyRoleFilters('/documents', options);
    
    try {
      const response = await smartApi.getDocuments({
        ...options,
        useFallback: true
      });
      
      if (response.success && response.data) {
        let data = response.data;
        
        // Apply role-based filtering
        if (this.userRole === 'client') {
          // Clients see their documents and shared documents
          const userId = localStorage.getItem('user_id');
          data = data.filter((doc: any) => 
            doc.owner_id === userId || 
            doc.shared_with?.includes(userId) ||
            doc.visibility === 'public'
          );
        } else if (this.userRole === 'third_party') {
          // Third parties see documents they have access to
          const userId = localStorage.getItem('user_id');
          data = data.filter((doc: any) => 
            doc.third_party_access?.includes(userId) ||
            doc.visibility === 'third_party' ||
            doc.visibility === 'public'
          );
        }
        
        return { success: true, data };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' };
    }
  }

  async getStats(options: RoleBasedOptions = {}) {
    try {
      const response = await smartApi.getExchangeStats({
        ...options,
        useFallback: true
      });
      
      if (response.success && response.data) {
        let stats = response.data;
        
        // Adjust stats based on role
        if (this.userRole === 'client') {
          // Show only client's stats
          const exchanges = await this.getExchanges();
          if (exchanges.success && exchanges.data) {
            stats = {
              total: exchanges.data.length,
              active: exchanges.data.filter((e: any) => e.status === 'active').length,
              completed: exchanges.data.filter((e: any) => e.status === 'completed').length,
              totalValue: exchanges.data.reduce((sum: number, e: any) => sum + (e.relinquished_property_value || 0), 0)
            };
          }
        }
        
        return { success: true, data: stats };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch stats' };
    }
  }

  hasPermission(action: string, resource?: string): boolean {
    // Check if user has permission for action
    const permission = resource ? `${action}:${resource}` : action;
    
    // Admins have all permissions
    if (this.userRole === 'admin') return true;
    
    // Check specific permissions
    return this.userPermissions.includes(permission) || 
           this.userPermissions.includes(`${action}:*`);
  }

  canEdit(resource: string, ownerId?: string): boolean {
    if (this.userRole === 'admin') return true;
    
    const userId = localStorage.getItem('user_id');
    
    // Check ownership
    if (ownerId && ownerId === userId) return true;
    
    // Check edit permissions
    return this.hasPermission('edit', resource);
  }

  canDelete(resource: string, ownerId?: string): boolean {
    if (this.userRole === 'admin') return true;
    
    const userId = localStorage.getItem('user_id');
    
    // Check ownership
    if (ownerId && ownerId === userId) {
      return this.hasPermission('delete', resource);
    }
    
    return false;
  }
}

export const roleBasedApi = new RoleBasedApiService();
export const roleBasedApiService = roleBasedApi; // For backward compatibility
export default roleBasedApi;