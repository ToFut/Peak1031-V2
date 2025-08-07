/**
 * Database Schema Introspection Service
 * 
 * This service provides database schema information to help the GPT OSS model
 * understand the available tables, columns, and relationships to generate
 * appropriate SQL queries from natural language.
 */

const supabaseService = require('./supabase');

class DatabaseSchemaService {
  constructor() {
    this.schema = null;
    this.lastUpdated = null;
  }

  /**
   * Get the complete database schema with relationships
   */
  async getSchema() {
    if (this.schema && this.lastUpdated && (Date.now() - this.lastUpdated < 3600000)) {
      return this.schema;
    }

    this.schema = await this.introspectSchema();
    this.lastUpdated = Date.now();
    return this.schema;
  }

  /**
   * Introspect the database schema from Supabase
   */
  async introspectSchema() {
    try {
      if (!supabaseService.client) {
        throw new Error('Supabase client not initialized');
      }

      // Get table information from information_schema
      const { data: tables, error: tablesError } = await supabaseService.client
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (tablesError) {
        console.warn('Could not introspect tables, using predefined schema');
        return this.getPredefinedSchema();
      }

      const schema = {
        tables: {},
        relationships: [],
        commonQueries: this.getCommonQueryPatterns()
      };

      // For each table, get column information
      for (const table of tables || []) {
        const tableName = table.table_name;
        
        const { data: columns, error: columnsError } = await supabaseService.client
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .order('ordinal_position');

        if (!columnsError && columns) {
          schema.tables[tableName] = {
            columns: columns.map(col => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              default: col.column_default
            })),
            description: this.getTableDescription(tableName)
          };
        }
      }

      // Add known relationships
      schema.relationships = this.getKnownRelationships();

      return schema;
    } catch (error) {
      console.warn('Schema introspection failed, using predefined schema:', error.message);
      return this.getPredefinedSchema();
    }
  }

  /**
   * Get predefined schema as fallback
   */
  getPredefinedSchema() {
    return {
      tables: {
        users: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
            { name: 'first_name', type: 'varchar', nullable: true },
            { name: 'last_name', type: 'varchar', nullable: true },
            { name: 'role', type: 'varchar', nullable: false },
            { name: 'is_active', type: 'boolean', nullable: false },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false },
            { name: 'last_login', type: 'timestamptz', nullable: true }
          ],
          description: 'System users including admins, coordinators, and other roles'
        },
        exchanges: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'status', type: 'varchar', nullable: false },
            { name: 'client_id', type: 'uuid', nullable: true },
            { name: 'coordinator_id', type: 'uuid', nullable: true },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false },
            { name: 'due_date', type: 'date', nullable: true },
            { name: 'property_address', type: 'varchar', nullable: true },
            { name: 'exchange_type', type: 'varchar', nullable: true }
          ],
          description: '1031 tax-deferred exchanges being processed'
        },
        contacts: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'first_name', type: 'varchar', nullable: true },
            { name: 'last_name', type: 'varchar', nullable: true },
            { name: 'email', type: 'varchar', nullable: true },
            { name: 'phone', type: 'varchar', nullable: true },
            { name: 'company', type: 'varchar', nullable: true },
            { name: 'role', type: 'varchar', nullable: true },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false }
          ],
          description: 'External contacts including clients, attorneys, agents, etc.'
        },
        tasks: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'title', type: 'varchar', nullable: false },
            { name: 'description', type: 'text', nullable: true },
            { name: 'status', type: 'varchar', nullable: false },
            { name: 'priority', type: 'varchar', nullable: true },
            { name: 'assigned_to', type: 'uuid', nullable: true },
            { name: 'exchange_id', type: 'uuid', nullable: true },
            { name: 'due_date', type: 'date', nullable: true },
            { name: 'completed_at', type: 'timestamptz', nullable: true },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false }
          ],
          description: 'Tasks and action items for exchanges'
        },
        messages: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'content', type: 'text', nullable: false },
            { name: 'sender_id', type: 'uuid', nullable: false },
            { name: 'exchange_id', type: 'uuid', nullable: true },
            { name: 'message_type', type: 'varchar', nullable: false },
            { name: 'read_by', type: 'jsonb', nullable: true },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false }
          ],
          description: 'Messages and communications within exchanges'
        },
        documents: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'file_path', type: 'varchar', nullable: false },
            { name: 'file_size', type: 'bigint', nullable: true },
            { name: 'mime_type', type: 'varchar', nullable: true },
            { name: 'category', type: 'varchar', nullable: true },
            { name: 'exchange_id', type: 'uuid', nullable: true },
            { name: 'uploaded_by', type: 'uuid', nullable: true },
            { name: 'pin_required', type: 'boolean', nullable: false },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'updated_at', type: 'timestamptz', nullable: false }
          ],
          description: 'Documents and files associated with exchanges'
        },
        exchange_participants: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'exchange_id', type: 'uuid', nullable: false },
            { name: 'user_id', type: 'uuid', nullable: true },
            { name: 'contact_id', type: 'uuid', nullable: true },
            { name: 'role', type: 'varchar', nullable: false },
            { name: 'permissions', type: 'jsonb', nullable: true },
            { name: 'created_at', type: 'timestamptz', nullable: false },
            { name: 'deleted_at', type: 'timestamptz', nullable: true }
          ],
          description: 'Participants in each exchange (users and contacts)'
        },
        notifications: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'user_id', type: 'uuid', nullable: false },
            { name: 'title', type: 'varchar', nullable: false },
            { name: 'message', type: 'text', nullable: true },
            { name: 'type', type: 'varchar', nullable: false },
            { name: 'read', type: 'boolean', nullable: false },
            { name: 'created_at', type: 'timestamptz', nullable: false }
          ],
          description: 'System notifications for users'
        }
      },
      relationships: this.getKnownRelationships(),
      commonQueries: this.getCommonQueryPatterns()
    };
  }

  /**
   * Get known table relationships
   */
  getKnownRelationships() {
    return [
      {
        from_table: 'exchanges',
        from_column: 'client_id',
        to_table: 'contacts',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'exchanges',
        from_column: 'coordinator_id',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'tasks',
        from_column: 'exchange_id',
        to_table: 'exchanges',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'tasks',
        from_column: 'assigned_to',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'messages',
        from_column: 'sender_id',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'messages',
        from_column: 'exchange_id',
        to_table: 'exchanges',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'documents',
        from_column: 'exchange_id',
        to_table: 'exchanges',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'documents',
        from_column: 'uploaded_by',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'exchange_participants',
        from_column: 'exchange_id',
        to_table: 'exchanges',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'exchange_participants',
        from_column: 'user_id',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'exchange_participants',
        from_column: 'contact_id',
        to_table: 'contacts',
        to_column: 'id',
        relationship_type: 'many_to_one'
      },
      {
        from_table: 'notifications',
        from_column: 'user_id',
        to_table: 'users',
        to_column: 'id',
        relationship_type: 'many_to_one'
      }
    ];
  }

  /**
   * Get table descriptions
   */
  getTableDescription(tableName) {
    const descriptions = {
      users: 'System users including admins, coordinators, and other roles',
      exchanges: '1031 tax-deferred exchanges being processed',
      contacts: 'External contacts including clients, attorneys, agents, etc.',
      tasks: 'Tasks and action items for exchanges',
      messages: 'Messages and communications within exchanges',
      documents: 'Documents and files associated with exchanges',
      exchange_participants: 'Participants in each exchange (users and contacts)',
      notifications: 'System notifications for users',
      audit_logs: 'System audit trail and activity logs'
    };
    return descriptions[tableName] || `Table containing ${tableName} data`;
  }

  /**
   * Get common query patterns for the GPT model to learn from
   */
  getCommonQueryPatterns() {
    return [
      {
        pattern: "how many {table}",
        sql_template: "SELECT COUNT(*) as count FROM {table}",
        example: "how many exchanges -> SELECT COUNT(*) as count FROM exchanges"
      },
      {
        pattern: "show me all {table}",
        sql_template: "SELECT * FROM {table} ORDER BY created_at DESC LIMIT 50",
        example: "show me all exchanges -> SELECT * FROM exchanges ORDER BY created_at DESC LIMIT 50"
      },
      {
        pattern: "active {table}",
        sql_template: "SELECT * FROM {table} WHERE status = 'ACTIVE'",
        example: "active exchanges -> SELECT * FROM exchanges WHERE status = 'ACTIVE'"
      },
      {
        pattern: "recent {table}",
        sql_template: "SELECT * FROM {table} WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC",
        example: "recent users -> SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"
      },
      {
        pattern: "{table} by {column}",
        sql_template: "SELECT {column}, COUNT(*) as count FROM {table} GROUP BY {column} ORDER BY count DESC",
        example: "exchanges by status -> SELECT status, COUNT(*) as count FROM exchanges GROUP BY status"
      },
      {
        pattern: "overdue tasks",
        sql_template: "SELECT * FROM tasks WHERE due_date < CURRENT_DATE AND status != 'COMPLETED'",
        example: "overdue tasks -> SELECT * FROM tasks WHERE due_date < CURRENT_DATE AND status != 'COMPLETED'"
      }
    ];
  }

  /**
   * Generate schema context for LLM prompt
   */
  async getSchemaContext() {
    const schema = await this.getSchema();
    
    let context = "Database Schema Information:\n\n";
    
    // Add table information
    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      context += `Table: ${tableName}\n`;
      context += `Description: ${tableInfo.description}\n`;
      context += `Columns:\n`;
      
      for (const column of tableInfo.columns) {
        context += `  - ${column.name} (${column.type}${column.nullable ? ', nullable' : ', not null'})\n`;
      }
      context += `\n`;
    }
    
    // Add relationship information
    context += "Relationships:\n";
    for (const rel of schema.relationships) {
      context += `  - ${rel.from_table}.${rel.from_column} -> ${rel.to_table}.${rel.to_column} (${rel.relationship_type})\n`;
    }
    context += `\n`;
    
    // Add common patterns
    context += "Common Query Patterns:\n";
    for (const pattern of schema.commonQueries) {
      context += `  - "${pattern.pattern}" -> ${pattern.sql_template}\n`;
      context += `    Example: ${pattern.example}\n`;
    }
    
    return context;
  }
}

module.exports = new DatabaseSchemaService();