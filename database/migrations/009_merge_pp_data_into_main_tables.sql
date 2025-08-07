-- Migration: Merge PracticePanther data into main tables
-- Instead of separate pp_ tables, enhance existing tables with PP fields

-- ============================================
-- 1. ENHANCE CONTACTS TABLE WITH PP FIELDS
-- ============================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS pp_id VARCHAR(36) UNIQUE,
ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_home VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_work VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_fax VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_ref_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS account_ref_name TEXT,
ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_field_values JSONB,
ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for PP lookups
CREATE INDEX IF NOT EXISTS idx_contacts_pp_id ON contacts(pp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account_ref ON contacts(account_ref_id);

-- ============================================
-- 2. ENHANCE TASKS TABLE WITH PP FIELDS
-- ============================================
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS pp_id VARCHAR(36) UNIQUE,
ADD COLUMN IF NOT EXISTS matter_ref_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS matter_ref_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_users JSONB,
ADD COLUMN IF NOT EXISTS assigned_to_contacts JSONB,
ADD COLUMN IF NOT EXISTS tags JSONB,
ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_tasks_pp_id ON tasks(pp_id);
CREATE INDEX IF NOT EXISTS idx_tasks_matter_ref ON tasks(matter_ref_id);

-- ============================================
-- 3. ENHANCE EXCHANGES TABLE WITH PP MATTER FIELDS
-- ============================================
ALTER TABLE exchanges
ADD COLUMN IF NOT EXISTS pp_matter_id VARCHAR(36) UNIQUE,
ADD COLUMN IF NOT EXISTS pp_matter_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS pp_matter_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS pp_practice_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS pp_responsible_attorney VARCHAR(255),
ADD COLUMN IF NOT EXISTS pp_opened_date DATE,
ADD COLUMN IF NOT EXISTS pp_closed_date DATE,
ADD COLUMN IF NOT EXISTS pp_billing_info JSONB,
ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_id ON exchanges(pp_matter_id);

-- ============================================
-- 4. CREATE INVOICES TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    
    -- Invoice details
    invoice_number VARCHAR(100),
    issue_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    invoice_type VARCHAR(50),
    
    -- Financial data
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    total_paid DECIMAL(12, 2) DEFAULT 0,
    total_outstanding DECIMAL(12, 2) DEFAULT 0,
    
    -- Line items
    items_time_entries JSONB,
    items_expenses JSONB,
    items_flat_fees JSONB,
    
    -- PP sync
    pp_account_ref_id VARCHAR(36),
    pp_matter_ref_id VARCHAR(36),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_exchange_id ON invoices(exchange_id);
CREATE INDEX idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================
-- 5. CREATE EXPENSES TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Expense details
    description TEXT,
    expense_date DATE,
    category VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    price DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Billing
    is_billable BOOLEAN DEFAULT false,
    is_billed BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    
    -- Notes
    private_notes TEXT,
    
    -- PP sync
    pp_matter_ref_id VARCHAR(36),
    pp_account_ref_id VARCHAR(36),
    pp_expense_category_ref JSONB,
    pp_billed_by_user_ref JSONB,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_exchange_id ON expenses(exchange_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_invoice_id ON expenses(invoice_id);
CREATE INDEX idx_expenses_is_billable ON expenses(is_billable);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

-- ============================================
-- 6. CREATE NOTES TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pp_id VARCHAR(36) UNIQUE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    
    -- Note details
    subject VARCHAR(255),
    content TEXT,
    note_type VARCHAR(50),
    is_private BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    
    -- PP sync
    pp_account_ref_id VARCHAR(36),
    pp_matter_ref_id VARCHAR(36),
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_exchange_id ON notes(exchange_id);
CREATE INDEX idx_notes_contact_id ON notes(contact_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_is_private ON notes(is_private);

-- ============================================
-- 7. ENHANCE USERS TABLE WITH PP FIELDS
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pp_user_id VARCHAR(36) UNIQUE,
ADD COLUMN IF NOT EXISTS pp_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS pp_is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_pp_user_id ON users(pp_user_id);

-- ============================================
-- 8. DATA MIGRATION FROM PP TABLES
-- ============================================

-- Migrate PP contacts data into main contacts table
INSERT INTO contacts (
    pp_id, first_name, last_name, email, 
    phone_mobile, phone_home, phone_work, phone_fax,
    account_ref_id, account_ref_name, is_primary_contact,
    custom_field_values, pp_synced_at, pp_created_at, pp_updated_at
)
SELECT 
    pp_id, first_name, last_name, email,
    phone_mobile, phone_home, phone_work, phone_fax,
    account_ref_id, account_ref_display_name, is_primary_contact,
    custom_field_values, synced_at, pp_created_at, pp_updated_at
FROM pp_contacts
ON CONFLICT (pp_id) DO UPDATE SET
    phone_mobile = EXCLUDED.phone_mobile,
    phone_home = EXCLUDED.phone_home,
    phone_work = EXCLUDED.phone_work,
    phone_fax = EXCLUDED.phone_fax,
    account_ref_id = EXCLUDED.account_ref_id,
    account_ref_name = EXCLUDED.account_ref_name,
    custom_field_values = EXCLUDED.custom_field_values,
    pp_synced_at = EXCLUDED.pp_synced_at;

-- Migrate PP tasks data into main tasks table
UPDATE tasks t
SET 
    pp_id = pt.pp_id,
    matter_ref_id = pt.matter_ref_id,
    matter_ref_name = pt.matter_ref_display_name,
    assigned_to_users = pt.assigned_to_users,
    assigned_to_contacts = pt.assigned_to_contacts,
    tags = pt.tags,
    pp_synced_at = pt.synced_at,
    pp_created_at = pt.pp_created_at,
    pp_updated_at = pt.pp_updated_at
FROM pp_tasks pt
WHERE t.title = pt.subject OR t.description LIKE '%' || pt.notes || '%';

-- Insert new tasks that don't exist yet
INSERT INTO tasks (
    pp_id, title, description, status, priority, due_date,
    matter_ref_id, matter_ref_name, assigned_to_users, assigned_to_contacts,
    tags, pp_synced_at, pp_created_at, pp_updated_at
)
SELECT 
    pp_id, subject, notes, 
    CASE status 
        WHEN 'NotCompleted' THEN 'pending'
        WHEN 'Completed' THEN 'completed'
        ELSE 'pending'
    END,
    LOWER(priority), due_date,
    matter_ref_id, matter_ref_display_name, assigned_to_users, assigned_to_contacts,
    tags, synced_at, pp_created_at, pp_updated_at
FROM pp_tasks
WHERE pp_id NOT IN (SELECT pp_id FROM tasks WHERE pp_id IS NOT NULL);

-- Migrate PP invoices to new invoices table
INSERT INTO invoices (
    pp_id, invoice_number, issue_date, due_date, status, invoice_type,
    subtotal, tax, discount, total, total_paid, total_outstanding,
    items_time_entries, items_expenses, items_flat_fees,
    pp_account_ref_id, pp_matter_ref_id, pp_synced_at,
    created_at, updated_at
)
SELECT 
    pp_id, pp_id as invoice_number, issue_date, due_date, 
    CASE 
        WHEN total_outstanding = 0 THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
    END,
    invoice_type,
    subtotal/100.0, tax/100.0, discount/100.0, total/100.0, 
    total_paid/100.0, total_outstanding/100.0,
    items_time_entries, items_expenses, items_flat_fees,
    account_ref_id, matter_ref_id, synced_at,
    pp_created_at, pp_updated_at
FROM pp_invoices
ON CONFLICT (pp_id) DO UPDATE SET
    total_paid = EXCLUDED.total_paid,
    total_outstanding = EXCLUDED.total_outstanding,
    status = EXCLUDED.status,
    pp_synced_at = EXCLUDED.pp_synced_at;

-- Migrate PP expenses to new expenses table
INSERT INTO expenses (
    pp_id, description, expense_date, quantity, price, amount,
    is_billable, is_billed, private_notes,
    pp_matter_ref_id, pp_account_ref_id, pp_expense_category_ref, pp_billed_by_user_ref,
    pp_synced_at, created_at, updated_at
)
SELECT 
    pp_id, description, date, qty, price/100.0, amount/100.0,
    is_billable, is_billed, private_notes,
    matter_ref_id, account_ref_id, expense_category_ref, billed_by_user_ref,
    synced_at, pp_created_at, pp_updated_at
FROM pp_expenses
ON CONFLICT (pp_id) DO UPDATE SET
    is_billed = EXCLUDED.is_billed,
    pp_synced_at = EXCLUDED.pp_synced_at;

-- Migrate PP notes to new notes table
INSERT INTO notes (
    pp_id, subject, content, note_type, is_private,
    pp_account_ref_id, pp_matter_ref_id, pp_synced_at,
    created_at, updated_at
)
SELECT 
    pp_id, subject, content, note_type, is_private,
    account_ref_id, matter_ref_id, synced_at,
    pp_created_at, pp_updated_at
FROM pp_notes
ON CONFLICT (pp_id) DO UPDATE SET
    content = EXCLUDED.content,
    pp_synced_at = EXCLUDED.pp_synced_at;

-- Update users with PP user data
UPDATE users u
SET 
    pp_user_id = pu.pp_id,
    pp_display_name = pu.display_name,
    pp_is_active = pu.is_active,
    pp_synced_at = pu.synced_at
FROM pp_users pu
WHERE LOWER(u.email) = LOWER(pu.email);

-- ============================================
-- 9. CREATE VIEWS FOR UNIFIED DATA ACCESS
-- ============================================

-- Create a view for complete contact information
CREATE OR REPLACE VIEW v_contacts_full AS
SELECT 
    c.*,
    COALESCE(c.phone_mobile, c.phone_home, c.phone_work) as primary_phone,
    CASE 
        WHEN c.pp_id IS NOT NULL THEN 'synced'
        ELSE 'local'
    END as data_source
FROM contacts c;

-- Create a view for exchange with all related data
CREATE OR REPLACE VIEW v_exchanges_full AS
SELECT 
    e.*,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
    COUNT(DISTINCT i.id) as invoice_count,
    SUM(i.total) as total_invoiced,
    SUM(i.total_outstanding) as total_outstanding,
    COUNT(DISTINCT exp.id) as expense_count,
    SUM(exp.amount) as total_expenses
FROM exchanges e
LEFT JOIN tasks t ON t.exchange_id = e.id
LEFT JOIN invoices i ON i.exchange_id = e.id
LEFT JOIN expenses exp ON exp.exchange_id = e.id
GROUP BY e.id;

-- ============================================
-- 10. DROP OLD PP TABLES (AFTER VERIFICATION)
-- ============================================
-- IMPORTANT: Only run this after verifying data migration
-- DROP TABLE IF EXISTS pp_contacts CASCADE;
-- DROP TABLE IF EXISTS pp_tasks CASCADE;
-- DROP TABLE IF EXISTS pp_invoices CASCADE;
-- DROP TABLE IF EXISTS pp_expenses CASCADE;
-- DROP TABLE IF EXISTS pp_users CASCADE;
-- DROP TABLE IF EXISTS pp_notes CASCADE;
-- DROP TABLE IF EXISTS pp_matters CASCADE;