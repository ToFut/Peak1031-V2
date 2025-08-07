/**
 * Enhanced Database Schema Service for Full LLM Integration
 * 
 * This service provides comprehensive database schema information with full indexing,
 * semantic understanding, and query pattern matching to enable any OSS LLM to 
 * convert natural language prompts into accurate SQL queries.
 */

const supabaseService = require('./supabase');

class EnhancedDatabaseSchemaService {
  constructor() {
    this.fullSchema = null;
    this.semanticIndex = null;
    this.lastUpdated = null;
    this.cacheTimeout = 1800000; // 30 minutes
  }

  /**
   * Get comprehensive database schema with full semantic indexing
   */
  async getFullSchema() {
    if (this.fullSchema && this.lastUpdated && (Date.now() - this.lastUpdated < this.cacheTimeout)) {
      return this.fullSchema;
    }

    this.fullSchema = await this.buildComprehensiveSchema();
    this.semanticIndex = this.buildSemanticIndex(this.fullSchema);
    this.lastUpdated = Date.now();
    
    return this.fullSchema;
  }

  /**
   * Build comprehensive schema with all metadata for LLM understanding
   */
  async buildComprehensiveSchema() {
    const schema = {
      database: {
        name: 'Peak1031_Exchange_Management',
        description: '1031 tax-deferred exchange management platform with PracticePanther integration',
        version: '1.0',
        lastUpdated: new Date().toISOString()
      },
      tables: this.getCompleteTableDefinitions(),
      relationships: this.getDetailedRelationships(),
      indexes: this.getAllIndexes(),
      businessRules: this.getBusinessRules(),
      commonQueries: this.getExpandedQueryPatterns(),
      semanticMappings: this.getSemanticMappings(),
      userRoles: this.getUserRoleDefinitions(),
      dataTypes: this.getDataTypeGuide(),
      constraints: this.getTableConstraints(),
      views: this.getVirtualViews()
    };

    return schema;
  }

  /**
   * Complete table definitions with all metadata
   */
  getCompleteTableDefinitions() {
    return {
      users: {
        description: 'System users including admins, coordinators, clients, and third parties',
        purpose: 'Authentication, authorization, and user management',
        rowEstimate: '50-500 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique user identifier' },
          email: { type: 'VARCHAR(255)', nullable: false, unique: true, description: 'User email address for login' },
          password_hash: { type: 'VARCHAR(255)', nullable: false, description: 'Hashed password (bcrypt)' },
          role: { type: 'VARCHAR(20)', nullable: false, default: 'client', description: 'User role: admin, coordinator, client, third_party, agency', enum: ['admin', 'coordinator', 'client', 'third_party', 'agency'] },
          first_name: { type: 'VARCHAR(100)', nullable: true, description: 'User first name' },
          last_name: { type: 'VARCHAR(100)', nullable: true, description: 'User last name' },
          phone: { type: 'VARCHAR(20)', nullable: true, description: 'Contact phone number' },
          is_active: { type: 'BOOLEAN', nullable: false, default: true, description: 'Whether user account is active' },
          two_fa_enabled: { type: 'BOOLEAN', nullable: false, default: false, description: 'Two-factor authentication enabled' },
          two_fa_secret: { type: 'VARCHAR(255)', nullable: true, description: 'TOTP secret for 2FA' },
          last_login: { type: 'TIMESTAMP', nullable: true, description: 'Last successful login timestamp' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Account creation timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['email', 'role', 'is_active', 'created_at'],
        businessLogic: 'Supports role-based access control with five distinct user types'
      },

      contacts: {
        description: 'External contacts including clients, attorneys, agents, title companies, etc.',
        purpose: 'Contact management for all external parties involved in exchanges',
        rowEstimate: '1000-10000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique contact identifier' },
          pp_contact_id: { type: 'VARCHAR(100)', nullable: true, unique: true, description: 'PracticePanther contact ID for sync' },
          first_name: { type: 'VARCHAR(100)', nullable: true, description: 'Contact first name' },
          last_name: { type: 'VARCHAR(100)', nullable: true, description: 'Contact last name' },
          email: { type: 'VARCHAR(255)', nullable: true, description: 'Contact email address' },
          phone: { type: 'VARCHAR(20)', nullable: true, description: 'Primary phone number' },
          phone_2: { type: 'VARCHAR(20)', nullable: true, description: 'Secondary phone number' },
          company: { type: 'VARCHAR(200)', nullable: true, description: 'Company or organization name' },
          title: { type: 'VARCHAR(100)', nullable: true, description: 'Job title or professional role' },
          address_line_1: { type: 'VARCHAR(255)', nullable: true, description: 'Street address line 1' },
          address_line_2: { type: 'VARCHAR(255)', nullable: true, description: 'Street address line 2' },
          city: { type: 'VARCHAR(100)', nullable: true, description: 'City' },
          state: { type: 'VARCHAR(10)', nullable: true, description: 'State/province abbreviation' },
          zip_code: { type: 'VARCHAR(20)', nullable: true, description: 'Postal code' },
          contact_type: { type: 'VARCHAR(50)', nullable: true, description: 'Type of contact: client, attorney, agent, title_company, etc.' },
          pp_data: { type: 'JSONB', nullable: true, default: '{}', description: 'Raw data from PracticePanther' },
          notes: { type: 'TEXT', nullable: true, description: 'Internal notes about contact' },
          is_active: { type: 'BOOLEAN', nullable: false, default: true, description: 'Whether contact is active' },
          last_sync_at: { type: 'TIMESTAMP', nullable: true, description: 'Last sync with PracticePanther' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Record creation timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['pp_contact_id', 'email', 'company', 'contact_type', 'state', 'is_active', 'last_sync_at'],
        businessLogic: 'Synced from PracticePanther, supports multiple contact types and addresses'
      },

      exchanges: {
        description: '1031 tax-deferred exchanges being processed through the platform',
        purpose: 'Core entity representing each 1031 exchange transaction',
        rowEstimate: '100-5000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique exchange identifier' },
          pp_matter_id: { type: 'VARCHAR(100)', nullable: true, unique: true, description: 'PracticePanther matter ID for sync' },
          name: { type: 'VARCHAR(255)', nullable: false, description: 'Exchange name/title' },
          status: { type: 'VARCHAR(20)', nullable: false, default: 'PENDING', description: 'Current status', enum: ['PENDING', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] },
          client_id: { type: 'UUID', nullable: true, foreign: 'contacts.id', description: 'Primary client for this exchange' },
          coordinator_id: { type: 'UUID', nullable: true, foreign: 'users.id', description: 'Assigned coordinator (user)' },
          start_date: { type: 'DATE', nullable: true, description: 'Exchange start date' },
          completion_date: { type: 'DATE', nullable: true, description: 'Exchange completion date' },
          
          // PracticePanther integration fields
          rate: { type: 'VARCHAR(50)', nullable: true, description: 'Rate/fee structure' },
          tags: { type: 'JSONB', nullable: true, default: '[]', description: 'Tags from PracticePanther' },
          assigned_to_users: { type: 'JSONB', nullable: true, default: '[]', description: 'Assigned users from PP' },
          statute_of_limitation_date: { type: 'TIMESTAMP', nullable: true, description: 'Legal deadline date' },
          pp_created_at: { type: 'TIMESTAMP', nullable: true, description: 'Creation date in PracticePanther' },
          pp_updated_at: { type: 'TIMESTAMP', nullable: true, description: 'Last update in PracticePanther' },
          
          // Exchange-specific fields
          bank: { type: 'VARCHAR(10)', nullable: true, description: 'Qualified intermediary bank code' },
          type_of_exchange: { type: 'VARCHAR(50)', nullable: true, description: 'Type of 1031 exchange', enum: ['simultaneous', 'delayed', 'reverse', 'build_to_suit'] },
          proceeds: { type: 'DECIMAL(15,2)', nullable: true, description: 'Total exchange proceeds amount' },
          client_vesting: { type: 'TEXT', nullable: true, description: 'How client holds title to property' },
          
          // Relinquished property fields
          rel_property_address: { type: 'TEXT', nullable: true, description: 'Relinquished property full address' },
          rel_property_city: { type: 'VARCHAR(100)', nullable: true, description: 'Relinquished property city' },
          rel_property_state: { type: 'VARCHAR(10)', nullable: true, description: 'Relinquished property state' },
          rel_property_zip: { type: 'VARCHAR(20)', nullable: true, description: 'Relinquished property ZIP code' },
          rel_apn: { type: 'VARCHAR(50)', nullable: true, description: 'Relinquished property APN' },
          rel_escrow_number: { type: 'VARCHAR(50)', nullable: true, description: 'Relinquished property escrow number' },
          rel_value: { type: 'DECIMAL(15,2)', nullable: true, description: 'Relinquished property value' },
          rel_contract_date: { type: 'DATE', nullable: true, description: 'Relinquished property contract date' },
          close_of_escrow_date: { type: 'DATE', nullable: true, description: 'Close of escrow date' },
          
          // Important 1031 timeline dates
          day_45: { type: 'DATE', nullable: true, description: '45-day identification deadline' },
          day_180: { type: 'DATE', nullable: true, description: '180-day exchange completion deadline' },
          
          // Replacement property fields
          buyer_1_name: { type: 'VARCHAR(200)', nullable: true, description: 'Primary buyer name for replacement property' },
          buyer_2_name: { type: 'VARCHAR(200)', nullable: true, description: 'Secondary buyer name for replacement property' },
          rep_1_property_address: { type: 'TEXT', nullable: true, description: 'Replacement property 1 full address' },
          rep_1_city: { type: 'VARCHAR(100)', nullable: true, description: 'Replacement property 1 city' },
          rep_1_state: { type: 'VARCHAR(10)', nullable: true, description: 'Replacement property 1 state' },
          rep_1_zip: { type: 'VARCHAR(20)', nullable: true, description: 'Replacement property 1 ZIP code' },
          rep_1_apn: { type: 'VARCHAR(50)', nullable: true, description: 'Replacement property 1 APN' },
          rep_1_escrow_number: { type: 'VARCHAR(50)', nullable: true, description: 'Replacement property 1 escrow number' },
          rep_1_value: { type: 'DECIMAL(15,2)', nullable: true, description: 'Replacement property 1 value' },
          rep_1_contract_date: { type: 'DATE', nullable: true, description: 'Replacement property 1 contract date' },
          rep_1_seller_name: { type: 'TEXT', nullable: true, description: 'Replacement property 1 seller name' },
          
          // System fields
          pp_data: { type: 'JSONB', nullable: true, default: '{}', description: 'Raw data from PracticePanther' },
          metadata: { type: 'JSONB', nullable: true, default: '{}', description: 'Additional exchange metadata' },
          last_sync_at: { type: 'TIMESTAMP', nullable: true, description: 'Last sync with PracticePanther' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Record creation timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['pp_matter_id', 'status', 'client_id', 'coordinator_id', 'start_date', 'rate', 'rel_property_state', 'type_of_exchange', 'day_45', 'day_180', 'close_of_escrow_date', 'last_sync_at'],
        businessLogic: '1031 exchanges have strict IRS timelines (45/180 days) and complex property relationships'
      },

      exchange_participants: {
        description: 'Participants in each exchange including users and contacts with specific roles',
        purpose: 'Many-to-many relationship between exchanges and participants (users/contacts)',
        rowEstimate: '500-15000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique participant record identifier' },
          exchange_id: { type: 'UUID', nullable: false, foreign: 'exchanges.id', description: 'Exchange this participant is involved in' },
          user_id: { type: 'UUID', nullable: true, foreign: 'users.id', description: 'Internal user (if participant is a user)' },
          contact_id: { type: 'UUID', nullable: true, foreign: 'contacts.id', description: 'External contact (if participant is a contact)' },
          role: { type: 'VARCHAR(50)', nullable: false, description: 'Role in exchange', enum: ['client', 'attorney', 'title_company', 'real_estate_agent', 'lender', 'appraiser', 'inspector', 'other'] },
          permissions: { type: 'JSONB', nullable: true, description: 'Specific permissions for this participant' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'When participant was added' },
          deleted_at: { type: 'TIMESTAMP', nullable: true, description: 'Soft delete timestamp' }
        },
        indexes: ['exchange_id', 'user_id', 'contact_id', 'role'],
        businessLogic: 'Either user_id OR contact_id must be set, not both. Supports flexible role-based access.'
      },

      tasks: {
        description: 'Tasks and action items associated with exchanges',
        purpose: 'Task management and workflow tracking for exchanges',
        rowEstimate: '1000-50000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique task identifier' },
          pp_task_id: { type: 'VARCHAR(100)', nullable: true, unique: true, description: 'PracticePanther task ID for sync' },
          title: { type: 'VARCHAR(255)', nullable: false, description: 'Task title' },
          description: { type: 'TEXT', nullable: true, description: 'Detailed task description' },
          status: { type: 'VARCHAR(20)', nullable: false, default: 'PENDING', description: 'Task status', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] },
          priority: { type: 'VARCHAR(10)', nullable: true, description: 'Task priority', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          assigned_to: { type: 'UUID', nullable: true, foreign: 'users.id', description: 'User assigned to complete task' },
          exchange_id: { type: 'UUID', nullable: true, foreign: 'exchanges.id', description: 'Associated exchange' },
          due_date: { type: 'DATE', nullable: true, description: 'Task due date' },
          completed_at: { type: 'TIMESTAMP', nullable: true, description: 'When task was completed' },
          estimated_hours: { type: 'DECIMAL(5,2)', nullable: true, description: 'Estimated hours to complete' },
          actual_hours: { type: 'DECIMAL(5,2)', nullable: true, description: 'Actual hours spent' },
          pp_data: { type: 'JSONB', nullable: true, default: '{}', description: 'Raw data from PracticePanther' },
          last_sync_at: { type: 'TIMESTAMP', nullable: true, description: 'Last sync with PracticePanther' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Task creation timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['pp_task_id', 'status', 'priority', 'assigned_to', 'exchange_id', 'due_date', 'completed_at'],
        businessLogic: 'Tasks can be standalone or associated with exchanges. Supports time tracking and PP sync.'
      },

      documents: {
        description: 'Documents and files associated with exchanges',
        purpose: 'Document management with categorization and security features',
        rowEstimate: '1000-100000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique document identifier' },
          name: { type: 'VARCHAR(255)', nullable: false, description: 'Document name/filename' },
          file_path: { type: 'VARCHAR(500)', nullable: false, description: 'Storage path (S3 key)' },
          file_size: { type: 'BIGINT', nullable: true, description: 'File size in bytes' },
          mime_type: { type: 'VARCHAR(100)', nullable: true, description: 'MIME type of the file' },
          category: { type: 'VARCHAR(50)', nullable: true, description: 'Document category', enum: ['contract', 'deed', 'title_report', 'financial', 'legal', 'correspondence', 'other'] },
          exchange_id: { type: 'UUID', nullable: true, foreign: 'exchanges.id', description: 'Associated exchange' },
          uploaded_by: { type: 'UUID', nullable: true, foreign: 'users.id', description: 'User who uploaded the document' },
          pin_required: { type: 'BOOLEAN', nullable: false, default: false, description: 'Whether document requires PIN to access' },
          pin_hash: { type: 'VARCHAR(255)', nullable: true, description: 'Hashed PIN for secure documents' },
          version: { type: 'INTEGER', nullable: false, default: 1, description: 'Document version number' },
          is_template: { type: 'BOOLEAN', nullable: false, default: false, description: 'Whether this is a template document' },
          template_category: { type: 'VARCHAR(50)', nullable: true, description: 'Template category if applicable' },
          storage_provider: { type: 'VARCHAR(20)', nullable: false, default: 'local', description: 'Storage provider', enum: ['local', 's3', 'azure', 'gcs'] },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Upload timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['exchange_id', 'uploaded_by', 'category', 'created_at', 'is_template', 'template_category'],
        businessLogic: 'Supports versioning, PIN protection, and multiple storage providers'
      },

      messages: {
        description: 'Messages and communications within exchanges',
        purpose: 'Real-time messaging system for exchange participants',
        rowEstimate: '5000-500000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique message identifier' },
          content: { type: 'TEXT', nullable: false, description: 'Message content' },
          sender_id: { type: 'UUID', nullable: false, foreign: 'users.id', description: 'User who sent the message' },
          exchange_id: { type: 'UUID', nullable: true, foreign: 'exchanges.id', description: 'Exchange this message belongs to' },
          message_type: { type: 'VARCHAR(20)', nullable: false, default: 'text', description: 'Message type', enum: ['text', 'file', 'system', 'notification'] },
          parent_message_id: { type: 'UUID', nullable: true, foreign: 'messages.id', description: 'Parent message for threading' },
          attachment_path: { type: 'VARCHAR(500)', nullable: true, description: 'File attachment path' },
          read_by: { type: 'JSONB', nullable: true, default: '{}', description: 'JSON object tracking who has read the message' },
          edited_at: { type: 'TIMESTAMP', nullable: true, description: 'When message was last edited' },
          deleted_at: { type: 'TIMESTAMP', nullable: true, description: 'Soft delete timestamp' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Message creation timestamp' },
          updated_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Last update timestamp' }
        },
        indexes: ['sender_id', 'exchange_id', 'message_type', 'parent_message_id', 'created_at', 'deleted_at'],
        businessLogic: 'Supports threading, file attachments, read receipts, and soft deletion'
      },

      notifications: {
        description: 'System notifications for users',
        purpose: 'User notification system for important events and updates',
        rowEstimate: '1000-50000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique notification identifier' },
          user_id: { type: 'UUID', nullable: false, foreign: 'users.id', description: 'User receiving the notification' },
          title: { type: 'VARCHAR(255)', nullable: false, description: 'Notification title' },
          message: { type: 'TEXT', nullable: true, description: 'Notification message content' },
          type: { type: 'VARCHAR(30)', nullable: false, description: 'Notification type', enum: ['task_assigned', 'task_due', 'exchange_update', 'message_received', 'system_alert', 'deadline_approaching'] },
          priority: { type: 'VARCHAR(10)', nullable: false, default: 'MEDIUM', description: 'Notification priority', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          read: { type: 'BOOLEAN', nullable: false, default: false, description: 'Whether notification has been read' },
          related_entity_type: { type: 'VARCHAR(20)', nullable: true, description: 'Type of related entity', enum: ['exchange', 'task', 'message', 'document'] },
          related_entity_id: { type: 'UUID', nullable: true, description: 'ID of related entity' },
          action_url: { type: 'VARCHAR(500)', nullable: true, description: 'URL for notification action' },
          expires_at: { type: 'TIMESTAMP', nullable: true, description: 'When notification expires' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'Notification creation timestamp' }
        },
        indexes: ['user_id', 'type', 'priority', 'read', 'related_entity_type', 'created_at', 'expires_at'],
        businessLogic: 'Supports different notification types, priorities, and expiration'
      },

      audit_logs: {
        description: 'System audit trail for security and compliance',
        purpose: 'Track all significant user actions and system changes',
        rowEstimate: '10000-1000000 records',
        columns: {
          id: { type: 'UUID', nullable: false, primary: true, description: 'Unique audit log identifier' },
          user_id: { type: 'UUID', nullable: true, foreign: 'users.id', description: 'User who performed the action' },
          action: { type: 'VARCHAR(50)', nullable: false, description: 'Action performed', enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import'] },
          entity_type: { type: 'VARCHAR(30)', nullable: false, description: 'Type of entity affected', enum: ['user', 'contact', 'exchange', 'task', 'document', 'message', 'system'] },
          entity_id: { type: 'UUID', nullable: true, description: 'ID of affected entity' },
          old_values: { type: 'JSONB', nullable: true, description: 'Previous values before change' },
          new_values: { type: 'JSONB', nullable: true, description: 'New values after change' },
          ip_address: { type: 'INET', nullable: true, description: 'User IP address' },
          user_agent: { type: 'TEXT', nullable: true, description: 'User browser/client information' },
          success: { type: 'BOOLEAN', nullable: false, default: true, description: 'Whether action was successful' },
          error_message: { type: 'TEXT', nullable: true, description: 'Error message if action failed' },
          session_id: { type: 'VARCHAR(255)', nullable: true, description: 'User session identifier' },
          created_at: { type: 'TIMESTAMP', nullable: false, default: 'NOW()', description: 'When action occurred' }
        },
        indexes: ['user_id', 'action', 'entity_type', 'entity_id', 'created_at', 'ip_address', 'success'],
        businessLogic: 'Immutable audit trail for compliance and security monitoring'
      }
    };
  }

  /**
   * Detailed relationship definitions with cardinality and business logic
   */
  getDetailedRelationships() {
    return [
      {
        name: 'user_to_coordinated_exchanges',
        from_table: 'users', from_column: 'id',
        to_table: 'exchanges', to_column: 'coordinator_id',
        cardinality: 'one_to_many',
        description: 'A coordinator (user) can manage multiple exchanges',
        cascade: 'SET NULL'
      },
      {
        name: 'contact_to_client_exchanges',
        from_table: 'contacts', from_column: 'id',
        to_table: 'exchanges', to_column: 'client_id',
        cardinality: 'one_to_many',
        description: 'A client (contact) can have multiple exchanges',
        cascade: 'SET NULL'
      },
      {
        name: 'exchange_to_participants',
        from_table: 'exchanges', from_column: 'id',
        to_table: 'exchange_participants', to_column: 'exchange_id',
        cardinality: 'one_to_many',
        description: 'An exchange can have multiple participants',
        cascade: 'CASCADE'
      },
      {
        name: 'user_to_exchange_participation',
        from_table: 'users', from_column: 'id',
        to_table: 'exchange_participants', to_column: 'user_id',
        cardinality: 'one_to_many',
        description: 'A user can participate in multiple exchanges',
        cascade: 'SET NULL'
      },
      {
        name: 'contact_to_exchange_participation',
        from_table: 'contacts', from_column: 'id',
        to_table: 'exchange_participants', to_column: 'contact_id',
        cardinality: 'one_to_many',
        description: 'A contact can participate in multiple exchanges',
        cascade: 'SET NULL'
      },
      {
        name: 'exchange_to_tasks',
        from_table: 'exchanges', from_column: 'id',
        to_table: 'tasks', to_column: 'exchange_id',
        cardinality: 'one_to_many',
        description: 'An exchange can have multiple tasks',
        cascade: 'SET NULL'
      },
      {
        name: 'user_to_assigned_tasks',
        from_table: 'users', from_column: 'id',
        to_table: 'tasks', to_column: 'assigned_to',
        cardinality: 'one_to_many',
        description: 'A user can be assigned multiple tasks',
        cascade: 'SET NULL'
      },
      {
        name: 'exchange_to_documents',
        from_table: 'exchanges', from_column: 'id',
        to_table: 'documents', to_column: 'exchange_id',
        cardinality: 'one_to_many',
        description: 'An exchange can have multiple documents',
        cascade: 'SET NULL'
      },
      {
        name: 'user_to_uploaded_documents',
        from_table: 'users', from_column: 'id',
        to_table: 'documents', to_column: 'uploaded_by',
        cardinality: 'one_to_many',
        description: 'A user can upload multiple documents',
        cascade: 'SET NULL'
      },
      {
        name: 'exchange_to_messages',
        from_table: 'exchanges', from_column: 'id',
        to_table: 'messages', to_column: 'exchange_id',
        cardinality: 'one_to_many',
        description: 'An exchange can have multiple messages',
        cascade: 'SET NULL'
      },
      {
        name: 'user_to_sent_messages',
        from_table: 'users', from_column: 'id',
        to_table: 'messages', to_column: 'sender_id',
        cardinality: 'one_to_many',
        description: 'A user can send multiple messages',
        cascade: 'SET NULL'
      },
      {
        name: 'message_to_replies',
        from_table: 'messages', from_column: 'id',
        to_table: 'messages', to_column: 'parent_message_id',
        cardinality: 'one_to_many',
        description: 'A message can have multiple reply messages (threading)',
        cascade: 'SET NULL'
      },
      {
        name: 'user_to_notifications',
        from_table: 'users', from_column: 'id',
        to_table: 'notifications', to_column: 'user_id',
        cardinality: 'one_to_many',
        description: 'A user can receive multiple notifications',
        cascade: 'CASCADE'
      },
      {
        name: 'user_to_audit_logs',
        from_table: 'users', from_column: 'id',
        to_table: 'audit_logs', to_column: 'user_id',
        cardinality: 'one_to_many',
        description: 'A user can have multiple audit log entries',
        cascade: 'SET NULL'
      }
    ];
  }

  /**
   * Complete index definitions for query optimization
   */
  getAllIndexes() {
    return {
      primary_keys: [
        'users.id', 'contacts.id', 'exchanges.id', 'exchange_participants.id', 
        'tasks.id', 'documents.id', 'messages.id', 'notifications.id', 'audit_logs.id'
      ],
      unique_indexes: [
        'users.email', 'contacts.pp_contact_id', 'exchanges.pp_matter_id', 'tasks.pp_task_id'
      ],
      foreign_key_indexes: [
        'exchanges.client_id', 'exchanges.coordinator_id',
        'exchange_participants.exchange_id', 'exchange_participants.user_id', 'exchange_participants.contact_id',
        'tasks.exchange_id', 'tasks.assigned_to',
        'documents.exchange_id', 'documents.uploaded_by',
        'messages.sender_id', 'messages.exchange_id', 'messages.parent_message_id',
        'notifications.user_id', 'audit_logs.user_id'
      ],
      search_indexes: [
        'users.role', 'users.is_active',
        'contacts.contact_type', 'contacts.company', 'contacts.state', 'contacts.is_active',
        'exchanges.status', 'exchanges.type_of_exchange', 'exchanges.rel_property_state',
        'tasks.status', 'tasks.priority', 'tasks.due_date',
        'documents.category', 'documents.mime_type',
        'messages.message_type', 'messages.created_at',
        'notifications.type', 'notifications.read', 'notifications.priority',
        'audit_logs.action', 'audit_logs.entity_type'
      ],
      composite_indexes: [
        'exchanges(status, coordinator_id)',
        'tasks(exchange_id, status)',
        'tasks(assigned_to, status)',
        'documents(exchange_id, category)',
        'messages(exchange_id, created_at)',
        'notifications(user_id, read)',
        'audit_logs(entity_type, entity_id)',
        'audit_logs(user_id, created_at)'
      ],
      date_indexes: [
        'users.created_at', 'users.last_login',
        'contacts.created_at', 'contacts.last_sync_at',
        'exchanges.start_date', 'exchanges.completion_date', 'exchanges.day_45', 'exchanges.day_180',
        'tasks.due_date', 'tasks.completed_at',
        'documents.created_at',
        'messages.created_at',
        'notifications.created_at', 'notifications.expires_at',
        'audit_logs.created_at'
      ]
    };
  }

  /**
   * Business rules and constraints for LLM understanding
   */
  getBusinessRules() {
    return {
      '1031_exchange_rules': {
        description: '1031 exchanges have strict IRS timeline requirements',
        rules: [
          '45-day rule: Client must identify replacement property within 45 days',
          '180-day rule: Exchange must be completed within 180 days',
          'Like-kind property: Properties must be of like-kind for tax deferment',
          'Qualified intermediary required: Cannot take direct possession of funds'
        ]
      },
      user_roles: {
        description: 'Role-based access control system',
        roles: {
          admin: 'Full system access, user management, system configuration',
          coordinator: 'Manage multiple exchanges, assign tasks, view all exchange data',
          client: 'View own exchanges, documents, and communications only',
          third_party: 'Read-only access to assigned exchanges (attorneys, agents)',
          agency: 'Multi-client view for agencies managing multiple clients'
        }
      },
      data_integrity: {
        description: 'Data consistency and validation rules',
        rules: [
          'exchange_participants: Either user_id OR contact_id must be set, not both',
          'exchanges: day_45 must be <= day_180 if both are set',
          'tasks: completed_at must be set when status = COMPLETED',
          'documents: pin_hash required when pin_required = true',
          'messages: deleted messages retain content for audit purposes'
        ]
      },
      sync_rules: {
        description: 'PracticePanther synchronization rules',
        rules: [
          'PracticePanther is source of truth for contacts and base exchange data',
          'Local changes to synced fields may be overwritten during sync',
          'pp_* fields contain original PracticePanther identifiers',
          'last_sync_at tracks when data was last synchronized'
        ]
      }
    };
  }

  /**
   * Expanded query patterns for better LLM understanding
   */
  getExpandedQueryPatterns() {
    return [
      // Count queries
      {
        pattern: 'how many {entity}',
        intent: 'count_records',
        sql_template: 'SELECT COUNT(*) as count FROM {table}',
        examples: [
          'how many exchanges -> SELECT COUNT(*) as count FROM exchanges',
          'how many active users -> SELECT COUNT(*) as count FROM users WHERE is_active = true'
        ]
      },
      
      // Status-based queries
      {
        pattern: '{status} {entity}',
        intent: 'filter_by_status',
        sql_template: 'SELECT * FROM {table} WHERE status = \'{status}\' ORDER BY created_at DESC LIMIT 20',
        examples: [
          'active exchanges -> SELECT * FROM exchanges WHERE status = \'ACTIVE\'',
          'completed tasks -> SELECT * FROM tasks WHERE status = \'COMPLETED\''
        ]
      },
      
      // Time-based queries
      {
        pattern: 'recent {entity}',
        intent: 'filter_by_time',
        sql_template: 'SELECT * FROM {table} WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\' ORDER BY created_at DESC',
        examples: [
          'recent exchanges -> SELECT * FROM exchanges WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'',
          'recent messages -> SELECT * FROM messages WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
        ]
      },
      
      // Overdue/deadline queries
      {
        pattern: 'overdue {entity}',
        intent: 'filter_overdue',
        sql_template: 'SELECT * FROM {table} WHERE due_date < CURRENT_DATE AND status != \'COMPLETED\'',
        examples: [
          'overdue tasks -> SELECT * FROM tasks WHERE due_date < CURRENT_DATE AND status != \'COMPLETED\'',
          'approaching 45 day deadline -> SELECT * FROM exchanges WHERE day_45 BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL \'7 days\''
        ]
      },
      
      // Aggregation queries
      {
        pattern: '{entity} by {grouping}',
        intent: 'group_and_count',
        sql_template: 'SELECT {grouping}, COUNT(*) as count FROM {table} GROUP BY {grouping} ORDER BY count DESC',
        examples: [
          'exchanges by status -> SELECT status, COUNT(*) as count FROM exchanges GROUP BY status',
          'tasks by priority -> SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority'
        ]
      },
      
      // User-specific queries
      {
        pattern: 'my {entity}',
        intent: 'user_specific',
        sql_template: 'SELECT * FROM {table} WHERE {user_field} = $user_id ORDER BY created_at DESC',
        examples: [
          'my exchanges -> SELECT * FROM exchanges WHERE coordinator_id = $user_id',
          'my tasks -> SELECT * FROM tasks WHERE assigned_to = $user_id'
        ]
      },
      
      // Relationship queries
      {
        pattern: '{entity} with {related_entity}',
        intent: 'join_tables',
        sql_template: 'SELECT {main}.*, {related}.{field} FROM {main_table} {main} JOIN {related_table} {related} ON {join_condition}',
        examples: [
          'exchanges with coordinator -> SELECT e.*, u.first_name, u.last_name FROM exchanges e JOIN users u ON e.coordinator_id = u.id',
          'tasks with exchange -> SELECT t.*, e.name as exchange_name FROM tasks t JOIN exchanges e ON t.exchange_id = e.id'
        ]
      },
      
      // Search queries
      {
        pattern: 'find {entity} containing {term}',
        intent: 'text_search',
        sql_template: 'SELECT * FROM {table} WHERE {search_field} ILIKE \'%{term}%\'',
        examples: [
          'find exchanges containing california -> SELECT * FROM exchanges WHERE name ILIKE \'%california%\' OR rel_property_address ILIKE \'%california%\'',
          'find contacts containing smith -> SELECT * FROM contacts WHERE first_name ILIKE \'%smith%\' OR last_name ILIKE \'%smith%\''
        ]
      },
      
      // Financial queries
      {
        pattern: 'total {financial_field}',
        intent: 'sum_financial',
        sql_template: 'SELECT SUM({field}) as total FROM {table} WHERE {field} IS NOT NULL',
        examples: [
          'total exchange proceeds -> SELECT SUM(proceeds) as total FROM exchanges WHERE proceeds IS NOT NULL',
          'total property values -> SELECT SUM(rel_value) as total FROM exchanges WHERE rel_value IS NOT NULL'
        ]
      }
    ];
  }

  /**
   * Semantic mappings for natural language understanding
   */
  getSemanticMappings() {
    return {
      entity_synonyms: {
        exchanges: ['exchange', 'deal', 'transaction', '1031', 'case', 'matter'],
        users: ['user', 'person', 'staff', 'employee', 'coordinator', 'admin'],
        contacts: ['contact', 'client', 'customer', 'attorney', 'agent', 'party'],
        tasks: ['task', 'todo', 'action item', 'work item', 'assignment'],
        documents: ['document', 'file', 'paper', 'attachment', 'upload'],
        messages: ['message', 'communication', 'chat', 'conversation', 'note']
      },
      
      status_synonyms: {
        active: ['active', 'open', 'ongoing', 'current', 'in progress'],
        completed: ['completed', 'done', 'finished', 'closed', 'ended'],
        pending: ['pending', 'waiting', 'new', 'unstarted'],
        cancelled: ['cancelled', 'canceled', 'terminated', 'abandoned']
      },
      
      time_synonyms: {
        recent: ['recent', 'latest', 'new', 'current'],
        overdue: ['overdue', 'late', 'past due', 'expired'],
        today: ['today', 'this day'],
        week: ['this week', 'past week', 'last 7 days'],
        month: ['this month', 'past month', 'last 30 days']
      },
      
      role_mappings: {
        coordinator: ['coordinator', 'manager', 'handler', 'processor'],
        client: ['client', 'customer', 'exchanger', 'taxpayer'],
        admin: ['admin', 'administrator', 'system admin'],
        attorney: ['attorney', 'lawyer', 'legal counsel', 'counsel'],
        agent: ['agent', 'real estate agent', 'broker', 'realtor']
      }
    };
  }

  /**
   * User role definitions with permissions
   */
  getUserRoleDefinitions() {
    return {
      admin: {
        description: 'System administrator with full access',
        permissions: ['read_all', 'write_all', 'delete_all', 'manage_users', 'system_config'],
        data_access: 'all_records',
        typical_queries: ['system statistics', 'user management', 'all exchanges', 'system health']
      },
      coordinator: {
        description: 'Exchange coordinator managing multiple exchanges',
        permissions: ['read_exchanges', 'write_exchanges', 'manage_tasks', 'view_reports'],
        data_access: 'assigned_exchanges_and_related',
        typical_queries: ['my exchanges', 'assigned tasks', 'exchange status', 'overdue items']
      },
      client: {
        description: 'Client with access to their own exchanges',
        permissions: ['read_own_exchanges', 'upload_documents', 'send_messages'],
        data_access: 'own_exchanges_only',
        typical_queries: ['my exchanges', 'my documents', 'exchange status', 'important dates']
      },
      third_party: {
        description: 'External parties (attorneys, agents) with read-only access',
        permissions: ['read_assigned_exchanges'],
        data_access: 'assigned_exchanges_readonly',
        typical_queries: ['assigned exchanges', 'document status', 'timeline', 'contact info']
      },
      agency: {
        description: 'Agency users managing multiple clients',
        permissions: ['read_client_exchanges', 'manage_client_documents'],
        data_access: 'client_exchanges',
        typical_queries: ['client exchanges', 'agency statistics', 'client documents', 'deadlines']
      }
    };
  }

  /**
   * Data type guide for SQL generation
   */
  getDataTypeGuide() {
    return {
      uuid: {
        description: 'Universally unique identifier',
        sql_type: 'UUID',
        examples: ['id fields', 'foreign key references'],
        operators: ['=', '!=', 'IN', 'NOT IN']
      },
      varchar: {
        description: 'Variable length text',
        sql_type: 'VARCHAR(n)',
        examples: ['names', 'emails', 'short text'],
        operators: ['=', '!=', 'LIKE', 'ILIKE', 'IN', 'NOT IN']
      },
      text: {
        description: 'Unlimited length text',
        sql_type: 'TEXT',
        examples: ['descriptions', 'notes', 'content'],
        operators: ['=', '!=', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL']
      },
      timestamp: {
        description: 'Date and time with timezone',
        sql_type: 'TIMESTAMP',
        examples: ['created_at', 'updated_at', 'due_dates'],
        operators: ['=', '!=', '<', '>', '<=', '>=', 'BETWEEN']
      },
      date: {
        description: 'Date only (no time)',
        sql_type: 'DATE',
        examples: ['due_date', 'start_date', 'day_45'],
        operators: ['=', '!=', '<', '>', '<=', '>=', 'BETWEEN']
      },
      boolean: {
        description: 'True/false values',
        sql_type: 'BOOLEAN',
        examples: ['is_active', 'pin_required', 'read'],
        operators: ['=', '!=', 'IS', 'IS NOT']
      },
      decimal: {
        description: 'Fixed precision numbers',
        sql_type: 'DECIMAL(p,s)',
        examples: ['proceeds', 'property_value', 'hours'],
        operators: ['=', '!=', '<', '>', '<=', '>=', 'BETWEEN']
      },
      jsonb: {
        description: 'JSON binary data',
        sql_type: 'JSONB',
        examples: ['metadata', 'pp_data', 'permissions'],
        operators: ['->', '->>', '@>', '<@', '?', '?&', '?|']
      }
    };
  }

  /**
   * Table constraints for data integrity
   */
  getTableConstraints() {
    return {
      primary_keys: {
        description: 'Primary key constraints ensure unique identification',
        constraints: ['All tables have UUID primary keys', 'Primary keys are immutable']
      },
      foreign_keys: {
        description: 'Foreign key constraints maintain referential integrity',
        constraints: [
          'exchanges.client_id -> contacts.id (SET NULL on delete)',
          'exchanges.coordinator_id -> users.id (SET NULL on delete)',
          'tasks.assigned_to -> users.id (SET NULL on delete)',
          'exchange_participants require either user_id OR contact_id, not both'
        ]
      },
      unique_constraints: {
        description: 'Unique constraints prevent duplicates',
        constraints: [
          'users.email must be unique',
          'contacts.pp_contact_id must be unique when not null',
          'exchanges.pp_matter_id must be unique when not null'
        ]
      },
      check_constraints: {
        description: 'Business rule constraints',
        constraints: [
          'user.role must be one of: admin, coordinator, client, third_party, agency',
          'exchange.status must be valid status value',
          'task.priority must be: LOW, MEDIUM, HIGH, or URGENT'
        ]
      }
    };
  }

  /**
   * Virtual views for common queries
   */
  getVirtualViews() {
    return {
      active_exchanges_with_coordinators: {
        description: 'Active exchanges with coordinator information',
        sql: `
          SELECT 
            e.id, e.name, e.status, e.start_date, e.day_45, e.day_180,
            u.first_name as coordinator_first_name,
            u.last_name as coordinator_last_name,
            u.email as coordinator_email,
            c.first_name as client_first_name,
            c.last_name as client_last_name,
            c.email as client_email
          FROM exchanges e
          LEFT JOIN users u ON e.coordinator_id = u.id
          LEFT JOIN contacts c ON e.client_id = c.id
          WHERE e.status IN ('ACTIVE', 'IN_PROGRESS')
        `
      },
      
      overdue_tasks_with_details: {
        description: 'Overdue tasks with assignee and exchange information',
        sql: `
          SELECT 
            t.id, t.title, t.due_date, t.priority,
            u.first_name as assignee_first_name,
            u.last_name as assignee_last_name,
            e.name as exchange_name,
            e.status as exchange_status
          FROM tasks t
          LEFT JOIN users u ON t.assigned_to = u.id
          LEFT JOIN exchanges e ON t.exchange_id = e.id
          WHERE t.due_date < CURRENT_DATE 
          AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        `
      },
      
      upcoming_deadlines: {
        description: '1031 deadlines approaching within 30 days',
        sql: `
          SELECT 
            e.id, e.name, e.client_id,
            'day_45' as deadline_type,
            e.day_45 as deadline_date,
            e.day_45 - CURRENT_DATE as days_remaining
          FROM exchanges e
          WHERE e.day_45 BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND e.status IN ('ACTIVE', 'IN_PROGRESS')
          
          UNION ALL
          
          SELECT 
            e.id, e.name, e.client_id,
            'day_180' as deadline_type,
            e.day_180 as deadline_date,
            e.day_180 - CURRENT_DATE as days_remaining
          FROM exchanges e
          WHERE e.day_180 BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND e.status IN ('ACTIVE', 'IN_PROGRESS')
        `
      }
    };
  }

  /**
   * Build semantic index for natural language processing
   */
  buildSemanticIndex(schema) {
    const index = {
      tables: {},
      columns: {},
      relationships: {},
      concepts: {}
    };

    // Index table names and synonyms
    Object.keys(schema.tables).forEach(tableName => {
      const table = schema.tables[tableName];
      index.tables[tableName] = {
        synonyms: schema.semanticMappings.entity_synonyms[tableName] || [tableName],
        description: table.description,
        purpose: table.purpose,
        columns: Object.keys(table.columns || {})
      };
    });

    // Index column names and types
    Object.entries(schema.tables).forEach(([tableName, table]) => {
      if (table.columns) {
        Object.entries(table.columns).forEach(([columnName, column]) => {
          const fullColumnName = `${tableName}.${columnName}`;
          index.columns[fullColumnName] = {
            table: tableName,
            column: columnName,
            type: column.type,
            description: column.description,
            searchable: column.type.includes('VARCHAR') || column.type === 'TEXT',
            filterable: true,
            sortable: true
          };
        });
      }
    });

    // Index business concepts
    index.concepts = {
      '1031_exchange': {
        tables: ['exchanges', 'exchange_participants'],
        key_fields: ['day_45', 'day_180', 'proceeds', 'type_of_exchange'],
        business_rules: schema.businessRules['1031_exchange_rules']
      },
      user_management: {
        tables: ['users', 'exchange_participants'],
        key_fields: ['role', 'is_active', 'permissions'],
        business_rules: schema.businessRules.user_roles
      },
      document_management: {
        tables: ['documents'],
        key_fields: ['category', 'pin_required', 'storage_provider'],
        business_rules: 'Documents support categorization, PIN protection, and multiple storage providers'
      }
    };

    return index;
  }

  /**
   * Generate comprehensive schema context for LLM
   */
  async getSchemaContextForLLM() {
    const schema = await this.getFullSchema();
    
    let context = `# Peak1031 Exchange Management Database Schema

## Database Overview
${schema.database.description}

## User Roles and Access Control
`;
    
    Object.entries(schema.userRoles).forEach(([role, info]) => {
      context += `### ${role.toUpperCase()}
- Description: ${info.description}
- Data Access: ${info.data_access}
- Typical Queries: ${info.typical_queries.join(', ')}

`;
    });

    context += `## Tables and Relationships

`;

    // Add table definitions with detailed information
    Object.entries(schema.tables).forEach(([tableName, table]) => {
      context += `### ${tableName.toUpperCase()} Table
**Purpose:** ${table.purpose}
**Description:** ${table.description}
**Estimated Records:** ${table.rowEstimate}

**Columns:**
`;
      
      if (table.columns) {
        Object.entries(table.columns).forEach(([columnName, column]) => {
          const nullableText = column.nullable ? 'nullable' : 'NOT NULL';
          const extraInfo = [];
          if (column.primary) extraInfo.push('PRIMARY KEY');
          if (column.unique) extraInfo.push('UNIQUE');
          if (column.foreign) extraInfo.push(`REFERENCES ${column.foreign}`);
          if (column.default) extraInfo.push(`DEFAULT ${column.default}`);
          if (column.enum) extraInfo.push(`VALUES: ${column.enum.join(', ')}`);
          
          context += `- **${columnName}** (${column.type}, ${nullableText}): ${column.description}`;
          if (extraInfo.length > 0) {
            context += ` [${extraInfo.join(', ')}]`;
          }
          context += `\n`;
        });
      }

      context += `
**Indexes:** ${table.indexes ? table.indexes.join(', ') : 'None'}
**Business Logic:** ${table.businessLogic}

`;
    });

    // Add relationship information
    context += `## Table Relationships

`;
    schema.relationships.forEach(rel => {
      context += `- **${rel.name}**: ${rel.from_table}.${rel.from_column} → ${rel.to_table}.${rel.to_column} (${rel.cardinality})
  - ${rel.description}
  - Cascade: ${rel.cascade}

`;
    });

    // Add business rules
    context += `## Business Rules

`;
    Object.entries(schema.businessRules).forEach(([category, rules]) => {
      context += `### ${category.replace('_', ' ').toUpperCase()}
${rules.description}

`;
      if (rules.rules) {
        rules.rules.forEach(rule => {
          context += `- ${rule}\n`;
        });
      }
      if (rules.roles) {
        Object.entries(rules.roles).forEach(([role, desc]) => {
          context += `- **${role}**: ${desc}\n`;
        });
      }
      context += `\n`;
    });

    // Add query patterns
    context += `## Common Query Patterns

`;
    schema.commonQueries.forEach(pattern => {
      context += `### ${pattern.intent.replace('_', ' ').toUpperCase()}
**Pattern:** "${pattern.pattern}"
**SQL Template:** \`${pattern.sql_template}\`
**Examples:**
`;
      pattern.examples.forEach(example => {
        context += `- ${example}\n`;
      });
      context += `\n`;
    });

    // Add semantic mappings
    context += `## Natural Language Mappings

### Entity Synonyms:
`;
    Object.entries(schema.semanticMappings.entity_synonyms).forEach(([entity, synonyms]) => {
      context += `- **${entity}**: ${synonyms.join(', ')}\n`;
    });

    context += `
### Status Synonyms:
`;
    Object.entries(schema.semanticMappings.status_synonyms).forEach(([status, synonyms]) => {
      context += `- **${status}**: ${synonyms.join(', ')}\n`;
    });

    context += `
### Time Expression Synonyms:
`;
    Object.entries(schema.semanticMappings.time_synonyms).forEach(([time, synonyms]) => {
      context += `- **${time}**: ${synonyms.join(', ')}\n`;
    });

    // Add virtual views for complex queries
    context += `
## Pre-defined Views for Complex Queries

`;
    Object.entries(schema.views).forEach(([viewName, view]) => {
      context += `### ${viewName}
**Purpose:** ${view.description}
**SQL:**
\`\`\`sql
${view.sql.trim()}
\`\`\`

`;
    });

    return context;
  }

  /**
   * Get schema statistics for monitoring
   */
  async getSchemaStatistics() {
    const schema = await this.getFullSchema();
    
    return {
      lastUpdated: this.lastUpdated,
      tableCount: Object.keys(schema.tables).length,
      relationshipCount: schema.relationships.length,
      indexCount: Object.keys(schema.indexes.search_indexes).length + 
                  Object.keys(schema.indexes.composite_indexes).length,
      queryPatternCount: schema.commonQueries.length,
      userRoleCount: Object.keys(schema.userRoles).length,
      businessRuleCount: Object.keys(schema.businessRules).length,
      cacheStatus: this.fullSchema ? 'cached' : 'not_cached'
    };
  }
}

module.exports = new EnhancedDatabaseSchemaService();