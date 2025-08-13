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
import { generalCache as cacheService } from './cache';

interface ApiOptions {
  useCache?: boolean;
  cacheDuration?: number;
  useFallback?: boolean;
  forceRefresh?: boolean;
  lazyLoad?: boolean;
  etag?: string;
}

class ApiService {
  private baseURL: string;
  private isOnline: boolean = true;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: number = 0;
  private connectionListeners: ((online: boolean) => void)[] = [];

  constructor() {
    // Resolve base URL from env or current origin, trim trailing slashes
    const resolvedBaseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
    this.baseURL = resolvedBaseUrl;
    console.log('🔗 API base URL:', this.baseURL);
    // Monitor connection status
    window.addEventListener('online', () => this.checkBackendHealth());
    window.addEventListener('offline', () => this.setConnectionStatus(false));
    
    // Start periodic health checks
    this.startHealthCheck();
    
    // Initial health check
    this.checkBackendHealth();
  }

  private setConnectionStatus(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online;
      
      this.connectionListeners.forEach(listener => listener(online));
    }
  }

  onConnectionChange(listener: (online: boolean) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private startHealthCheck() {
    // Check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkBackendHealth();
    }, 30000);
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      const isHealthy = response.ok;
      
      this.setConnectionStatus(isHealthy);
      this.lastHealthCheck = Date.now();
      
      return isHealthy;
    } catch (error: any) {
      console.warn('⚠️ Backend health check failed:', error.name === 'AbortError' ? 'Timeout' : error.message);
      this.setConnectionStatus(false);
      return false;
    }
  }

  getConnectionStatus(): { online: boolean; lastCheck: number } {
    return {
      online: this.isOnline,
      lastCheck: this.lastHealthCheck
    };
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Helper method to get auth headers
  private getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }


  // Helper method for HTTP requests with real-time data fetching
  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry: boolean = false, apiOptions?: ApiOptions): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    
    // Handle caching for GET requests only (as fallback for offline scenarios)
    if (method === 'GET' && apiOptions) {
      const {
        useCache = false, // Default to false for real-time data
        cacheDuration = 1 * 60 * 1000, // 1 minute for offline fallback
        useFallback = true,
        forceRefresh = true, // Default to true for real-time data
        lazyLoad = false,
        etag
      } = apiOptions;

      const cacheKey = `api:${endpoint}`;

      // Only check cache if explicitly requested and not forcing refresh
      if (useCache && !forceRefresh) {
        const cached = cacheService.get<T>(cacheKey);
        if (cached) {
          console.log('📦 Returning cached data for:', endpoint);
          return cached;
        }
      }

      // Add ETag header if provided for conditional requests
      if (etag) {
        options.headers = {
          ...options.headers,
          'If-None-Match': etag
        };
      }
    }

    // Add cache control headers for real-time data
    if (method === 'GET') {
      options.headers = {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      // Handle 304 Not Modified responses (only if we have cached data)
      if (response.status === 304) {
        console.log('📦 Data not modified, using cached version for:', endpoint);
        const cacheKey = `api:${endpoint}`;
        const cached = cacheService.get<T>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      if (!response.ok) {
        // Handle 401 with refresh token retry
        if (response.status === 401 && !isRetry && localStorage.getItem('refreshToken')) {
          console.warn('🔄 Got 401, attempting token refresh for:', endpoint);
          try {
            await this.refreshToken();
            console.log('✅ Token refresh successful, retrying request');
            return await this.request<T>(endpoint, options, true, apiOptions);
          } catch (refreshError: any) {
            console.error('❌ Token refresh failed:', refreshError);
            console.error('🔍 Request was to:', endpoint);
            console.error('🔍 Refresh error details:', refreshError?.message || refreshError);
            
            // Clear tokens and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            
            // Log before redirect to help debug
            console.error('🚨 About to redirect to login due to authentication failure');
            console.error('🚨 This was triggered by request to:', endpoint);
            
            window.location.href = '/login';
            throw new Error('Authentication expired');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error ${response.status} for ${endpoint}:`, errorData);
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache GET responses only for offline fallback scenarios
      if (method === 'GET' && apiOptions?.useCache && !apiOptions?.forceRefresh) {
        const cacheKey = `api:${endpoint}`;
        const cacheDuration = apiOptions?.cacheDuration || 1 * 60 * 1000; // 1 minute default
        cacheService.set(cacheKey, data.data || data, cacheDuration);
        console.log('💾 Cached data for offline fallback:', endpoint);
      }
      
      // Return data.data if it exists (backend format), otherwise return the whole response
      // Handle both {data: [...]} and {success: true, data: [...]} formats
      if (data.data !== undefined) {
        return data.data;
      }
      return data;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, error);
      
      // For GET requests, try to use cached data as fallback if available
      if (method === 'GET' && apiOptions?.useFallback !== false) {
        const cacheKey = `api:${endpoint}`;
        const cached = cacheService.get<T>(cacheKey);
        if (cached) {
          console.log('📦 Using cached data as fallback for:', endpoint);
          return cached;
        }
      }
      
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // For login, we don't want to include auth headers
      const url = `${this.baseURL}/auth/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
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

  // Data methods - now using backend API
  async getUsers(): Promise<User[]> {
    return await this.request('/users');
  }

  async getContacts(options?: { page?: number; limit?: number; search?: string }): Promise<Contact[]> {
    // Use pagination to prevent performance issues
    const { page = 1, limit = 50, search } = options || {};
    
    // Check if user is admin to request more contacts per page
    const userStr = localStorage.getItem('user');
    let userLimit = limit;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.role === 'admin') {
          userLimit = Math.min(limit, 100); // Admin gets more but still paginated
        }
      } catch (e) {
        console.error('Error parsing user data for contacts:', e);
        // Continue with default limit
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
    
    const response = await this.request<any>(endpoint);
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.contacts) {
      return response.contacts;
    } else if (response && response.data) {
      return response.data;
    }
    return [];
  }

  async getExchanges(options?: ApiOptions): Promise<Exchange[]> {
    // Check if user is admin to request all exchanges
    const userStr = localStorage.getItem('user');
    let limit = '20';
    let isAdmin = false;
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        
        if (user?.role === 'admin') {
          limit = '50'; // Admin gets more exchanges but not ALL at once (reduced from 100 to prevent timeouts)
          isAdmin = true;
          
        }
      } catch (e) {
        console.error('Error parsing user data for exchanges:', e);
        // Continue with default limit
      }
    }
    
    const endpoint = `/exchanges?limit=${limit}`;
    
    
    const response = await this.request<any>(endpoint, {}, false, options);
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
    return await this.request(`/messages`, {
      method: 'POST',
      body: JSON.stringify({ exchangeId, content, messageType: 'text' })
    });
  }

  async getDocuments(): Promise<Document[]> {
    const response = await this.request<Document[]>('/documents');
    return response;
  }

  // Folder operations
  async getFolders(exchangeId?: string, parentId?: string): Promise<any[]> {
    let endpoint = '/folders';
    if (exchangeId) {
      endpoint = `/folders/exchange/${exchangeId}`;
      if (parentId) {
        endpoint += `?parentId=${parentId}`;
      }
    }
    const response = await this.request<any>(endpoint);
    return response.data || response || [];
  }

  async getFolderById(id: string): Promise<any> {
    const response = await this.request<any>(`/folders/${id}`);
    return response.data || response;
  }

  async createFolder(folderData: {
    name: string;
    parentId?: string;
    exchangeId: string;
  }): Promise<any> {
    const response = await this.request<any>('/folders', {
      method: 'POST',
      body: JSON.stringify(folderData)
    });
    return response.data || response;
  }

  async updateFolder(id: string, folderData: {
    name?: string;
    parentId?: string;
  }): Promise<any> {
    const response = await this.request<any>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(folderData)
    });
    return response.data || response;
  }

  async deleteFolder(id: string): Promise<void> {
    await this.request(`/folders/${id}`, {
      method: 'DELETE'
    });
  }

  async moveDocumentsToFolder(documentIds: string[], folderId: string): Promise<any[]> {
    const response = await this.request<any>(`/folders/${folderId}/move-documents`, {
      method: 'POST',
      body: JSON.stringify({ documentIds })
    });
    return response.data || response || [];
  }



  async updateAssignment(assignmentId: string, updateData: {
    status: string;
    notes?: string;
  }): Promise<any> {
    return await this.request(`/audit-social/assignments/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async updateEscalation(escalationId: string, updateData: {
    status: string;
    resolutionNotes?: string;
  }): Promise<any> {
    return await this.request(`/audit-social/escalations/${escalationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    return await this.request('/sync/logs');
  }

  async getDashboardStats(): Promise<any> {
    return await this.request('/dashboard/overview');
  }

  // User Management
  async createUser(userData: Partial<User>): Promise<User> {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/users/${id}`, {
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

  async deleteTask(id: string): Promise<void> {
    return await this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  async uploadDocument(
    file: File,
    exchangeId: string,
    category: string,
    options?: { description?: string; pinRequired?: boolean; pin?: string; folderId?: string }
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exchangeId', exchangeId);
    formData.append('category', category);
    if (options?.description) formData.append('description', options.description);
    if (typeof options?.pinRequired === 'boolean') formData.append('pinRequired', String(options.pinRequired));
    if (options?.pin) formData.append('pin', options.pin);
    if (options?.folderId) formData.append('folderId', options.folderId);

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

    const result = await response.json();
    // Backend returns { data: document, message: string }
    return result.data || result;
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

  // Notification Settings methods
  async getNotificationSettings(): Promise<any> {
    return await this.request('/settings/notifications');
  }

  async updateNotificationSettings(settings: any): Promise<any> {
    return await this.request('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // User Management - Additional methods
  async activateUser(userId: string): Promise<User> {
    return await this.request(`/users/${userId}/activate`, {
      method: 'POST'
    });
  }

  async deactivateUser(userId: string): Promise<User> {
    return await this.request(`/users/${userId}/deactivate`, {
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
    const response = await this.request<any>('/templates');
    // Handle response format from new templates endpoint
    if (response && response.success && response.data) {
      return response.data || [];
    }
    // Fallback to direct array if response format is different
    return Array.isArray(response) ? response : [];
  }

  async createDocumentTemplate(templateData: any): Promise<any> {
    return this.request<any>('/documents/templates', {
      method: 'POST'
    }, templateData);
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

  async getDocumentsByUser(userId: string): Promise<any[]> {
    return await this.request(`/documents?userId=${userId}`);
  }

  async getDocumentsByThirdParty(thirdPartyId: string): Promise<any[]> {
    return await this.request(`/documents?thirdPartyId=${thirdPartyId}`);
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

  // ===========================================
  // AUDIT LOGS ENDPOINTS
  // ===========================================

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(options: {
    page?: number;
    limit?: number;
    action?: string;
    user_id?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    severity?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request(`/audit-logs${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStats(): Promise<any> {
    return this.request('/audit-logs/stats');
  }

  /**
   * Get available audit actions for filtering
   */
  async getAuditActions(): Promise<any> {
    return this.request('/audit-logs/actions');
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string): Promise<any> {
    return this.request(`/audit-logs/${id}`);
  }

  /**
   * Get audit log interactions (social features)
   */
  async getAuditLogInteractions(auditLogId: string): Promise<any> {
    return this.request(`/audit-social/${auditLogId}/interactions`);
  }

  /**
   * Add comment to audit log
   */
  async commentOnAuditLog(auditLogId: string, content: string, mentions: string[] = []): Promise<any> {
    return this.post(`/audit-social/${auditLogId}/comments`, {
      content,
      mentions
    });
  }

  /**
   * Like/react to audit log
   */
  async likeAuditLog(auditLogId: string, reactionType: string = 'like'): Promise<any> {
    return this.post(`/audit-social/${auditLogId}/like`, {
      reaction_type: reactionType
    });
  }

  /**
   * Assign audit log to user
   */
  async assignAuditLog(auditLogId: string, assignment: {
    assignedTo: string;
    assignmentType: string;
    priority: string;
    dueDate?: string;
    notes?: string;
  }): Promise<any> {
    return this.post(`/audit-social/${auditLogId}/assign`, assignment);
  }

  /**
   * Escalate audit log
   */
  async escalateAuditLog(auditLogId: string, escalation: {
    escalatedTo: string;
    reason: string;
    priority: string;
  }): Promise<any> {
    return this.post(`/audit-social/${auditLogId}/escalate`, escalation);
  }

  // ===========================================
  // V2 DASHBOARD ENDPOINTS (High Value!)
  // ===========================================

  /**
   * Get comprehensive dashboard overview in single call
   * Replaces multiple separate API calls
   */
  async getDashboardOverview(): Promise<{
    exchanges: { total: number; active: number; completed: number };
    users: { total: number; active: number };
    tasks: { total: number; pending: number; completed: number };
  }> {
    return this.request('/dashboard/overview');
  }

  /**
   * Get FAST dashboard overview - optimized for quick loading
   * Uses minimal queries and estimations for super-fast response
   */
  async getFastDashboardOverview(): Promise<{
    exchanges: { total: number; active: number; completed: number };
    users: { total: number; active: number };
    tasks: { total: number; pending: number; completed: number };
    loadTime?: string;
  }> {
    return this.request('/dashboard/fast');
  }

  /**
   * Get exchange performance metrics
   */
  async getExchangeMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    pending: number;
  }> {
    return this.request('/dashboard/exchange-metrics');
  }

  // ===========================================
  // ENHANCED ANALYTICS ENDPOINTS
  // ===========================================

  /**
   * Get paginated exchanges with smart filtering
   */
  async getSmartExchanges(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    minValue?: number;
    maxValue?: number;
    exchangeType?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    
    // Use regular exchanges endpoint since analytics/exchanges is disabled for security
    return this.request(`/exchanges?${params.toString()}`);
  }

  /**
   * Get comprehensive financial overview
   */
  async getFinancialOverview(): Promise<any> {
    return this.request('/analytics/financial-overview');
  }

  /**
   * Get enhanced dashboard statistics
   */
  async getEnhancedDashboardStats(): Promise<any> {
    return this.request('/analytics/dashboard-stats');
  }

  /**
   * Get available classic queries
   */
  async getClassicQueries(): Promise<any> {
    return this.request('/analytics/classic-queries');
  }

  /**
   * Execute a classic pre-built query
   */
  async executeClassicQuery(queryKey: string, params?: any): Promise<any> {
    return this.post('/analytics/classic-query', { queryKey, params });
  }

  /**
   * Execute AI-powered natural language query
   */
  async executeAIQuery(query: string): Promise<any> {
    return this.post('/analytics/ai-query', { query });
  }

  /**
   * Get query suggestions based on context
   */
  async getQuerySuggestions(context?: any): Promise<string[]> {
    const params = new URLSearchParams();
    if (context?.page) params.set('page', context.page);
    if (context?.recent) params.set('recent', JSON.stringify(context.recent));
    
    return this.request(`/analytics/query-suggestions?${params.toString()}`);
  }

  /**
   * Get upcoming 1031 exchange deadlines (CRITICAL for compliance)
   */
  async getDeadlines(): Promise<{
    deadlines: Array<{
      id: string;
      type: '45-day' | '180-day';
      deadline: string;
      exchangeName: string;
      daysRemaining?: number;
    }>;
  }> {
    return this.request('/dashboard/deadlines');
  }

  /**
   * Get financial summary across all exchanges
   */
  async getFinancialSummary(): Promise<{
    totalValue: number;
    completedValue: number;
    pendingValue: number;
    averageExchangeValue: number;
  }> {
    return this.request('/dashboard/financial-summary');
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(): Promise<{
    activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
      exchangeId?: string;
    }>;
  }> {
    return this.request('/dashboard/recent-activity');
  }

  /**
   * Get system alerts and notifications
   */
  async getAlerts(): Promise<{
    alerts: Array<{
      id: string;
      type: 'deadline' | 'compliance' | 'system';
      level: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      exchangeId?: string;
      deadline?: string;
      read: boolean;
    }>;
  }> {
    return this.request('/dashboard/alerts');
  }

  /**
   * Get user activity tracking
   */
  async getUserActivity(): Promise<{
    activity: Array<{
      action: string;
      timestamp: string;
      details?: any;
    }>;
  }> {
    return this.request('/dashboard/user-activity');
  }

  // ===========================================
  // ENHANCED EXCHANGE MANAGEMENT
  // ===========================================

  /**
   * Get exchange workflow status and available actions
   */
  async getExchangeWorkflow(exchangeId: string): Promise<{
    currentStage: string;
    availableActions: string[];
    nextStages: string[];
    requirements: string[];
    progress: number;
  }> {
    return this.request(`/exchanges/${exchangeId}/workflow`);
  }

  // ===========================================
  // ENHANCED NOTIFICATIONS
  // ===========================================

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    email: boolean;
    sms: boolean;
    deadlineAlerts: boolean;
    taskAssignments: boolean;
    exchangeUpdates: boolean;
  }): Promise<any> {
    return this.post('/notifications/preferences', preferences);
  }

  // ===========================================
  // ENHANCED SECURITY & AUDIT
  // ===========================================

  /**
   * Get user permissions for RBAC
   */
  async getUserPermissions(): Promise<{
    role: string;
    permissions: string[];
  }> {
    return this.request('/auth/permissions');
  }

  /**
   * Get comprehensive audit logs with filters
   */
  async getAuditLogsFiltered(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    auditLogs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.request(`/audit-logs${queryParams}`);
  }

  // Utility methods
  getAuthType(): string {
    return localStorage.getItem('authType') || 'local';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUserId(): string | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user?.id || null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Generic HTTP methods with caching support
  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return await this.request(endpoint, {}, false, options);
  }

  async post<T = any>(endpoint: string, data: any): Promise<T> {
    return await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T = any>(endpoint: string, data: any): Promise<T> {
    return await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch<T = any>(endpoint: string, data: any): Promise<T> {
    return await this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete<T = any>(endpoint: string, data?: any): Promise<T> {
    const options: RequestInit = {
      method: 'DELETE'
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return await this.request(endpoint, options);
  }

  // ===========================================
  // PRACTICEPANTHER INTEGRATION API METHODS
  // ===========================================

  /**
   * Initiate PracticePanther OAuth flow
   */
  async initiateP3OAuth(): Promise<{ authUrl: string }> {
    const response = await this.request<{ auth_url: string }>('/pp-token-admin/auth-url', { method: 'GET' });
    return { authUrl: response.auth_url };
  }

  /**
   * Complete PracticePanther OAuth with callback code
   */
  async completeP3OAuth(code: string, state: string): Promise<{ success: boolean }> {
    return await this.request(`/pp-token-admin/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
      method: 'GET',
    });
  }

  /**
   * Get PracticePanther authorization status
   */
  async getP3AuthStatus(): Promise<{ authorized: boolean; lastSync?: string }> {
    const response = await this.request<{
      token_status?: { status: string };
      last_refresh?: { refreshed_at: string };
    }>('/pp-token-admin/status');
    return { 
      authorized: response.token_status?.status === 'valid',
      lastSync: response.last_refresh?.refreshed_at 
    };
  }

  /**
   * Disconnect PracticePanther integration
   */
  async disconnectP3Integration(): Promise<{ success: boolean }> {
    return await this.request('/pp-token-admin/revoke', { method: 'DELETE' });
  }

  /**
   * Sync data from PracticePanther
   */
  async syncFromPracticePanther(): Promise<{ success: boolean; synced: any }> {
    return await this.request('/pp-token-admin/trigger-sync', { method: 'POST' });
  }

  /**
   * Get sync status with PracticePanther
   */
  async getP3SyncStatus(): Promise<any> {
    return await this.request('/pp-token-admin/sync-status');
  }

  /**
   * Get sync logs for PracticePanther
   */
  async getP3SyncLogs(limit: number = 50): Promise<{
    logs: Array<{
      id: string;
      timestamp: string;
      action: string;
      status: 'success' | 'error';
      details: string;
      entityType?: string;
      entityId?: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    // For now, return empty logs since there's no dedicated logs endpoint
    // TODO: Implement proper sync logs endpoint
    return {
      logs: [],
      pagination: {
        total: 0,
        page: 1,
        limit: limit
      }
    };
  }

  // ===========================================
  // AGENCY MANAGEMENT API METHODS  
  // ===========================================

  /**
   * Get all agencies
   */
  async getAgencies(): Promise<{
    agencies: Array<{
      id: string;
      name: string;
      contactInfo: any;
      status: 'active' | 'inactive';
      createdAt: string;
      thirdParties: number;
    }>;
  }> {
    return await this.request('/agency/agencies');
  }

  /**
   * Create a new agency
   */
  async createAgency(agencyData: {
    name: string;
    contactInfo: any;
    description?: string;
  }): Promise<{ agency: any }> {
    return await this.request('/agency/agencies', {
      method: 'POST',
      body: JSON.stringify(agencyData)
    });
  }

  /**
   * Update an agency
   */
  async updateAgency(agencyId: string, agencyData: any): Promise<{ agency: any }> {
    return await this.request(`/agency/agencies/${agencyId}`, {
      method: 'PUT',
      body: JSON.stringify(agencyData)
    });
  }

  /**
   * Delete an agency
   */
  async deleteAgency(agencyId: string): Promise<{ success: boolean }> {
    return await this.request(`/agency/agencies/${agencyId}`, { method: 'DELETE' });
  }

  /**
   * Get third parties for an agency
   */
  async getAgencyThirdParties(agencyId: string): Promise<{
    thirdParties: Array<{
      id: string;
      userId: string;
      agencyId: string;
      role: string;
      permissions: string[];
      status: 'active' | 'inactive';
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
  }> {
    return await this.request(`/agency/agencies/${agencyId}/third-parties`);
  }

  /**
   * Add third party to agency
   */
  async addThirdPartyToAgency(agencyId: string, thirdPartyData: {
    userId: string;
    role: string;
    permissions: string[];
  }): Promise<{ thirdParty: any }> {
    return await this.request(`/agency/agencies/${agencyId}/third-parties`, {
      method: 'POST',
      body: JSON.stringify(thirdPartyData)
    });
  }

  /**
   * Remove third party from agency
   */
  async removeThirdPartyFromAgency(agencyId: string, thirdPartyId: string): Promise<{ success: boolean }> {
    return await this.request(`/agency/agencies/${agencyId}/third-parties/${thirdPartyId}`, { 
      method: 'DELETE' 
    });
  }

  /**
   * Get all third parties across all agencies
   */
  async getAllThirdParties(): Promise<{
    thirdParties: Array<{
      id: string;
      userId: string;
      agencyId: string;
      agencyName: string;
      role: string;
      permissions: string[];
      status: 'active' | 'inactive';
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
  }> {
    return await this.request('/agency/third-parties');
  }

  // ===========================================
  // ADMIN GPT API METHODS
  // ===========================================

  /**
   * Query database using GPT-powered natural language
   */
  async queryWithGPT(query: string, context?: string): Promise<{
    query: string;
    results: any[];
    explanation: string;
    suggestedActions?: string[];
  }> {
    return await this.request('/admin/gpt/query', {
      method: 'POST',
      body: JSON.stringify({ query, context })
    });
  }

  /**
   * Get insights about exchanges using GPT analysis
   */
  async getExchangeInsights(exchangeId?: string): Promise<{
    insights: Array<{
      category: string;
      insight: string;
      severity: 'low' | 'medium' | 'high';
      actionable: boolean;
      suggestedAction?: string;
    }>;
    summary: string;
  }> {
    const endpoint = exchangeId ? `/admin/gpt/insights/${exchangeId}` : '/admin/gpt/insights';
    return await this.request(endpoint);
  }

  /**
   * Generate reports using GPT
   */
  async generateGPTReport(reportType: string, parameters?: any): Promise<{
    report: {
      title: string;
      content: string;
      data: any[];
      charts?: any[];
    };
    metadata: {
      generatedAt: string;
      parameters: any;
      executionTime: number;
    };
  }> {
    return await this.request('/admin/gpt/reports', {
      method: 'POST',
      body: JSON.stringify({ reportType, parameters })
    });
  }

  /**
   * Get GPT usage statistics
   */
  async getGPTUsageStats(): Promise<{
    usage: {
      totalQueries: number;
      thisMonth: number;
      avgResponseTime: number;
      successRate: number;
    };
    topQueries: Array<{
      query: string;
      count: number;
      avgResponseTime: number;
    }>;
  }> {
    return await this.request('/admin/gpt/usage');
  }

  // ===========================================  
  // ENHANCED MESSAGE SYSTEM API METHODS
  // ===========================================

  /**
   * Send message with file attachments
   */
  async sendMessageWithFiles(exchangeId: string, content: string, files: File[]): Promise<{ message: any }> {
    const formData = new FormData();
    formData.append('content', content);
    files.forEach(file => formData.append('files', file));

    return await this.request(`/messages/exchange/${exchangeId}`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(true) // isFormData = true
    });
  }

  /**
   * Search messages in an exchange
   */
  async searchMessages(exchangeId: string, searchTerm: string, options?: {
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    messages: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const params = new URLSearchParams({
      q: searchTerm,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.offset && { offset: options.offset.toString() }),
      ...(options?.dateFrom && { dateFrom: options.dateFrom }),
      ...(options?.dateTo && { dateTo: options.dateTo })
    });
    
    return await this.request(`/messages/exchange/${exchangeId}/search?${params}`);
  }

  /**
   * Set typing indicator
   */
  async setTypingIndicator(exchangeId: string, isTyping: boolean): Promise<{ success: boolean }> {
    return await this.request(`/messages/exchange/${exchangeId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping })
    });
  }

  /**
   * Get typing indicators for an exchange
   */
  async getTypingIndicators(exchangeId: string): Promise<{
    typingUsers: Array<{
      userId: string;
      userName: string;
      timestamp: string;
    }>;
  }> {
    return await this.request(`/messages/exchange/${exchangeId}/typing`);
  }

  // ===========================================
  // ENHANCED DOCUMENT MANAGEMENT API METHODS  
  // ===========================================

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string): Promise<{
    versions: Array<{
      id: string;
      version: number;
      fileName: string;
      uploadedBy: string;
      uploadedAt: string;
      size: number;
      changes?: string;
    }>;
  }> {
    return await this.request(`/documents/${documentId}/versions`);
  }

  /**
   * Share document with external parties
   */
  async shareDocument(documentId: string, shareData: {
    email?: string;
    permissions: 'view' | 'download' | 'edit';
    expiresAt?: string;
    password?: string;
  }): Promise<{
    shareLink: string;
    shareId: string;
    expiresAt?: string;
  }> {
    return await this.request(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(shareData)
    });
  }

  /**
   * Search documents across all exchanges
   */
  async searchDocuments(searchTerm: string, filters?: {
    exchangeId?: string;
    type?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<{
    documents: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const params = new URLSearchParams({
      q: searchTerm,
      ...(filters?.exchangeId && { exchangeId: filters.exchangeId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.uploadedBy && { uploadedBy: filters.uploadedBy }),
      ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters?.dateTo && { dateTo: filters.dateTo }),
      ...(filters?.limit && { limit: filters.limit.toString() })
    });

    return await this.request(`/documents/search?${params}`);
  }

  /**
   * Perform bulk operations on documents
   */
  async bulkDocumentOperation(operation: 'delete' | 'move' | 'tag', data: {
    documentIds: string[];
    targetExchangeId?: string;
    tags?: string[];
  }): Promise<{
    success: number;
    failed: number;
    errors: Array<{ documentId: string; error: string }>;
  }> {
    return await this.request('/documents/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation, ...data })
    });
  }

  // ===========================================
  // ENHANCED TASK MANAGEMENT API METHODS
  // ===========================================

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(updates: {
    taskIds: string[];
    status?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
  }): Promise<{
    updated: number;
    failed: number;
    errors: Array<{ taskId: string; error: string }>;
  }> {
    return await this.request('/tasks/bulk-update', {
      method: 'POST',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Get tasks filtered by exchange
   */
  async getTasksByExchange(exchangeId: string, options?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<{
    tasks: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const params = new URLSearchParams({
      ...(options?.status && { status: options.status }),
      ...(options?.priority && { priority: options.priority }),
      ...(options?.assignedTo && { assignedTo: options.assignedTo }),
      ...(options?.limit && { limit: options.limit.toString() })
    });

    return await this.request(`/tasks/exchange/${exchangeId}?${params}`);
  }



  // ===========================================
  // USER AUDIT LOGS API METHODS
  // ===========================================

  /**
   * Get user's activity history for audit logs
   */
  async getUserAuditActivity(options?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    return await this.request(`/user-audit/my-activity?${queryParams}`);
  }

  /**
   * Get activities related to user's assignments
   */
  async getAssignedActivities(options?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    return await this.request(`/user-audit/assigned-activities?${queryParams}`);
  }

  /**
   * Get user's audit-related notifications
   */
  async getAuditNotifications(options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    return await this.request(`/user-audit/notifications?${queryParams}`);
  }

  /**
   * Mark audit notification as read
   */
  async markAuditNotificationAsRead(notificationId: string): Promise<any> {
    return await this.request(`/user-audit/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<any> {
    return await this.request('/user-audit/notifications/read-all', {
      method: 'PUT'
    });
  }

  /**
   * Get user's audit summary
   */
  async getAuditSummary(): Promise<any> {
    return await this.request('/user-audit/summary');
  }
}

export const apiService = new ApiService();
export default apiService;