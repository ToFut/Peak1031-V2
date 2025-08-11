-- ================================================================
-- ADD ACTUAL PP FIELDS - Using real PracticePanther field names
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add actual PP fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Add actual PP fields to contacts table  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '[]';

-- Add actual PP fields to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS number INTEGER;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rate VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS open_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS close_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '[]';

-- Add actual PP fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '[]';

-- Add actual PP fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items_time_entries JSONB DEFAULT '[]';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items_expenses JSONB DEFAULT '[]';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items_flat_fees JSONB DEFAULT '[]';

-- Add actual PP fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS price DECIMAL(12,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS private_notes TEXT;

SELECT 'SUCCESS: All actual PP field names added to database tables!' as result;