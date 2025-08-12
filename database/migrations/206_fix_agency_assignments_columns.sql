-- =================================================================
-- FIX AGENCY THIRD PARTY ASSIGNMENTS TABLE COLUMNS
-- Add missing columns if they don't exist
-- =================================================================

-- Add assignment_date column if it doesn't exist
ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure all required columns exist
ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id);

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS can_view_performance BOOLEAN DEFAULT true;

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS can_assign_exchanges BOOLEAN DEFAULT false;

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 100);

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS last_performance_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE agency_third_party_assignments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_agency_assignments_agency ON agency_third_party_assignments(agency_contact_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_assignments_third_party ON agency_third_party_assignments(third_party_contact_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_assignments_active ON agency_third_party_assignments(is_active, assignment_date);

-- Update any existing records that might have NULL assignment_date
UPDATE agency_third_party_assignments 
SET assignment_date = COALESCE(assignment_date, created_at, NOW())
WHERE assignment_date IS NULL;

/*
✅ This migration ensures all required columns exist
✅ Safe to run multiple times (uses IF NOT EXISTS)
✅ Preserves existing data
✅ Sets default values for any NULL fields
*/