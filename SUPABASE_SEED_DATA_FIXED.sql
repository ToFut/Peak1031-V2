-- Peak 1031 Exchange Management System
-- Fixed Seed Data for Existing Schema
-- Version: 1.0.1
-- Created: 2025-07-30

-- ==============================================
-- SEED DATA FOR EXISTING SCHEMA
-- ==============================================

-- Sample users (matching existing schema)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, is_active) VALUES
-- Admin user
('00000000-0000-0000-0000-000000000001', 'admin@peak1031.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'System', 'Administrator', 'admin', '+1-555-0001', true),

-- Coordinators
('00000000-0000-0000-0000-000000000002', 'ariel@peak1031.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Ariel', 'Messian', 'coordinator', '+1-555-0002', true),
('00000000-0000-0000-0000-000000000003', 'sarah@peak1031.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Sarah', 'Johnson', 'coordinator', '+1-555-0003', true),

-- Clients
('00000000-0000-0000-0000-000000000004', 'djamshid@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Djamshid', 'Younessi', 'client', '+1-555-0004', true),
('00000000-0000-0000-0000-000000000005', 'mark@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Mark', 'Franklin', 'client', '+1-555-0005', true),

-- Third party users
('00000000-0000-0000-0000-000000000006', 'attorney@lawfirm.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Michael', 'Roberts', 'third_party', '+1-555-0006', true),
('00000000-0000-0000-0000-000000000007', 'cpa@accounting.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Lisa', 'Chen', 'third_party', '+1-555-0007', true)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample contacts (matching existing schema)
INSERT INTO contacts (id, first_name, last_name, email, phone, company, address_street, address_city, address_state, address_zip_code, pp_client_id, source, metadata) VALUES

-- Primary client contacts
('10000000-0000-0000-0000-000000000001', 'Djamshid', 'Younessi', 'dyounessi@example.com', '+1-310-555-0101', 'Younessi Investments LLC', '1112 North Olive Drive #2', 'West Hollywood', 'CA', '90069', '593c368c-5928-4f6e-86d4-ff8571471c45', 'Referral', '{"pp_matter_count": 11, "total_exchange_value": 15000000, "tags": ["VIP", "High Value"]}'::jsonb),

('10000000-0000-0000-0000-000000000002', 'Mark', 'Franklin', 'mark.franklin@example.com', '+1-213-555-0102', 'Franklin Capital Group', '6767 Sunset Plaza', 'Los Angeles', 'CA', '90028', '71b0cb78-2499-4701-a083-5ccb8b7f0666', 'Website', '{"pp_matter_count": 5, "total_exchange_value": 8500000, "tags": ["Commercial", "Repeat Client"]}'::jsonb),

('10000000-0000-0000-0000-000000000003', 'Ken', 'Cyr', 'ken.cyr@example.com', '+1-949-555-0103', 'Cyr Properties', '714 Ocampo Drive', 'Pacific Palisades', 'CA', '90272', '8a1b2c3d-4e5f-6789-abcd-ef0123456789', 'Referral', '{"pp_matter_count": 3, "total_exchange_value": 4200000, "tags": ["Residential", "Premium"]}'::jsonb),

-- Professional contacts
('10000000-0000-0000-0000-000000000004', 'Michael', 'Roberts', 'mroberts@lawfirm.com', '+1-213-555-0201', 'Roberts & Associates Law', '350 South Grand Avenue Suite 3400', 'Los Angeles', 'CA', '90071', NULL, 'Other', '{"bar_number": "123456", "specializations": ["Tax Law", "Real Estate"], "tags": ["Tax Law", "1031 Specialist"]}'::jsonb),

('10000000-0000-0000-0000-000000000005', 'Lisa', 'Chen', 'lchen@cpafirm.com', '+1-213-555-0202', 'Chen & Partners CPA', '633 West 5th Street Suite 2600', 'Los Angeles', 'CA', '90071', NULL, 'Other', '{"cpa_license": "CPA123456", "specializations": ["Real Estate Tax", "1031 Exchanges"], "tags": ["CPA", "Tax Planning"]}'::jsonb),

('10000000-0000-0000-0000-000000000006', 'Jennifer', 'Walsh', 'jwalsh@escrow123.com', '+1-310-555-0203', 'Premier Escrow Services', '9100 Wilshire Boulevard Suite 725', 'Beverly Hills', 'CA', '90212', NULL, 'Other', '{"license_number": "ESC789", "years_experience": 15, "tags": ["Escrow", "1031 Expert"]}'::jsonb),

('10000000-0000-0000-0000-000000000007', 'Robert', 'Martinez', 'rmartinez@titleco.com', '+1-310-555-0204', 'First American Title', '1 First American Way', 'Santa Ana', 'CA', '92707', NULL, 'Other', '{"license_number": "TITLE456", "branch": "Beverly Hills", "tags": ["Title Insurance", "Commercial"]}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample exchanges (matching existing schema)
INSERT INTO exchanges (id, pp_matter_id, name, status, client_id, coordinator_id, start_date, completion_date, pp_data, metadata) VALUES

-- Active exchange for Younessi
('20000000-0000-0000-0000-000000000001', '33bccad5-e99a-42ef-8194-da5730f3981f', 'Younessi - 18555 Collins Street #C5', 'PENDING', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2025-06-15', NULL, '{"pp_type": "DELAYED", "pp_status": "Open", "client_vesting": "Younessi Family Trust"}'::jsonb, '{"exchange_type": "DELAYED", "relinquished_property_address": "18555 Collins Street #C5", "relinquished_property_value": 769000, "relinquished_sale_price": 739000, "relinquished_closing_date": "2025-06-15", "replacement_property_address": "12345 Sunset Boulevard", "replacement_property_value": 850000, "replacement_purchase_price": 820000, "exchange_proceeds": 709135.89, "day_45_deadline": "2025-07-30", "day_180_deadline": "2025-12-11", "tags": ["Active", "High Priority", "Commercial"]}'::jsonb),

-- Completed exchange for Franklin
('20000000-0000-0000-0000-000000000002', '44cddbe6-0fab-53fg-9305-ea6641f4092g', 'Franklin - 6767 Sunset Plaza', 'COMPLETED', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '2025-03-20', '2025-09-16', '{"pp_type": "DELAYED", "pp_status": "Closed", "client_vesting": "Franklin Capital Group LLC"}'::jsonb, '{"exchange_type": "DELAYED", "relinquished_property_address": "6767 Sunset Plaza", "relinquished_property_value": 1200000, "relinquished_sale_price": 1150000, "relinquished_closing_date": "2025-03-20", "replacement_property_address": "8901 Wilshire Boulevard Suite 100", "replacement_property_value": 1300000, "replacement_purchase_price": 1275000, "exchange_proceeds": 1125000, "day_45_deadline": "2025-05-04", "day_180_deadline": "2025-09-16", "tags": ["Completed", "Commercial", "Success"]}'::jsonb),

-- Pending exchange for Cyr
('20000000-0000-0000-0000-000000000003', '55deecf7-1gbc-64gh-a416-fb7752g5103h', 'Cyr - 714 Ocampo Drive Residential', 'PENDING', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '2025-07-01', NULL, '{"pp_type": "DELAYED", "pp_status": "Open", "client_vesting": "Cyr Properties Inc."}'::jsonb, '{"exchange_type": "DELAYED", "relinquished_property_address": "714 Ocampo Drive", "relinquished_property_value": 950000, "relinquished_sale_price": 925000, "relinquished_closing_date": "2025-07-01", "replacement_property_address": null, "replacement_property_value": null, "replacement_purchase_price": null, "exchange_proceeds": 895000, "day_45_deadline": "2025-08-15", "day_180_deadline": "2025-12-28", "tags": ["Pending", "Residential", "45-Day Deadline"]}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Exchange participants
INSERT INTO exchange_participants (id, exchange_id, contact_id, user_id, role, permissions) VALUES
-- Exchange 1 participants
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000002', 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000004', 'client', '{"view": true, "edit": false, "delete": false}'::jsonb),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', NULL, 'attorney', '{"view": true, "edit": false, "delete": false}'::jsonb),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', NULL, 'escrow_officer', '{"view": true, "edit": false, "delete": false}'::jsonb),

-- Exchange 2 participants
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', NULL, '00000000-0000-0000-0000-000000000003', 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', NULL, '00000000-0000-0000-0000-000000000005', 'client', '{"view": true, "edit": false, "delete": false}'::jsonb),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', NULL, 'cpa', '{"view": true, "edit": false, "delete": false}'::jsonb),

-- Exchange 3 participants
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', NULL, '00000000-0000-0000-0000-000000000002', 'coordinator', '{"view": true, "edit": true, "delete": true}'::jsonb),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', NULL, '00000000-0000-0000-0000-000000000004', 'client', '{"view": true, "edit": false, "delete": false}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    created_at = NOW();

-- Sample tasks
INSERT INTO tasks (id, title, description, status, priority, due_date, exchange_id, assigned_to, created_by) VALUES

-- Tasks for Exchange 1 (Active)
('40000000-0000-0000-0000-000000000001', 'Finalize replacement property inspection', 'Coordinate and complete property inspection for 12345 Sunset Boulevard replacement property', 'in_progress', 'high', '2025-08-05', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),

('40000000-0000-0000-0000-000000000002', 'Prepare assignment agreement', 'Draft assignment agreement for replacement property purchase', 'pending', 'high', '2025-08-10', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002'),

-- Tasks for Exchange 3 (Pending 45-day)
('40000000-0000-0000-0000-000000000003', 'Identify replacement properties', 'URGENT: Find and identify suitable replacement properties within 45-day deadline', 'in_progress', 'high', '2025-08-15', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),

-- General administrative tasks
('40000000-0000-0000-0000-000000000004', 'Weekly compliance review', 'Review all active exchanges for compliance and upcoming deadlines', 'pending', 'medium', '2025-08-02', NULL, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Sample messages
INSERT INTO messages (id, content, exchange_id, sender_id, message_type, read_by) VALUES

-- Messages for Exchange 1
('50000000-0000-0000-0000-000000000001', 'Exchange created and participants added. Beginning coordination process.', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'system', '[]'::jsonb),

('50000000-0000-0000-0000-000000000002', 'Thank you for setting up the exchange. Looking forward to working with the team on this transaction.', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'text', '["00000000-0000-0000-0000-000000000002"]'::jsonb),

-- Messages for Exchange 3 (urgent)
('50000000-0000-0000-0000-000000000003', 'URGENT: We have 16 days remaining for the 45-day identification deadline. Need to prioritize property identification.', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'text', '["00000000-0000-0000-0000-000000000004"]'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    created_at = EXCLUDED.created_at;

-- Sample documents
INSERT INTO documents (id, original_filename, stored_filename, file_size, mime_type, exchange_id, uploaded_by, pp_document_id, metadata) VALUES

-- Documents for Exchange 1
('60000000-0000-0000-0000-000000000001', 'Relinquished_Property_Deed.pdf', 'relinquished_deed_20250725.pdf', 245760, 'application/pdf', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', NULL, '{"document_type": "deed", "recorded_date": "2020-03-15", "recording_number": "2020-0123456", "tags": ["Legal", "Deed", "Relinquished"]}'::jsonb),

('60000000-0000-0000-0000-000000000002', 'Exchange_Agreement.pdf', 'exchange_agreement_20250601.pdf', 1024000, 'application/pdf', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', NULL, '{"document_type": "contract", "execution_date": "2025-06-01", "intermediary": "Peak 1031 Exchange", "tags": ["1031", "Exchange Agreement", "QI Agreement"]}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Peak 1031 Seed Data loaded successfully!';
    RAISE NOTICE 'Sample data includes:';
    RAISE NOTICE '- 7 Users (Admin, Coordinators, Clients, Third-party)';
    RAISE NOTICE '- 7 Contacts (Clients and Professionals)';
    RAISE NOTICE '- 3 Exchanges (Active, Completed, Pending)';
    RAISE NOTICE '- 9 Exchange Participants';
    RAISE NOTICE '- 4 Tasks (Various priorities and statuses)';
    RAISE NOTICE '- 3 Messages (Including urgent deadline alert)';
    RAISE NOTICE '- 2 Documents (Deeds, Contracts)';
    RAISE NOTICE '';
    RAISE NOTICE 'Test user credentials:';
    RAISE NOTICE '- admin@peak1031.com (Admin) - password: admin123';
    RAISE NOTICE '- ariel@peak1031.com (Coordinator) - password: admin123';
    RAISE NOTICE '- djamshid@example.com (Client) - password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for development and testing!';
END $$; 