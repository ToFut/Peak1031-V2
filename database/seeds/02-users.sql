-- 02-users.sql
-- Seed data for users table
-- NOTE: Users must first be created in Supabase Auth before adding to this table

-- Insert user profiles (these IDs should match auth.users)
INSERT INTO public.users (id, email, display_name, first_name, last_name, role, organization_id, is_active, created_at, updated_at) VALUES
-- Admin users for Peak 1031
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@peak1031.com', 'System Admin', 'System', 'Admin', 'admin', '11111111-1111-1111-1111-111111111111', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'john.coordinator@peak1031.com', 'John Davis', 'John', 'Davis', 'coordinator', '11111111-1111-1111-1111-111111111111', true, '2024-01-02T09:00:00Z', '2024-01-02T09:00:00Z'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sarah.coordinator@peak1031.com', 'Sarah Miller', 'Sarah', 'Miller', 'coordinator', '11111111-1111-1111-1111-111111111111', true, '2024-01-02T09:30:00Z', '2024-01-02T09:30:00Z'),

-- Agency staff
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'michael.agent@peak1031.com', 'Michael Brown', 'Michael', 'Brown', 'agency', '11111111-1111-1111-1111-111111111111', true, '2024-01-03T10:00:00Z', '2024-01-03T10:00:00Z'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'lisa.agent@peak1031.com', 'Lisa Garcia', 'Lisa', 'Garcia', 'agency', '11111111-1111-1111-1111-111111111111', true, '2024-01-03T10:30:00Z', '2024-01-03T10:30:00Z'),

-- Partner law firm users
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'robert.attorney@johnsonlaw.com', 'Robert Johnson', 'Robert', 'Johnson', 'third_party', '22222222-2222-2222-2222-222222222222', true, '2024-01-15T11:00:00Z', '2024-01-15T11:00:00Z'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'emily.paralegal@johnsonlaw.com', 'Emily Chen', 'Emily', 'Chen', 'third_party', '22222222-2222-2222-2222-222222222222', true, '2024-01-15T11:30:00Z', '2024-01-15T11:30:00Z'),

-- Partner realty users
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'david.broker@premierrealty.com', 'David Thompson', 'David', 'Thompson', 'third_party', '33333333-3333-3333-3333-333333333333', true, '2024-02-01T09:00:00Z', '2024-02-01T09:00:00Z'),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'amy.agent@premierrealty.com', 'Amy Wilson', 'Amy', 'Wilson', 'third_party', '33333333-3333-3333-3333-333333333333', true, '2024-02-01T09:30:00Z', '2024-02-01T09:30:00Z'),

-- Client users (these would be created when clients sign up)
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'client1@example.com', 'James Peterson', 'James', 'Peterson', 'client', '11111111-1111-1111-1111-111111111111', true, '2024-03-01T14:00:00Z', '2024-03-01T14:00:00Z'),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'client2@example.com', 'Maria Rodriguez', 'Maria', 'Rodriguez', 'client', '11111111-1111-1111-1111-111111111111', true, '2024-03-15T15:00:00Z', '2024-03-15T15:00:00Z'),
('llllllll-llll-llll-llll-llllllllllll', 'client3@example.com', 'William Anderson', 'William', 'Anderson', 'client', '11111111-1111-1111-1111-111111111111', true, '2024-04-01T10:00:00Z', '2024-04-01T10:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create these users in Supabase Auth first with:
-- Password: TestPass123! (for all test users)
-- Then run this SQL to create their profiles