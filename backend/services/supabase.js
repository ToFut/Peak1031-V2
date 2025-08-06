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

    console.log(`🔵 Supabase INSERT into ${table}:`, data);

    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error(`❌ Supabase insert error for ${table}:`, error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log(`✅ Supabase INSERT success:`, result);
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
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { where = {}, orderBy = { column: 'created_at', ascending: false }, limit, offset } = options;
      
      // Build query with participants included
      let query = this.client
        .from('exchanges')
        .select('*');

      // Apply where conditions
      if (where) {
        Object.keys(where).forEach(key => {
          query = query.eq(key, where[key]);
        });
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      // Apply limit and offset
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset !== undefined) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase getExchanges error:', error);
        throw new Error(error.message);
      }

      // For performance, return exchanges without related data when fetching many
      // Frontend can fetch details when needed
      const exchanges = data || [];
      
      // Only fetch related data for small result sets (< 10 exchanges)
      if (exchanges.length <= 10 && exchanges.length > 0) {
        // Batch fetch all client and coordinator IDs
        const clientIds = [...new Set(exchanges.filter(e => e.client_id).map(e => e.client_id))];
        const coordinatorIds = [...new Set(exchanges.filter(e => e.coordinator_id).map(e => e.coordinator_id))];
        
        let clientsMap = {};
        let coordinatorsMap = {};
        
        // Fetch all clients in one query
        if (clientIds.length > 0) {
          const { data: clients } = await this.client
            .from('contacts')
            .select('id, first_name, last_name, email, company')
            .in('id', clientIds);
          
          if (clients) {
            clientsMap = clients.reduce((acc, client) => {
              acc[client.id] = client;
              return acc;
            }, {});
          }
        }
        
        // Fetch all coordinators in one query
        if (coordinatorIds.length > 0) {
          const { data: coordinators } = await this.client
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', coordinatorIds);
          
          if (coordinators) {
            coordinatorsMap = coordinators.reduce((acc, coord) => {
              acc[coord.id] = coord;
              return acc;
            }, {});
          }
        }
        
        // Add related data to exchanges
        for (let exchange of exchanges) {
          exchange.client = clientsMap[exchange.client_id] || null;
          exchange.coordinator = coordinatorsMap[exchange.coordinator_id] || null;
          exchange.exchangeParticipants = []; // Skip participants for performance
        }
      }

      console.log(`✅ Fetched ${exchanges.length} exchanges with participants`);
      return exchanges;
    } catch (error) {
      console.error('Error in getExchanges:', error);
      throw error;
    }
  }

  async getExchangeById(id) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('exchanges')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Supabase getExchangeById error:', error);
        throw new Error(error.message);
      }

      if (data) {
        // Manually fetch related data
        let client = null;
        if (data.client_id) {
          const { data: clientData } = await this.client
            .from('contacts')
            .select('id, first_name, last_name, email, company')
            .eq('id', data.client_id)
            .single();
          client = clientData;
        }

        let coordinator = null;
        if (data.coordinator_id) {
          const { data: coordData } = await this.client
            .from('contacts')
            .select('id, first_name, last_name, email')
            .eq('id', data.coordinator_id)
            .single();
          coordinator = coordData;
        }

        const { data: participants } = await this.client
          .from('exchange_participants')
          .select('id, role, permissions, user_id, contact_id')
          .eq('exchange_id', data.id);

        return {
          ...data,
          client,
          coordinator,
          exchangeParticipants: participants || []
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getExchangeById:', error);
      throw error;
    }
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
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { where = {}, orderBy = { column: 'created_at', ascending: false }, limit } = options;
      
      let query = this.client
        .from('messages')
        .select(`
          *,
          sender:users(id, first_name, last_name, email),
          exchange:exchanges(id, name, status)
        `);

      // Apply where conditions with column name conversion
      if (where.exchangeId) {
        query = query.eq('exchange_id', where.exchangeId);
      }
      if (where.senderId) {
        query = query.eq('sender_id', where.senderId);
      }
      if (where.content) {
        query = query.ilike('content', `%${where.content}%`);
      }

      // Apply ordering
      if (orderBy) {
        const columnMap = {
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          'content': 'content',
          'senderId': 'sender_id',
          'exchangeId': 'exchange_id'
        };
        const column = columnMap[orderBy.column] || orderBy.column;
        query = query.order(column, { ascending: orderBy.ascending !== false });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase select error for messages:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
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

  async getMessageById(id) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, email, first_name, last_name, role)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId, userId) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Get current message
      const { data: message, error: fetchError } = await this.client
        .from('messages')
        .select('read_by')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Add user to readBy array if not already present
      const currentReadBy = message.read_by || [];
      if (!currentReadBy.includes(userId)) {
        currentReadBy.push(userId);
      }

      // Update message
      const { data, error } = await this.client
        .from('messages')
        .update({ read_by: currentReadBy })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
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

  async createExchangeParticipant(participantData) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('exchange_participants')
        .insert(participantData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating exchange participant:', error);
      throw error;
    }
  }

  async deleteExchangeParticipant(participantId) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Use soft delete by setting deleted_at timestamp
      const { data, error } = await this.client
        .from('exchange_participants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error deleting exchange participant:', error);
      throw error;
    }
  }

  // Storage operations
  async uploadFile(bucketName, filePath, file, options = {}) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // First, ensure the bucket exists
      await this.ensureBucketExists(bucketName);

      const { data, error } = await this.client.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          ...options
        });

      if (error) {
        console.error('❌ Supabase file upload error:', error);
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        });
        throw error;
      }

      console.log('✅ File uploaded successfully:', data.path);
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async ensureBucketExists(bucketName) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();
      
      if (listError) {
        console.warn('Could not list buckets:', listError);
        return; // Continue anyway, maybe we don't have permission to list
      }

      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`📁 Creating bucket: ${bucketName}`);
        const { data, error: createError } = await this.client.storage.createBucket(bucketName, {
          public: false,
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            'application/zip',
            'application/x-zip-compressed'
          ],
          fileSizeLimit: 52428800 // 50MB
        });

        if (createError) {
          console.warn('Could not create bucket (may already exist):', createError);
          // Don't throw error here, bucket might exist but we can't list it
        } else {
          console.log('✅ Bucket created successfully:', bucketName);
        }
      }
    } catch (error) {
      console.warn('Error ensuring bucket exists:', error);
      // Don't throw error, continue with upload attempt
    }
  }

  async downloadFile(bucketName, filePath) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        console.error('❌ Supabase file download error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async deleteFile(bucketName, filePath) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Supabase file deletion error:', error);
        throw error;
      }

      console.log('✅ File deleted successfully:', filePath);
      return data;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFileUrl(bucketName, filePath, expiresIn = 3600) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Supabase signed URL error:', error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  async listFiles(bucketName, folderPath = '', options = {}) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          ...options
        });

      if (error) {
        console.error('❌ Supabase file list error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error listing files:', error);
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