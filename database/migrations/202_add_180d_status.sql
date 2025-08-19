-- Migration to add 180D status to exchange_status_enum
-- This ensures the status workflow is complete: PENDING → 45D → 180D → COMPLETED

-- First, check if the type exists and what values it has
DO $$ 
BEGIN
    -- Check if '180D' value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = '180D' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'exchange_status_enum'
        )
    ) THEN
        -- Add the new enum value
        ALTER TYPE exchange_status_enum ADD VALUE '180D' AFTER '45D';
    END IF;
END $$;

-- Update any exchanges that might be using '180-Day' string to use '180D'
UPDATE exchanges 
SET status = '180D' 
WHERE status = '180-Day' OR status = 'pending_180';

-- Add comment to document the status workflow
COMMENT ON TYPE exchange_status_enum IS 'Exchange status workflow: PENDING → 45D → 180D → COMPLETED/TERMINATED';

-- Create an index for faster status queries
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);

-- Log the migration
INSERT INTO audit_logs (
    action,
    entity_type,
    details,
    created_at
) VALUES (
    'MIGRATION_APPLIED',
    'database',
    '{"migration": "202_add_180d_status.sql", "description": "Added 180D status to exchange_status_enum"}',
    NOW()
);