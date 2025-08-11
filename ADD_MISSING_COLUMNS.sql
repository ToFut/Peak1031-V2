-- ================================================================
-- ADD MISSING COLUMNS TO FIX RELATIONSHIP ISSUES
-- Run this in Supabase SQL Editor after running PROPER_1031_SCHEMA.sql
-- ================================================================

-- Add primary_exchange_id to contacts table if it doesn't exist
-- (This handles circular reference issues during table creation)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS primary_exchange_id UUID REFERENCES exchanges(id);

-- Add any other missing columns that might cause FK issues
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS primary_client_id UUID REFERENCES contacts(id);

ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES users(id);

ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS primary_attorney_id UUID REFERENCES users(id);

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES contacts(id);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES contacts(id);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_contacts_primary_exchange ON contacts(primary_exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator ON exchanges(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_client ON exchanges(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_exchange ON tasks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoices_exchange ON invoices(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_exchange ON expenses(exchange_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);

SELECT 'SUCCESS: All missing foreign key columns added!' as result;