-- ============================================
-- PEAK 1031 EXCHANGE PLATFORM - COMPLETE SCHEMA
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE - System users with roles
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'coordinator', 'client', 'third_party', 'agency')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    phone VARCHAR(50),
    phone_primary_new VARCHAR(50),
    phone_mobile_new VARCHAR(50),
    phone_work_new VARCHAR(50),
    phone_home_new VARCHAR(50),
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login TIMESTAMP,
    contact_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- PracticePanther fields
    pp_user_id VARCHAR(255),
    pp_display_name VARCHAR(255),
    pp_email VARCHAR(255),
    pp_is_active BOOLEAN DEFAULT true,
    pp_synced_at TIMESTAMP,
    pp_middle_name VARCHAR(100),
    pp_raw_data JSONB DEFAULT '{}',
    pp_created_at TIMESTAMP,
    pp_updated_at TIMESTAMP
);

-- ============================================
-- CONTACTS TABLE - All contacts from PP
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_primary VARCHAR(50),
    phone_mobile VARCHAR(50),
    phone_work VARCHAR(50),
    phone_home VARCHAR(50),
    company VARCHAR(255),
    contact_type VARCHAR(50) DEFAULT 'client',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- PracticePanther fields
    pp_contact_id VARCHAR(255) UNIQUE,
    pp_display_name VARCHAR(255),
    pp_type VARCHAR(50),
    pp_raw_data JSONB DEFAULT '{}',
    pp_synced_at TIMESTAMP,
    pp_created_at TIMESTAMP,
    pp_updated_at TIMESTAMP
);

-- ============================================
-- EXCHANGES TABLE - Core 1031 exchanges (from PP matters)
-- ============================================
CREATE TABLE IF NOT EXISTS exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    name VARCHAR(255),
    exchange_name VARCHAR(255),
    exchange_number VARCHAR(100) UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    exchange_type VARCHAR(50),
    type_of_exchange VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    
    -- Relationships
    client_id UUID REFERENCES contacts(id),
    coordinator_id UUID REFERENCES users(id),
    primary_client_id UUID REFERENCES contacts(id),
    primary_attorney_id UUID REFERENCES users(id),
    
    -- Property Information
    property_sold_address TEXT,
    property_sold_value DECIMAL(15,2),
    property_bought_address TEXT,
    property_bought_value DECIMAL(15,2),
    exchange_value DECIMAL(15,2),
    relinquished_property_value DECIMAL(15,2),
    replacement_property_value DECIMAL(15,2),
    total_replacement_value DECIMAL(15,2),
    rel_value DECIMAL(15,2),
    rep_1_value DECIMAL(15,2),
    proceeds DECIMAL(15,2),
    cash_boot DECIMAL(15,2),
    financing_amount DECIMAL(15,2),
    estimated_fees DECIMAL(15,2),
    actual_fees DECIMAL(15,2),
    profitability DECIMAL(15,2),
    
    -- Important Dates
    start_date DATE,
    completion_date DATE,
    forty_five_day_deadline DATE,
    one_eighty_day_deadline DATE,
    identification_deadline DATE,
    exchange_deadline DATE,
    sale_date DATE,
    close_of_escrow_date DATE,
    rel_contract_date DATE,
    rep_1_purchase_contract_date DATE,
    statute_of_limitation_date DATE,
    pp_opened_date DATE,
    pp_closed_date DATE,
    pp_open_date DATE,
    pp_close_date DATE,
    
    -- Detailed Property Info
    rel_property_address TEXT,
    rel_property_city VARCHAR(100),
    rel_property_state VARCHAR(50),
    rel_property_zip VARCHAR(20),
    rel_purchase_contract_title VARCHAR(255),
    rel_escrow_number VARCHAR(100),
    rel_apn VARCHAR(100),
    
    rep_1_purchase_contract_title VARCHAR(255),
    rep_1_property_address TEXT,
    rep_1_city VARCHAR(100),
    rep_1_state VARCHAR(50),
    rep_1_zip VARCHAR(20),
    rep_1_escrow_number VARCHAR(100),
    rep_1_seller_1_name VARCHAR(255),
    rep_1_seller_2_name VARCHAR(255),
    rep_1_apn VARCHAR(100),
    
    -- Additional Info
    buyer_1_name VARCHAR(255),
    buyer_2_name VARCHAR(255),
    client_vesting VARCHAR(255),
    bank VARCHAR(255),
    identified TEXT,
    reason_for_cancellation TEXT,
    rate DECIMAL(10,4),
    tags TEXT[],
    assigned_to_users UUID[],
    assigned_users UUID[],
    notes TEXT,
    
    -- Workflow & Compliance
    workflow_stage VARCHAR(100),
    lifecycle_stage VARCHAR(100),
    stage_changed_at TIMESTAMP,
    stage_changed_by UUID REFERENCES users(id),
    stage_progress INTEGER DEFAULT 0,
    days_in_current_stage INTEGER DEFAULT 0,
    compliance_status VARCHAR(50),
    compliance_checklist JSONB DEFAULT '{}',
    regulatory_requirements JSONB DEFAULT '{}',
    risk_level VARCHAR(20),
    on_track BOOLEAN DEFAULT true,
    completion_percentage INTEGER DEFAULT 0,
    substatus VARCHAR(100),
    
    -- Communication
    notifications_enabled BOOLEAN DEFAULT true,
    exchange_chat_id UUID,
    chat_enabled BOOLEAN DEFAULT true,
    
    -- Complex Data
    relinquished_properties JSONB DEFAULT '[]',
    replacement_properties JSONB DEFAULT '[]',
    property_types JSONB DEFAULT '[]',
    property_locations JSONB DEFAULT '[]',
    custom_field_values JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- PracticePanther fields
    pp_matter_id VARCHAR(255) UNIQUE,
    pp_matter_number VARCHAR(100),
    pp_matter_status VARCHAR(50),
    pp_practice_area VARCHAR(100),
    pp_responsible_attorney VARCHAR(255),
    pp_billing_info JSONB DEFAULT '{}',
    pp_account_ref_id VARCHAR(255),
    pp_account_ref_display_name VARCHAR(255),
    pp_account_ref JSONB DEFAULT '{}',
    pp_number VARCHAR(100),
    pp_display_name VARCHAR(255),
    pp_name VARCHAR(255),
    pp_notes TEXT,
    pp_rate DECIMAL(10,2),
    pp_status VARCHAR(50),
    pp_assigned_to_users JSONB DEFAULT '[]',
    pp_matter_type VARCHAR(100),
    pp_custom_field_values JSONB DEFAULT '{}',
    pp_raw_data JSONB DEFAULT '{}',
    pp_data JSONB DEFAULT '{}',
    pp_synced_at TIMESTAMP,
    pp_created_at TIMESTAMP,
    pp_updated_at TIMESTAMP,
    
    -- Computed fields
    day_45 INTEGER,
    day_180 INTEGER,
    display_name VARCHAR(255),
    number VARCHAR(100),
    open_date DATE,
    close_date DATE,
    
    -- Timestamps
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXCHANGE_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_id, contact_id),
    UNIQUE(exchange_id, user_id)
);

-- ============================================
-- MESSAGES TABLE - Chat per exchange
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    attachment_id UUID,
    is_read BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    filename VARCHAR(255),
    original_filename VARCHAR(255),
    stored_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    category VARCHAR(50),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    pin_required BOOLEAN DEFAULT false,
    pin_hash VARCHAR(255),
    storage_provider VARCHAR(50) DEFAULT 'supabase',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    due_date DATE,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- PracticePanther fields
    pp_task_id VARCHAR(255) UNIQUE,
    pp_raw_data JSONB DEFAULT '{}',
    pp_synced_at TIMESTAMP
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID REFERENCES exchanges(id),
    contact_id UUID REFERENCES contacts(id),
    invoice_number VARCHAR(100) UNIQUE,
    amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'draft',
    due_date DATE,
    paid_date DATE,
    description TEXT,
    line_items JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- PracticePanther fields
    pp_invoice_id VARCHAR(255) UNIQUE,
    pp_raw_data JSONB DEFAULT '{}',
    pp_synced_at TIMESTAMP
);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID REFERENCES exchanges(id),
    category VARCHAR(100),
    amount DECIMAL(15,2),
    description TEXT,
    expense_date DATE,
    vendor VARCHAR(255),
    receipt_url TEXT,
    is_billable BOOLEAN DEFAULT false,
    is_reimbursable BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- PracticePanther fields
    pp_expense_id VARCHAR(255) UNIQUE,
    pp_raw_data JSONB DEFAULT '{}',
    pp_synced_at TIMESTAMP
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    type VARCHAR(50),
    content TEXT,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    exchange_id UUID REFERENCES exchanges(id),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    action_url TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AI_ANALYSIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID REFERENCES exchanges(id),
    analysis_type VARCHAR(50),
    prompt TEXT,
    response TEXT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    confidence_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXCHANGE_TIMELINE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    is_milestone BOOLEAN DEFAULT false,
    is_deadline BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXCHANGE_NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    note TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CHAT_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    exchange_id UUID REFERENCES exchanges(id),
    session_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- ============================================
-- CHAT_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Add updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Apply updated_at triggers to all tables
-- ============================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON exchanges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();