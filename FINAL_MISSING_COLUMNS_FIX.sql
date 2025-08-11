-- ================================================================
-- FINAL MISSING COLUMNS FIX - Add ALL remaining missing columns
-- Run this in Supabase SQL Editor
-- ================================================================

-- TASKS table - Add missing notes column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- INVOICES table - Add missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;

-- EXPENSES table - Add missing columns  
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE;

-- Add any other potentially missing columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_id VARCHAR(50) UNIQUE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'service';

SELECT 'SUCCESS: All final missing columns added for remaining entities!' as result;