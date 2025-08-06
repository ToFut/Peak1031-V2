-- =============================================================================
-- STEP-BY-STEP MIGRATION - Run each section separately to identify issues
-- =============================================================================

-- STEP 1: Enhance CONTACTS table (safe - just adding columns)
-- Run this first:
/*
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
*/

-- STEP 2: Create USER_SESSIONS table (safe - new table)
-- Run this second:
/*
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
*/

-- STEP 3: Recreate EXCHANGE_PARTICIPANTS table (potential issue source)  
-- Run this third:
/*
DROP TABLE IF EXISTS exchange_participants CASCADE;

CREATE TABLE exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['view'],
    assigned_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(exchange_id, contact_id, role)
);
*/

-- STEP 4: Create indexes for EXCHANGE_PARTICIPANTS
-- Run this fourth:
/*
CREATE INDEX IF NOT EXISTS idx_exchange_participants_exchange ON exchange_participants(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_contact ON exchange_participants(contact_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_role ON exchange_participants(role);
*/

-- STEP 5: Enhance EXCHANGES table
-- Run this fifth:
/*
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_by UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
*/

-- STEP 6: Recreate MESSAGES table  
-- Run this sixth:
/*
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_system_message BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    read_by JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
*/

-- STEP 7: Create MESSAGE_PARTICIPANTS table
-- Run this seventh:
/*
CREATE TABLE message_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(message_id, contact_id)
);
*/

-- STEP 8: Create basic indexes
-- Run this eighth:
/*
CREATE INDEX idx_messages_exchange_created ON messages(exchange_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_message_participants_message ON message_participants(message_id);
CREATE INDEX idx_message_participants_contact ON message_participants(contact_id);
*/