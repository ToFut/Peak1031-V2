import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

interface ApiError {
  message: string;
  status: number;
  data?: any;
}

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add timestamp
        config.headers['X-Request-Time'] = new Date().toISOString();

        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });

        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle responses and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
          data: response.data
        });

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        // Handle specific error cases
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Try to refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.client.post('/auth/refresh', {
                refresh_token: refreshToken
              });

              const { access_token, refresh_token: newRefreshToken } = response.data;
              
              localStorage.setItem('token', access_token);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
              }
              
              return this.client(originalRequest);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              this.handleAuthError();
              return Promise.reject(this.createApiError(error));
            }
          } else {
            this.handleAuthError();
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
          
          // Could implement retry logic here
        }

        // Handle server errors
        if (error.response?.status && error.response.status >= 500) {
          console.error('Server error detected:', error.response.data);
          // Could show a global error notification
        }

        return Promise.reject(this.createApiError(error));
      }
    );
  }

  private createApiError(error: AxiosError): ApiError {
    return {
      message: (error.response?.data as any)?.message || error.message || 'An error occurred',
      status: error.response?.status || 0,
      data: error.response?.data
    };
  }

  private handleAuthError(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('lastActivity');
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=true';
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return (response.data.data || response.data) as T;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return (response.data.data || response.data) as T;
  }

  // File upload with progress tracking
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return (response.data.data || response.data) as T;
  }

  // Download file with progress tracking
  async downloadFile(
    url: string,
    filename?: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Batch requests
  async batch<T = any>(requests: Array<() => Promise<any>>): Promise<T[]> {
    const results = await Promise.allSettled(requests.map(request => request()));
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch request ${index} failed:`, result.reason);
        throw result.reason;
      }
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  // Get current user profile
  async getUserProfile(): Promise<any> {
    return this.get('/auth/profile');
  }

  // PracticePartner Integration
  async getPracticePartnerSyncStatus() {
    return this.get('/practicepartner/sync/status');
  }

  async startPracticePartnerSync(syncType: 'full' | 'incremental') {
    return this.post('/practicepartner/sync/start', { syncType });
  }

  async getPracticePartnerSyncHistory(params?: { limit?: number; page?: number }) {
    return this.get('/practicepartner/sync/history', { params });
  }

  async getPracticePartnerSyncDetails(syncId: string) {
    return this.get(`/practicepartner/sync/${syncId}`);
  }

  async updatePracticePartnerSyncConfig(config: { enabled: boolean; syncInterval: number }) {
    return this.put('/practicepartner/sync/config', config);
  }

  async getPracticePartnerSyncStatistics(days?: number) {
    return this.get('/practicepartner/sync/statistics', { params: { days } });
  }

  async testPracticePartnerConnection() {
    return this.post('/practicepartner/test-connection');
  }

  async getPracticePartnerMappingPreview(sampleData: any, dataType: 'client' | 'matter' | 'document') {
    return this.post('/practicepartner/mapping/preview', { sampleData, dataType });
  }
}

// Specific API service classes for different resources
export class ExchangeService {
  constructor(private api: ApiService) {}

  async getExchanges(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    return this.api.get('/exchanges', { params });
  }

  async getExchange(id: string) {
    return this.api.get(`/exchanges/${id}`);
  }

  async createExchange(data: any) {
    return this.api.post('/exchanges', data);
  }

  async updateExchange(id: string, data: any) {
    return this.api.put(`/exchanges/${id}`, data);
  }

  async deleteExchange(id: string) {
    return this.api.delete(`/exchanges/${id}`);
  }

  async getParticipants(exchangeId: string) {
    return this.api.get(`/exchanges/${exchangeId}/participants`);
  }

  async addParticipant(exchangeId: string, participantData: any) {
    return this.api.post(`/exchanges/${exchangeId}/participants`, participantData);
  }

  async removeParticipant(exchangeId: string, participantId: string) {
    return this.api.delete(`/exchanges/${exchangeId}/participants/${participantId}`);
  }
}

export class DocumentService {
  constructor(private api: ApiService) {}

  async getDocuments(exchangeId?: string) {
    const url = exchangeId ? `/exchanges/${exchangeId}/documents` : '/documents';
    return this.api.get(url);
  }

  async getDocument(id: string) {
    return this.api.get(`/documents/${id}`);
  }

  async uploadDocument(
    exchangeId: string,
    file: File,
    metadata: any,
    onProgress?: (progress: number) => void
  ) {
    return this.api.uploadFile(
      `/exchanges/${exchangeId}/documents`,
      file,
      metadata,
      onProgress
    );
  }

  async downloadDocument(id: string, filename?: string, onProgress?: (progress: number) => void) {
    return this.api.downloadFile(`/documents/${id}/download`, filename, onProgress);
  }

  async deleteDocument(id: string) {
    return this.api.delete(`/documents/${id}`);
  }

  async verifyPin(documentId: string, pin: string) {
    return this.api.post(`/documents/${documentId}/verify-pin`, { pin });
  }
}

export class TaskService {
  constructor(private api: ApiService) {}

  async getTasks(params?: {
    exchange_id?: string;
    status?: string;
    assigned_to?: string;
  }) {
    return this.api.get('/tasks', { params });
  }

  async getTask(id: string) {
    return this.api.get(`/tasks/${id}`);
  }

  async updateTask(id: string, data: any) {
    return this.api.put(`/tasks/${id}`, data);
  }

  async createTask(data: any) {
    return this.api.post('/tasks', data);
  }

  async deleteTask(id: string) {
    return this.api.delete(`/tasks/${id}`);
  }
}

export class MessageService {
  constructor(private api: ApiService) {}

  async getMessages(exchangeId: string, params?: {
    page?: number;
    limit?: number;
  }) {
    return this.api.get(`/exchanges/${exchangeId}/messages`, { params });
  }

  async sendMessage(exchangeId: string, data: {
    content: string;
    attachment_id?: string;
    message_type?: string;
  }) {
    return this.api.post(`/exchanges/${exchangeId}/messages`, data);
  }

  async markAsRead(messageId: string) {
    return this.api.put(`/messages/${messageId}/read`);
  }
}

export class UserService {
  constructor(private api: ApiService) {}

  async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
  }) {
    return this.api.get('/users', { params });
  }

  async getUser(id: string) {
    return this.api.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.api.post('/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.api.put(`/users/${id}`, data);
  }

  async deactivateUser(id: string) {
    return this.api.patch(`/users/${id}/deactivate`);
  }

  async activateUser(id: string) {
    return this.api.patch(`/users/${id}/activate`);
  }

  async deleteUser(id: string) {
    return this.api.delete(`/users/${id}`);
  }
}

export class SyncService {
  constructor(private api: ApiService) {}

  async getSyncStatus() {
    return this.api.get('/sync/status');
  }

  async triggerSync(type: 'contacts' | 'matters' | 'tasks' | 'all') {
    return this.api.post(`/sync/${type}`);
  }

  async getSyncLogs(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    return this.api.get('/sync/logs', { params });
  }
}

export class AdminService {
  constructor(private api: ApiService) {}

  async getDashboardData() {
    return this.api.get('/admin/dashboard');
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }) {
    return this.api.get('/admin/audit-logs', { params });
  }

  async getSystemHealth() {
    return this.api.get('/admin/system-health');
  }

  async exportData(type: string, params?: any) {
    return this.api.post('/admin/export', { type, ...params });
  }

  async getSettings() {
    return this.api.get('/admin/settings');
  }

  async updateSettings(settings: any) {
    return this.api.put('/admin/settings', settings);
  }
}

// Create singleton instances
const apiService = new ApiService();

export const exchangeService = new ExchangeService(apiService);
export const documentService = new DocumentService(apiService);
export const taskService = new TaskService(apiService);
export const messageService = new MessageService(apiService);
export const userService = new UserService(apiService);
export const syncService = new SyncService(apiService);
export const adminService = new AdminService(apiService);

export { apiService };
export default apiService;