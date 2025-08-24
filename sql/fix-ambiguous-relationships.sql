-- Fix ambiguous relationships between exchanges and contacts
-- This script establishes clear foreign key relationships

-- 1. First, let's check what relationships currently exist
-- (This will be run manually to diagnose the issue)

-- 2. Create clear foreign key constraints for the primary relationships

-- Add foreign key constraint for exchanges.client_id -> contacts.id
ALTER TABLE exchanges 
ADD CONSTRAINT fk_exchanges_client_id 
FOREIGN KEY (client_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- Add foreign key constraint for exchanges.primary_client_id -> contacts.id  
ALTER TABLE exchanges 
ADD CONSTRAINT fk_exchanges_primary_client_id 
FOREIGN KEY (primary_client_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- Add foreign key constraint for contacts.primary_exchange_id -> exchanges.id
ALTER TABLE contacts 
ADD CONSTRAINT fk_contacts_primary_exchange_id 
FOREIGN KEY (primary_exchange_id) REFERENCES exchanges(id) ON DELETE SET NULL;

-- 3. Create a junction table for many-to-many relationships
CREATE TABLE IF NOT EXISTS exchange_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'participant', -- 'client', 'coordinator', 'participant', etc.
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_id, contact_id, relationship_type)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_exchange_id ON exchange_contacts(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_contact_id ON exchange_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_relationship ON exchange_contacts(relationship_type);

-- 5. Add RLS policies for the new table
ALTER TABLE exchange_contacts ENABLE ROW LEVEL SECURITY;

-- Policy for users to see exchange_contacts for exchanges they have access to
CREATE POLICY "Users can view exchange_contacts for accessible exchanges" ON exchange_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN exchange_participants ep ON e.id = ep.exchange_id
            WHERE e.id = exchange_contacts.exchange_id
            AND ep.user_id = auth.uid()
        )
    );

-- 6. Create a view for easier querying
CREATE OR REPLACE VIEW exchange_relationships AS
SELECT 
    e.id as exchange_id,
    e.name as exchange_name,
    c.id as contact_id,
    c.first_name,
    c.last_name,
    c.email,
    ec.relationship_type,
    ec.is_primary,
    CASE 
        WHEN ec.relationship_type = 'client' THEN 'Client'
        WHEN ec.relationship_type = 'coordinator' THEN 'Coordinator'
        WHEN ec.relationship_type = 'participant' THEN 'Participant'
        ELSE ec.relationship_type
    END as role_display
FROM exchanges e
LEFT JOIN exchange_contacts ec ON e.id = ec.exchange_id
LEFT JOIN contacts c ON ec.contact_id = c.id
WHERE e.is_active = true;

-- 7. Grant permissions
GRANT SELECT ON exchange_relationships TO authenticated;
GRANT ALL ON exchange_contacts TO authenticated;

-- 8. Create a function to get exchanges with clear relationships
CREATE OR REPLACE FUNCTION get_exchanges_with_relationships(user_id UUID)
RETURNS TABLE (
    exchange_id UUID,
    exchange_name TEXT,
    client_id UUID,
    client_name TEXT,
    coordinator_id UUID,
    coordinator_name TEXT,
    status TEXT,
    priority TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        client_contact.id as client_id,
        CONCAT(client_contact.first_name, ' ', client_contact.last_name) as client_name,
        coordinator_user.id as coordinator_id,
        CONCAT(coordinator_user.first_name, ' ', coordinator_user.last_name) as coordinator_name,
        e.status,
        e.priority,
        e.created_at
    FROM exchanges e
    LEFT JOIN contacts client_contact ON e.client_id = client_contact.id
    LEFT JOIN users coordinator_user ON e.coordinator_id = coordinator_user.id
    WHERE e.is_active = true
    AND (
        -- User is admin
        EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.role = 'admin')
        OR
        -- User is coordinator of this exchange
        e.coordinator_id = user_id
        OR
        -- User is participant in this exchange
        EXISTS (
            SELECT 1 FROM exchange_participants ep 
            WHERE ep.exchange_id = e.id AND ep.user_id = user_id
        )
    )
    ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_exchanges_with_relationships(UUID) TO authenticated;























