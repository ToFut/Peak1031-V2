const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.log('⚠️ Supabase credentials not configured - using local database only');
      this.client = null;
      return;
    }

    this.client = createClient(this.supabaseUrl, this.supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  // Generic CRUD operations
  async select(table, options = {}) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    let query = this.client.from(table).select(options.select || '*');
    
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        query = query.eq(key, options.where[key]);
      });
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ Supabase select error for ${table}:`, error);
      throw error;
    }
    
    return data;
  }

  async insert(table, data) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error(`❌ Supabase insert error for ${table}:`, error);
      throw error;
    }

    return result[0];
  }

  async update(table, data, where) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    let query = this.client.from(table).update(data);
    
    if (where) {
      Object.keys(where).forEach(key => {
        query = query.eq(key, where[key]);
      });
    }

    const { data: result, error } = await query.select();

    if (error) {
      console.error(`❌ Supabase update error for ${table}:`, error);
      throw error;
    }

    return result[0];
  }

  async delete(table, where) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    let query = this.client.from(table).delete();
    
    if (where) {
      Object.keys(where).forEach(key => {
        query = query.eq(key, where[key]);
      });
    }

    const { error } = await query;

    if (error) {
      console.error(`❌ Supabase delete error for ${table}:`, error);
      throw error;
    }

    return true;
  }

  // Specific table operations
  async getUsers(options = {}) {
    return await this.select('users', options);
  }

  async getUserById(id) {
    const users = await this.select('users', { where: { id } });
    return users[0] || null;
  }

  async getUserByEmail(email) {
    const users = await this.select('users', { where: { email } });
    return users[0] || null;
  }

  async createUser(userData) {
    return await this.insert('users', userData);
  }

  async updateUser(id, userData) {
    return await this.update('users', userData, { id });
  }

  async getExchanges(options = {}) {
    return await this.select('exchanges', options);
  }

  async getExchangeById(id) {
    const exchanges = await this.select('exchanges', { where: { id } });
    return exchanges[0] || null;
  }

  async createExchange(exchangeData) {
    return await this.insert('exchanges', exchangeData);
  }

  async updateExchange(id, exchangeData) {
    return await this.update('exchanges', exchangeData, { id });
  }

  async getContacts(options = {}) {
    return await this.select('contacts', options);
  }

  async getContactById(id) {
    const contacts = await this.select('contacts', { where: { id } });
    return contacts[0] || null;
  }

  async createContact(contactData) {
    return await this.insert('contacts', contactData);
  }

  async updateContact(id, contactData) {
    return await this.update('contacts', contactData, { id });
  }

  async getTasks(options = {}) {
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { where = {}, orderBy = { column: 'due_date', ascending: false } } = options;
      
      let query = this.client
        .from('tasks')
        .select(`
          *,
          exchange:exchanges(id, name, status),
          assigned_user:users(id, first_name, last_name, email)
        `);

      // Apply where conditions
      if (where.exchangeId) {
        query = query.eq('exchange_id', where.exchangeId);
      }
      if (where.status) {
        query = query.eq('status', where.status);
      }
      if (where.assignedTo) {
        query = query.eq('assigned_to', where.assignedTo);
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase select error for tasks:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTasks:', error);
      throw error;
    }
  }

  async getTaskById(id) {
    const tasks = await this.select('tasks', { where: { id } });
    return tasks[0] || null;
  }

  async createTask(taskData) {
    return await this.insert('tasks', taskData);
  }

  async updateTask(id, taskData) {
    return await this.update('tasks', taskData, { id });
  }

  async getMessages(options = {}) {
    return await this.select('messages', options);
  }

  async getMessageById(id) {
    const messages = await this.select('messages', { where: { id } });
    return messages[0] || null;
  }

  async createMessage(messageData) {
    return await this.insert('messages', messageData);
  }

  async updateMessage(id, messageData) {
    return await this.update('messages', messageData, { id });
  }

  async getDocuments(options = {}) {
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { where = {}, orderBy = { column: 'created_at', ascending: false } } = options;
      
      let query = this.client
        .from('documents')
        .select(`
          *,
          exchange:exchanges(id, name, status),
          uploaded_by_user:users(id, first_name, last_name, email)
        `);

      // Apply where conditions
      if (where.exchangeId) {
        query = query.eq('exchange_id', where.exchangeId);
      }
      if (where.category) {
        query = query.eq('category', where.category);
      }
      if (where.pinRequired !== undefined) {
        query = query.eq('pin_required', where.pinRequired);
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase select error for documents:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDocuments:', error);
      throw error;
    }
  }

  async getDocumentById(id) {
    const documents = await this.select('documents', { where: { id } });
    return documents[0] || null;
  }

  async createDocument(documentData) {
    return await this.insert('documents', documentData);
  }

  async updateDocument(id, documentData) {
    return await this.update('documents', documentData, { id });
  }

  async getAuditLogs(options = {}) {
    return await this.select('audit_logs', options);
  }

  async createAuditLog(auditData) {
    return await this.insert('audit_logs', auditData);
  }

  async getNotifications(options = {}) {
    return await this.select('notifications', options);
  }

  async createNotification(notificationData) {
    return await this.insert('notifications', notificationData);
  }

  async updateNotification(id, notificationData) {
    return await this.update('notifications', notificationData, { id });
  }

  // Custom queries
  async getExchangesWithParticipants() {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client
      .from('exchanges')
      .select(`
        *,
        exchange_participants (
          *,
          users (*),
          contacts (*)
        )
      `);

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    return data;
  }

  async getMessagesWithSender(exchangeId = null) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    let query = this.client
      .from('messages')
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `);

    if (exchangeId) {
      query = query.eq('exchange_id', exchangeId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    return data;
  }

  async getExchangeParticipants(options = {}) {
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { where = {}, orderBy = { column: 'created_at', ascending: false } } = options;
      
      let query = this.client
        .from('exchange_participants')
        .select(`
          *,
          contact:contacts(*),
          user:users(id, first_name, last_name, email, role)
        `);

      // Apply where conditions
      if (where.exchangeId) {
        query = query.eq('exchange_id', where.exchangeId);
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase select error for exchange participants:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getExchangeParticipants:', error);
      throw error;
    }
  }

  // Statistics
  async getDashboardStats() {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const [
      { count: usersCount },
      { count: exchangesCount },
      { count: contactsCount },
      { count: tasksCount },
      { count: messagesCount }
    ] = await Promise.all([
      this.client.from('users').select('*', { count: 'exact', head: true }),
      this.client.from('exchanges').select('*', { count: 'exact', head: true }),
      this.client.from('contacts').select('*', { count: 'exact', head: true }),
      this.client.from('tasks').select('*', { count: 'exact', head: true }),
      this.client.from('messages').select('*', { count: 'exact', head: true })
    ]);

    return {
      usersCount,
      exchangesCount,
      contactsCount,
      tasksCount,
      messagesCount
    };
  }
}

module.exports = new SupabaseService(); 