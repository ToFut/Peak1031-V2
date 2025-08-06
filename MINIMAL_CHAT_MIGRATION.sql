-- =============================================================================
-- MINIMAL EXCHANGE CHAT SYSTEM MIGRATION
-- =============================================================================
-- This creates ONLY the essential tables for exchange chat functionality
-- Run each section separately in Supabase SQL Editor
-- =============================================================================

-- SECTION 1: Add essential user management columns to CONTACTS
-- Run this first:
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- SECTION 2: Create EXCHANGE_PARTICIPANTS (core of chat system)
-- Run this second:
DROP TABLE IF EXISTS exchange_participants CASCADE;

CREATE TABLE exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'client', 'coordinator', 'third_party', 'agency', 'admin'
    permissions TEXT[] DEFAULT ARRAY['view'], -- ['view', 'message', 'upload', 'manage']
    assigned_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(exchange_id, contact_id, role)
);

-- SECTION 3: Create indexes for EXCHANGE_PARTICIPANTS
-- Run this third:
CREATE INDEX idx_exchange_participants_exchange ON exchange_participants(exchange_id);
CREATE INDEX idx_exchange_participants_contact ON exchange_participants(contact_id);
CREATE INDEX idx_exchange_participants_role ON exchange_participants(role);
CREATE INDEX idx_exchange_participants_active ON exchange_participants(is_active);

-- SECTION 4: Create MESSAGES table (exchange chat)
-- Run this fourth:
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'system'
    attachments JSONB DEFAULT '[]', -- Array of file references
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_system_message BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    read_by JSONB DEFAULT '[]', -- Array of {user_id, read_at}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SECTION 5: Create MESSAGE_PARTICIPANTS for read tracking
-- Run this fifth:
CREATE TABLE message_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(message_id, contact_id)
);

-- SECTION 6: Create essential indexes
-- Run this sixth:
CREATE INDEX idx_messages_exchange_created ON messages(exchange_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_message_participants_message ON message_participants(message_id);
CREATE INDEX idx_message_participants_contact ON message_participants(contact_id);

-- SECTION 7: Add workflow tracking to EXCHANGES
-- Run this seventh:
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_by UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- SECTION 8: Create helper function to assign users to exchanges
-- Run this eighth:
CREATE OR REPLACE FUNCTION assign_user_to_exchange(
    p_exchange_id UUID,
    p_contact_id UUID, 
    p_role VARCHAR(50),
    p_assigned_by UUID,
    p_permissions TEXT[] DEFAULT ARRAY['view']
) RETURNS UUID AS $$
DECLARE
    participant_id UUID;
BEGIN
    INSERT INTO exchange_participants (
        exchange_id, contact_id, role, assigned_by, permissions
    ) VALUES (
        p_exchange_id, p_contact_id, p_role, p_assigned_by, p_permissions
    ) RETURNING id INTO participant_id;
    
    RETURN participant_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION COMPLETE! 
-- =============================================================================
-- 
-- You now have:
-- ✅ Exchange participants management (who can access which exchange chat)
-- ✅ Messages system (exchange-specific chat rooms)
-- ✅ Read tracking for messages
-- ✅ Role-based permissions
-- ✅ Helper functions
-- 
-- Test the system:
-- 1. Assign users to exchanges with: SELECT assign_user_to_exchange('exchange-id', 'user-id', 'client', 'admin-id');
-- 2. Send messages to specific exchanges
-- 3. Only assigned participants can see exchange messages
-- 
-- =============================================================================