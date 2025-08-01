-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (
  email,
  password_hash,
  role,
  first_name,
  last_name,
  is_active,
  two_fa_enabled
) VALUES (
  'admin@peak1031.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.sJwK.m',
  'admin',
  'Admin',
  'User',
  true,
  false
); 