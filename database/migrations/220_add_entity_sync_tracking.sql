-- Migration: Add Entity Sync Tracking
-- Description: Add fields to track PP entity synchronization and exchange assignments
-- Date: 2025-09-03

-- Add sync tracking fields to exchanges table
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS entities_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS entities_sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS entities_sync_errors JSONB;

-- Add exchange assignment tracking to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS assigned_exchanges TEXT[],
ADD COLUMN IF NOT EXISTS total_exchanges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_exchange_assignment TIMESTAMP WITH TIME ZONE;

-- Add exchange assignment tracking to users table  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS assigned_exchanges TEXT[],
ADD COLUMN IF NOT EXISTS total_exchanges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_exchange_assignment TIMESTAMP WITH TIME ZONE;

-- Create entity sync logs table
CREATE TABLE IF NOT EXISTS entity_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    entities_found INTEGER,
    users_created INTEGER DEFAULT 0,
    users_updated INTEGER DEFAULT 0,
    contacts_created INTEGER DEFAULT 0,
    contacts_updated INTEGER DEFAULT 0,
    participants_added INTEGER DEFAULT 0,
    primary_links_updated INTEGER DEFAULT 0,
    sync_status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
    sync_errors JSONB,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchanges_entities_sync_status ON exchanges(entities_sync_status);
CREATE INDEX IF NOT EXISTS idx_exchanges_entities_synced_at ON exchanges(entities_synced_at);

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_exchanges ON contacts USING GIN(assigned_exchanges);
CREATE INDEX IF NOT EXISTS idx_contacts_total_exchanges ON contacts(total_exchanges);

CREATE INDEX IF NOT EXISTS idx_users_assigned_exchanges ON users USING GIN(assigned_exchanges);
CREATE INDEX IF NOT EXISTS idx_users_total_exchanges ON users(total_exchanges);

CREATE INDEX IF NOT EXISTS idx_entity_sync_logs_exchange_id ON entity_sync_logs(exchange_id);
CREATE INDEX IF NOT EXISTS idx_entity_sync_logs_sync_status ON entity_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_entity_sync_logs_started_at ON entity_sync_logs(started_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_entity_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entity_sync_logs_updated_at
    BEFORE UPDATE ON entity_sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_sync_logs_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN exchanges.entities_synced_at IS 'Timestamp of last entity sync for this exchange';
COMMENT ON COLUMN exchanges.entities_sync_status IS 'Status of entity sync: pending, syncing, completed, failed';
COMMENT ON COLUMN exchanges.entities_sync_errors IS 'JSON object containing sync error details';

COMMENT ON COLUMN contacts.assigned_exchanges IS 'Array of exchange IDs this contact is assigned to';
COMMENT ON COLUMN contacts.total_exchanges IS 'Total number of exchanges this contact is assigned to';
COMMENT ON COLUMN contacts.last_exchange_assignment IS 'Timestamp of last exchange assignment';

COMMENT ON COLUMN users.assigned_exchanges IS 'Array of exchange IDs this user is assigned to';
COMMENT ON COLUMN users.total_exchanges IS 'Total number of exchanges this user is assigned to';
COMMENT ON COLUMN users.last_exchange_assignment IS 'Timestamp of last exchange assignment';

COMMENT ON TABLE entity_sync_logs IS 'Audit log for entity synchronization operations';

-- Create view for sync statistics
CREATE OR REPLACE VIEW entity_sync_statistics AS
SELECT 
    COUNT(*) as total_exchanges,
    COUNT(CASE WHEN entities_sync_status = 'completed' THEN 1 END) as synced_exchanges,
    COUNT(CASE WHEN entities_sync_status = 'failed' THEN 1 END) as failed_syncs,
    COUNT(CASE WHEN entities_sync_status = 'pending' THEN 1 END) as pending_syncs,
    MAX(entities_synced_at) as last_sync_time,
    AVG(
        CASE 
            WHEN entities_synced_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (entities_synced_at - created_at))
            ELSE NULL 
        END
    ) as avg_sync_duration_seconds
FROM exchanges 
WHERE is_active = true;

COMMENT ON VIEW entity_sync_statistics IS 'Summary statistics for entity synchronization status';

-- Create function to get user/contact exchange assignments
CREATE OR REPLACE FUNCTION get_entity_exchange_assignments(entity_type TEXT, entity_id UUID)
RETURNS TABLE (
    exchange_id UUID,
    exchange_name TEXT,
    exchange_status TEXT,
    participant_role TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF entity_type = 'user' THEN
        RETURN QUERY
        SELECT 
            e.id as exchange_id,
            e.name as exchange_name,
            e.status as exchange_status,
            ep.role as participant_role,
            ep.created_at as assigned_at
        FROM exchanges e
        JOIN exchange_participants ep ON e.id = ep.exchange_id
        WHERE ep.user_id = entity_id 
        AND ep.is_active = true
        AND e.is_active = true
        ORDER BY ep.created_at DESC;
    ELSIF entity_type = 'contact' THEN
        RETURN QUERY
        SELECT 
            e.id as exchange_id,
            e.name as exchange_name,
            e.status as exchange_status,
            ep.role as participant_role,
            ep.created_at as assigned_at
        FROM exchanges e
        JOIN exchange_participants ep ON e.id = ep.exchange_id
        WHERE ep.contact_id = entity_id 
        AND ep.is_active = true
        AND e.is_active = true
        ORDER BY ep.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_entity_exchange_assignments(TEXT, UUID) IS 'Get all exchange assignments for a user or contact';

-- Create function to update exchange assignment arrays
CREATE OR REPLACE FUNCTION update_entity_exchange_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Update contacts table
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts 
        SET 
            assigned_exchanges = (
                SELECT array_agg(DISTINCT exchange_id)
                FROM exchange_participants 
                WHERE contact_id = NEW.contact_id 
                AND is_active = true
            ),
            total_exchanges = (
                SELECT COUNT(DISTINCT exchange_id)
                FROM exchange_participants 
                WHERE contact_id = NEW.contact_id 
                AND is_active = true
            ),
            last_exchange_assignment = NOW()
        WHERE id = NEW.contact_id;
    END IF;
    
    -- Update users table
    IF NEW.user_id IS NOT NULL THEN
        UPDATE users 
        SET 
            assigned_exchanges = (
                SELECT array_agg(DISTINCT exchange_id)
                FROM exchange_participants 
                WHERE user_id = NEW.user_id 
                AND is_active = true
            ),
            total_exchanges = (
                SELECT COUNT(DISTINCT exchange_id)
                FROM exchange_participants 
                WHERE user_id = NEW.user_id 
                AND is_active = true
            ),
            last_exchange_assignment = NOW()
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update assignment arrays
CREATE TRIGGER update_entity_assignments_on_participant_change
    AFTER INSERT OR UPDATE OR DELETE ON exchange_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_exchange_assignments();

COMMENT ON TRIGGER update_entity_assignments_on_participant_change ON exchange_participants IS 'Automatically update assigned_exchanges arrays when participants are added/removed';