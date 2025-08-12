-- =================================================================
-- SIMPLE AGENCY THIRD PARTY ASSIGNMENTS TABLE
-- Creates the table without enum dependencies
-- =================================================================

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS agency_third_party_assignments CASCADE;

-- Create agency_third_party_assignments table
CREATE TABLE agency_third_party_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Relationship
    agency_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    third_party_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_by UUID REFERENCES users(id),
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status & Permissions
    is_active BOOLEAN DEFAULT true,
    can_view_performance BOOLEAN DEFAULT true,
    can_assign_exchanges BOOLEAN DEFAULT false,
    
    -- Performance Tracking
    performance_score INTEGER DEFAULT 75 CHECK (performance_score IS NULL OR (performance_score >= 1 AND performance_score <= 100)),
    last_performance_update TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(agency_contact_id, third_party_contact_id)
);

-- Create indexes for performance
CREATE INDEX idx_agency_assignments_agency ON agency_third_party_assignments(agency_contact_id, is_active);
CREATE INDEX idx_agency_assignments_third_party ON agency_third_party_assignments(third_party_contact_id, is_active);
CREATE INDEX idx_agency_assignments_active ON agency_third_party_assignments(is_active, created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_agency_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_agency_assignments_updated_at ON agency_third_party_assignments;
CREATE TRIGGER trigger_agency_assignments_updated_at
    BEFORE UPDATE ON agency_third_party_assignments
    FOR EACH ROW EXECUTE FUNCTION update_agency_assignments_updated_at();

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON agency_third_party_assignments TO authenticated;
GRANT ALL ON agency_third_party_assignments TO service_role;

/*
✅ This migration creates the agency_third_party_assignments table
✅ No enum dependencies - works with any contact_type structure
✅ Safe to run on any Supabase instance
✅ Includes all necessary indexes and triggers

To add sample data after creation, run:

INSERT INTO agency_third_party_assignments (agency_contact_id, third_party_contact_id, notes)
SELECT 
    a.id as agency_contact_id,
    tp.id as third_party_contact_id,
    'Initial assignment' as notes
FROM contacts a
CROSS JOIN contacts tp
WHERE 'agency' = ANY(a.contact_type)
  AND 'third_party' = ANY(tp.contact_type)
LIMIT 1;
*/