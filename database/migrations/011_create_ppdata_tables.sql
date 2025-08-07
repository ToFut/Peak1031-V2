-- Create ppData schema and tables for PracticePanther data
-- These tables will store all PP data separately from main application tables

-- ============================================
-- 1. CREATE PPDATA SCHEMA
-- ============================================
CREATE SCHEMA IF NOT EXISTS "ppData";

-- ============================================
-- 2. CREATE CONTACTS TABLE IN PPDATA SCHEMA
-- ============================================
CREATE TABLE IF NOT EXISTS "ppData".contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    display_name TEXT,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone_mobile VARCHAR(50),
    phone_home VARCHAR(50),
    phone_work VARCHAR(50),
    phone_fax VARCHAR(50),
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    is_primary_contact BOOLEAN DEFAULT false,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE MATTERS TABLE IN PPDATA SCHEMA
-- ============================================
CREATE TABLE IF NOT EXISTS "ppData".matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    display_name TEXT,
    matter_number VARCHAR(100),
    status VARCHAR(50),
    practice_area VARCHAR(100),
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    opened_date DATE,
    closed_date DATE,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE PPDATA_TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "ppData".tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    name TEXT,
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(20),
    due_date DATE,
    completed_date DATE,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE PPDATA_INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "ppData".invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    invoice_number VARCHAR(100),
    issue_date DATE,
    due_date DATE,
    status VARCHAR(50),
    subtotal INTEGER,
    tax INTEGER,
    total INTEGER,
    total_paid INTEGER,
    total_outstanding INTEGER,
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CREATE PPDATA_EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ppdata_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    description TEXT,
    expense_date DATE,
    amount INTEGER,
    is_billable BOOLEAN DEFAULT false,
    is_billed BOOLEAN DEFAULT false,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. CREATE PPDATA_TIME_ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ppdata_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    description TEXT,
    date DATE,
    duration_minutes INTEGER,
    amount INTEGER,
    is_billable BOOLEAN DEFAULT false,
    is_billed BOOLEAN DEFAULT false,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. CREATE PPDATA_USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ppdata_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    display_name VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. CREATE PPDATA_NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ppdata_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    name TEXT,
    description TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. CREATE PPDATA_DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ppdata_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    name VARCHAR(255),
    description TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_name TEXT,
    account_ref_id VARCHAR(36),
    account_ref_name TEXT,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_pp_id ON ppdata_contacts(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_email ON ppdata_contacts(email);
CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_sync ON ppdata_contacts(pp_synced_at);

-- Matters indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_matters_pp_id ON ppdata_matters(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_matters_status ON ppdata_matters(status);
CREATE INDEX IF NOT EXISTS idx_ppdata_matters_sync ON ppdata_matters(pp_synced_at);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_pp_id ON ppdata_tasks(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_status ON ppdata_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_due_date ON ppdata_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_sync ON ppdata_tasks(pp_synced_at);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_pp_id ON ppdata_invoices(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_status ON ppdata_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_due_date ON ppdata_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_sync ON ppdata_invoices(pp_synced_at);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_pp_id ON ppdata_expenses(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_date ON ppdata_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_billable ON ppdata_expenses(is_billable);
CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_sync ON ppdata_expenses(pp_synced_at);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_pp_id ON ppdata_time_entries(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_date ON ppdata_time_entries(date);
CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_billable ON ppdata_time_entries(is_billable);
CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_sync ON ppdata_time_entries(pp_synced_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_users_pp_id ON ppdata_users(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_users_email ON ppdata_users(email);
CREATE INDEX IF NOT EXISTS idx_ppdata_users_active ON ppdata_users(is_active);
CREATE INDEX IF NOT EXISTS idx_ppdata_users_sync ON ppdata_users(pp_synced_at);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_notes_pp_id ON ppdata_notes(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_notes_sync ON ppdata_notes(pp_synced_at);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_ppdata_documents_pp_id ON ppdata_documents(pp_id);
CREATE INDEX IF NOT EXISTS idx_ppdata_documents_sync ON ppdata_documents(pp_synced_at);

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON ppdata_contacts TO authenticated;
GRANT SELECT ON ppdata_matters TO authenticated;
GRANT SELECT ON ppdata_tasks TO authenticated;
GRANT SELECT ON ppdata_invoices TO authenticated;
GRANT SELECT ON ppdata_expenses TO authenticated;
GRANT SELECT ON ppdata_time_entries TO authenticated;
GRANT SELECT ON ppdata_users TO authenticated;
GRANT SELECT ON ppdata_notes TO authenticated;
GRANT SELECT ON ppdata_documents TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON ppdata_contacts TO service_role;
GRANT ALL ON ppdata_matters TO service_role;
GRANT ALL ON ppdata_tasks TO service_role;
GRANT ALL ON ppdata_invoices TO service_role;
GRANT ALL ON ppdata_expenses TO service_role;
GRANT ALL ON ppdata_time_entries TO service_role;
GRANT ALL ON ppdata_users TO service_role;
GRANT ALL ON ppdata_notes TO service_role;
GRANT ALL ON ppdata_documents TO service_role;

-- Migration complete! 
-- Your ppdata_ tables are now ready to receive PracticePanther data