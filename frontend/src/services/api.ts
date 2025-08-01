import { 
  User, 
  Contact, 
  Exchange, 
  Task, 
  Document, 
  Message, 
  AuditLog, 
  SyncLog,
  LoginCredentials,
  LoginResponse
} from '../types';

class ApiService {
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

  // Helper method to get auth headers
  private getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Helper method for HTTP requests
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      // If we get a 401 and have a refresh token, try to refresh
      if (response.status === 401 && localStorage.getItem('refreshToken')) {
        try {
          await this.refreshToken();
          // Retry the request with the new token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...this.getAuthHeaders(),
              ...options.headers
            }
          });
          
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryData = await retryResponse.json();
          return retryData.data || retryData;
        } catch (refreshError) {
          // If refresh fails, clear tokens and throw original error
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // Return data.data if it exists (backend format), otherwise return the whole response
    return data.data || data;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 API Service: Starting login process...');
      console.log('📧 Email:', credentials.email);
      console.log('🌐 API URL:', `${this.baseURL}/auth/login`);
      
      const response = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      console.log('✅ API Service: Login successful!');
      console.log('👤 User:', response.user.email, 'Role:', response.user.role);
      console.log('🔑 Token received:', response.token ? 'Yes' : 'No');
      return response;
    } catch (error: any) {
      console.error('❌ API Service login error:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const user = await this.request<User>('/auth/me');
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update stored tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Generic HTTP methods
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Data methods - now using backend API
  async getUsers(): Promise<User[]> {
    return await this.request('/admin/users');
  }

  async getContacts(): Promise<Contact[]> {
    return await this.request('/contacts');
  }

  async getExchanges(): Promise<Exchange[]> {
    const response = await this.request<any>('/exchanges');
    // Handle both array response and paginated response
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.exchanges) {
      return response.exchanges;
    } else {
      return [];
    }
  }

  async getExchange(id: string): Promise<Exchange> {
    return await this.request(`/exchanges/${id}`);
  }

  async getTasks(exchangeId?: string): Promise<Task[]> {
    const endpoint = exchangeId ? `/exchanges/${exchangeId}/tasks` : '/tasks';
    return await this.request(endpoint);
  }

  async getMessages(exchangeId?: string): Promise<Message[]> {
    if (exchangeId) {
      return await this.request(`/messages/exchange/${exchangeId}`);
    } else {
      return await this.request('/messages');
    }
  }

  async sendMessage(exchangeId: string, content: string): Promise<Message> {
    return await this.request(`/exchanges/${exchangeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getDocuments(): Promise<Document[]> {
    return await this.request('/documents');
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await this.request('/admin/audit-logs');
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    return await this.request('/sync/logs');
  }

  async getDashboardStats(): Promise<any> {
    return await this.request('/admin/stats');
  }

  // User Management
  async createUser(userData: Partial<User>): Promise<User> {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return await this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  }

  async getContact(id: string): Promise<Contact> {
    return await this.request(`/contacts/${id}`);
  }

  async createExchange(exchangeData: Partial<Exchange>): Promise<Exchange> {
    return await this.request('/exchanges', {
      method: 'POST',
      body: JSON.stringify(exchangeData)
    });
  }

  async updateExchange(id: string, exchangeData: Partial<Exchange>): Promise<Exchange> {
    return await this.request(`/exchanges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exchangeData)
    });
  }

  async getTask(id: string): Promise<Task> {
    return await this.request(`/tasks/${id}`);
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    return await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    return await this.request(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async uploadDocument(file: File, exchangeId: string, category: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exchangeId', exchangeId);
    formData.append('category', category);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upload failed');
    }
    
    return response.json();
  }

  async downloadDocument(id: string, pinCode?: string): Promise<Blob> {
    const endpoint = `/documents/${id}/download${pinCode ? `?pin=${pinCode}` : ''}`;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request(`/documents/${id}`, {
      method: 'DELETE'
    });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await this.request(`/messages/${messageId}/read`, {
      method: 'POST'
    });
  }

  async getNotifications(): Promise<any[]> {
    const response = await this.request<{ notifications: any[] }>('/notifications');
    return response.notifications || [];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async getPracticePartnerSyncStatus(): Promise<any> {
    return await this.request('/sync/practice-partner/status');
  }

  async startPracticePartnerSync(syncType?: string): Promise<any> {
    return await this.request('/sync/practice-partner/start', {
      method: 'POST',
      body: JSON.stringify({ syncType })
    });
  }

  async getPracticePartnerSyncHistory(): Promise<any> {
    return await this.request('/sync/practice-partner/history');
  }

  async getPracticePartnerSyncStatistics(): Promise<any> {
    return await this.request('/sync/practice-partner/statistics');
  }

  async triggerSync(syncType: string): Promise<any> {
    return await this.request('/sync/trigger', {
      method: 'POST',
      body: JSON.stringify({ syncType })
    });
  }

  // System Settings
  async getSystemSettings(): Promise<any> {
    return await this.request('/admin/system-settings');
  }

  async updateSystemSettings(settings: any): Promise<any> {
    return await this.request('/admin/system-settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Settings methods
  async getSettings(): Promise<any> {
    return await this.request('/settings');
  }

  async updateSettings(settings: any): Promise<any> {
    return await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // User Management - Additional methods
  async activateUser(userId: string): Promise<User> {
    return await this.request(`/admin/users/${userId}/activate`, {
      method: 'POST'
    });
  }

  async deactivateUser(userId: string): Promise<User> {
    return await this.request(`/admin/users/${userId}/deactivate`, {
      method: 'POST'
    });
  }

  // Bulk Operations
  async bulkUpdateExchanges(itemIds: string[], updateData: any): Promise<Exchange[]> {
    return await this.request('/exchanges/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ itemIds, updateData })
    });
  }

  async bulkExportData(type: string, options?: any): Promise<Blob> {
    const endpoint = `/admin/export/${type}${options ? '?' + new URLSearchParams(options).toString() : ''}`;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: options ? JSON.stringify(options) : undefined
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Document Template Management
  async getDocumentTemplates(): Promise<any[]> {
    return this.request<any[]>('/document-templates');
  }

  async uploadDocumentTemplate(formData: FormData): Promise<any> {
    const response = await fetch(`${this.baseURL}/document-templates`, {
      method: 'POST',
      headers: this.getAuthHeaders(true), // Don't set Content-Type for FormData
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload template: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteDocumentTemplate(templateId: string): Promise<void> {
    return this.request<void>(`/document-templates/${templateId}`, {
      method: 'DELETE'
    });
  }

  async generateDocumentFromTemplate(data: {
    template_id: string;
    exchange_id: string;
    generation_data: any;
    generated_by: string;
  }): Promise<{ document_id: string; download_url: string }> {
    return this.request<{ document_id: string; download_url: string }>('/document-templates/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getGeneratedDocuments(exchangeId?: string): Promise<any[]> {
    const endpoint = exchangeId 
      ? `/generated-documents?exchange_id=${exchangeId}`
      : '/generated-documents';
    return this.request<any[]>(endpoint);
  }
}

export const apiService = new ApiService();
export default apiService;