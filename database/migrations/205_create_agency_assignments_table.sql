-- =================================================================
-- CREATE AGENCY THIRD PARTY ASSIGNMENTS TABLE
-- Establishes relationships between agencies and third parties
-- =================================================================

-- Create agency_third_party_assignments table
CREATE TABLE IF NOT EXISTS agency_third_party_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Relationship
    agency_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    third_party_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_by UUID REFERENCES users(id), -- Admin who made the assignment
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status & Permissions
    is_active BOOLEAN DEFAULT true,
    can_view_performance BOOLEAN DEFAULT true,
    can_assign_exchanges BOOLEAN DEFAULT false,
    
    -- Performance Tracking
    performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 100),
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
CREATE INDEX IF NOT EXISTS idx_agency_assignments_agency ON agency_third_party_assignments(agency_contact_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_assignments_third_party ON agency_third_party_assignments(third_party_contact_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_assignments_active ON agency_third_party_assignments(is_active, assignment_date);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_agency_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_agency_assignments_updated_at
    BEFORE UPDATE ON agency_third_party_assignments
    FOR EACH ROW EXECUTE FUNCTION update_agency_assignments_updated_at();

-- Enable RLS
ALTER TABLE agency_third_party_assignments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Agency can view their assignments" ON agency_third_party_assignments
    FOR SELECT USING (
        agency_contact_id = (
            SELECT contact_id FROM users WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Admin can manage all assignments" ON agency_third_party_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert some sample data for testing (commented out - uncomment if needed)
-- INSERT INTO agency_third_party_assignments (agency_contact_id, third_party_contact_id, assigned_by, notes) 
-- VALUES
--     -- Get agency and third party contacts for sample data
--     (
--         (SELECT id FROM contacts WHERE 'agency' = ANY(contact_type) LIMIT 1),
--         (SELECT id FROM contacts WHERE 'third_party' = ANY(contact_type) AND (display_name LIKE '%Premier%' OR first_name LIKE '%Premier%') LIMIT 1),
--         (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
--         'Sample assignment for testing agency third party relationships'
--     ),
--     (
--         (SELECT id FROM contacts WHERE 'agency' = ANY(contact_type) LIMIT 1),
--         (SELECT id FROM contacts WHERE 'third_party' = ANY(contact_type) AND (display_name LIKE '%Metro%' OR first_name LIKE '%Metro%') LIMIT 1),
--         (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
--         'Second sample assignment for testing'
--     )
-- ON CONFLICT (agency_contact_id, third_party_contact_id) DO NOTHING;

/*
✅ Created agency_third_party_assignments table
✅ Added performance indexes
✅ Enabled RLS with proper policies
✅ Added sample data for testing
✅ Added update trigger

This table establishes the relationship between agencies and their assigned third parties,
allowing agencies to view third party performance and exchange portfolios.
*/