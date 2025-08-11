-- Migration to update all foreign keys from people to users table
-- Generated on 2025-08-08T19:36:14.767Z
-- This eliminates the need for the people table

BEGIN;

-- 1. Drop existing foreign key constraints
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_created_by_fkey;
ALTER TABLE generated_documents DROP CONSTRAINT IF EXISTS generated_documents_generated_by_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE exchange_participants DROP CONSTRAINT IF EXISTS exchange_participants_user_id_fkey;
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;

-- 2. Add new foreign key constraints to users table
ALTER TABLE documents ADD CONSTRAINT documents_uploaded_by_users_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE document_templates ADD CONSTRAINT document_templates_created_by_users_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_generated_by_users_fkey 
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_users_fkey 
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_users_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_users_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE exchange_participants ADD CONSTRAINT exchange_participants_user_id_users_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE invitations ADD CONSTRAINT invitations_invited_by_users_fkey 
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;

-- Verification query
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name IN ('people', 'users')
ORDER BY tc.table_name, kcu.column_name;
