-- Create PracticePanther data tables
-- Generated based on actual PP API data structure analysis

-- PP Contacts Table
CREATE TABLE IF NOT EXISTS pp_contacts (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    is_primary_contact BOOLEAN,
    display_name TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    phone_mobile TEXT,
    phone_home TEXT,
    phone_fax TEXT,
    phone_work TEXT,
    email TEXT,
    notes TEXT,
    custom_field_values JSONB,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Tasks Table
CREATE TABLE IF NOT EXISTS pp_tasks (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_display_name TEXT,
    subject TEXT,
    notes TEXT,
    priority TEXT,
    status TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to_users JSONB,
    assigned_to_contacts JSONB,
    tags JSONB,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Invoices Table
CREATE TABLE IF NOT EXISTS pp_invoices (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_display_name TEXT,
    issue_date DATE,
    due_date DATE,
    items_time_entries JSONB,
    items_expenses JSONB,
    items_flat_fees JSONB,
    subtotal INTEGER, -- Stored as cents
    tax INTEGER, -- Stored as cents
    discount INTEGER, -- Stored as cents
    total INTEGER, -- Stored as cents
    total_paid INTEGER, -- Stored as cents
    total_outstanding INTEGER, -- Stored as cents
    invoice_type TEXT,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Expenses Table
CREATE TABLE IF NOT EXISTS pp_expenses (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    is_billable BOOLEAN,
    is_billed BOOLEAN,
    date DATE,
    qty INTEGER,
    price INTEGER, -- Stored as cents
    amount INTEGER, -- Stored as cents
    description TEXT,
    private_notes TEXT,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_display_name TEXT,
    billed_by_user_ref JSONB,
    expense_category_ref JSONB,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Users Table
CREATE TABLE IF NOT EXISTS pp_users (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    is_active BOOLEAN,
    display_name TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    email TEXT,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Notes Table (for when data becomes available)
CREATE TABLE IF NOT EXISTS pp_notes (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    matter_ref_id VARCHAR(36),
    matter_ref_display_name TEXT,
    subject TEXT,
    content TEXT,
    note_type TEXT,
    is_private BOOLEAN,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PP Matters Table (for when API becomes available)
CREATE TABLE IF NOT EXISTS pp_matters (
    id UUID PRIMARY KEY,
    pp_id VARCHAR(36) UNIQUE NOT NULL,
    account_ref_id VARCHAR(36),
    account_ref_display_name TEXT,
    matter_name TEXT,
    matter_number TEXT,
    status TEXT,
    opened_date DATE,
    closed_date DATE,
    description TEXT,
    practice_area TEXT,
    responsible_attorney TEXT,
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    -- Sync metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pp_contacts_pp_id ON pp_contacts(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_contacts_account_ref ON pp_contacts(account_ref_id);
CREATE INDEX IF NOT EXISTS idx_pp_contacts_synced_at ON pp_contacts(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_tasks_pp_id ON pp_tasks(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_status ON pp_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_due_date ON pp_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pp_tasks_synced_at ON pp_tasks(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_invoices_pp_id ON pp_invoices(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_invoices_issue_date ON pp_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_pp_invoices_total ON pp_invoices(total);
CREATE INDEX IF NOT EXISTS idx_pp_invoices_synced_at ON pp_invoices(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_expenses_pp_id ON pp_expenses(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_expenses_date ON pp_expenses(date);
CREATE INDEX IF NOT EXISTS idx_pp_expenses_is_billable ON pp_expenses(is_billable);
CREATE INDEX IF NOT EXISTS idx_pp_expenses_synced_at ON pp_expenses(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_users_pp_id ON pp_users(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_users_is_active ON pp_users(is_active);
CREATE INDEX IF NOT EXISTS idx_pp_users_email ON pp_users(email);
CREATE INDEX IF NOT EXISTS idx_pp_users_synced_at ON pp_users(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_notes_pp_id ON pp_notes(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_notes_synced_at ON pp_notes(synced_at);

CREATE INDEX IF NOT EXISTS idx_pp_matters_pp_id ON pp_matters(pp_id);
CREATE INDEX IF NOT EXISTS idx_pp_matters_status ON pp_matters(status);
CREATE INDEX IF NOT EXISTS idx_pp_matters_synced_at ON pp_matters(synced_at);

-- Enable RLS (Row Level Security) for multi-tenant support
ALTER TABLE pp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_matters ENABLE ROW LEVEL SECURITY;