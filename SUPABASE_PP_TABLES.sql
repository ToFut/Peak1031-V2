-- ================================================================
-- PRACTICEPANTHER EXACT STRUCTURE TABLES
-- Based on actual PP API analysis
-- Run this in Supabase SQL Editor
-- ================================================================

-- USERS TABLE (9 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
    pp_is_active BOOLEAN DEFAULT true,
    pp_display_name VARCHAR(255),
    pp_first_name VARCHAR(255),
    pp_last_name VARCHAR(255),
    pp_middle_name VARCHAR(255),
    pp_email VARCHAR(255),
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50)
);

-- CONTACTS TABLE (14 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
    pp_account_ref JSONB DEFAULT '{}',
    pp_is_primary_contact BOOLEAN DEFAULT true,
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
    pp_custom_field_values JSONB DEFAULT '[]'
);

-- MATTERS TABLE (16 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
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
    pp_assigned_to_users JSONB DEFAULT '[]',
    pp_custom_field_values JSONB DEFAULT '[]',
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50)
);

-- TASKS TABLE (13 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
    pp_account_ref JSONB DEFAULT '{}',
    pp_matter_ref JSONB DEFAULT '{}',
    pp_subject VARCHAR(255),
    pp_notes TEXT,
    pp_priority VARCHAR(50),
    pp_status VARCHAR(50),
    pp_due_date VARCHAR(50),
    pp_assigned_to_users JSONB DEFAULT '[]',
    pp_assigned_to_contacts JSONB DEFAULT '[]',
    pp_tags JSONB DEFAULT '[]',
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50)
);

-- INVOICES TABLE (17 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
    pp_account_ref JSONB DEFAULT '{}',
    pp_matter_ref JSONB DEFAULT '{}',
    pp_issue_date VARCHAR(50),
    pp_due_date VARCHAR(50),
    pp_items_time_entries JSONB DEFAULT '[]',
    pp_items_expenses JSONB DEFAULT '[]',
    pp_items_flat_fees JSONB DEFAULT '[]',
    pp_subtotal INTEGER,
    pp_tax INTEGER,
    pp_discount INTEGER,
    pp_total INTEGER,
    pp_total_paid INTEGER,
    pp_total_outstanding INTEGER,
    pp_invoice_type VARCHAR(50),
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50)
);

-- EXPENSES TABLE (15 PP fields exactly as returned by API)
CREATE TABLE IF NOT EXISTS pp_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PracticePanther fields (exact API mapping)
    pp_id VARCHAR(50) UNIQUE NOT NULL,
    pp_is_billable BOOLEAN DEFAULT true,
    pp_is_billed BOOLEAN DEFAULT false,
    pp_date VARCHAR(50),
    pp_qty INTEGER,
    pp_price INTEGER,
    pp_amount INTEGER,
    pp_description TEXT,
    pp_private_notes TEXT,
    pp_account_ref JSONB DEFAULT '{}',
    pp_matter_ref JSONB DEFAULT '{}',
    pp_billed_by_user_ref JSONB DEFAULT '{}',
    pp_expense_category_ref JSONB DEFAULT '{}',
    pp_created_at VARCHAR(50),
    pp_updated_at VARCHAR(50)
);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================

-- Primary PP ID indexes (already created as UNIQUE constraints above)

-- Relationship indexes for fast joins
CREATE INDEX IF NOT EXISTS idx_pp_contacts_account_ref ON pp_contacts USING GIN(pp_account_ref);
CREATE INDEX IF NOT EXISTS idx_pp_matters_account_ref ON pp_matters USING GIN(pp_account_ref);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_matter_ref ON pp_tasks USING GIN(pp_matter_ref);
CREATE INDEX IF NOT EXISTS idx_pp_invoices_matter_ref ON pp_invoices USING GIN(pp_matter_ref);
CREATE INDEX IF NOT EXISTS idx_pp_expenses_matter_ref ON pp_expenses USING GIN(pp_matter_ref);

-- Sync timestamp indexes for incremental updates
CREATE INDEX IF NOT EXISTS idx_pp_users_synced ON pp_users(synced_at);
CREATE INDEX IF NOT EXISTS idx_pp_contacts_synced ON pp_contacts(synced_at);
CREATE INDEX IF NOT EXISTS idx_pp_matters_synced ON pp_matters(synced_at);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_synced ON pp_tasks(synced_at);
CREATE INDEX IF NOT EXISTS idx_pp_invoices_synced ON pp_invoices(synced_at);
CREATE INDEX IF NOT EXISTS idx_pp_expenses_synced ON pp_expenses(synced_at);

-- Business logic indexes
CREATE INDEX IF NOT EXISTS idx_pp_contacts_email ON pp_contacts(pp_email) WHERE pp_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pp_users_email ON pp_users(pp_email) WHERE pp_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pp_matters_status ON pp_matters(pp_status);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_status ON pp_tasks(pp_status);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_due_date ON pp_tasks(pp_due_date) WHERE pp_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pp_invoices_issue_date ON pp_invoices(pp_issue_date) WHERE pp_issue_date IS NOT NULL;

-- Success message
SELECT 'SUCCESS: All PracticePanther tables created with exact field mapping!' as result;