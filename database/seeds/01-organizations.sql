-- 01-organizations.sql
-- Seed data for organizations table

-- Clear existing data (optional - comment out if you want to preserve existing data)
-- DELETE FROM public.organizations WHERE id IN ('org-001', 'org-002', 'org-003');

-- Insert organizations
INSERT INTO public.organizations (id, name, type, is_active, settings, created_at, updated_at) VALUES
-- Main agency organization
('11111111-1111-1111-1111-111111111111', 'Peak 1031 Exchange Services', 'agency', true, 
  '{"features": {"practice_panther_integration": true, "document_management": true, "automated_notifications": true, "client_portal": true}, "branding": {"primary_color": "#1a73e8", "logo_url": "/assets/logo.png"}, "preferences": {"timezone": "America/Chicago", "business_hours": {"start": "08:00", "end": "18:00"}}}', 
  '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),

-- Partner law firm
('22222222-2222-2222-2222-222222222222', 'Johnson & Associates Law Firm', 'partner', true, 
  '{"features": {"document_sharing": true, "secure_messaging": true}, "preferences": {"notification_email": "admin@johnsonlaw.com", "timezone": "America/New_York"}}', 
  '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),

-- Partner real estate company
('33333333-3333-3333-3333-333333333333', 'Premier Realty Group', 'partner', true, 
  '{"features": {"exchange_tracking": true, "client_referrals": true}, "preferences": {"notification_email": "exchanges@premierrealty.com", "timezone": "America/Los_Angeles"}}', 
  '2024-02-01T09:00:00Z', '2024-02-01T09:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active,
  settings = EXCLUDED.settings,
  updated_at = NOW();