-- Create invitations table for managing exchange invitations
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'third_party', 'agency', 'coordinator')),
    invited_by UUID NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    custom_message TEXT,
    user_id UUID REFERENCES users(id), -- Set when invitation is accepted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_invitations_token ON invitations(invitation_token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_exchange_id ON invitations(exchange_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function
CREATE TRIGGER trigger_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_invitations_updated_at();

-- Create function to automatically mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired'
    WHERE status = 'pending' 
      AND expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- Add RLS (Row Level Security) policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy for users to see invitations they sent
CREATE POLICY "Users can view invitations they sent" ON invitations
    FOR SELECT USING (auth.uid() = invited_by);

-- Policy for admins to see all invitations
CREATE POLICY "Admins can view all invitations" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for coordinators to see invitations for their exchanges
CREATE POLICY "Coordinators can view invitations for their exchanges" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN users u ON u.id = auth.uid()
            WHERE e.id = exchange_id 
            AND (e.coordinator_id = auth.uid() OR u.role = 'coordinator')
        )
    );

-- Policy for creating invitations
CREATE POLICY "Authorized users can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coordinator')
        )
    );

-- Policy for updating invitations (for acceptance)
CREATE POLICY "Users can update invitations for acceptance" ON invitations
    FOR UPDATE USING (
        status = 'pending' 
        AND expires_at > CURRENT_TIMESTAMP
    );

COMMENT ON TABLE invitations IS 'Stores exchange invitations sent to new and existing users';
COMMENT ON COLUMN invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN invitations.phone IS 'Phone number for SMS invitations (optional)';
COMMENT ON COLUMN invitations.exchange_id IS 'ID of the exchange they are being invited to';
COMMENT ON COLUMN invitations.role IS 'Role they will have in the exchange';
COMMENT ON COLUMN invitations.invited_by IS 'ID of the user who sent the invitation';
COMMENT ON COLUMN invitations.invitation_token IS 'Secure token for invitation acceptance';
COMMENT ON COLUMN invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN invitations.custom_message IS 'Optional message from the inviter';
COMMENT ON COLUMN invitations.user_id IS 'Set to the created user ID when invitation is accepted';