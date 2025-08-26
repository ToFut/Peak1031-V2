-- Insert coordinator user
-- Password: coordinator123 (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'coordinator@peak1031.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.Oi',
    'Exchange',
    'Coordinator',
    'coordinator',
    true,
    true
) ON CONFLICT (email) DO NOTHING;































