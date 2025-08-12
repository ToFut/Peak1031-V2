// Load environment variables
require('dotenv').config();

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
    // Try users table first for authentication purposes (has role and auth fields)
    try {
      const users = await this.select('users', { where: { id } });
      if (users && users.length > 0) {
        return users[0];
      }
    } catch (userError) {
      console.log('⚠️ Could not query users table with id, trying contacts table:', userError.message);
    }

    // Try contacts table second (for user profiles) - use 'id' field, not 'user_id'
    try {
      const users = await this.select('contacts', { where: { id } });
      if (users && users.length > 0) {
        return users[0];
      }
    } catch (contactError) {
      console.log('⚠️ Could not query contacts table with id, trying people table:', contactError.message);
    }
    
    // Fallback to people table
    try {
      const users = await this.select('people', { where: { id } });
      if (users && users.length > 0) {
        return users[0];
      }
    } catch (peopleError) {
      console.log('⚠️ Could not query people table:', peopleError.message);
    }
    
    return null;
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
      const { where = {}, orderBy = { column: 'created_at', ascending: false }, limit, offset, select } = options;
      
      // Use basic select if specified for performance
      const selectFields = select || '*';
      
      let query = this.client
        .from('exchanges')
        .select(selectFields);

      // Apply where conditions
      if (where && Object.keys(where).length > 0) {
        Object.keys(where).forEach(key => {
          if (key === 'id' && where[key].in) {
            // Handle IN clause for id
            query = query.in('id', where[key].in);
          } else {
            query = query.eq(key, where[key]);
          }
        });
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      // Apply limit and offset (reduced default to prevent timeouts)
      const finalLimit = limit || 100; // Reduced from 1000 to 100
      query = query.limit(finalLimit);
      
      if (offset !== undefined) {
        query = query.range(offset, offset + finalLimit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase getExchanges error:', error);
        throw new Error(error.message);
      }

      // For performance, return exchanges without related data when fetching many
      // Frontend can fetch details when needed
      const exchanges = data || [];
      
      // Only fetch related data if not using basic select and for small result sets
      if (!select && exchanges.length <= 10 && exchanges.length > 0) {
        // Batch fetch all client and coordinator IDs
        const clientIds = [...new Set(exchanges.filter(e => e.client_id).map(e => e.client_id))];
        const coordinatorIds = [...new Set(exchanges.filter(e => e.coordinator_id).map(e => e.coordinator_id))];
        
        let clientsMap = {};
        let coordinatorsMap = {};
        
        // Fetch all clients in one query
        if (clientIds.length > 0) {
          // Filter out invalid UUIDs to prevent database errors
          const validClientIds = clientIds.filter(id => 
            typeof id === 'string' && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          );
          
          if (validClientIds.length > 0) {
            const { data: clients } = await this.client
              .from('contacts')
              .select('id, first_name, last_name, email, company')
              .in('id', validClientIds);
            
            if (clients) {
              clientsMap = clients.reduce((acc, client) => {
                acc[client.id] = client;
                return acc;
              }, {});
            }
          }
        }
        
        // Fetch all coordinators in one query
        if (coordinatorIds.length > 0) {
          // Filter out invalid UUIDs to prevent database errors
          const validCoordinatorIds = coordinatorIds.filter(id => 
            typeof id === 'string' && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          );
          
          if (validCoordinatorIds.length > 0) {
            const { data: coordinators } = await this.client
              .from('users')
              .select('id, first_name, last_name, email')
              .in('id', validCoordinatorIds);
            
            if (coordinators) {
              coordinatorsMap = coordinators.reduce((acc, coord) => {
                acc[coord.id] = coord;
                return acc;
              }, {});
            }
          }
        }
        
        // Add related data to exchanges
        for (let exchange of exchanges) {
          exchange.client = clientsMap[exchange.client_id] || null;
          exchange.coordinator = coordinatorsMap[exchange.coordinator_id] || null;
          exchange.exchangeParticipants = []; // Skip participants for performance
        }
      }

      console.log(`✅ Fetched ${exchanges.length} exchanges ${select ? '(basic fields only)' : 'with participants'}`);
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
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { page = 1, limit = 50, offset = 0, search } = options;
      
      // Use users table for contacts
      let query = this.client
        .from('users')
        .select('*', { count: 'exact' });

      // Apply search filter if provided
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,organization_name.ilike.%${search}%`);
      }

      // Filter out admin users for contact selection
      query = query.neq('role', 'admin');

      // Apply pagination
      const start = offset || (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      // Apply ordering
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Supabase select error for users/contacts:', error);
        throw new Error(error.message);
      }

      // Transform users data to match contact interface
      const contacts = (data || []).map(user => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        company: user.organization_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        // Additional fields for compatibility
        first_name: user.first_name,
        last_name: user.last_name
      }));

      // Return with pagination info
      return {
        data: contacts,
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error in getContacts:', error);
      throw error;
    }
  }

  async getContactById(id) {
    const users = await this.select('users', { where: { id } });
    if (users[0]) {
      const user = users[0];
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        company: user.organization_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      };
    }
    return null;
  }

  async createContact(contactData) {
    // Convert contact data to user format
    const userData = {
      first_name: contactData.firstName || contactData.first_name,
      last_name: contactData.lastName || contactData.last_name,
      email: contactData.email,
      phone: contactData.phone,
      organization_name: contactData.company,
      role: contactData.role || 'client',
      is_active: true
    };
    return await this.insert('users', userData);
  }

  async updateContact(id, contactData) {
    // Convert contact data to user format
    const userData = {
      first_name: contactData.firstName || contactData.first_name,
      last_name: contactData.lastName || contactData.last_name,
      email: contactData.email,
      phone: contactData.phone,
      organization_name: contactData.company
    };
    return await this.update('users', userData, { id });
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
        .select('*');

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
      
      // Query messages without problematic joins
      let query = this.client
        .from('messages')
        .select('*');

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
      
      // Return messages with included relationships
      const messages = data || [];
      
      // Transform messages and fetch attachments
      if (messages.length > 0) {
        const enrichedMessages = await Promise.all(messages.map(async (message) => {
          // Add users property for backward compatibility
          if (message.sender) {
            message.users = message.sender;
          }
          
          // Handle attachments array
          if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
            // Get the first attachment ID
            const attachmentId = message.attachments[0];
            
            try {
              // Fetch document details
              const { data: docData, error: docError } = await this.client
                .from('documents')
                .select('id, original_filename, file_size, mime_type, pin_required, category, created_at')
                .eq('id', attachmentId)
                .single();
                
              if (!docError && docData) {
                message.attachment = docData;
                message.attachment_id = attachmentId;
                console.log(`✅ Enriched message ${message.id} with attachment data:`, docData.original_filename);
              } else {
                console.warn(`⚠️ Could not fetch document ${attachmentId}:`, docError);
              }
            } catch (err) {
              console.warn('Could not fetch attachment:', attachmentId, err);
            }
          }
          
          return message;
        }));
        
        return enrichedMessages;
      }

      return messages;
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
        .select('*')
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
        .select('id, read_by')
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
          exchange:exchanges(id, name, status)
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
      if (where.folderId) {
        query = query.eq('folder_id', where.folderId);
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

  // Folder operations
  async getFolders(options = {}) {
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized');
      return [];
    }

    try {
      const { where = {}, orderBy = { column: 'name', ascending: true } } = options;
      
      let query = this.client
        .from('folders')
        .select(`
          *,
          exchange:exchanges(id, name),
          created_by_user:users!folders_created_by_fkey(id, first_name, last_name, email)
        `);

      // Apply where conditions
      if (where.exchange_id) {
        query = query.eq('exchange_id', where.exchange_id);
      }
      if (where.parent_id !== undefined) {
        query = query.eq('parent_id', where.parent_id);
      }
      if (where.name) {
        query = query.ilike('name', `%${where.name}%`);
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase select error for folders:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFolders:', error);
      throw error;
    }
  }

  async getFolderById(id) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('folders')
        .select(`
          *,
          exchange:exchanges(id, name),
          created_by_user:users!folders_created_by_fkey(id, first_name, last_name, email),
          parent:folders!folders_parent_id_fkey(id, name),
          children:folders!folders_parent_id_fkey(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Supabase getFolderById error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in getFolderById:', error);
      throw error;
    }
  }

  async createFolder(folderData) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('folders')
        .insert(folderData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase createFolder error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in createFolder:', error);
      throw error;
    }
  }

  async updateFolder(id, folderData) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('folders')
        .update(folderData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase updateFolder error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateFolder:', error);
      throw error;
    }
  }

  async deleteFolder(id) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase deleteFolder error:', error);
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFolder:', error);
      throw error;
    }
  }

  async moveDocumentsToFolder(documentIds, folderId) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('documents')
        .update({ folder_id: folderId })
        .in('id', documentIds)
        .select();

      if (error) {
        console.error('❌ Supabase moveDocumentsToFolder error:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in moveDocumentsToFolder:', error);
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

  // Contact operations
  async createContact(contactData) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Convert camelCase to snake_case for Supabase
      const supabaseData = {
        first_name: contactData.firstName,
        last_name: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        company: contactData.company,
        contact_type: contactData.contactType || 'client',  // Note: snake_case
        is_active: contactData.isActive !== false
      };

      // Add id if provided
      if (contactData.id) {
        supabaseData.id = contactData.id;
      }

      const { data, error } = await this.client
        .from('contacts')
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase createContact error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in createContact:', error);
      throw error;
    }
  }

  async updateContact(id, contactData) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Convert camelCase to snake_case for Supabase
      const supabaseData = {};
      if (contactData.firstName !== undefined) supabaseData.first_name = contactData.firstName;
      if (contactData.lastName !== undefined) supabaseData.last_name = contactData.lastName;
      if (contactData.email !== undefined) supabaseData.email = contactData.email;
      if (contactData.phone !== undefined) supabaseData.phone = contactData.phone;
      if (contactData.company !== undefined) supabaseData.company = contactData.company;
      if (contactData.contactType !== undefined) supabaseData.contact_type = contactData.contactType;
      if (contactData.isActive !== undefined) supabaseData.is_active = contactData.isActive;

      const { data, error } = await this.client
        .from('contacts')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase updateContact error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateContact:', error);
      throw error;
    }
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

    try {
      // First get exchanges
      const { data: exchanges, error: exchangesError } = await this.client
        .from('exchanges')
        .select('*')
        .limit(5000);

      if (exchangesError) {
        console.error('❌ Error fetching exchanges:', exchangesError);
        throw exchangesError;
      }

      // Then get participants separately to avoid relationship issues
      if (exchanges && exchanges.length > 0) {
        const exchangeIds = exchanges.map(e => e.id);
        
        const { data: participants, error: participantsError } = await this.client
          .from('exchange_participants')
          .select('*')
          .in('exchange_id', exchangeIds);

        if (!participantsError && participants) {
          // Map participants to exchanges
          const participantsByExchange = {};
          participants.forEach(p => {
            if (!participantsByExchange[p.exchange_id]) {
              participantsByExchange[p.exchange_id] = [];
            }
            participantsByExchange[p.exchange_id].push(p);
          });

          // Add participants to exchanges
          exchanges.forEach(exchange => {
            exchange.exchange_participants = participantsByExchange[exchange.id] || [];
          });
        }
      }

      return exchanges || [];
    } catch (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
  }

  async getMessagesWithSender(exchangeId = null) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    let query = this.client
      .from('messages')
      .select('*');

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
      
      // Simplified query to avoid relationship errors
      let query = this.client
        .from('exchange_participants')
        .select('*');

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

  // Audit Social Features - Mock implementations
  async getAuditLogById(id) {
    // Mock implementation
    return {
      id,
      action: 'login',
      entityType: 'user',
      entityId: 'mock-entity-id',
      userId: 'mock-user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'Mock User Agent',
      details: { message: 'Mock audit log details' },
      createdAt: new Date().toISOString()
    };
  }

  async getAuditInteractions(auditLogId) {
    // Mock implementation
    return {
      comments: [],
      likes: [],
      assignments: [],
      escalations: []
    };
  }

  async createAuditComment(commentData) {
    // Mock implementation
    return {
      id: 'mock-comment-id',
      ...commentData,
      createdAt: new Date().toISOString()
    };
  }

  async getAuditCommentById(commentId) {
    // Mock implementation
    return {
      id: commentId,
      content: 'Mock comment',
      userId: 'mock-user-id',
      createdAt: new Date().toISOString()
    };
  }

  async updateAuditComment(commentId, updateData) {
    // Mock implementation
    return {
      id: commentId,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
  }

  async deleteAuditComment(commentId) {
    // Mock implementation
    return { success: true };
  }

  async createAuditLike(auditLogId, userId, reactionType) {
    // Mock implementation
    return {
      id: 'mock-like-id',
      auditLogId,
      userId,
      reactionType,
      createdAt: new Date().toISOString()
    };
  }

  async getAuditLike(auditLogId, userId) {
    // Mock implementation - return null to simulate no existing like
    return null;
  }

  async updateAuditLike(auditLogId, userId, reactionType) {
    // Mock implementation
    return {
      id: 'mock-like-id',
      auditLogId,
      userId,
      reactionType,
      updatedAt: new Date().toISOString()
    };
  }

  async deleteAuditLike(auditLogId, userId) {
    // Mock implementation
    return { success: true };
  }

  async createAuditAssignment(assignmentData) {
    // Mock implementation
    return {
      id: 'mock-assignment-id',
      ...assignmentData,
      createdAt: new Date().toISOString()
    };
  }

  async getAuditAssignmentById(assignmentId) {
    // Mock implementation
    return {
      id: assignmentId,
      assignedTo: 'mock-user-id',
      assignmentType: 'review',
      priority: 'normal',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  async updateAuditAssignment(assignmentId, updateData) {
    // Mock implementation
    return {
      id: assignmentId,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
  }

  async createAuditEscalation(escalationData) {
    // Mock implementation
    return {
      id: 'mock-escalation-id',
      ...escalationData,
      createdAt: new Date().toISOString()
    };
  }

  async getAuditEscalationById(escalationId) {
    // Mock implementation
    return {
      id: escalationId,
      escalatedTo: 'mock-user-id',
      escalationLevel: 1,
      reason: 'Mock escalation reason',
      priority: 'normal',
      status: 'open',
      createdAt: new Date().toISOString()
    };
  }

  async updateAuditEscalation(escalationId, updateData) {
    // Mock implementation
    return {
      id: escalationId,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
  }

  async createTaskFromMention(taskData) {
    // Mock implementation
    return {
      id: 'mock-task-id',
      title: 'Mentioned in audit log comment',
      description: taskData.commentContent,
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedTo: taskData.mentionedUserId,
      createdAt: new Date().toISOString()
    };
  }

  async createTaskFromAssignment(taskData) {
    // Mock implementation
    return {
      id: 'mock-task-id',
      title: `Audit log assignment: ${taskData.assignmentType}`,
      description: taskData.notes || 'Review audit log assignment',
      status: 'PENDING',
      priority: taskData.priority?.toUpperCase() || 'MEDIUM',
      assignedTo: taskData.assignedTo,
      createdAt: new Date().toISOString()
    };
  }

  async createTaskFromEscalation(taskData) {
    // Mock implementation
    return {
      id: 'mock-task-id',
      title: `Escalated audit log - Level ${taskData.escalationLevel}`,
      description: taskData.reason,
      status: 'PENDING',
      priority: 'HIGH',
      assignedTo: taskData.escalatedTo,
      createdAt: new Date().toISOString()
    };
  }

  async getUserAuditInteractions(userId, options = {}) {
    // Mock implementation
    return {
      comments: [],
      likes: [],
      assignments: [],
      escalations: []
    };
  }

  async getAuditLogStats(auditLogId) {
    // Mock implementation
    return {
      comments: 0,
      likes: 0,
      assignments: 0,
      escalations: 0
    };
  }
}

module.exports = new SupabaseService(); 