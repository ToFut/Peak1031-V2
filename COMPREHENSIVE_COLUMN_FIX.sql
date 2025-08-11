-- ================================================================
-- COMPREHENSIVE COLUMN FIX - Add all missing columns
-- Run this in Supabase SQL Editor to fix all column issues
-- ================================================================

-- Fix USERS table - add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_middle_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Fix CONTACTS table - add missing columns
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type TEXT[] DEFAULT ARRAY['client'];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Fix EXCHANGES table - add missing columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS assigned_users JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Fix TASKS table - add missing columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_users JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_contacts JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Fix INVOICES table - add missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Fix EXPENSES table - add missing columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

SELECT 'SUCCESS: All missing columns added to all tables!' as result;