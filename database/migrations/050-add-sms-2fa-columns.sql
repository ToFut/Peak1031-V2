-- Add SMS 2FA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_fa_type VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS two_fa_expires_at TIMESTAMP DEFAULT NULL;

-- Add index for 2FA type
CREATE INDEX IF NOT EXISTS idx_users_two_fa_type ON users(two_fa_type);

-- Add index for 2FA expiration
CREATE INDEX IF NOT EXISTS idx_users_two_fa_expires ON users(two_fa_expires_at);

-- Update existing users to have 'totp' as default 2FA type if they have 2FA enabled
UPDATE users 
SET two_fa_type = 'totp' 
WHERE two_fa_enabled = true AND two_fa_type IS NULL;
