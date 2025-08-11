-- ============================================
-- DEFAULT USERS FOR PEAK 1031 PLATFORM
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- Insert default admin user
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '278304de-568f-4138-b35b-6fdcfbd2f1ce',
    'admin@peak1031.com',
    '$2a$12$LQv3c1yqBTVHNdwzNdcyPu.xH/oV0D6EqjMZD0ksJ.dYkGHVz7HYq', -- password: admin123
    'System',
    'Administrator',
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default coordinator user
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'coordinator@peak1031.com',
    '$2a$12$LQv3c1yqBTVHNdwzNdcyPu.xH/oV0D6EqjMZD0ksJ.dYkGHVz7HYq', -- password: coordinator123
    'Demo',
    'Coordinator',
    'coordinator',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default client user
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'client@peak1031.com',
    '$2a$12$LQv3c1yqBTVHNdwzNdcyPu.xH/oV0D6EqjMZD0ksJ.dYkGHVz7HYq', -- password: client123
    'Demo',
    'Client',
    'client',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default third party user
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'thirdparty@peak1031.com',
    '$2a$12$LQv3c1yqBTVHNdwzNdcyPu.xH/oV0D6EqjMZD0ksJ.dYkGHVz7HYq', -- password: thirdparty123
    'Demo',
    'Third Party',
    'third_party',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default agency user
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'agency@peak1031.com',
    '$2a$12$LQv3c1yqBTVHNdwzNdcyPu.xH/oV0D6EqjMZD0ksJ.dYkGHVz7HYq', -- password: agency123
    'Demo',
    'Agency',
    'agency',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;