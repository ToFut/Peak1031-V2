const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class PracticePartnerService {
  constructor() {
    this.baseURL = 'https://app.practicepanther.com/api/v2';
    this.clientId = process.env.PP_CLIENT_ID;
    this.clientSecret = process.env.PP_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );

    // Rate limiting: 300 requests per 5 minutes according to PP docs
    this.rateLimiter = {
      requests: [],
      maxRequests: 300,
      windowMs: 5 * 60 * 1000 // 5 minutes
    };

    // Initialize axios with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
          console.log(`🔑 PP: Adding auth header for ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          console.log('⚠️ PP: No access token available for request');
        }
        
        // Rate limiting check
        await this.checkRateLimit();
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear it and retry
          console.log('🔐 PP: Access token expired, clearing token');
          this.accessToken = null;
          this.tokenExpiry = null;
        }
        
        // Log rate limit issues
        if (error.response?.status === 429) {
          console.log('⚠️ PP: Rate limit exceeded, backing off');
          await this.backoff(60000); // Wait 1 minute
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get stored OAuth token from database
   */
  async getStoredToken() {
    try {
      const { data, error } = await this.supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', 'practicepanther')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log('🔍 PP: No stored token found');
        return null;
      }

      // Check if token is still valid
      if (data.expires_at && new Date(data.expires_at) > new Date()) {
        console.log('✅ PP: Using stored valid token');
        this.accessToken = data.access_token;
        this.tokenExpiry = new Date(data.expires_at).getTime();
        return data;
      }

      // Try to refresh token if available
      if (data.refresh_token) {
        console.log('🔄 PP: Refreshing expired token...');
        return await this.refreshToken(data.refresh_token);
      }

      console.log('⚠️ PP: Stored token expired and no refresh token available');
      return null;
    } catch (error) {
      console.error('❌ PP: Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Store OAuth token in database
   */
  async storeToken(tokenData) {
    try {
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      const tokenRecord = {
        provider: 'practicepanther',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope || null,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('oauth_tokens')
        .insert(tokenRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ PP: Error storing token:', error);
        return false;
      }

      console.log('✅ PP: Token stored successfully');
      return true;
    } catch (error) {
      console.error('❌ PP: Error storing token:', error);
      return false;
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(refreshToken) {
    try {
      console.log('🔄 PP: Refreshing access token...');
      
      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const response = await axios.post('https://app.practicepanther.com/oauth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
        
        // Store the new token
        await this.storeToken(response.data);
        
        console.log('✅ PP: Token refreshed successfully');
        return response.data;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('❌ PP: Token refresh failed:', error.message);
      if (error.response?.data) {
        console.error('PP Refresh Error Details:', error.response.data);
      }
      return null;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state = null) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: process.env.PP_REDIRECT_URI,
      state: state || Math.random().toString(36).substring(7)
    });

    const authUrl = `https://app.practicepanther.com/oauth/authorize?${params.toString()}`;
    console.log('🔗 PP: Generated auth URL:', authUrl);
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode, state = null) {
    try {
      console.log('🔄 PP: Exchanging authorization code for token...');
      
      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: process.env.PP_REDIRECT_URI
      });

      const response = await axios.post('https://app.practicepanther.com/oauth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('🔍 PP: Token exchange response:', response.data);

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
        
        // Store the token
        await this.storeToken(response.data);
        
        console.log('✅ PP: Authorization successful');
        return response.data;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ PP: Authorization code exchange failed:', error.message);
      if (error.response?.data) {
        console.error('PP Auth Error Details:', error.response.data);
      }
      throw new Error(`PracticePanther authorization failed: ${error.message}`);
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureValidToken() {
    // First try to get a stored valid token
    const storedToken = await this.getStoredToken();
    if (storedToken && this.accessToken) {
      console.log('🔑 PP: Using stored valid token');
      return;
    }

    // If no valid token available, we need to go through OAuth flow
    console.error('❌ PP: No valid access token available. OAuth authorization required.');
    console.log('🔗 PP: Use the following URL to authorize the application:');
    console.log(this.generateAuthUrl());
    
    throw new Error('PracticePanther authorization required. Please complete OAuth flow first.');
  }

  /**
   * Public method to authenticate (for testing)
   */
  async authenticate() {
    await this.ensureValidToken();
    return {
      access_token: this.accessToken,
      token_type: 'Bearer',
      expires_in: this.tokenExpiry ? Math.floor((this.tokenExpiry - Date.now()) / 1000) : 0
    };
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.windowMs
    );
    
    // Check if we're at the limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const waitTime = this.rateLimiter.windowMs - (now - oldestRequest);
      
      console.log(`⏳ PP: Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s`);
      await this.backoff(waitTime);
    }
    
    // Record this request
    this.rateLimiter.requests.push(now);
  }

  /**
   * Backoff/delay utility
   */
  async backoff(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log sync activity to database
   */
  async logSyncActivity(syncType, status, details = {}) {
    try {
      const logEntry = {
        sync_type: syncType,
        status: status,
        started_at: details.startedAt || new Date().toISOString(),
        completed_at: details.completedAt || null,
        records_processed: details.recordsProcessed || 0,
        records_created: details.recordsCreated || 0,
        records_updated: details.recordsUpdated || 0,
        error_message: details.errorMessage || null,
        details: details.additionalInfo || null,
        triggered_by: details.triggeredBy || null
      };

      const { data, error } = await this.supabase
        .from('sync_logs')
        .insert(logEntry)
        .select()
        .single();

      if (error) {
        console.error('Failed to log sync activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error logging sync activity:', error);
      return null;
    }
  }

  /**
   * Update sync log entry
   */
  async updateSyncLog(logId, updates) {
    try {
      const { error } = await this.supabase
        .from('sync_logs')
        .update(updates)
        .eq('id', logId);

      if (error) {
        console.error('Failed to update sync log:', error);
      }
    } catch (error) {
      console.error('Error updating sync log:', error);
    }
  }

  /**
   * Get last sync timestamp for incremental syncing
   */
  async getLastSyncTimestamp(syncType, entityType) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .select('completed_at, details')
        .eq('sync_type', syncType)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Check if details contain entity-specific timestamp
      const details = data[0].details || {};
      if (details[`${entityType}_last_sync`]) {
        return details[`${entityType}_last_sync`];
      }

      return data[0].completed_at;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Fetch contacts from PracticePanther with pagination
   */
  async fetchContacts(params = {}) {
    console.log('👥 PP: Fetching contacts...', params);
    
    try {
      const response = await this.client.get('/contacts', { params });
      
      console.log(`✅ PP: Fetched ${response.data.results?.length || 0} contacts`);
      
      return {
        results: response.data.results || [],
        hasMore: response.data.has_more || false,
        nextPageUrl: response.data.next_page_url || null
      };
    } catch (error) {
      console.error('❌ PP: Error fetching contacts:', error.message);
      throw error;
    }
  }

  /**
   * Fetch matters (exchanges) from PracticePanther
   */
  async fetchMatters(params = {}) {
    console.log('📄 PP: Fetching matters...', params);
    
    try {
      const response = await this.client.get('/matters', { params });
      
      console.log(`✅ PP: Fetched ${response.data.results?.length || 0} matters`);
      
      return {
        results: response.data.results || [],
        hasMore: response.data.has_more || false,
        nextPageUrl: response.data.next_page_url || null
      };
    } catch (error) {
      console.error('❌ PP: Error fetching matters:', error.message);
      throw error;
    }
  }

  /**
   * Fetch tasks from PracticePanther
   */
  async fetchTasks(params = {}) {
    console.log('✅ PP: Fetching tasks...', params);
    
    try {
      const response = await this.client.get('/tasks', { params });
      
      console.log(`✅ PP: Fetched ${response.data.results?.length || 0} tasks`);
      
      return {
        results: response.data.results || [],
        hasMore: response.data.has_more || false,
        nextPageUrl: response.data.next_page_url || null
      };
    } catch (error) {
      console.error('❌ PP: Error fetching tasks:', error.message);
      throw error;
    }
  }

  /**
   * Transform PP contact to our database format
   */
  transformContact(ppContact) {
    return {
      pp_contact_id: ppContact.id.toString(),
      first_name: ppContact.first_name || '',
      last_name: ppContact.last_name || '',
      email: ppContact.email || `unknown_${ppContact.id}@example.com`,
      phone: ppContact.phone || null,
      company: ppContact.company || null,
      address: ppContact.address ? JSON.stringify(ppContact.address) : null,
      position: ppContact.position || ppContact.title || null,
      contact_type: this.mapContactType(ppContact.type || ppContact.category),
      notes: ppContact.notes || ppContact.description || null,
      pp_data: ppContact,
      last_sync_at: new Date().toISOString(),
      created_at: ppContact.created_at || new Date().toISOString(),
      updated_at: ppContact.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform PP matter to our exchange format
   */
  transformMatter(ppMatter) {
    return {
      pp_matter_id: ppMatter.id.toString(),
      name: ppMatter.name || ppMatter.description || 'Unnamed Exchange',
      exchange_name: ppMatter.name || ppMatter.description || 'Unnamed Exchange',
      status: this.mapMatterStatus(ppMatter.status),
      new_status: this.mapMatterStatusToNew(ppMatter.status),
      exchange_type: this.mapExchangeType(ppMatter.type || ppMatter.matter_type),
      client_id: ppMatter.client_id ? this.findClientByPPId(ppMatter.client_id) : null,
      start_date: ppMatter.opened_date || new Date().toISOString(),
      completion_date: ppMatter.closed_date || null,
      exchange_value: ppMatter.value || null,
      relinquished_property_address: ppMatter.relinquished_address || ppMatter.property_address || null,
      relinquished_sale_price: ppMatter.relinquished_price || ppMatter.sale_price || null,
      relinquished_closing_date: ppMatter.relinquished_closing || ppMatter.closing_date || null,
      identification_date: ppMatter.identification_date || ppMatter.id_deadline || null,
      identification_deadline: ppMatter.identification_date || ppMatter.id_deadline || null,
      exchange_deadline: ppMatter.exchange_deadline || ppMatter.completion_deadline || null,
      completion_deadline: ppMatter.exchange_deadline || ppMatter.completion_deadline || null,
      exchange_coordinator: ppMatter.coordinator || ppMatter.assigned_attorney || null,
      attorney_or_cpa: ppMatter.attorney || ppMatter.cpa || ppMatter.professional || null,
      bank_account_escrow: ppMatter.escrow_account || ppMatter.trust_account || null,
      notes: ppMatter.description || ppMatter.notes || null,
      pp_data: ppMatter,
      last_sync_at: new Date().toISOString(),
      created_at: ppMatter.created_at || new Date().toISOString(),
      updated_at: ppMatter.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform PP task to our task format
   */
  transformTask(ppTask) {
    return {
      pp_task_id: ppTask.id.toString(),
      title: ppTask.name || ppTask.description || 'Unnamed Task',
      description: ppTask.description || null,
      status: this.mapTaskStatus(ppTask.status),
      priority: this.mapTaskPriority(ppTask.priority),
      exchange_id: ppTask.matter_id ? this.findExchangeByPPId(ppTask.matter_id) : null,
      assigned_to: ppTask.assigned_to ? this.findUserByPPId(ppTask.assigned_to) : null,
      due_date: ppTask.due_date || null,
      completed_at: ppTask.completed_at || null,
      pp_data: ppTask,
      last_sync_at: new Date().toISOString(),
      created_at: ppTask.created_at || new Date().toISOString(),
      updated_at: ppTask.updated_at || new Date().toISOString()
    };
  }

  /**
   * Map PP matter status to our exchange status
   */
  mapMatterStatus(ppStatus) {
    const statusMap = {
      'active': 'PENDING',
      'open': 'PENDING',
      'in_progress': '45D',
      'pending': 'PENDING',
      'closed': 'COMPLETED',
      'completed': 'COMPLETED',
      'cancelled': 'TERMINATED'
    };
    
    return statusMap[ppStatus?.toLowerCase()] || 'PENDING';
  }

  /**
   * Map PP matter status to our new exchange status system
   */
  mapMatterStatusToNew(ppStatus) {
    const statusMap = {
      'active': 'In Progress',
      'open': 'In Progress',
      'in_progress': 'In Progress',
      'pending': 'Draft',
      'draft': 'Draft',
      'closed': 'Completed',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'terminated': 'Cancelled'
    };
    
    return statusMap[ppStatus?.toLowerCase()] || 'Draft';
  }

  /**
   * Map PP task status to our task status
   */
  mapTaskStatus(ppStatus) {
    const statusMap = {
      'open': 'PENDING',
      'pending': 'PENDING',
      'in_progress': 'IN_PROGRESS',
      'working': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'done': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'on_hold': 'ON_HOLD'
    };
    
    return statusMap[ppStatus?.toLowerCase()] || 'PENDING';
  }

  /**
   * Map PP task priority to our priority system
   */
  mapTaskPriority(ppPriority) {
    const priorityMap = {
      'low': 'LOW',
      'normal': 'MEDIUM',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'urgent': 'URGENT',
      'critical': 'URGENT'
    };
    
    return priorityMap[ppPriority?.toLowerCase()] || 'MEDIUM';
  }

  /**
   * Map PP contact type to our contact type system
   */
  mapContactType(ppType) {
    const typeMap = {
      'client': 'Client',
      'customer': 'Client',
      'individual': 'Client',
      'person': 'Client',
      'broker': 'Broker',
      'real_estate_broker': 'Broker',
      'realtor': 'Broker',
      'attorney': 'Attorney',
      'lawyer': 'Attorney',
      'legal': 'Attorney',
      'cpa': 'CPA',
      'accountant': 'CPA',
      'accounting': 'CPA',
      'agent': 'Agent',
      'representative': 'Agent',
      'company': 'Other',
      'business': 'Other',
      'corporation': 'Other',
      'llc': 'Other'
    };
    
    return typeMap[ppType?.toLowerCase()] || 'Other';
  }

  /**
   * Map PP exchange type to our exchange type system
   */
  mapExchangeType(ppType) {
    const typeMap = {
      'delayed': 'Delayed',
      'reverse': 'Reverse',
      'improvement': 'Improvement',
      'build_to_suit': 'Improvement',
      'construction': 'Improvement'
    };
    
    return typeMap[ppType?.toLowerCase()] || 'Other';
  }

  /**
   * Find existing client by PP ID
   */
  async findClientByPPId(ppContactId) {
    try {
      const { data, error } = await this.supabase
        .from('contacts')
        .select('id')
        .eq('pp_contact_id', ppContactId.toString())
        .single();

      if (error || !data) {
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error finding client by PP ID:', error);
      return null;
    }
  }

  /**
   * Find existing exchange by PP matter ID
   */
  async findExchangeByPPId(ppMatterId) {
    try {
      const { data, error } = await this.supabase
        .from('exchanges')
        .select('id')
        .eq('pp_matter_id', ppMatterId.toString())
        .single();

      if (error || !data) {
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error finding exchange by PP ID:', error);
      return null;
    }
  }

  /**
   * Find existing user by PP ID (placeholder - we don't sync users from PP)
   */
  async findUserByPPId(ppUserId) {
    // For now, return null as we don't sync users from PP
    // Users are managed internally
    return null;
  }

  /**
   * Sync single contact to database
   */
  async syncContact(ppContact) {
    try {
      const contactData = this.transformContact(ppContact);
      
      // Check if contact exists
      const { data: existing } = await this.supabase
        .from('contacts')
        .select('id, updated_at')
        .eq('pp_contact_id', contactData.pp_contact_id)
        .single();

      if (existing) {
        // Update existing contact
        const { data, error } = await this.supabase
          .from('contacts')
          .update(contactData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating contact:', error);
          return { action: 'error', error: error.message };
        }

        return { action: 'updated', data };
      } else {
        // Create new contact
        const { data, error } = await this.supabase
          .from('contacts')
          .insert(contactData)
          .select()
          .single();

        if (error) {
          console.error('Error creating contact:', error);
          return { action: 'error', error: error.message };
        }

        return { action: 'created', data };
      }
    } catch (error) {
      console.error('Error syncing contact:', error);
      return { action: 'error', error: error.message };
    }
  }

  /**
   * Sync single matter/exchange to database
   */
  async syncMatter(ppMatter) {
    try {
      const exchangeData = this.transformMatter(ppMatter);
      
      // Resolve client_id if we have pp_contact_id
      if (ppMatter.client_id) {
        exchangeData.client_id = await this.findClientByPPId(ppMatter.client_id);
      }
      
      // Check if exchange exists
      const { data: existing } = await this.supabase
        .from('exchanges')
        .select('id, updated_at')
        .eq('pp_matter_id', exchangeData.pp_matter_id)
        .single();

      if (existing) {
        // Update existing exchange
        const { data, error } = await this.supabase
          .from('exchanges')
          .update(exchangeData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating exchange:', error);
          return { action: 'error', error: error.message };
        }

        // Sync replacement properties for this exchange
        const propResult = await this.syncReplacementProperties(existing.id, ppMatter);
        
        // Sync contact-exchange links
        const linkResult = await this.syncContactExchangeLinks(existing.id, ppMatter);
        
        return { 
          action: 'updated', 
          data,
          replacementProperties: propResult,
          contactLinks: linkResult
        };
      } else {
        // Create new exchange
        const { data, error } = await this.supabase
          .from('exchanges')
          .insert(exchangeData)
          .select()
          .single();

        if (error) {
          console.error('Error creating exchange:', error);
          return { action: 'error', error: error.message };
        }

        // Sync replacement properties for this new exchange
        const propResult = await this.syncReplacementProperties(data.id, ppMatter);

        // Sync contact-exchange links
        const linkResult = await this.syncContactExchangeLinks(data.id, ppMatter);

        return { 
          action: 'created', 
          data,
          replacementProperties: propResult,
          contactLinks: linkResult
        };
      }
    } catch (error) {
      console.error('Error syncing matter:', error);
      return { action: 'error', error: error.message };
    }
  }

  /**
   * Sync replacement properties for an exchange
   */
  async syncReplacementProperties(exchangeId, ppMatter) {
    try {
      // Extract replacement properties from PP matter data
      const replacementProps = this.extractReplacementProperties(ppMatter);
      
      if (!replacementProps || replacementProps.length === 0) {
        return { action: 'no_properties', count: 0 };
      }

      const results = [];
      
      for (const prop of replacementProps) {
        try {
          const propData = {
            exchange_id: exchangeId,
            address: prop.address,
            purchase_price: prop.price || null,
            closing_date: prop.closing_date || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Check if property already exists (by address for this exchange)
          const { data: existing } = await this.supabase
            .from('replacement_properties')
            .select('id')
            .eq('exchange_id', exchangeId)
            .eq('address', prop.address)
            .single();

          if (existing) {
            // Update existing property
            const { data, error } = await this.supabase
              .from('replacement_properties')
              .update(propData)
              .eq('id', existing.id)
              .select()
              .single();

            if (error) {
              console.error('Error updating replacement property:', error);
              results.push({ action: 'error', address: prop.address, error: error.message });
            } else {
              results.push({ action: 'updated', data });
            }
          } else {
            // Create new property
            const { data, error } = await this.supabase
              .from('replacement_properties')
              .insert(propData)
              .select()
              .single();

            if (error) {
              console.error('Error creating replacement property:', error);
              results.push({ action: 'error', address: prop.address, error: error.message });
            } else {
              results.push({ action: 'created', data });
            }
          }
        } catch (error) {
          console.error('Error processing replacement property:', error);
          results.push({ action: 'error', address: prop.address || 'unknown', error: error.message });
        }
      }

      return {
        action: 'processed',
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('Error syncing replacement properties:', error);
      return { action: 'error', error: error.message };
    }
  }

  /**
   * Extract replacement properties from PP matter data
   */
  extractReplacementProperties(ppMatter) {
    const properties = [];
    
    // Try different possible fields in PP data for replacement properties
    if (ppMatter.replacement_properties && Array.isArray(ppMatter.replacement_properties)) {
      return ppMatter.replacement_properties.map(prop => ({
        address: prop.address || prop.property_address || '',
        price: prop.price || prop.purchase_price || prop.value || null,
        closing_date: prop.closing_date || prop.close_date || null
      }));
    }
    
    // Try single replacement property fields
    if (ppMatter.replacement_address || ppMatter.replacement_property) {
      properties.push({
        address: ppMatter.replacement_address || ppMatter.replacement_property || '',
        price: ppMatter.replacement_price || ppMatter.replacement_value || null,
        closing_date: ppMatter.replacement_closing || ppMatter.replacement_close_date || null
      });
    }
    
    // Try looking in custom fields or notes for property info
    if (ppMatter.custom_fields) {
      const customFields = ppMatter.custom_fields;
      Object.keys(customFields).forEach(key => {
        if (key.toLowerCase().includes('replacement') && key.toLowerCase().includes('address')) {
          properties.push({
            address: customFields[key] || '',
            price: customFields[key.replace('address', 'price')] || null,
            closing_date: customFields[key.replace('address', 'closing')] || null
          });
        }
      });
    }
    
    return properties.filter(prop => prop.address && prop.address.trim() !== '');
  }

  /**
   * Sync contact-exchange relationships
   */
  async syncContactExchangeLinks(exchangeId, ppMatter) {
    try {
      const contactIds = this.extractContactIdsFromMatter(ppMatter);
      
      if (!contactIds || contactIds.length === 0) {
        return { action: 'no_contacts', count: 0 };
      }

      const results = [];
      
      for (const ppContactId of contactIds) {
        try {
          // Find the local contact ID by PP contact ID
          const localContactId = await this.findClientByPPId(ppContactId);
          
          if (!localContactId) {
            console.log(`Contact with PP ID ${ppContactId} not found locally, skipping link`);
            results.push({ 
              action: 'skipped', 
              pp_contact_id: ppContactId, 
              reason: 'Contact not found locally' 
            });
            continue;
          }

          // Check if link already exists
          const { data: existing } = await this.supabase
            .from('contact_exchange_links')
            .select('id')
            .eq('contact_id', localContactId)
            .eq('exchange_id', exchangeId)
            .single();

          if (!existing) {
            // Create new contact-exchange link
            const { data, error } = await this.supabase
              .from('contact_exchange_links')
              .insert({
                contact_id: localContactId,
                exchange_id: exchangeId,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (error) {
              console.error('Error creating contact-exchange link:', error);
              results.push({ 
                action: 'error', 
                pp_contact_id: ppContactId, 
                error: error.message 
              });
            } else {
              results.push({ action: 'created', data });
            }
          } else {
            results.push({ 
              action: 'exists', 
              pp_contact_id: ppContactId,
              link_id: existing.id 
            });
          }
        } catch (error) {
          console.error('Error processing contact-exchange link:', error);
          results.push({ 
            action: 'error', 
            pp_contact_id: ppContactId, 
            error: error.message 
          });
        }
      }

      return {
        action: 'processed',
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('Error syncing contact-exchange links:', error);
      return { action: 'error', error: error.message };
    }
  }

  /**
   * Extract contact IDs from PP matter data
   */
  extractContactIdsFromMatter(ppMatter) {
    const contactIds = [];
    
    // Add the primary client
    if (ppMatter.client_id) {
      contactIds.push(ppMatter.client_id.toString());
    }
    
    // Add any additional contacts from participants or custom fields
    if (ppMatter.participants && Array.isArray(ppMatter.participants)) {
      ppMatter.participants.forEach(participant => {
        if (participant.contact_id) {
          contactIds.push(participant.contact_id.toString());
        }
      });
    }
    
    // Check for other contact fields
    const contactFields = [
      'attorney_id', 'cpa_id', 'broker_id', 'agent_id', 
      'coordinator_id', 'intermediary_id', 'qi_id'
    ];
    
    contactFields.forEach(field => {
      if (ppMatter[field]) {
        contactIds.push(ppMatter[field].toString());
      }
    });
    
    // Look in custom fields for additional contacts
    if (ppMatter.custom_fields) {
      Object.keys(ppMatter.custom_fields).forEach(key => {
        if (key.toLowerCase().includes('contact') && ppMatter.custom_fields[key]) {
          // Assume it's a contact ID if it's numeric
          const value = ppMatter.custom_fields[key];
          if (value && !isNaN(value)) {
            contactIds.push(value.toString());
          }
        }
      });
    }
    
    // Remove duplicates and return
    return [...new Set(contactIds)];
  }

  /**
   * Sync single task to database
   */
  async syncTask(ppTask) {
    try {
      const taskData = this.transformTask(ppTask);
      
      // Resolve exchange_id if we have pp_matter_id
      if (ppTask.matter_id) {
        taskData.exchange_id = await this.findExchangeByPPId(ppTask.matter_id);
      }
      
      // Check if task exists
      const { data: existing } = await this.supabase
        .from('tasks')
        .select('id, updated_at')
        .eq('pp_task_id', taskData.pp_task_id)
        .single();

      if (existing) {
        // Update existing task
        const { data, error } = await this.supabase
          .from('tasks')
          .update(taskData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating task:', error);
          return { action: 'error', error: error.message };
        }

        return { action: 'updated', data };
      } else {
        // Create new task
        const { data, error } = await this.supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) {
          console.error('Error creating task:', error);
          return { action: 'error', error: error.message };
        }

        return { action: 'created', data };
      }
    } catch (error) {
      console.error('Error syncing task:', error);
      return { action: 'error', error: error.message };
    }
  }

  /**
   * Perform incremental sync - only fetch changes since last sync
   */
  async performIncrementalSync(syncType = 'contacts', triggeredBy = null) {
    console.log(`🔄 Starting incremental ${syncType} sync...`);
    
    const syncLog = await this.logSyncActivity(syncType, 'running', {
      startedAt: new Date().toISOString(),
      triggeredBy
    });

    if (!syncLog) {
      throw new Error('Failed to create sync log');
    }

    let stats = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };

    try {
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp(syncType, syncType);
      const params = {};
      
      // If we have a last sync time, only fetch changes since then
      if (lastSync) {
        params.updated_since = lastSync;
        console.log(`📅 Fetching ${syncType} updated since: ${lastSync}`);
      } else {
        console.log(`📅 Performing full ${syncType} sync (no previous sync found)`);
      }

      let hasMore = true;
      let page = 1;
      const maxPages = 50; // Safety limit

      while (hasMore && page <= maxPages) {
        console.log(`📄 Processing page ${page}...`);
        
        let response;
        params.page = page;
        params.per_page = 100; // PP max is 100 per page

        if (syncType === 'contacts') {
          response = await this.fetchContacts(params);
        } else if (syncType === 'matters') {
          response = await this.fetchMatters(params);
        } else if (syncType === 'tasks') {
          response = await this.fetchTasks(params);
        } else {
          throw new Error(`Unknown sync type: ${syncType}`);
        }

        const items = response.results || [];
        stats.recordsProcessed += items.length;

        // Process each item
        for (const item of items) {
          try {
            let result;
            
            if (syncType === 'contacts') {
              result = await this.syncContact(item);
            } else if (syncType === 'matters') {
              result = await this.syncMatter(item);
            } else if (syncType === 'tasks') {
              result = await this.syncTask(item);
            }

            if (result.action === 'created') {
              stats.recordsCreated++;
            } else if (result.action === 'updated') {
              stats.recordsUpdated++;
            } else if (result.action === 'error') {
              stats.errors.push({
                id: item.id,
                error: result.error
              });
            }
          } catch (error) {
            console.error(`Error processing ${syncType} ${item.id}:`, error);
            stats.errors.push({
              id: item.id,
              error: error.message
            });
          }
        }

        // Check if there are more pages
        hasMore = response.hasMore && items.length > 0;
        page++;

        // Small delay between pages to be nice to the API
        if (hasMore) {
          await this.backoff(100);
        }
      }

      // Determine final status
      const status = stats.errors.length > 0 ? 'partial' : 'success';
      
      // Update sync log
      await this.updateSyncLog(syncLog.id, {
        status,
        completed_at: new Date().toISOString(),
        records_processed: stats.recordsProcessed,
        records_created: stats.recordsCreated,
        records_updated: stats.recordsUpdated,
        error_message: stats.errors.length > 0 ? `${stats.errors.length} errors occurred` : null,
        details: {
          [`${syncType}_last_sync`]: new Date().toISOString(),
          errors: stats.errors.slice(0, 10), // Store first 10 errors
          pages_processed: page - 1
        }
      });

      console.log(`✅ ${syncType} sync completed:`, {
        status,
        processed: stats.recordsProcessed,
        created: stats.recordsCreated,
        updated: stats.recordsUpdated,
        errors: stats.errors.length
      });

      return {
        syncId: syncLog.id,
        status,
        statistics: stats
      };

    } catch (error) {
      console.error(`❌ ${syncType} sync failed:`, error);
      
      // Update sync log with error
      await this.updateSyncLog(syncLog.id, {
        status: 'error',
        completed_at: new Date().toISOString(),
        records_processed: stats.recordsProcessed,
        records_created: stats.recordsCreated,
        records_updated: stats.recordsUpdated,
        error_message: error.message,
        details: {
          errors: stats.errors
        }
      });

      throw error;
    }
  }

  /**
   * Perform full sync of all data
   */
  async performFullSync(triggeredBy = null) {
    console.log('🔄 Starting full sync...');
    
    const results = {
      contacts: null,
      matters: null,
      tasks: null
    };

    try {
      // Sync contacts first (matters depend on contacts)
      results.contacts = await this.performIncrementalSync('contacts', triggeredBy);
      
      // Then sync matters (tasks depend on matters)
      results.matters = await this.performIncrementalSync('matters', triggeredBy);
      
      // Finally sync tasks
      results.tasks = await this.performIncrementalSync('tasks', triggeredBy);

      console.log('✅ Full sync completed successfully');
      
      return {
        status: 'success',
        results
      };

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      
      return {
        status: 'error',
        error: error.message,
        results
      };
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Test PracticePanther connection
   */
  async testConnection() {
    try {
      console.log('🔗 Testing PracticePanther connection...');
      
      // Try to fetch a small number of contacts
      const response = await this.fetchContacts({ per_page: 1 });
      
      console.log('✅ PracticePanther connection successful');
      
      return {
        connected: true,
        message: 'Connection successful',
        sampleData: response.results.length > 0 ? response.results[0] : null
      };
    } catch (error) {
      console.error('❌ PracticePanther connection failed:', error);
      
      return {
        connected: false,
        message: error.message,
        error: error
      };
    }
  }
}

module.exports = new PracticePartnerService();