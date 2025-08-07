-- Clean Migration: Add PP fields and create new tables
-- This version doesn't try to migrate from pp_ tables since they don't exist

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

CREATE INDEX IF NOT EXISTS idx_invoices_exchange_id ON invoices(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

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

CREATE INDEX IF NOT EXISTS idx_expenses_exchange_id ON expenses(exchange_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_invoice_id ON expenses(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_billable ON expenses(is_billable);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

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

CREATE INDEX IF NOT EXISTS idx_notes_exchange_id ON notes(exchange_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_private ON notes(is_private);

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
-- 8. CREATE VIEWS FOR UNIFIED DATA ACCESS
-- ============================================

-- Create a view for complete contact information
CREATE OR REPLACE VIEW v_contacts_full AS
SELECT 
    c.*,
    COALESCE(c.phone_mobile, c.phone_home, c.phone_work, c.phone) as primary_phone,
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
    COALESCE(SUM(i.total), 0) as total_invoiced,
    COALESCE(SUM(i.total_outstanding), 0) as total_outstanding,
    COUNT(DISTINCT exp.id) as expense_count,
    COALESCE(SUM(exp.amount), 0) as total_expenses
FROM exchanges e
LEFT JOIN tasks t ON t.exchange_id = e.id
LEFT JOIN invoices i ON i.exchange_id = e.id
LEFT JOIN expenses exp ON exp.exchange_id = e.id
GROUP BY e.id;

-- ============================================
-- 9. GRANT PERMISSIONS (for Supabase)
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON notes TO authenticated;

-- Grant permissions to service role
GRANT ALL ON invoices TO service_role;
GRANT ALL ON expenses TO service_role;
GRANT ALL ON notes TO service_role;

-- Enable RLS on new tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust based on your needs)
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view non-private notes" ON notes
    FOR SELECT USING (is_private = false OR auth.uid()::text = user_id::text);

-- Admin can do everything
CREATE POLICY "Service role has full access to invoices" ON invoices
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to expenses" ON expenses
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to notes" ON notes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 10. SUCCESS MESSAGE
-- ============================================
-- Migration complete! Your database now has:
-- ✅ Enhanced contacts table with PP phone fields
-- ✅ Enhanced tasks table with PP assignments
-- ✅ Enhanced exchanges table with PP matter fields
-- ✅ New invoices table for financial data
-- ✅ New expenses table for expense tracking
-- ✅ New notes table for notes and comments
-- ✅ Views for unified data access
-- ✅ Proper indexes and permissions