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

// V2 Enhanced API Service with new endpoints
class ApiServiceV2Enhanced {
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
      if (response.status === 401 && localStorage.getItem('refreshToken') && !isRetry) {
        try {
          await this.refreshToken();
          return await this.request<T>(endpoint, options, true);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Authentication expired');
        }
      }
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ API Error: ${errorMessage} - ${url}`);
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log(`✅ API Response: ${url} - Status: ${response.status}`);
    return responseData;
  }

  // Authentication methods (enhanced for V2 hybrid auth)
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('🔐 Attempting login...');
    
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (response.user && response.token) {
      console.log('✅ Login successful:', response.user.email);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
      localStorage.setItem('authType', (response as any).authType || 'local');
      
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }

    return response;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await this.request<{ token: string; refreshToken?: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });

    localStorage.setItem('token', response.token);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
  }

  // Basic HTTP methods
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ===========================================
  // NEW V2 DASHBOARD ENDPOINTS (High Value!)
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
    return this.get('/dashboard/overview');
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
    return this.get('/dashboard/exchange-metrics');
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
    return this.get('/dashboard/deadlines');
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
    return this.get('/dashboard/financial-summary');
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
    return this.get('/dashboard/recent-activity');
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
    return this.get('/dashboard/alerts');
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
    return this.get('/dashboard/user-activity');
  }

  // ===========================================
  // ENHANCED EXCHANGE MANAGEMENT
  // ===========================================

  /**
   * Advance exchange to next stage in workflow
   */
  async advanceExchangeStage(exchangeId: string, nextStage: string): Promise<any> {
    return this.post(`/exchanges/${exchangeId}/advance-stage`, { nextStage });
  }

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
    return this.get(`/exchanges/${exchangeId}/workflow`);
  }

  /**
   * Get auto-generated tasks for exchange stage
   */
  async getExchangeTasks(exchangeId: string): Promise<Task[]> {
    return this.get(`/exchanges/${exchangeId}/tasks`);
  }

  // ===========================================
  // NOTIFICATION SYSTEM
  // ===========================================

  /**
   * Get user notifications
   */
  async getNotifications(): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
      action?: {
        type: string;
        url?: string;
        data?: any;
      };
    }>;
  }> {
    return this.get('/notifications');
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<any> {
    return this.post(`/notifications/${notificationId}/read`);
  }

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
    return this.get('/auth/permissions');
  }

  /**
   * Get comprehensive audit logs
   */
  async getAuditLogs(filters?: {
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
    return this.get(`/audit-logs${queryParams}`);
  }

  // ===========================================
  // EXISTING METHODS (Updated for V2)
  // ===========================================

  async getCurrentUser(): Promise<User> {
    const user = await this.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authType');
    }
  }

  // Standard CRUD operations (existing methods work with V2)
  async getUsers(): Promise<User[]> {
    return this.get('/users');
  }

  async getContacts(): Promise<Contact[]> {
    return this.get('/contacts');
  }

  async getExchanges(): Promise<Exchange[]> {
    return this.get('/exchanges');
  }

  async getExchange(id: string): Promise<Exchange> {
    return this.get(`/exchanges/${id}`);
  }

  async getTasks(exchangeId?: string): Promise<Task[]> {
    const endpoint = exchangeId ? `/exchanges/${exchangeId}/tasks` : '/tasks';
    return this.get(endpoint);
  }

  async getMessages(exchangeId?: string): Promise<Message[]> {
    const endpoint = exchangeId ? `/exchanges/${exchangeId}/messages` : '/messages';
    return this.get(endpoint);
  }

  async sendMessage(exchangeId: string, content: string): Promise<Message> {
    return this.post(`/exchanges/${exchangeId}/messages`, { content });
  }

  async getDocuments(): Promise<Document[]> {
    return this.get('/documents');
  }

  async uploadDocument(file: File, exchangeId: string, category: string = 'general'): Promise<Document> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('exchangeId', exchangeId);
    formData.append('category', category);

    const response = await fetch(`${this.baseURL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/download`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
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
    const user = JSON.parse(userStr);
    return user.id;
  }
}

// Export singleton instance
export const apiServiceV2 = new ApiServiceV2Enhanced();
export default apiServiceV2;