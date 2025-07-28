const axios = require('axios');
const { Contact, Exchange, Task, SyncLog, AuditLog } = require('../models');
const config = require('../config/integrations');

class PracticePantherService {
  constructor() {
    this.baseURL = config.practicePanther.baseURL;
    this.apiKey = config.practicePanther.apiKey;
    this.clientId = config.practicePanther.clientId;
    
    // Initialize HTTP client with authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Peak1031-Integration/1.0.0'
      }
    });

    // Request/Response interceptors for logging and error handling
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 PP API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('PP API Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ PP API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ PP API Error: ${error.response?.status} ${error.config?.url}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
          error.retryAfter = retryAfter;
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Main sync function - orchestrates all sync operations
   */
  async performFullSync(triggeredBy = null) {
    const syncLog = await SyncLog.create({
      sync_type: 'full',
      status: 'running',
      started_at: new Date(),
      triggered_by: triggeredBy
    });

    const results = {
      contacts: { processed: 0, created: 0, updated: 0, errors: [] },
      matters: { processed: 0, created: 0, updated: 0, errors: [] },
      tasks: { processed: 0, created: 0, updated: 0, errors: [] }
    };

    try {
      console.log('🚀 Starting full PracticePanther sync...');

      // Step 1: Sync Contacts
      console.log('📋 Syncing contacts...');
      results.contacts = await this.syncContacts();

      // Step 2: Sync Matters (as Exchanges)
      console.log('🏢 Syncing matters as exchanges...');
      results.matters = await this.syncMatters();

      // Step 3: Sync Tasks
      console.log('✅ Syncing tasks...');
      results.tasks = await this.syncTasks();

      // Update sync log with success
      await syncLog.update({
        status: 'success',
        completed_at: new Date(),
        records_processed: results.contacts.processed + results.matters.processed + results.tasks.processed,
        records_created: results.contacts.created + results.matters.created + results.tasks.created,
        records_updated: results.contacts.updated + results.matters.updated + results.tasks.updated,
        details: results
      });

      console.log('✅ Full sync completed successfully', results);
      return results;

    } catch (error) {
      console.error('❌ Full sync failed:', error.message);
      
      await syncLog.update({
        status: 'error',
        completed_at: new Date(),
        error_message: error.message,
        details: { ...results, error: error.message, stack: error.stack }
      });

      throw error;
    }
  }

  /**
   * Sync contacts from PracticePanther
   */
  async syncContacts() {
    const results = { processed: 0, created: 0, updated: 0, errors: [] };

    try {
      // Fetch all contacts from PP with pagination
      const contacts = await this.fetchAllContacts();
      results.processed = contacts.length;

      console.log(`📋 Processing ${contacts.length} contacts from PracticePanther`);

      // Process contacts in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        await this.processBatchContacts(batch, results);
      }

      return results;

    } catch (error) {
      console.error('❌ Contact sync failed:', error.message);
      results.errors.push(error.message);
      throw error;
    }
  }

  async fetchAllContacts() {
    const allContacts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.client.get('/contacts', {
          params: {
            page: page,
            per_page: 100,
            sort_by: 'updated_at',
            sort_order: 'desc'
          }
        });

        const { data, meta } = response.data;
        allContacts.push(...data);

        hasMore = meta.current_page < meta.total_pages;
        page++;

        // Rate limiting protection
        if (hasMore) {
          await this.sleep(100); // 100ms delay between requests
        }

      } catch (error) {
        if (error.response?.status === 429 && error.retryAfter) {
          console.warn(`Rate limited. Waiting ${error.retryAfter} seconds...`);
          await this.sleep(error.retryAfter * 1000);
          continue; // Retry the same page
        }
        throw error;
      }
    }

    return allContacts;
  }

  async processBatchContacts(contacts, results) {
    const operations = contacts.map(async (ppContact) => {
      try {
        const contactData = this.transformContact(ppContact);
        
        const [contact, created] = await Contact.findOrCreate({
          where: { pp_contact_id: ppContact.id.toString() },
          defaults: contactData
        });

        if (created) {
          results.created++;
          console.log(`✅ Created contact: ${contactData.first_name} ${contactData.last_name}`);
        } else {
          // Update existing contact with latest data
          const updated = await contact.update(contactData);
          if (updated) {
            results.updated++;
            console.log(`🔄 Updated contact: ${contactData.first_name} ${contactData.last_name}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing contact ${ppContact.id}:`, error.message);
        results.errors.push(`Contact ${ppContact.id}: ${error.message}`);
      }
    });

    await Promise.allSettled(operations);
  }

  transformContact(ppContact) {
    return {
      pp_contact_id: ppContact.id.toString(),
      first_name: ppContact.first_name || '',
      last_name: ppContact.last_name || '',
      email: ppContact.email || null,
      phone: ppContact.phone || null,
      company: ppContact.company || null,
      address: this.formatAddress(ppContact),
      pp_data: ppContact, // Store full PP data for reference
      last_sync_at: new Date()
    };
  }

  formatAddress(contact) {
    const parts = [
      contact.address_line_1,
      contact.address_line_2,
      contact.city,
      contact.state,
      contact.zip_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Sync matters from PracticePanther as exchanges
   */
  async syncMatters() {
    const results = { processed: 0, created: 0, updated: 0, errors: [] };

    try {
      // Fetch all matters from PP
      const matters = await this.fetchAllMatters();
      results.processed = matters.length;

      console.log(`🏢 Processing ${matters.length} matters from PracticePanther`);

      // Process matters in batches
      const batchSize = 25;
      for (let i = 0; i < matters.length; i += batchSize) {
        const batch = matters.slice(i, i + batchSize);
        await this.processBatchMatters(batch, results);
      }

      return results;

    } catch (error) {
      console.error('❌ Matter sync failed:', error.message);
      results.errors.push(error.message);
      throw error;
    }
  }

  async fetchAllMatters() {
    const allMatters = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.client.get('/matters', {
          params: {
            page: page,
            per_page: 100,
            sort_by: 'updated_at',
            sort_order: 'desc',
            include: 'client,assigned_users' // Include related data
          }
        });

        const { data, meta } = response.data;
        allMatters.push(...data);

        hasMore = meta.current_page < meta.total_pages;
        page++;

        if (hasMore) {
          await this.sleep(150); // Slightly longer delay for matters
        }

      } catch (error) {
        if (error.response?.status === 429 && error.retryAfter) {
          await this.sleep(error.retryAfter * 1000);
          continue;
        }
        throw error;
      }
    }

    return allMatters;
  }

  async processBatchMatters(matters, results) {
    const operations = matters.map(async (ppMatter) => {
      try {
        const exchangeData = await this.transformMatter(ppMatter);
        
        const [exchange, created] = await Exchange.findOrCreate({
          where: { pp_matter_id: ppMatter.id.toString() },
          defaults: exchangeData
        });

        if (created) {
          results.created++;
          console.log(`✅ Created exchange: ${exchangeData.name}`);
          
          // Link client contact if available
          if (exchangeData.client_id) {
            await this.linkMatterParticipants(ppMatter, exchange.id);
          }
        } else {
          // Update existing exchange with latest data
          const updated = await exchange.update(exchangeData);
          if (updated) {
            results.updated++;
            console.log(`🔄 Updated exchange: ${exchangeData.name}`);
            
            // Update participants if needed
            await this.syncMatterParticipants(ppMatter, exchange.id);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing matter ${ppMatter.id}:`, error.message);
        results.errors.push(`Matter ${ppMatter.id}: ${error.message}`);
      }
    });

    await Promise.allSettled(operations);
  }

  async transformMatter(ppMatter) {
    // Find client contact
    let clientId = null;
    if (ppMatter.client && ppMatter.client.id) {
      const clientContact = await Contact.findOne({
        where: { pp_contact_id: ppMatter.client.id.toString() }
      });
      clientId = clientContact?.id || null;
    }

    // Determine exchange status based on PP matter status
    const status = this.mapMatterStatusToExchangeStatus(ppMatter.status);
    
    // Extract dates
    const startDate = ppMatter.opened_at ? new Date(ppMatter.opened_at) : null;
    const completionDate = ppMatter.closed_at ? new Date(ppMatter.closed_at) : null;

    return {
      pp_matter_id: ppMatter.id.toString(),
      name: ppMatter.display_name || ppMatter.name || `Matter ${ppMatter.id}`,
      status: status,
      client_id: clientId,
      start_date: startDate,
      completion_date: completionDate,
      exchange_value: this.parseDecimal(ppMatter.custom_fields?.exchange_value),
      notes: ppMatter.description || '',
      pp_data: ppMatter,
      last_sync_at: new Date(),
      // Calculate deadlines based on start date if available
      identification_deadline: startDate ? new Date(startDate.getTime() + (45 * 24 * 60 * 60 * 1000)) : null,
      completion_deadline: startDate ? new Date(startDate.getTime() + (180 * 24 * 60 * 60 * 1000)) : null
    };
  }

  mapMatterStatusToExchangeStatus(ppStatus) {
    const statusMap = {
      'open': 'PENDING',
      'pending': 'PENDING',
      'active': '45D',
      'in_progress': '180D',
      'completed': 'COMPLETED',
      'closed': 'COMPLETED',
      'terminated': 'TERMINATED',
      'cancelled': 'TERMINATED'
    };

    return statusMap[ppStatus?.toLowerCase()] || 'PENDING';
  }

  async linkMatterParticipants(ppMatter, exchangeId) {
    const { ExchangeParticipant } = require('../models');
    
    try {
      // Add client as participant
      if (ppMatter.client && ppMatter.client.id) {
        const clientContact = await Contact.findOne({
          where: { pp_contact_id: ppMatter.client.id.toString() }
        });
        
        if (clientContact) {
          await ExchangeParticipant.findOrCreate({
            where: {
              exchange_id: exchangeId,
              contact_id: clientContact.id
            },
            defaults: {
              role: 'client',
              permissions: { view: true, upload: true, message: true }
            }
          });
        }
      }

      // Add assigned users as participants
      if (ppMatter.assigned_users && Array.isArray(ppMatter.assigned_users)) {
        for (const assignedUser of ppMatter.assigned_users) {
          // Try to find corresponding internal user by email
          const { User } = require('../models');
          const internalUser = await User.findOne({
            where: { email: assignedUser.email }
          });
          
          if (internalUser) {
            await ExchangeParticipant.findOrCreate({
              where: {
                exchange_id: exchangeId,
                user_id: internalUser.id
              },
              defaults: {
                role: 'coordinator',
                permissions: { view: true, edit: true, upload: true, message: true, manage: true }
              }
            });
          }
        }
      }

    } catch (error) {
      console.error(`Error linking participants for matter ${ppMatter.id}:`, error.message);
    }
  }

  async syncMatterParticipants(ppMatter, exchangeId) {
    // Similar to linkMatterParticipants but updates existing relationships
    await this.linkMatterParticipants(ppMatter, exchangeId);
  }

  /**
   * Sync tasks from PracticePanther
   */
  async syncTasks() {
    const results = { processed: 0, created: 0, updated: 0, errors: [] };

    try {
      // Fetch all tasks from PP
      const tasks = await this.fetchAllTasks();
      results.processed = tasks.length;

      console.log(`✅ Processing ${tasks.length} tasks from PracticePanther`);

      // Process tasks in batches
      const batchSize = 100;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        await this.processBatchTasks(batch, results);
      }

      return results;

    } catch (error) {
      console.error('❌ Task sync failed:', error.message);
      results.errors.push(error.message);
      throw error;
    }
  }

  async fetchAllTasks() {
    const allTasks = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.client.get('/tasks', {
          params: {
            page: page,
            per_page: 100,
            sort_by: 'updated_at',
            sort_order: 'desc',
            include: 'matter,assigned_to'
          }
        });

        const { data, meta } = response.data;
        allTasks.push(...data);

        hasMore = meta.current_page < meta.total_pages;
        page++;

        if (hasMore) {
          await this.sleep(100);
        }

      } catch (error) {
        if (error.response?.status === 429 && error.retryAfter) {
          await this.sleep(error.retryAfter * 1000);
          continue;
        }
        throw error;
      }
    }

    return allTasks;
  }

  async processBatchTasks(tasks, results) {
    const operations = tasks.map(async (ppTask) => {
      try {
        const taskData = await this.transformTask(ppTask);
        
        const [task, created] = await Task.findOrCreate({
          where: { pp_task_id: ppTask.id.toString() },
          defaults: taskData
        });

        if (created) {
          results.created++;
          console.log(`✅ Created task: ${taskData.title}`);
        } else {
          // Update existing task with latest data
          const updated = await task.update(taskData);
          if (updated) {
            results.updated++;
            console.log(`🔄 Updated task: ${taskData.title}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing task ${ppTask.id}:`, error.message);
        results.errors.push(`Task ${ppTask.id}: ${error.message}`);
      }
    });

    await Promise.allSettled(operations);
  }

  async transformTask(ppTask) {
    // Find associated exchange
    let exchangeId = null;
    if (ppTask.matter && ppTask.matter.id) {
      const exchange = await Exchange.findOne({
        where: { pp_matter_id: ppTask.matter.id.toString() }
      });
      exchangeId = exchange?.id || null;
    }

    // Find assigned user
    let assignedTo = null;
    if (ppTask.assigned_to && ppTask.assigned_to.email) {
      const { User } = require('../models');
      const user = await User.findOne({
        where: { email: ppTask.assigned_to.email }
      });
      assignedTo = user?.id || null;
    }

    // Map task status
    const status = this.mapTaskStatus(ppTask.status);
    
    // Parse dates
    const dueDate = ppTask.due_date ? new Date(ppTask.due_date) : null;
    const completedAt = ppTask.completed_at ? new Date(ppTask.completed_at) : null;

    return {
      pp_task_id: ppTask.id.toString(),
      title: ppTask.title || `Task ${ppTask.id}`,
      description: ppTask.description || '',
      status: status,
      priority: this.mapTaskPriority(ppTask.priority),
      exchange_id: exchangeId,
      assigned_to: assignedTo,
      due_date: dueDate,
      completed_at: completedAt,
      pp_data: ppTask,
      last_sync_at: new Date()
    };
  }

  mapTaskStatus(ppStatus) {
    const statusMap = {
      'pending': 'PENDING',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'on_hold': 'ON_HOLD'
    };

    return statusMap[ppStatus?.toLowerCase()] || 'PENDING';
  }

  mapTaskPriority(ppPriority) {
    const priorityMap = {
      'low': 'LOW',
      'normal': 'MEDIUM',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'urgent': 'URGENT'
    };

    return priorityMap[ppPriority?.toLowerCase()] || 'MEDIUM';
  }

  /**
   * Sync specific entity types
   */
  async syncContacts() {
    return await this.performSync('contacts', () => this.syncContacts());
  }

  async syncMatters() {
    return await this.performSync('matters', () => this.syncMatters());
  }

  async syncTasks() {
    return await this.performSync('tasks', () => this.syncTasks());
  }

  async performSync(syncType, syncFunction) {
    const syncLog = await SyncLog.create({
      sync_type: syncType,
      status: 'running',
      started_at: new Date()
    });

    try {
      const results = await syncFunction();
      
      await syncLog.update({
        status: 'success',
        completed_at: new Date(),
        records_processed: results.processed,
        records_created: results.created,
        records_updated: results.updated,
        details: results
      });

      return results;

    } catch (error) {
      await syncLog.update({
        status: 'error',
        completed_at: new Date(),
        error_message: error.message,
        details: { error: error.message }
      });

      throw error;
    }
  }

  /**
   * Get sync status and recent sync logs
   */
  async getSyncStatus() {
    const recentSyncs = await SyncLog.findAll({
      limit: 10,
      order: [['started_at', 'DESC']],
      include: [
        { 
          model: require('../models').User, 
          as: 'triggeredByUser', 
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        }
      ]
    });

    const lastFullSync = await SyncLog.findOne({
      where: { sync_type: 'full', status: 'success' },
      order: [['completed_at', 'DESC']]
    });

    // Get entity counts
    const counts = {
      contacts: await Contact.count(),
      exchanges: await Exchange.count(),
      tasks: await Task.count()
    };

    // Get sync statistics
    const stats = await this.getSyncStatistics();

    return {
      recentSyncs: recentSyncs.map(sync => ({
        id: sync.id,
        type: sync.sync_type,
        status: sync.status,
        started_at: sync.started_at,
        completed_at: sync.completed_at,
        duration: sync.completed_at ? 
          Math.round((new Date(sync.completed_at) - new Date(sync.started_at)) / 1000) : null,
        records_processed: sync.records_processed,
        records_created: sync.records_created,
        records_updated: sync.records_updated,
        error_message: sync.error_message,
        triggered_by: sync.triggeredByUser ? {
          name: `${sync.triggeredByUser.first_name} ${sync.triggeredByUser.last_name}`,
          email: sync.triggeredByUser.email
        } : null
      })),
      lastFullSync: lastFullSync ? {
        completed_at: lastFullSync.completed_at,
        records_processed: lastFullSync.records_processed,
        duration: Math.round((new Date(lastFullSync.completed_at) - new Date(lastFullSync.started_at)) / 1000)
      } : null,
      entityCounts: counts,
      statistics: stats
    };
  }

  async getSyncStatistics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const [
      syncsLast24Hours,
      syncsLast7Days,
      successRate,
      avgDuration
    ] = await Promise.all([
      SyncLog.count({ where: { started_at: { [require('sequelize').Op.gte]: last24Hours } } }),
      SyncLog.count({ where: { started_at: { [require('sequelize').Op.gte]: last7Days } } }),
      this.calculateSuccessRate(),
      this.calculateAverageDuration()
    ]);

    return {
      syncsLast24Hours,
      syncsLast7Days,
      successRate,
      avgDuration
    };
  }

  async calculateSuccessRate() {
    const [total, successful] = await Promise.all([
      SyncLog.count(),
      SyncLog.count({ where: { status: 'success' } })
    ]);

    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }

  async calculateAverageDuration() {
    const completedSyncs = await SyncLog.findAll({
      where: { 
        status: 'success',
        completed_at: { [require('sequelize').Op.ne]: null }
      },
      attributes: ['started_at', 'completed_at'],
      limit: 50,
      order: [['completed_at', 'DESC']]
    });

    if (completedSyncs.length === 0) return 0;

    const totalDuration = completedSyncs.reduce((sum, sync) => {
      const duration = new Date(sync.completed_at) - new Date(sync.started_at);
      return sum + duration;
    }, 0);

    return Math.round(totalDuration / completedSyncs.length / 1000); // Convert to seconds
  }

  /**
   * Utility methods
   */
  parseDecimal(value) {
    if (!value) return null;
    const parsed = parseFloat(value.toString().replace(/[,$]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for PracticePanther API
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/ping', { timeout: 5000 });
      return {
        status: 'healthy',
        response_time: response.headers['x-response-time'] || 'unknown',
        api_version: response.headers['x-api-version'] || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test connection with minimal API call
   */
  async testConnection() {
    try {
      const response = await this.client.get('/contacts', {
        params: { per_page: 1 },
        timeout: 10000
      });
      
      return {
        success: true,
        message: 'Connection successful',
        api_limit: response.headers['x-ratelimit-limit'],
        api_remaining: response.headers['x-ratelimit-remaining'],
        api_reset: response.headers['x-ratelimit-reset']
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      };
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsage() {
    try {
      const response = await this.client.get('/contacts', {
        params: { per_page: 1 }
      });

      return {
        rateLimit: {
          limit: parseInt(response.headers['x-ratelimit-limit']) || 'unknown',
          remaining: parseInt(response.headers['x-ratelimit-remaining']) || 'unknown',
          reset: response.headers['x-ratelimit-reset'] || 'unknown'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = PracticePantherService;