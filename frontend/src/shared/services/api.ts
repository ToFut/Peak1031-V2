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
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Helper method to get auth headers
  private getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Helper method for HTTP requests
  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry: boolean = false): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      // If we get a 401 and have a refresh token, try to refresh (but only once)
      if (response.status === 401 && localStorage.getItem('refreshToken') && !isRetry) {
        try {
          await this.refreshToken();
          // Retry the request with the new token
          return await this.request<T>(endpoint, options, true);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, clear tokens and throw original error
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          // Redirect to login or dispatch logout action
          window.location.href = '/login';
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Authentication failed. Please login again.');
        }
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response from ${endpoint}:`, data);
    
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
    // Check if user is admin to request all contacts
    const userStr = localStorage.getItem('user');
    let endpoint = '/contacts';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          endpoint = '/contacts?limit=2000'; // Admin gets ALL contacts
          console.log('📊 Admin requesting all contacts');
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    const response = await this.request<any>(endpoint);
    if (Array.isArray(response)) {
      console.log(`✅ Received ${response.length} contacts`);
      return response;
    } else if (response && response.contacts) {
      console.log(`✅ Received ${response.contacts.length} contacts`);
      return response.contacts;
    } else if (response && response.data) {
      console.log(`✅ Received ${response.data.length} contacts`);
      return response.data;
    }
    return [];
  }

  async getExchanges(): Promise<Exchange[]> {
    // Check if user is admin to request all exchanges
    const userStr = localStorage.getItem('user');
    let limit = '20';
    let isAdmin = false;
    
    console.log('🔍 Checking user for exchanges request...');
    console.log('User in localStorage:', userStr?.substring(0, 100) + '...');
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Parsed user role:', user.role);
        if (user.role === 'admin') {
          limit = '2000'; // Admin gets ALL exchanges (increased to ensure we get all)
          isAdmin = true;
          console.log('📊 ADMIN DETECTED! Requesting all exchanges with limit:', limit);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    const endpoint = `/exchanges?limit=${limit}`;
    console.log('Making request to:', endpoint);
    
    const response = await this.request<any>(endpoint);
    // Handle both array response and paginated response
    if (Array.isArray(response)) {
      console.log(`✅ ${isAdmin ? 'ADMIN' : 'USER'} received ${response.length} exchanges`);
      return response;
    } else if (response && response.exchanges) {
      console.log(`✅ ${isAdmin ? 'ADMIN' : 'USER'} received ${response.exchanges.length} exchanges`);
      return response.exchanges;
    } else {
      console.log('⚠️ Unexpected response format:', response);
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
    const response = await fetch(`${this.baseURL}/documents`, {
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
    return this.request<any[]>('/documents/templates');
  }

  async uploadDocumentTemplate(formData: FormData): Promise<any> {
    const response = await fetch(`${this.baseURL}/documents/templates/upload`, {
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
    return this.request<void>(`/documents/templates/${templateId}`, {
      method: 'DELETE'
    });
  }

  async updateDocumentTemplate(templateId: string, templateData: any): Promise<any> {
    return this.request<any>(`/documents/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(templateData)
    });
  }

  async downloadDocumentTemplate(templateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/templates/${templateId}/download`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    return response.blob();
  }

  async viewDocumentTemplate(templateId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/documents/templates/${templateId}/view`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to view template: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async generateDocumentFromTemplate(data: {
    template_id: string;
    exchange_id: string;
    generation_data: any;
    generated_by: string;
  }): Promise<{ document_id: string; download_url: string }> {
    return this.request<{ document_id: string; download_url: string }>('/documents/templates/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getGeneratedDocuments(exchangeId?: string): Promise<any[]> {
    const endpoint = exchangeId 
      ? `/documents/templates/generated?exchange_id=${exchangeId}`
      : '/documents/templates/generated';
    return this.request<any[]>(endpoint);
  }

  async checkAutoGeneration(data: {
    exchange_id: string;
    new_status: string;
    triggered_by: string;
  }): Promise<any> {
    return this.request<any>('/documents/templates/check-auto-generation', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Exchange Participant Management
  async getExchangeParticipants(exchangeId: string): Promise<any> {
    return this.request<any>(`/exchanges/${exchangeId}/participants`);
  }

  async getAvailableMembers(exchangeId: string, search?: string): Promise<any> {
    const endpoint = search 
      ? `/exchanges/${exchangeId}/available-members?search=${encodeURIComponent(search)}`
      : `/exchanges/${exchangeId}/available-members`;
    return this.request<any>(endpoint);
  }

  async addExchangeParticipant(exchangeId: string, data: {
    user_id?: string;
    contact_id?: string;
    email?: string;
    role?: string;
    permissions?: Record<string, boolean>;
  }): Promise<any> {
    return this.request<any>(`/exchanges/${exchangeId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async removeExchangeParticipant(exchangeId: string, participantId: string): Promise<void> {
    return this.request<void>(`/exchanges/${exchangeId}/participants/${participantId}`, {
      method: 'DELETE'
    });
  }

  // Enterprise API Methods
  // Enterprise Exchanges
  async getEnterpriseExchange(exchangeId: string): Promise<any> {
    return this.request<any>(`/enterprise-exchanges/${exchangeId}`);
  }

  async getEnterpriseExchanges(params?: any): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/enterprise-exchanges${queryString}`);
  }

  async getEnterpriseExchangeStats(): Promise<any> {
    return this.request<any>('/enterprise-exchanges/dashboard/stats');
  }

  async advanceExchangeStage(exchangeId: string, data: { new_stage: string; reason: string }): Promise<any> {
    return this.request<any>(`/enterprise-exchanges/${exchangeId}/advance-stage`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getExchangeTimeline(exchangeId: string): Promise<any> {
    return this.request<any>(`/enterprise-exchanges/${exchangeId}/timeline`);
  }

  async getExchangeCompliance(exchangeId: string): Promise<any> {
    return this.request<any>(`/enterprise-exchanges/${exchangeId}/compliance`);
  }

  // Account Management
  async getAccountActivityLogs(): Promise<any> {
    return this.request<any>('/account/activity-logs');
  }

  async updateAccountPreferences(preferences: any): Promise<any> {
    return this.request<any>('/account/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }

  async updateAccountSecurity(securityData: any): Promise<any> {
    return this.request<any>('/account/security', {
      method: 'PUT',
      body: JSON.stringify(securityData)
    });
  }

  // Enhanced Exchange Methods with Enterprise Features
  async getExchangesWithLifecycle(params?: any): Promise<any> {
    // First try enterprise endpoint, fallback to regular
    try {
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      return await this.request<any>(`/enterprise-exchanges${queryString}`);
    } catch (error) {
      // Fallback to regular exchanges endpoint
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      return await this.request<any>(`/exchanges${queryString}`);
    }
  }

  async exportEnterpriseData(type: string, filters?: any): Promise<Blob> {
    const endpoint = `/enterprise-exchanges/export/${type}`;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: filters ? JSON.stringify(filters) : undefined
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}

export const apiService = new ApiService();
export default apiService;