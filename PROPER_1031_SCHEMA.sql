-- ================================================================
-- PROPER 1031 EXCHANGE PLATFORM SCHEMA
-- Business entity names with correct PP relationships
-- ================================================================

-- ================================================================
-- PART 1: CORE BUSINESS ENTITIES (PP Integration + 1031 Features)
-- ================================================================

-- ORGANIZATIONS TABLE (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'law_firm', -- law_firm, agency, intermediary, corporate
    
    -- Contact Information
    address JSONB DEFAULT '{}',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Settings & Configuration
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    default_timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS TABLE (Platform users - attorneys, coordinators, staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Identity
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    display_name VARCHAR(300) GENERATED ALWAYS AS (
        CASE 
            WHEN middle_name IS NOT NULL THEN first_name || ' ' || middle_name || ' ' || last_name
            ELSE first_name || ' ' || last_name
        END
    ) STORED,
    
    -- Role & Permissions
    role VARCHAR(50) NOT NULL DEFAULT 'coordinator', -- admin, coordinator, attorney, staff
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    
    -- Contact Information
    phone_primary VARCHAR(20),
    phone_mobile VARCHAR(20),
    phone_work VARCHAR(20),
    phone_home VARCHAR(20),
    
    -- Address Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Business Context
    organization_id UUID REFERENCES organizations(id),
    title VARCHAR(100),
    department VARCHAR(100),
    bar_number VARCHAR(50),
    license_numbers JSONB DEFAULT '[]',
    specializations TEXT[] DEFAULT '{}',
    
    -- Authentication & Security
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    
    -- Communication Preferences
    notification_preferences JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    
    -- PracticePanther Integration (Raw PP data)
    pp_user_id VARCHAR(50) UNIQUE,
    pp_display_name VARCHAR(255),
    pp_first_name VARCHAR(255),
    pp_last_name VARCHAR(255),
    pp_middle_name VARCHAR(255),
    pp_email VARCHAR(255),
    pp_is_active BOOLEAN,
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Metadata
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- EXCHANGES TABLE (Core 1031 business entity - enhanced from PP matters)
CREATE TABLE IF NOT EXISTS exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core 1031 Exchange Identity
    exchange_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    exchange_type VARCHAR(50) NOT NULL DEFAULT 'simultaneous', -- simultaneous, reverse, improvement, build_to_suit, delayed
    
    -- Key Participants (References based on PP structure)
    primary_client_id UUID REFERENCES contacts(id), -- Main client for this exchange (from PP account_ref)
    coordinator_id UUID REFERENCES users(id), -- Lead coordinator (from PP assigned_to_users)
    primary_attorney_id UUID REFERENCES users(id), -- Lead attorney (from PP assigned_to_users)
    assigned_users JSONB DEFAULT '[]', -- All assigned users (from PP assigned_to_users array)
    
    -- CRITICAL 1031 TIMELINE (IRS Requirements)
    sale_date DATE, -- Start of 1031 timeline
    identification_deadline DATE, -- 45 days from sale (IRS requirement)
    exchange_deadline DATE, -- 180 days from sale (IRS requirement)
    days_remaining INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN exchange_deadline IS NULL THEN NULL
            ELSE exchange_deadline - CURRENT_DATE
        END
    ) STORED,
    
    -- Financial Intelligence
    relinquished_property_value DECIMAL(15,2),
    replacement_property_value DECIMAL(15,2),
    exchange_value DECIMAL(15,2) GENERATED ALWAYS AS (
        COALESCE(relinquished_property_value, 0) + COALESCE(replacement_property_value, 0)
    ) STORED,
    cash_boot DECIMAL(12,2) DEFAULT 0,
    financing_amount DECIMAL(15,2),
    
    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'active', -- active, pending, completed, cancelled, on_hold, failed
    substatus VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    risk_level VARCHAR(20) DEFAULT 'medium',
    completion_percentage INTEGER DEFAULT 0,
    
    -- 1031 Properties Intelligence
    relinquished_properties JSONB DEFAULT '[]',
    replacement_properties JSONB DEFAULT '[]',
    property_types TEXT[] DEFAULT '{}',
    property_locations JSONB DEFAULT '{}',
    
    -- Compliance & Regulatory
    compliance_checklist JSONB DEFAULT '{}',
    regulatory_requirements JSONB DEFAULT '{}',
    compliance_status VARCHAR(50) DEFAULT 'pending',
    
    -- Real-time Chat System
    exchange_chat_id UUID UNIQUE DEFAULT gen_random_uuid(),
    chat_enabled BOOLEAN DEFAULT true,
    
    -- Analytics
    estimated_fees DECIMAL(12,2),
    actual_fees DECIMAL(12,2),
    profitability DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(actual_fees, 0) - COALESCE(estimated_fees, 0)
    ) STORED,
    
    -- PracticePanther Integration (Raw PP matter data)
    pp_matter_id VARCHAR(50) UNIQUE,
    pp_account_ref JSONB DEFAULT '{}',
    pp_number INTEGER,
    pp_display_name TEXT,
    pp_name TEXT,
    pp_notes TEXT,
    pp_rate VARCHAR(50),
    pp_open_date VARCHAR(50),
    pp_close_date VARCHAR(50),
    pp_statute_of_limitation_date VARCHAR(50),
    pp_tags JSONB DEFAULT '[]',
    pp_status VARCHAR(50),
    pp_assigned_to_users JSONB DEFAULT '[]', -- Raw PP assigned users data
    pp_custom_field_values JSONB DEFAULT '[]',
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- CONTACTS TABLE (External parties - clients, vendors, service providers)
-- PP Structure: contacts belong to accounts (matters), so they reference exchanges
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Identity
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    display_name VARCHAR(300),
    email VARCHAR(255),
    
    -- Primary Exchange Relationship (from PP account_ref)
    primary_exchange_id UUID REFERENCES exchanges(id), -- Main exchange this contact belongs to (PP account_ref)
    
    -- Contact Information
    phone_primary VARCHAR(20),
    phone_mobile VARCHAR(20),
    phone_work VARCHAR(20),
    phone_home VARCHAR(20),
    phone_fax VARCHAR(20),
    
    -- Address Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    coordinates POINT,
    
    -- Business Context
    organization_id UUID REFERENCES organizations(id),
    contact_type TEXT[] DEFAULT ARRAY['client'], -- client, vendor, attorney, agent, intermediary, lender, title_company
    industry VARCHAR(100),
    company VARCHAR(255),
    title VARCHAR(100),
    
    -- Relationship Intelligence
    is_primary_contact BOOLEAN DEFAULT false, -- From PP is_primary_contact
    primary_contact_for UUID REFERENCES contacts(id),
    assistant_contact_id UUID REFERENCES contacts(id),
    referral_source VARCHAR(255),
    relationship_strength INTEGER CHECK (relationship_strength >= 1 AND relationship_strength <= 5),
    
    -- Financial Intelligence
    credit_score INTEGER,
    net_worth_estimate DECIMAL(15,2),
    investment_capacity DECIMAL(15,2),
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    communication_preferences JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    
    -- PracticePanther Integration (Raw PP contact data)
    pp_contact_id VARCHAR(50) UNIQUE,
    pp_account_ref JSONB DEFAULT '{}', -- Original PP account reference
    pp_is_primary_contact BOOLEAN,
    pp_display_name VARCHAR(255),
    pp_first_name VARCHAR(255),
    pp_middle_name VARCHAR(255),
    pp_last_name VARCHAR(255),
    pp_phone_mobile VARCHAR(50),
    pp_phone_home VARCHAR(50),
    pp_phone_fax VARCHAR(50),
    pp_phone_work VARCHAR(50),
    pp_email VARCHAR(255),
    pp_notes TEXT,
    pp_custom_field_values JSONB DEFAULT '[]',
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Intelligence & Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    importance_score INTEGER DEFAULT 50 CHECK (importance_score >= 1 AND importance_score <= 100),
    last_interaction_date TIMESTAMP WITH TIME ZONE,
    next_followup_date DATE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- TASKS TABLE (Workflow management - enhanced from PP tasks)
-- PP Structure: tasks reference matter_ref (exchange) and assigned_to_users/contacts
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Task Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100), -- 1031_deadline, document_review, compliance_check, client_communication
    category VARCHAR(100), -- critical_deadline, routine, compliance, documentation
    
    -- Context & Relationships (from PP structure)
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE, -- From PP matter_ref
    primary_contact_id UUID REFERENCES contacts(id), -- From PP account_ref
    assigned_to UUID REFERENCES users(id), -- Primary assignee (from PP assigned_to_users[0])
    assigned_users JSONB DEFAULT '[]', -- All assigned users (from PP assigned_to_users array)
    assigned_contacts JSONB DEFAULT '[]', -- All assigned contacts (from PP assigned_to_contacts array)
    created_by UUID REFERENCES users(id),
    
    -- Timeline
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTERVAL,
    actual_duration INTERVAL GENERATED ALWAYS AS (
        CASE 
            WHEN completed_at IS NULL OR start_date IS NULL THEN NULL
            ELSE completed_at - start_date
        END
    ) STORED,
    
    -- 1031-Specific Features
    is_critical_1031_deadline BOOLEAN DEFAULT false,
    deadline_type VARCHAR(50), -- 45_day_identification, 180_day_completion, custom
    days_before_deadline INTEGER,
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, overdue
    priority VARCHAR(20) DEFAULT 'medium',
    urgency_score INTEGER DEFAULT 50,
    
    -- Progress & Quality
    completion_percentage INTEGER DEFAULT 0,
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 100),
    
    -- Dependencies & Workflow
    depends_on_tasks UUID[] DEFAULT '{}',
    blocks_tasks UUID[] DEFAULT '{}',
    template_id UUID,
    
    -- Automation
    auto_assign_rules JSONB DEFAULT '{}',
    reminder_schedule JSONB DEFAULT '{}',
    escalation_rules JSONB DEFAULT '{}',
    
    -- PracticePanther Integration (Raw PP task data)
    pp_task_id VARCHAR(50) UNIQUE,
    pp_account_ref JSONB DEFAULT '{}', -- Original PP account reference
    pp_matter_ref JSONB DEFAULT '{}', -- Original PP matter reference  
    pp_subject VARCHAR(255),
    pp_notes TEXT,
    pp_priority VARCHAR(50),
    pp_status VARCHAR(50),
    pp_due_date VARCHAR(50),
    pp_assigned_to_users JSONB DEFAULT '[]', -- Raw PP assigned users
    pp_assigned_to_contacts JSONB DEFAULT '[]', -- Raw PP assigned contacts
    pp_tags JSONB DEFAULT '[]',
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVOICES TABLE (Financial management - enhanced from PP invoices)
-- PP Structure: invoices reference account_ref and matter_ref
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Invoice Identity
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Relationships (from PP structure)
    exchange_id UUID REFERENCES exchanges(id), -- From PP matter_ref
    client_id UUID REFERENCES contacts(id), -- From PP account_ref
    user_id UUID REFERENCES users(id), -- Invoice creator
    organization_id UUID REFERENCES organizations(id),
    
    -- Invoice Details
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    invoice_type VARCHAR(50) DEFAULT 'service',
    
    -- 1031-Specific Billing
    exchange_phase VARCHAR(50), -- initiation, identification, exchange, completion
    fee_type VARCHAR(50), -- coordination_fee, legal_fee, intermediary_fee, closing_costs
    milestone VARCHAR(100),
    
    -- Financial Information
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 4) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    amount_outstanding DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    
    -- Payment Information
    payment_terms VARCHAR(100),
    payment_method VARCHAR(50),
    payment_instructions TEXT,
    
    -- Line Items & Details
    line_items JSONB DEFAULT '[]',
    
    -- PracticePanther Integration (Raw PP invoice data)
    pp_invoice_id VARCHAR(50) UNIQUE,
    pp_account_ref JSONB DEFAULT '{}', -- Original PP account reference
    pp_matter_ref JSONB DEFAULT '{}', -- Original PP matter reference
    pp_issue_date VARCHAR(50),
    pp_due_date VARCHAR(50),
    pp_items_time_entries JSONB DEFAULT '[]',
    pp_items_expenses JSONB DEFAULT '[]',
    pp_items_flat_fees JSONB DEFAULT '[]',
    pp_subtotal INTEGER, -- PP stores in cents
    pp_tax INTEGER,
    pp_discount INTEGER,
    pp_total INTEGER,
    pp_total_paid INTEGER,
    pp_total_outstanding INTEGER,
    pp_invoice_type VARCHAR(50),
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- EXPENSES TABLE (Expense management - enhanced from PP expenses)  
-- PP Structure: expenses reference account_ref, matter_ref, and billed_by_user_ref
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Expense Information
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL,
    category VARCHAR(100),
    
    -- Relationships (from PP structure)
    exchange_id UUID REFERENCES exchanges(id), -- From PP matter_ref
    client_id UUID REFERENCES contacts(id), -- From PP account_ref  
    user_id UUID REFERENCES users(id), -- From PP billed_by_user_ref
    
    -- Expense Details
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(8,2),
    is_billable BOOLEAN DEFAULT true,
    is_billed BOOLEAN DEFAULT false,
    
    -- 1031-Specific Features
    exchange_phase VARCHAR(50),
    expense_type VARCHAR(50), -- travel, filing_fees, courier, research
    
    -- Receipt & Documentation
    receipt_url TEXT,
    receipt_stored_path VARCHAR(500),
    
    -- PracticePanther Integration (Raw PP expense data)
    pp_expense_id VARCHAR(50) UNIQUE,
    pp_account_ref JSONB DEFAULT '{}', -- Original PP account reference
    pp_matter_ref JSONB DEFAULT '{}', -- Original PP matter reference
    pp_billed_by_user_ref JSONB DEFAULT '{}', -- Original PP user reference
    pp_expense_category_ref JSONB DEFAULT '{}',
    pp_is_billable BOOLEAN,
    pp_is_billed BOOLEAN,
    pp_date VARCHAR(50),
    pp_qty INTEGER,
    pp_price INTEGER, -- PP stores in cents
    pp_amount INTEGER, -- PP stores in cents
    pp_description TEXT,
    pp_private_notes TEXT,
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    private_notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- ================================================================
-- PART 2: SPECIALIZED 1031 FEATURES (Building on PP foundation)
-- ================================================================

-- EXCHANGE PARTICIPANTS (Advanced relationship management)
CREATE TABLE IF NOT EXISTS exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Relationships
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Internal platform users
    contact_id UUID REFERENCES contacts(id), -- External contacts (from PP)
    
    -- External Participant Identity (for non-PP contacts)
    external_name VARCHAR(255),
    external_email VARCHAR(255),
    external_phone VARCHAR(20),
    external_company VARCHAR(255),
    
    -- 1031-Specific Role & Permissions
    role VARCHAR(50) NOT NULL, -- client, buyer, seller, attorney, agent, lender, title_company, intermediary, coordinator, qualified_intermediary
    sub_roles TEXT[] DEFAULT '{}',
    is_primary BOOLEAN DEFAULT false,
    is_decision_maker BOOLEAN DEFAULT false,
    permission_level VARCHAR(50) DEFAULT 'view_only', -- view_only, comment, edit_documents, full_access, admin
    
    -- Access Control
    can_view_documents BOOLEAN DEFAULT true,
    can_upload_documents BOOLEAN DEFAULT false,
    can_comment BOOLEAN DEFAULT true,
    can_create_tasks BOOLEAN DEFAULT false,
    can_view_financial BOOLEAN DEFAULT false,
    can_access_compliance BOOLEAN DEFAULT false,
    
    -- Communication & Chat
    can_access_chat BOOLEAN DEFAULT true,
    chat_channels TEXT[] DEFAULT ARRAY['exchange_general'],
    receive_notifications BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{}',
    email_frequency VARCHAR(20) DEFAULT 'immediate',
    
    -- Timeline & Status
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance Metrics
    responsiveness_score INTEGER CHECK (responsiveness_score >= 1 AND responsiveness_score <= 100),
    engagement_score INTEGER CHECK (engagement_score >= 1 AND engagement_score <= 100),
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 100),
    
    -- PracticePanther Integration
    pp_contact_id VARCHAR(50), -- Reference to PP contact if applicable
    pp_user_id VARCHAR(50), -- Reference to PP user if applicable
    
    -- Metadata
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT participant_identity_check CHECK (
        (user_id IS NOT NULL) OR 
        (contact_id IS NOT NULL) OR 
        (external_name IS NOT NULL AND external_email IS NOT NULL)
    ),
    UNIQUE(exchange_id, user_id, contact_id, role)
);

-- EXCHANGE CHAT CHANNELS
CREATE TABLE IF NOT EXISTS exchange_chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    channel_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- exchange_general, exchange_documents, exchange_tasks, exchange_financial, private_thread
    
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Access Control
    allowed_participant_roles TEXT[] DEFAULT '{}',
    allowed_permission_levels TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(exchange_id, channel_name)
);

-- EXCHANGE CHAT MESSAGES
CREATE TABLE IF NOT EXISTS exchange_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, system, notification, file, task_update, deadline_alert, status_change
    
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES exchange_chat_channels(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES exchange_chat_messages(id),
    reply_to_id UUID REFERENCES exchange_chat_messages(id),
    
    -- Sender Information
    sender_user_id UUID REFERENCES users(id),
    sender_participant_id UUID REFERENCES exchange_participants(id),
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    
    -- Recipients & Delivery
    mentioned_user_ids UUID[] DEFAULT '{}',
    mentioned_participant_ids UUID[] DEFAULT '{}',
    
    -- Message Status
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Attachments & Media
    attachments JSONB DEFAULT '[]',
    has_attachments BOOLEAN DEFAULT false,
    
    -- Message Intelligence
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    urgency_level VARCHAR(20) DEFAULT 'normal',
    contains_deadline BOOLEAN DEFAULT false,
    contains_action_item BOOLEAN DEFAULT false,
    extracted_entities JSONB DEFAULT '{}',
    
    -- Read Receipts & Delivery
    read_by JSONB DEFAULT '{}',
    delivered_to JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENT TEMPLATES (1031-Specific)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100) NOT NULL, -- exchange_agreement, identification_notice, assignment_agreement
    category VARCHAR(100), -- 1031_forms, compliance, notices, agreements
    
    -- Template Content
    file_path VARCHAR(500),
    template_url VARCHAR(500),
    mime_type VARCHAR(100),
    file_size BIGINT,
    
    -- Template Configuration
    is_required BOOLEAN DEFAULT false,
    exchange_types TEXT[] DEFAULT '{}', -- Which exchange types this applies to
    exchange_phase VARCHAR(50), -- initiation, identification, completion
    auto_generate BOOLEAN DEFAULT false,
    
    -- Field Mapping
    field_mappings JSONB DEFAULT '{}',
    required_fields TEXT[] DEFAULT '{}',
    optional_fields TEXT[] DEFAULT '{}',
    
    -- Compliance
    regulatory_requirement VARCHAR(100),
    compliance_deadline_days INTEGER,
    
    -- Access Control
    available_to_roles TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- DOCUMENTS (Enhanced document management)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Document Info
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    
    -- Context & Relationships
    exchange_id UUID REFERENCES exchanges(id),
    contact_id UUID REFERENCES contacts(id),
    task_id UUID REFERENCES tasks(id),
    template_id UUID REFERENCES document_templates(id),
    uploaded_by UUID REFERENCES users(id),
    
    -- File Information
    file_type VARCHAR(100),
    file_size BIGINT,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    
    -- Storage Information
    storage_path VARCHAR(500),
    storage_provider VARCHAR(50) DEFAULT 'aws_s3',
    storage_url VARCHAR(500),
    
    -- 1031-Specific Classification
    document_type VARCHAR(100), -- exchange_agreement, property_deed, identification_notice, closing_statement
    document_category VARCHAR(100), -- 1031_forms, property_docs, financial, compliance
    exchange_phase VARCHAR(50), -- initiation, identification, exchange, completion
    
    -- Security & Access Control
    access_level VARCHAR(20) DEFAULT 'standard',
    is_confidential BOOLEAN DEFAULT false,
    pin_protected BOOLEAN DEFAULT false,
    pin_hash VARCHAR(255),
    
    -- Document Intelligence
    processing_status VARCHAR(50) DEFAULT 'pending',
    ocr_text TEXT,
    extracted_data JSONB DEFAULT '{}',
    ai_summary TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    
    -- Version Control
    version_number INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id),
    is_latest_version BOOLEAN DEFAULT true,
    
    -- Compliance & Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    retention_period INTERVAL,
    auto_delete_at TIMESTAMP WITH TIME ZONE,
    compliance_status VARCHAR(50) DEFAULT 'pending',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- PART 3: PERFORMANCE INDEXES & RELATIONSHIPS
-- ================================================================

-- Primary relationship indexes
CREATE INDEX IF NOT EXISTS idx_contacts_primary_exchange ON contacts(primary_exchange_id);
CREATE INDEX IF NOT EXISTS idx_tasks_exchange ON tasks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_exchange ON invoices(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_exchange ON expenses(exchange_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);

-- Exchange performance indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator ON exchanges(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_client ON exchanges(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines ON exchanges(identification_deadline, exchange_deadline);
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status, priority);
CREATE INDEX IF NOT EXISTS idx_exchanges_risk ON exchanges(risk_level, days_remaining);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_channels_exchange ON exchange_chat_channels(exchange_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_time ON exchange_chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_exchange ON exchange_chat_messages(exchange_id, created_at DESC);

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_participants_exchange_role ON exchange_participants(exchange_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_participants_user ON exchange_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_contact ON exchange_participants(contact_id);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_exchange_type ON documents(exchange_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_phase ON documents(exchange_phase, created_at DESC);

-- PracticePanther integration indexes
CREATE INDEX IF NOT EXISTS idx_users_pp_id ON users(pp_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_pp_id ON contacts(pp_contact_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_id ON exchanges(pp_matter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_pp_id ON tasks(pp_task_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pp_id ON invoices(pp_invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_pp_id ON expenses(pp_expense_id);

-- Success message
SELECT 'SUCCESS: Complete 1031 Exchange Platform with proper PP relationships created!' as result;

/*
🎉 PROPER 1031 EXCHANGE PLATFORM COMPLETED!

✅ Correct Business Entity Names:
- exchanges (from PP matters)
- contacts (from PP contacts) 
- users (from PP users)
- tasks (from PP tasks)
- invoices (from PP invoices)  
- expenses (from PP expenses)

✅ Proper Foreign Key Relationships (based on PP structure):
- contacts.primary_exchange_id → exchanges.id (from PP account_ref)
- exchanges.coordinator_id → users.id (from PP assigned_to_users)
- exchanges.primary_client_id → contacts.id (main client)
- tasks.exchange_id → exchanges.id (from PP matter_ref)
- tasks.assigned_to → users.id (from PP assigned_to_users)
- tasks.primary_contact_id → contacts.id (from PP account_ref)
- invoices.exchange_id → exchanges.id (from PP matter_ref)
- invoices.client_id → contacts.id (from PP account_ref)
- expenses.exchange_id → exchanges.id (from PP matter_ref)
- expenses.user_id → users.id (from PP billed_by_user_ref)

✅ Enhanced Features:
- Real-time chat system per exchange
- Advanced participant role management
- Document templates and intelligence
- Critical 1031 deadline tracking
- Compliance monitoring
- Financial analytics
- Risk assessment

🚀 Ready for comprehensive 1031 exchange management with seamless PP integration!
*/