-- Peak 1031 Exchange Management System
-- Enterprise Seed Data for Development and Testing
-- Version: 1.0.1
-- Created: 2025-07-30

-- ==============================================
-- SEED DATA FOR DEVELOPMENT AND TESTING
-- ==============================================

-- Sample users (these will be created via Supabase Auth in real usage)
-- We're creating user profiles that would correspond to auth.users
INSERT INTO public.users (id, organization_id, email, first_name, last_name, role, phone, preferences, is_active) VALUES
-- Admin user
('00000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@peak1031.com', 'System', 'Administrator', 'admin', '+1-555-0001', '{"notifications": {"email": true, "sms": true, "push": true}, "dashboard": {"show_all_exchanges": true}}'::jsonb, true),

-- Coordinators
('00000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ariel@peak1031.com', 'Ariel', 'Messian', 'coordinator', '+1-555-0002', '{"notifications": {"email": true, "sms": false, "push": true}}'::jsonb, true),
('00000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sarah@peak1031.com', 'Sarah', 'Johnson', 'coordinator', '+1-555-0003', '{"notifications": {"email": true, "sms": true, "push": true}}'::jsonb, true),

-- Clients
('00000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'djamshid@example.com', 'Djamshid', 'Younessi', 'client', '+1-555-0004', '{"notifications": {"email": true, "sms": false, "push": false}}'::jsonb, true),
('00000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'mark@example.com', 'Mark', 'Franklin', 'client', '+1-555-0005', '{"notifications": {"email": true, "sms": true, "push": false}}'::jsonb, true),

-- Third party users
('00000000-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'attorney@lawfirm.com', 'Michael', 'Roberts', 'third_party', '+1-555-0006', '{"notifications": {"email": true, "sms": false, "push": false}}'::jsonb, true),
('00000000-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cpa@accounting.com', 'Lisa', 'Chen', 'third_party', '+1-555-0007', '{"notifications": {"email": true, "sms": false, "push": false}}'::jsonb, true)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample contacts (from PracticePanther sync)
INSERT INTO public.contacts (id, organization_id, practicepanther_id, first_name, last_name, email, phone, company, contact_type, address_street, address_city, address_state, address_zip, source, tags, preferred_contact_method, is_primary, notes, custom_fields, is_active) VALUES

-- Primary client contacts
('10000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '593c368c-5928-4f6e-86d4-ff8571471c45', 'Djamshid', 'Younessi', 'dyounessi@example.com', '+1-310-555-0101', 'Younessi Investments LLC', 'Client', '1112 North Olive Drive #2', 'West Hollywood', 'CA', '90069', 'Referral', '["VIP", "High Value"]'::jsonb, 'Email', true, 'Long-term client with multiple exchanges', '{"pp_matter_count": 11, "total_exchange_value": 15000000}'::jsonb, true),

('10000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '71b0cb78-2499-4701-a083-5ccb8b7f0666', 'Mark', 'Franklin', 'mark.franklin@example.com', '+1-213-555-0102', 'Franklin Capital Group', 'Client', '6767 Sunset Plaza', 'Los Angeles', 'CA', '90028', 'Website', '["Commercial", "Repeat Client"]'::jsonb, 'Phone', true, 'Commercial real estate investor', '{"pp_matter_count": 5, "total_exchange_value": 8500000}'::jsonb, true),

('10000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '8a1b2c3d-4e5f-6789-abcd-ef0123456789', 'Ken', 'Cyr', 'ken.cyr@example.com', '+1-949-555-0103', 'Cyr Properties', 'Client', '714 Ocampo Drive', 'Pacific Palisades', 'CA', '90272', 'Referral', '["Residential", "Premium"]'::jsonb, 'Email', true, 'Residential property investor', '{"pp_matter_count": 3, "total_exchange_value": 4200000}'::jsonb, true),

-- Professional contacts
('10000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Michael', 'Roberts', 'mroberts@lawfirm.com', '+1-213-555-0201', 'Roberts & Associates Law', 'Attorney', '350 South Grand Avenue Suite 3400', 'Los Angeles', 'CA', '90071', 'Other', '["Tax Law", "1031 Specialist"]'::jsonb, 'Email', false, 'Specialized in 1031 exchange tax law', '{"bar_number": "123456", "specializations": ["Tax Law", "Real Estate"]}'::jsonb, true),

('10000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Lisa', 'Chen', 'lchen@cpafirm.com', '+1-213-555-0202', 'Chen & Partners CPA', 'CPA', '633 West 5th Street Suite 2600', 'Los Angeles', 'CA', '90071', 'Other', '["CPA", "Tax Planning"]'::jsonb, 'Email', false, 'CPA specializing in real estate taxation', '{"cpa_license": "CPA123456", "specializations": ["Real Estate Tax", "1031 Exchanges"]}'::jsonb, true),

('10000000-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Jennifer', 'Walsh', 'jwalsh@escrow123.com', '+1-310-555-0203', 'Premier Escrow Services', 'Escrow Officer', '9100 Wilshire Boulevard Suite 725', 'Beverly Hills', 'CA', '90212', 'Other', '["Escrow", "1031 Expert"]'::jsonb, 'Phone', false, 'Senior escrow officer with 1031 expertise', '{"license_number": "ESC789", "years_experience": 15}'::jsonb, true),

('10000000-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Robert', 'Martinez', 'rmartinez@titleco.com', '+1-310-555-0204', 'First American Title', 'Title Company', '1 First American Way', 'Santa Ana', 'CA', '92707', 'Other', '["Title Insurance", "Commercial"]'::jsonb, 'Email', false, 'Commercial title officer', '{"license_number": "TITLE456", "branch": "Beverly Hills"}'::jsonb, true)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample exchanges with realistic 1031 data
INSERT INTO exchange.exchanges (id, organization_id, practicepanther_matter_id, matter_number, exchange_name, client_id, coordinator_id, exchange_type, status, relinquished_property_address, relinquished_property_value, relinquished_sale_price, relinquished_closing_date, relinquished_escrow_number, relinquished_apn, replacement_property_address, replacement_property_value, replacement_purchase_price, replacement_identification_deadline, replacement_closing_deadline, exchange_proceeds, boot_received, boot_paid, exchange_coordinator_name, attorney_or_cpa, qualified_intermediary, escrow_officer, title_company, bank_account_escrow, wire_instructions, documents, custom_fields, tags, notes, pp_custom_fields, pp_created_at, pp_updated_at, is_active) VALUES

-- Active exchange for Younessi
('20000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '33bccad5-e99a-42ef-8194-da5730f3981f', 2087, 'Younessi - 18555 Collins Street #C5', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'DELAYED', 'active', '18555 Collins Street #C5', 769000.00, 739000.00, '2025-06-15', '25-1234567', '5554-026-138', '12345 Sunset Boulevard', 850000.00, 820000.00, '2025-07-30', '2025-12-11', 709135.89, 0.00, 81000.00, 'Peak 1031 Exchange', 'Michael Roberts - Roberts & Associates', 'Peak 1031 Exchange', 'Jennifer Walsh - Premier Escrow', 'First American Title', 'Peak Exchange Escrow Account #12345', '{"bank_name": "Wells Fargo", "routing": "121000248", "account": "1234567890", "wire_instructions": "For credit to Peak 1031 Exchange Trust Account"}'::jsonb, '[]'::jsonb, '{"pp_type": "DELAYED", "pp_status": "Open", "client_vesting": "Younessi Family Trust"}'::jsonb, '["Active", "High Priority", "Commercial"]'::jsonb, 'Active delayed exchange. Identified replacement property. Closing scheduled.', '{"Type of Exchange": "DELAYED", "Client Vesting": "Younessi Family Trust", "Rel Value": 769000, "Proceeds": 709135.89, "Close of Escrow Date": "2025-06-15T07:00:00", "Day 45": "2025-07-30T07:00:00"}'::jsonb, '2024-05-01T10:00:00Z', '2025-07-29T15:30:00Z', true),

-- Completed exchange for Franklin
('20000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '44cddbe6-0fab-53fg-9305-ea6641f4092g', 2088, 'Franklin - 6767 Sunset Plaza', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'DELAYED', 'completed', '6767 Sunset Plaza', 1200000.00, 1150000.00, '2025-03-20', '25-2345678', '5555-027-250', '8901 Wilshire Boulevard Suite 100', 1300000.00, 1275000.00, '2025-05-04', '2025-09-16', 1125000.00, 0.00, 125000.00, 'Peak 1031 Exchange', 'Lisa Chen - Chen & Partners CPA', 'Peak 1031 Exchange', 'Jennifer Walsh - Premier Escrow', 'First American Title', 'Peak Exchange Escrow Account #12346', '{"bank_name": "Wells Fargo", "routing": "121000248", "account": "1234567891"}'::jsonb, '[]'::jsonb, '{"pp_type": "DELAYED", "pp_status": "Closed", "client_vesting": "Franklin Capital Group LLC"}'::jsonb, '["Completed", "Commercial", "Success"]'::jsonb, 'Successfully completed delayed exchange. All deadlines met. Client satisfied.', '{"Type of Exchange": "DELAYED", "Client Vesting": "Franklin Capital Group LLC", "Rel Value": 1200000, "Proceeds": 1125000, "Close of Escrow Date": "2025-03-20T07:00:00", "Day 45": "2025-05-04T07:00:00", "Day 180": "2025-09-16T07:00:00"}'::jsonb, '2024-02-15T09:00:00Z', '2025-07-15T12:00:00Z', true),

-- Pending exchange for Cyr
('20000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '55deecf7-1gbc-64gh-a416-fb7752g5103h', 2089, 'Cyr - 714 Ocampo Drive Residential', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'DELAYED', 'pending_45_day', '714 Ocampo Drive', 950000.00, 925000.00, '2025-07-01', '25-3456789', '5556-028-361', NULL, NULL, NULL, '2025-08-15', '2025-12-28', 895000.00, 0.00, 30000.00, 'Peak 1031 Exchange', 'Michael Roberts - Roberts & Associates', 'Peak 1031 Exchange', 'Jennifer Walsh - Premier Escrow', 'First American Title', 'Peak Exchange Escrow Account #12347', '{"bank_name": "Wells Fargo", "routing": "121000248", "account": "1234567892"}'::jsonb, '[]'::jsonb, '{"pp_type": "DELAYED", "pp_status": "Open", "client_vesting": "Cyr Properties Inc."}'::jsonb, '["Pending", "Residential", "45-Day Deadline"]'::jsonb, 'Need to identify replacement property within 45-day window. Actively searching.', '{"Type of Exchange": "DELAYED", "Client Vesting": "Cyr Properties Inc.", "Rel Value": 950000, "Proceeds": 895000, "Close of Escrow Date": "2025-07-01T07:00:00", "Day 45": "2025-08-15T07:00:00"}'::jsonb, '2024-06-01T11:00:00Z', '2025-07-28T16:45:00Z', true)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Exchange participants
INSERT INTO exchange.exchange_participants (id, exchange_id, user_id, contact_id, role, permissions, added_by) VALUES
-- Exchange 1 participants
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', NULL, 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb, '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', NULL, 'client', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', NULL, '10000000-0000-0000-0000-000000000004', 'attorney', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', NULL, '10000000-0000-0000-0000-000000000006', 'escrow_officer', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000002'),

-- Exchange 2 participants
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', NULL, 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb, '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', NULL, 'client', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000003'),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', NULL, '10000000-0000-0000-0000-000000000005', 'cpa', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000003'),

-- Exchange 3 participants
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', NULL, 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb, '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', NULL, 'client', '{"view": true, "edit": false, "delete": false}'::jsonb, '00000000-0000-0000-0000-000000000002')

ON CONFLICT (id) DO UPDATE SET
    added_at = NOW();

-- Sample tasks
INSERT INTO public.tasks (id, organization_id, exchange_id, title, description, status, priority, assigned_to, assigned_by, due_date, tags, attachments, checklist, time_estimate, created_at) VALUES

-- Tasks for Exchange 1 (Active)
('40000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', 'Finalize replacement property inspection', 'Coordinate and complete property inspection for 12345 Sunset Boulevard replacement property', 'in_progress', 'high', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2025-08-05 17:00:00+00', '["Inspection", "Critical"]'::jsonb, '[]'::jsonb, '[{"item": "Schedule inspection", "completed": true}, {"item": "Review inspection report", "completed": false}, {"item": "Address any issues found", "completed": false}]'::jsonb, 180, '2025-07-25 09:00:00+00'),

('40000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', 'Prepare assignment agreement', 'Draft assignment agreement for replacement property purchase', 'pending', 'high', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', '2025-08-10 17:00:00+00', '["Legal", "Documentation"]'::jsonb, '[]'::jsonb, '[{"item": "Draft initial agreement", "completed": false}, {"item": "Client review", "completed": false}, {"item": "Attorney review", "completed": false}]'::jsonb, 240, '2025-07-28 14:30:00+00'),

-- Tasks for Exchange 3 (Pending 45-day)
('40000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000003', 'Identify replacement properties', 'URGENT: Find and identify suitable replacement properties within 45-day deadline', 'in_progress', 'urgent', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2025-08-15 23:59:59+00', '["45-Day Deadline", "Critical", "Property Search"]'::jsonb, '[]'::jsonb, '[{"item": "Research market options", "completed": true}, {"item": "Schedule property viewings", "completed": true}, {"item": "Prepare identification letter", "completed": false}, {"item": "Submit identification by deadline", "completed": false}]'::jsonb, 600, '2025-07-02 08:00:00+00'),

-- General administrative tasks
('40000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Weekly compliance review', 'Review all active exchanges for compliance and upcoming deadlines', 'pending', 'medium', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2025-08-02 17:00:00+00', '["Compliance", "Review", "Weekly"]'::jsonb, '[]'::jsonb, '[{"item": "Review deadline calendar", "completed": false}, {"item": "Check document completeness", "completed": false}, {"item": "Update client communications", "completed": false}]'::jsonb, 180, '2025-07-29 16:00:00+00')

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample messages
INSERT INTO public.messages (id, organization_id, exchange_id, sender_id, content, attachments, mentions, reactions, is_system_message, created_at) VALUES

-- Messages for Exchange 1
('50000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Exchange created and participants added. Beginning coordination process.', '[]'::jsonb, '{}', '{}', true, '2025-07-25 09:00:00+00'),

('50000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Thank you for setting up the exchange. Looking forward to working with the team on this transaction.', '[]'::jsonb, '{"00000000-0000-0000-0000-000000000002"}', '{}', false, '2025-07-25 14:30:00+00'),

-- Messages for Exchange 3 (urgent)
('50000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'URGENT: We have 16 days remaining for the 45-day identification deadline. Need to prioritize property identification.', '[]'::jsonb, '{"00000000-0000-0000-0000-000000000004"}', '{}', false, '2025-07-30 08:00:00+00')

ON CONFLICT (id) DO UPDATE SET
    created_at = EXCLUDED.created_at;

-- Sample documents
INSERT INTO public.documents (id, organization_id, exchange_id, uploaded_by, file_name, file_type, file_size, mime_type, storage_path, document_type, description, tags, metadata, version, is_template, access_permissions, created_at) VALUES

-- Documents for Exchange 1
('60000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Relinquished_Property_Deed.pdf', 'pdf', 245760, 'application/pdf', '/storage/exchanges/20000000-0000-0000-0000-000000000001/deeds/Relinquished_Property_Deed.pdf', 'deed', 'Grant deed for relinquished property at 18555 Collins Street #C5', '["Legal", "Deed", "Relinquished"]'::jsonb, '{"recorded_date": "2020-03-15", "recording_number": "2020-0123456"}'::jsonb, 1, false, '{"view": ["all"], "download": ["coordinator", "client", "attorney"]}'::jsonb, '2025-07-25 10:30:00+00'),

('60000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Exchange_Agreement.pdf', 'pdf', 1024000, 'application/pdf', '/storage/exchanges/20000000-0000-0000-0000-000000000001/agreements/Exchange_Agreement.pdf', 'contract', 'Section 1031 Exchange Agreement between client and qualified intermediary', '["1031", "Exchange Agreement", "QI Agreement"]'::jsonb, '{"execution_date": "2025-06-01", "intermediary": "Peak 1031 Exchange"}'::jsonb, 1, false, '{"view": ["all"], "download": ["all"]}'::jsonb, '2025-06-01 14:00:00+00')

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample notifications
INSERT INTO public.notifications (id, organization_id, user_id, type, title, message, data, related_exchange_id, related_task_id, action_url, is_read, created_at) VALUES

-- Notifications for coordinator
('70000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000002', 'deadline_approaching', '45-Day Deadline Alert - 16 days remaining', 'Exchange "Cyr - 714 Ocampo Drive Residential" has 16 days until the 45-day identification deadline.', '{"days_remaining": 16, "deadline_type": "45_day", "deadline_date": "2025-08-15"}'::jsonb, '20000000-0000-0000-0000-000000000003', NULL, '/exchanges/20000000-0000-0000-0000-000000000003', false, '2025-07-30 08:00:00+00'),

-- Notifications for client
('70000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000004', 'document_uploaded', 'New Document: Exchange Agreement', 'Your coordinator has uploaded the 1031 exchange agreement.', '{"document_type": "contract", "file_name": "Exchange_Agreement.pdf"}'::jsonb, '20000000-0000-0000-0000-000000000001', NULL, '/documents/60000000-0000-0000-0000-000000000002', false, '2025-06-01 14:30:00+00')

ON CONFLICT (id) DO UPDATE SET
    created_at = EXCLUDED.created_at;

-- OAuth tokens for PracticePanther integration
INSERT INTO sync.oauth_tokens (id, organization_id, user_id, provider, access_token, refresh_token, expires_at, scope, metadata, created_at, updated_at) VALUES
('80000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000001', 'practicepanther', 'sample_access_token_encrypted', 'sample_refresh_token_encrypted', '2025-07-31 08:00:00+00', 'read', '{"pp_user_id": "admin@peak1031.com", "last_sync": "2025-07-30T06:00:00Z"}'::jsonb, '2025-07-30 08:00:00+00', '2025-07-30 08:00:00+00')
ON CONFLICT (organization_id, provider) DO UPDATE SET
    updated_at = NOW();

-- Sync log entries
INSERT INTO sync.sync_log (id, organization_id, sync_type, entity_type, status, started_at, completed_at, records_processed, records_created, records_updated, records_failed, last_sync_timestamp, metadata) VALUES
('90000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'practicepanther', 'contacts', 'completed', '2025-07-30 06:00:00+00', '2025-07-30 06:05:00+00', 11171, 150, 11021, 0, '2025-07-30 06:05:00+00', '{"sync_duration_ms": 300000, "api_calls": 45}'::jsonb),
('90000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'practicepanther', 'matters', 'completed', '2025-07-30 06:05:00+00', '2025-07-30 06:08:00+00', 25, 3, 22, 0, '2025-07-30 06:08:00+00', '{"sync_duration_ms": 180000, "api_calls": 12}'::jsonb),
('90000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'practicepanther', 'tasks', 'completed', '2025-07-30 06:08:00+00', '2025-07-30 06:09:00+00', 8, 3, 5, 0, '2025-07-30 06:09:00+00', '{"sync_duration_ms": 60000, "api_calls": 3}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    completed_at = EXCLUDED.completed_at;

-- Sample audit logs
INSERT INTO audit.audit_logs (id, organization_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000002', 'EXCHANGE_CREATED', 'exchanges', '20000000-0000-0000-0000-000000000001', NULL, '{"exchange_name": "Younessi - 18555 Collins Street #C5", "status": "active"}'::jsonb, '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2025-07-25 09:00:00+00'),
('a0000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000002', 'TASK_CREATED', 'tasks', '40000000-0000-0000-0000-000000000001', NULL, '{"title": "Finalize replacement property inspection", "priority": "high"}'::jsonb, '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2025-07-25 09:30:00+00')
ON CONFLICT (id) DO UPDATE SET
    created_at = EXCLUDED.created_at;

-- Activity feed entries
INSERT INTO audit.activity_feed (id, organization_id, user_id, exchange_id, action, description, metadata, is_public, created_at) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'EXCHANGE_CREATED', 'Created new exchange for Younessi - 18555 Collins Street #C5', '{"exchange_type": "DELAYED", "value": 769000}'::jsonb, true, '2025-07-25 09:00:00+00'),
('b0000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'MESSAGE_SENT', 'Sent message: Thank you for setting up the exchange...', '{"message_length": 89}'::jsonb, true, '2025-07-25 14:30:00+00'),
('b0000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'DEADLINE_WARNING', 'System alert: 45-day deadline approaching for Cyr exchange', '{"days_remaining": 16, "deadline_type": "45_day"}'::jsonb, false, '2025-07-30 08:00:00+00')
ON CONFLICT (id) DO UPDATE SET
    created_at = EXCLUDED.created_at;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Peak 1031 Enterprise Seed Data loaded successfully!';
    RAISE NOTICE 'Sample data includes:';
    RAISE NOTICE '- 1 Organization (Peak 1031 Exchange)';
    RAISE NOTICE '- 7 Users (Admin, Coordinators, Clients, Third-party)';
    RAISE NOTICE '- 7 Contacts (Clients and Professionals)';
    RAISE NOTICE '- 3 Exchanges (Active, Completed, Pending)';
    RAISE NOTICE '- 9 Exchange Participants';
    RAISE NOTICE '- 4 Tasks (Various priorities and statuses)';
    RAISE NOTICE '- 3 Messages (Including urgent deadline alert)';
    RAISE NOTICE '- 2 Documents (Deeds, Contracts, Statements)';
    RAISE NOTICE '- 2 Notifications (Deadlines, Documents)';
    RAISE NOTICE '- OAuth tokens and sync logs for PracticePanther integration';
    RAISE NOTICE '- Audit logs and activity feed entries';
    RAISE NOTICE '';
    RAISE NOTICE 'Test user credentials (create via Supabase Auth):';
    RAISE NOTICE '- admin@peak1031.com (Admin)';
    RAISE NOTICE '- ariel@peak1031.com (Coordinator)';
    RAISE NOTICE '- djamshid@example.com (Client)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for development and testing!';
END $$; 