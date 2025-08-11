-- ================================================================
-- ADD ALL MISSING ENTITY COLUMNS - For exchanges, tasks, invoices, expenses
-- Run this in Supabase SQL Editor
-- ================================================================

-- EXCHANGES table - Add missing columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notes TEXT;

-- TASKS table - Add missing columns  
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_users JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_contacts JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_task_id VARCHAR(50) UNIQUE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_account_ref JSONB DEFAULT '{}';

-- INVOICES table - Add missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pp_invoice_id VARCHAR(50) UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pp_account_ref JSONB DEFAULT '{}';

-- EXPENSES table - Add missing columns  
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS pp_expense_id VARCHAR(50) UNIQUE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS pp_account_ref JSONB DEFAULT '{}';

SELECT 'SUCCESS: All missing entity columns added!' as result;