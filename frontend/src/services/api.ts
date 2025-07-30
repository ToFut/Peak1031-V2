import { supabase, User, Contact, Exchange, Task, Document, Message, AuditLog, SyncLog } from './supabase';

interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
}

class ApiService {
  private useMockData: boolean = false; // Using Supabase - not mock data

  constructor() {
    // No axios client needed - using Supabase directly
  }

  // Utility method to simulate API delay
  private async delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (this.useMockData) {
      await this.delay(500);
      throw new Error('Mock data mode not supported');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message || 'Login failed');
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Failed to load user profile');
      }

      // Store tokens
      if (data.session?.access_token) {
        localStorage.setItem('token', data.session.access_token);
      }
      if (data.session?.refresh_token) {
        localStorage.setItem('refreshToken', data.session.refresh_token);
      }

      return {
        user: userProfile,
        token: data.session?.access_token || '',
        refreshToken: data.session?.refresh_token,
        requiresTwoFactor: false // 2FA not implemented yet
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    if (this.useMockData) {
      await this.delay();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return;
    }
    
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still clear local storage even if server logout fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    if (this.useMockData) {
      await this.delay();
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('No user found');
      return JSON.parse(userStr);
    }
    
    try {
      // Use Supabase to get current user
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('Auth user fetch error:', error);
        throw new Error('No authenticated user found');
      }
      
      console.log('Fetching profile for user:', user.id);
      
      // Get user profile from database with retry logic
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile error details in getCurrentUser:', profileError);
        console.error('User ID from auth in getCurrentUser:', user.id);
        
        // If user profile doesn't exist, try to create it
        if (profileError.code === 'PGRST116') { // No rows returned
          console.log('Creating missing user profile...');
          
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || 'unknown@example.com',
              role: 'admin',
              first_name: 'Admin',
              last_name: 'User',
              is_active: true,
              two_fa_enabled: false
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Failed to create user profile:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }
          
          return createdProfile;
        }
        
        throw new Error(`Failed to load user profile: ${profileError.message}`);
      }
      
      return userProfile;
    } catch (error: any) {
      console.error('getCurrentUser error:', error);
      throw new Error(error.message || 'Failed to get current user');
    }
  }

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    if (this.useMockData) {
      await this.delay();
      const user = await this.getCurrentUser();
      const token = `mock_token_${user.id}_${Date.now()}`;
      const refreshToken = `mock_refresh_${user.id}_${Date.now()}`;
      localStorage.setItem('token', token);
      return { token, refreshToken };
    }
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        throw new Error('Failed to refresh token');
      }
      
      const token = data.session.access_token;
      const refreshToken = data.session.refresh_token;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      return { token, refreshToken };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  // User Management
  async getUsers(): Promise<User[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get users error:', error);
      throw new Error('Failed to fetch users');
    }
    
    return data || [];
  }

  async createUser(userData: Partial<User>): Promise<User> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) {
      console.error('Create user error:', error);
      throw new Error('Failed to create user');
    }
    
    return data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
    
    return data;
  }

  async deleteUser(id: string): Promise<void> {
    if (this.useMockData) {
      await this.delay();
      return;
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Delete user error:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Contact Management
  async getContacts(): Promise<Contact[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get contacts error:', error);
      throw new Error('Failed to fetch contacts');
    }
    
    return data || [];
  }

  async getContact(id: string): Promise<Contact> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Get contact error:', error);
      throw new Error('Failed to fetch contact');
    }
    
    return data;
  }

  // Exchange Management
  async getExchanges(): Promise<Exchange[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    const { data, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:contacts(*),
        coordinator:users(*),
        participants:exchange_participants(*),
        tasks(*),
        documents(*),
        messages(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get exchanges error:', error);
      throw new Error('Failed to fetch exchanges');
    }
    
    return data || [];
  }

  async getExchange(id: string): Promise<Exchange> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:contacts(*),
        coordinator:users(*),
        participants:exchange_participants(*),
        tasks(*),
        documents(*),
        messages(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Get exchange error:', error);
      throw new Error('Failed to fetch exchange');
    }
    
    return data;
  }

  async createExchange(exchangeData: Partial<Exchange>): Promise<Exchange> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('exchanges')
      .insert(exchangeData)
      .select()
      .single();
    
    if (error) {
      console.error('Create exchange error:', error);
      throw new Error('Failed to create exchange');
    }
    
    return data;
  }

  async updateExchange(id: string, exchangeData: Partial<Exchange>): Promise<Exchange> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('exchanges')
      .update(exchangeData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update exchange error:', error);
      throw new Error('Failed to update exchange');
    }
    
    return data;
  }

  async updateExchangeStatus(id: string, status: Exchange['status']): Promise<Exchange> {
    return this.updateExchange(id, { status });
  }

  // Task Management
  async getTasks(exchangeId?: string): Promise<Task[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        exchange:exchanges(*),
        assignee:users(*)
      `)
      .order('created_at', { ascending: false });
    
    if (exchangeId) {
      query = query.eq('exchange_id', exchangeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get tasks error:', error);
      throw new Error('Failed to fetch tasks');
    }
    
    return data || [];
  }

  async getTask(id: string): Promise<Task> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        exchange:exchanges(*),
        assignee:users(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Get task error:', error);
      throw new Error('Failed to fetch task');
    }
    
    return data;
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) {
      console.error('Create task error:', error);
      throw new Error('Failed to create task');
    }
    
    return data;
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update task error:', error);
      throw new Error('Failed to update task');
    }
    
    return data;
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    return this.updateTask(id, { status });
  }

  // Document Management
  async getDocuments(exchangeId?: string): Promise<Document[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    let query = supabase
      .from('documents')
      .select(`
        *,
        exchange:exchanges(*),
        uploader:users(*)
      `)
      .order('created_at', { ascending: false });
    
    if (exchangeId) {
      query = query.eq('exchange_id', exchangeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get documents error:', error);
      throw new Error('Failed to fetch documents');
    }
    
    return data || [];
  }

  async uploadDocument(file: File, exchangeId: string, metadata: Partial<Document>): Promise<Document> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('Failed to upload file');
      }
      
      // Create document record
      const documentData = {
        filename: fileName,
        original_filename: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        exchange_id: exchangeId,
        uploaded_by: (await this.getCurrentUser()).id,
        ...metadata
      };
      
      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
      
      if (error) {
        console.error('Create document error:', error);
        throw new Error('Failed to create document record');
      }
      
      return data;
    } catch (error: any) {
      console.error('Upload document error:', error);
      throw new Error(error.message || 'Failed to upload document');
    }
  }

  async downloadDocument(id: string, pin?: string): Promise<Blob> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    try {
      // Get document info
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (docError) {
        console.error('Get document error:', docError);
        throw new Error('Document not found');
      }
      
      // Download file from Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (error) {
        console.error('Download error:', error);
        throw new Error('Failed to download file');
      }
      
      return data;
    } catch (error: any) {
      console.error('Download document error:', error);
      throw new Error(error.message || 'Failed to download document');
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (this.useMockData) {
      await this.delay();
      return;
    }
    
    try {
      // Get document info first
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (docError) {
        console.error('Get document error:', docError);
        throw new Error('Document not found');
      }
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
      
      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Delete document error:', error);
        throw new Error('Failed to delete document');
      }
    } catch (error: any) {
      console.error('Delete document error:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  }

  // Message Management
  async getMessages(exchangeId: string): Promise<Message[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        exchange:exchanges(*),
        sender:users(*),
        attachment:documents(*)
      `)
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Get messages error:', error);
      throw new Error('Failed to fetch messages');
    }
    
    return data || [];
  }

  async sendMessage(exchangeId: string, content: string, attachmentId?: string): Promise<Message> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const messageData = {
      content,
      exchange_id: exchangeId,
      sender_id: (await this.getCurrentUser()).id,
      message_type: 'text' as const,
      read_by: [],
      ...(attachmentId && { attachment_id: attachmentId })
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) {
      console.error('Send message error:', error);
      throw new Error('Failed to send message');
    }
    
    return data;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (this.useMockData) {
      await this.delay();
      return;
    }
    
    try {
      const currentUser = await this.getCurrentUser();
      
      // First get the current message to see existing read_by array
      const { data: message, error: getError } = await supabase
        .from('messages')
        .select('read_by')
        .eq('id', messageId)
        .single();
      
      if (getError) {
        console.error('Get message error:', getError);
        throw new Error('Failed to get message');
      }
      
      // Add current user to read_by array if not already present
      const readBy = message.read_by || [];
      if (!readBy.includes(currentUser.id)) {
        readBy.push(currentUser.id);
        
        const { error } = await supabase
          .from('messages')
          .update({ read_by: readBy })
          .eq('id', messageId);
        
        if (error) {
          console.error('Mark message as read error:', error);
          throw new Error('Failed to mark message as read');
        }
      }
    } catch (error: any) {
      console.error('Mark message as read error:', error);
      throw new Error(error.message || 'Failed to mark message as read');
    }
  }

  // Audit and Sync Logs
  async getAuditLogs(filters?: any): Promise<AuditLog[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(*)
      `)
      .order('created_at', { ascending: false });
    
    if (filters) {
      // Apply filters if provided
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get audit logs error:', error);
      throw new Error('Failed to fetch audit logs');
    }
    
    return data || [];
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    const { data, error } = await supabase
      .from('sync_logs')
      .select(`
        *,
        triggeredByUser:users(*)
      `)
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Get sync logs error:', error);
      throw new Error('Failed to fetch sync logs');
    }
    
    return data || [];
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return {
        totalExchanges: 0,
        activeExchanges: 0,
        totalTasks: 0,
        overdueTasks: 0,
        pendingExchanges: 0,
        completedExchanges: 0
      };
    }
    
    try {
      // Get exchange stats
      const { data: exchanges } = await supabase
        .from('exchanges')
        .select('status');
      
      const exchangeStats = {
        total: exchanges?.length || 0,
        active: exchanges?.filter(e => ['PENDING', '45D', '180D'].includes(e.status)).length || 0,
        pending: exchanges?.filter(e => e.status === 'PENDING').length || 0,
        completed: exchanges?.filter(e => e.status === 'COMPLETED').length || 0
      };
      
      // Get task stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, due_date');
      
      const now = new Date();
      const taskStats = {
        total: tasks?.length || 0,
        overdue: tasks?.filter(t => 
          t.due_date && new Date(t.due_date) < now && t.status !== 'COMPLETED'
        ).length || 0
      };
      
      return {
        totalExchanges: exchangeStats.total,
        activeExchanges: exchangeStats.active,
        totalTasks: taskStats.total,
        overdueTasks: taskStats.overdue,
        pendingExchanges: exchangeStats.pending,
        completedExchanges: exchangeStats.completed
      };
    } catch (error: any) {
      console.error('Get dashboard stats error:', error);
      throw new Error('Failed to fetch dashboard stats');
    }
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    // For now, return empty array - notifications can be implemented later
    return [];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (this.useMockData) {
      await this.delay();
      return;
    }
    
    // For now, do nothing - notifications can be implemented later
  }

  // Generic HTTP methods (using fetch instead of axios)
  async get(url: string, config?: any): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(config?.headers || {})
    };
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...config
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(config?.headers || {})
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Practice Partner Integration (placeholder methods)
  async getPracticePartnerSyncStatus(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return { status: 'idle', lastSync: null };
    }
    
    // Placeholder - implement actual Practice Partner integration
    return { status: 'not_configured', lastSync: null };
  }

  async getPracticePartnerSyncHistory(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return [];
    }
    
    return this.getSyncLogs();
  }

  async getPracticePartnerSyncStatistics(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncDate: null
      };
    }
    
    const syncLogs = await this.getSyncLogs();
    const totalSyncs = syncLogs.length;
    const successfulSyncs = syncLogs.filter(log => log.status === 'success').length;
    const failedSyncs = syncLogs.filter(log => log.status === 'error').length;
    const lastSyncDate = syncLogs.length > 0 ? syncLogs[0].started_at : null;
    
    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      lastSyncDate
    };
  }

  async startPracticePartnerSync(syncType: string = 'full'): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return { message: 'Mock sync started' };
    }
    
    // Placeholder - implement actual Practice Partner sync
    return { message: 'Practice Partner sync not yet implemented' };
  }

  async triggerSync(syncType: string = 'full'): Promise<{ message: string }> {
    if (this.useMockData) {
      await this.delay();
      return { message: 'Mock sync triggered' };
    }
    
    try {
      const response = await this.post('/sync/trigger', { syncType });
      return response;
    } catch (error: any) {
      console.error('Trigger sync error:', error);
      throw new Error(error.message || 'Failed to trigger sync');
    }
  }

  // New sync-related methods
  async getSyncStatus(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return {
        scheduled: {
          isInitialized: true,
          jobs: {
            incremental: {
              isRunning: true,
              nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            },
            daily_full: {
              isRunning: true,
              nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          },
          totalJobs: 2
        },
        recent: []
      };
    }
    
    try {
      const response = await this.get('/sync/status');
      return response;
    } catch (error: any) {
      console.error('Get sync status error:', error);
      throw new Error(error.message || 'Failed to get sync status');
    }
  }

  async testPPConnection(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return {
        connected: true,
        message: 'Mock connection successful',
        sampleData: null
      };
    }
    
    try {
      const response = await this.get('/sync/test-connection');
      return response;
    } catch (error: any) {
      console.error('Test PP connection error:', error);
      throw new Error(error.message || 'Failed to test connection');
    }
  }

  async getSyncStatistics(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return {
        overall: {
          totalSyncs: 45,
          successfulSyncs: 42,
          failedSyncs: 2,
          partialSyncs: 1,
          totalRecordsProcessed: 1250,
          totalRecordsCreated: 150,
          totalRecordsUpdated: 800,
          lastSuccessfulSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          averageSyncDuration: 45
        },
        byType: {
          contacts: { total: 15, successful: 15, failed: 0, partial: 0 },
          matters: { total: 15, successful: 14, failed: 1, partial: 0 },
          tasks: { total: 15, successful: 13, failed: 1, partial: 1 }
        },
        period: '30 days'
      };
    }
    
    try {
      const response = await this.get('/sync/statistics');
      return response;
    } catch (error: any) {
      console.error('Get sync statistics error:', error);
      throw new Error(error.message || 'Failed to get sync statistics');
    }
  }

  async updateSyncSchedule(schedule: {
    incrementalInterval: number;
    fullSyncHour: number;
    fullSyncMinute: number;
  }): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return { message: 'Mock schedule updated' };
    }
    
    try {
      const response = await this.put('/sync/schedule', schedule);
      return response;
    } catch (error: any) {
      console.error('Update sync schedule error:', error);
      throw new Error(error.message || 'Failed to update sync schedule');
    }
  }

  async stopAllSyncs(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return { message: 'Mock syncs stopped' };
    }
    
    try {
      const response = await this.post('/sync/stop');
      return response;
    } catch (error: any) {
      console.error('Stop syncs error:', error);
      throw new Error(error.message || 'Failed to stop syncs');
    }
  }

  async restartSyncs(): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      return { message: 'Mock syncs restarted' };
    }
    
    try {
      const response = await this.post('/sync/restart');
      return response;
    } catch (error: any) {
      console.error('Restart syncs error:', error);
      throw new Error(error.message || 'Failed to restart syncs');
    }
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    if (this.useMockData) {
      await this.delay();
      throw new Error('Mock data mode not supported');
    }
    
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(config?.headers || {})
    };
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const apiService = new ApiService();