-- Mock PracticePanther Data for Development
-- This simulates data that would come from PP API

-- Insert mock contacts (simulating PP contacts API response)
INSERT INTO contacts (
  id, 
  pp_contact_id, 
  first_name, 
  last_name, 
  email, 
  phone, 
  company, 
  contact_type,
  pp_data,
  last_sync_at,
  created_at,
  updated_at
) VALUES 
-- Clients
('550e8400-e29b-41d4-a716-446655440001', 'PP_CLIENT_001', 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', 'Smith Properties LLC', 'Client', 
'{"pp_id": "PP_CLIENT_001", "type": "Individual", "address": "123 Main St, New York, NY 10001", "tax_id": "12-3456789"}', 
NOW(), NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440002', 'PP_CLIENT_002', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '+1-555-0102', 'Johnson Investments', 'Client',
'{"pp_id": "PP_CLIENT_002", "type": "Entity", "address": "456 Oak Ave, Los Angeles, CA 90210", "tax_id": "98-7654321"}',
NOW(), NOW(), NOW()),

-- Intermediaries/QIs
('550e8400-e29b-41d4-a716-446655440003', 'PP_QI_001', 'Michael', 'Davis', 'michael.davis@qi-exchange.com', '+1-555-0201', 'Qualified Intermediary Services', 'Broker',
'{"pp_id": "PP_QI_001", "type": "QI", "license": "QI-12345", "address": "789 Business Blvd, Chicago, IL 60601"}',
NOW(), NOW(), NOW()),

-- Attorneys
('550e8400-e29b-41d4-a716-446655440004', 'PP_ATT_001', 'Lisa', 'Wilson', 'lisa.wilson@lawfirm.com', '+1-555-0301', 'Wilson & Associates Law', 'Attorney',
'{"pp_id": "PP_ATT_001", "type": "Attorney", "bar_number": "ATT-67890", "address": "321 Legal St, Miami, FL 33101"}',
NOW(), NOW(), NOW()),

-- CPAs
('550e8400-e29b-41d4-a716-446655440005', 'PP_CPA_001', 'Robert', 'Brown', 'robert.brown@cpa-firm.com', '+1-555-0401', 'Brown CPA Group', 'CPA',
'{"pp_id": "PP_CPA_001", "type": "CPA", "license": "CPA-11111", "address": "567 Tax Ave, Houston, TX 77001"}',
NOW(), NOW(), NOW()),

-- Real Estate Agents
('550e8400-e29b-41d4-a716-446655440006', 'PP_AGENT_001', 'Jennifer', 'Taylor', 'jennifer.taylor@realty.com', '+1-555-0501', 'Premier Realty Group', 'Agent',
'{"pp_id": "PP_AGENT_001", "type": "Agent", "license": "RE-22222", "address": "890 Realty Row, Denver, CO 80201"}',
NOW(), NOW(), NOW());

-- Insert mock exchanges (simulating PP matters API response)
INSERT INTO exchanges (
  id,
  pp_matter_id,
  name,
  exchange_name,
  status,
  client_id,
  exchange_type,
  relinquished_property_address,
  relinquished_sale_price,
  relinquished_closing_date,
  identification_date,
  exchange_deadline,
  exchange_coordinator,
  attorney_or_cpa,
  bank_account_escrow,
  notes,
  pp_data,
  last_sync_at,
  created_at,
  updated_at
) VALUES
-- Exchange 1: John Smith Commercial Property
('660e8400-e29b-41d4-a716-446655440001', 'PP_MATTER_001', 'Smith Commercial Exchange', 'Smith Commercial Exchange', 'In Progress', 
'550e8400-e29b-41d4-a716-446655440001', 'Delayed', 
'123 Commerce Dr, New York, NY 10001', 2500000.00, '2024-08-15',
'2024-09-30', '2025-02-15', 'Qualified Intermediary Services', 'Wilson & Associates Law',
'Account #12345 - First National Bank', 
'High-value commercial property exchange. Client needs to identify replacement properties by September 30th.',
'{"pp_matter_id": "PP_MATTER_001", "practice_area": "1031 Exchange", "status": "Active", "matter_type": "Commercial Real Estate"}',
NOW(), NOW(), NOW()),

-- Exchange 2: Sarah Johnson Residential Exchange
('660e8400-e29b-41d4-a716-446655440002', 'PP_MATTER_002', 'Johnson Residential Portfolio', 'Johnson Residential Portfolio', 'In Progress',
'550e8400-e29b-41d4-a716-446655440002', 'Reverse',
'456 Residential St, Los Angeles, CA 90210', 1800000.00, '2024-09-01',
'2024-10-15', '2025-03-01', 'Qualified Intermediary Services', 'Wilson & Associates Law',
'Account #67890 - West Coast Bank',
'Reverse exchange for residential investment portfolio. Already identified replacement properties.',
'{"pp_matter_id": "PP_MATTER_002", "practice_area": "1031 Exchange", "status": "Active", "matter_type": "Residential Real Estate"}',
NOW(), NOW(), NOW()),

-- Exchange 3: Completed Example
('660e8400-e29b-41d4-a716-446655440003', 'PP_MATTER_003', 'Davis Industrial Complex', 'Davis Industrial Complex', 'Completed',
'550e8400-e29b-41d4-a716-446655440001', 'Delayed',
'789 Industrial Blvd, Chicago, IL 60601', 3200000.00, '2024-07-01',
'2024-08-15', '2024-12-31', 'Qualified Intermediary Services', 'Wilson & Associates Law',
'Account #11111 - Midwest Bank',
'Successfully completed industrial property exchange. All deadlines met.',
'{"pp_matter_id": "PP_MATTER_003", "practice_area": "1031 Exchange", "status": "Closed", "matter_type": "Industrial Real Estate"}',
NOW(), NOW(), NOW());

-- Insert exchange participants (who can access each exchange chat)
INSERT INTO exchange_participants (
  id,
  exchange_id,
  contact_id,
  user_id,
  role,
  permissions,
  created_at
) VALUES
-- Exchange 1 Participants
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', NULL, 'client', 
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', NULL, 'qualified_intermediary',
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true, "can_manage": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', NULL, 'attorney',
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', NULL, 'cpa',
'{"can_view": true, "can_message": true, "can_view_documents": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', NULL, 'agent',
'{"can_view": true, "can_message": true, "can_view_documents": false}', NOW()),

-- Exchange 2 Participants
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', NULL, 'client',
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', NULL, 'qualified_intermediary',
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true, "can_manage": true}', NOW()),

('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', NULL, 'attorney',
'{"can_view": true, "can_message": true, "can_upload": true, "can_view_documents": true}', NOW());

-- Add internal users to exchanges (admin, coordinator roles)
-- Note: You'll need to get actual user IDs from your Supabase users table
-- For now using placeholder UUIDs - replace with real user IDs

-- Insert mock tasks (simulating PP tasks API response)
INSERT INTO tasks (
  id,
  pp_task_id,
  title,
  description,
  status,
  priority,
  exchange_id,
  due_date,
  pp_data,
  last_sync_at,
  created_at,
  updated_at
) VALUES
-- Tasks for Exchange 1
('880e8400-e29b-41d4-a716-446655440001', 'PP_TASK_001', 'Property Appraisal', 'Schedule and complete professional appraisal of relinquished property', 'COMPLETED', 'HIGH',
'660e8400-e29b-41d4-a716-446655440001', '2024-08-10',
'{"pp_task_id": "PP_TASK_001", "assigned_to": "Jennifer Taylor", "billable": true, "hours": 4.5}',
NOW(), NOW(), NOW()),

('880e8400-e29b-41d4-a716-446655440002', 'PP_TASK_002', 'Identification Documents', 'Prepare and review 45-day identification documents', 'IN_PROGRESS', 'HIGH',
'660e8400-e29b-41d4-a716-446655440001', '2024-09-30',
'{"pp_task_id": "PP_TASK_002", "assigned_to": "Lisa Wilson", "billable": true, "hours": 8.0}',
NOW(), NOW(), NOW()),

('880e8400-e29b-41d4-a716-446655440003', 'PP_TASK_003', 'Escrow Setup', 'Establish qualified escrow account with intermediary', 'COMPLETED', 'MEDIUM',
'660e8400-e29b-41d4-a716-446655440001', '2024-08-20',
'{"pp_task_id": "PP_TASK_003", "assigned_to": "Michael Davis", "billable": true, "hours": 2.0}',
NOW(), NOW(), NOW()),

-- Tasks for Exchange 2
('880e8400-e29b-41d4-a716-446655440004', 'PP_TASK_004', 'Title Insurance Review', 'Review title insurance for replacement properties', 'PENDING', 'MEDIUM',
'660e8400-e29b-41d4-a716-446655440002', '2024-10-05',
'{"pp_task_id": "PP_TASK_004", "assigned_to": "Lisa Wilson", "billable": true, "hours": 0}',
NOW(), NOW(), NOW()),

('880e8400-e29b-41d4-a716-446655440005', 'PP_TASK_005', 'Tax Documentation', 'Prepare tax documentation for reverse exchange', 'IN_PROGRESS', 'HIGH',
'660e8400-e29b-41d4-a716-446655440002', '2024-09-25',
'{"pp_task_id": "PP_TASK_005", "assigned_to": "Robert Brown", "billable": true, "hours": 6.0}',
NOW(), NOW(), NOW());

-- Insert some sample messages for testing chat
INSERT INTO messages (
  id,
  content,
  exchange_id,
  sender_id,
  message_type,
  read_by,
  created_at
) VALUES 
-- Messages for Exchange 1 (use actual user IDs from your Supabase setup)
-- Note: Replace these UUIDs with real user IDs from your Supabase Auth users
('990e8400-e29b-41d4-a716-446655440001', 'Welcome to the Smith Commercial Exchange chat. All parties have been added to this secure communication channel.', 
'660e8400-e29b-41d4-a716-446655440001', 'SYSTEM_USER_ID_REPLACE_ME', 'system', '[]', NOW() - INTERVAL '2 days'),

('990e8400-e29b-41d4-a716-446655440002', 'Hi everyone, I have completed the property appraisal. The report will be uploaded to the document section shortly.', 
'660e8400-e29b-41d4-a716-446655440001', 'AGENT_USER_ID_REPLACE_ME', 'text', '[]', NOW() - INTERVAL '1 day'),

('990e8400-e29b-41d4-a716-446655440003', 'Great! @John, please review the appraisal when you have a chance. We need to finalize the identification documents by Sept 30th.',
'660e8400-e29b-41d4-a716-446655440001', 'ATTORNEY_USER_ID_REPLACE_ME', 'text', '[]', NOW() - INTERVAL '1 day'),

('990e8400-e29b-41d4-a716-446655440004', 'Thanks Lisa. I will review today and get back with any questions. The timeline looks good from my end.',
'660e8400-e29b-41d4-a716-446655440001', 'CLIENT_USER_ID_REPLACE_ME', 'text', '[]', NOW() - INTERVAL '12 hours');

-- Insert sample documents
INSERT INTO documents (
  id,
  filename,
  original_filename,
  file_path,
  file_size,
  mime_type,
  exchange_id,
  uploaded_by,
  category,
  tags,
  pin_required,
  is_template,
  created_at,
  updated_at
) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'property_appraisal_001.pdf', 'Smith Property Appraisal Report.pdf', 
'/uploads/documents/property_appraisal_001.pdf', 2548000, 'application/pdf',
'660e8400-e29b-41d4-a716-446655440001', 'AGENT_USER_ID_REPLACE_ME', 'Appraisal', 
'["appraisal", "property-valuation", "smith-property"]', false, false, NOW(), NOW()),

('aa0e8400-e29b-41d4-a716-446655440002', 'identification_letter_001.pdf', '45-Day Identification Letter.pdf',
'/uploads/documents/identification_letter_001.pdf', 856000, 'application/pdf',
'660e8400-e29b-41d4-a716-446655440001', 'ATTORNEY_USER_ID_REPLACE_ME', 'Legal', 
'["identification", "45-day", "legal-document"]', true, false, NOW(), NOW());

-- Add audit logs for mock data creation
INSERT INTO audit_logs (
  id,
  action,
  entity_type,
  entity_id,
  user_id,
  details,
  created_at
) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'MOCK_DATA_CREATED', 'system', NULL, 'SYSTEM_USER_ID_REPLACE_ME',
'{"action": "inserted_mock_pp_data", "contacts": 6, "exchanges": 3, "tasks": 5, "messages": 4, "documents": 2}',
NOW());

-- Note: After running this script, you need to:
-- 1. Replace all 'REPLACE_ME' user IDs with actual Supabase user IDs
-- 2. Create corresponding user entries in the users table that match Supabase Auth
-- 3. Update message sender_ids to use real user IDs
-- 4. Assign real users to exchange participants

COMMENT ON TABLE contacts IS 'Mock contacts simulating PracticePanther API responses';
COMMENT ON TABLE exchanges IS 'Mock exchanges (matters) simulating PracticePanther API responses';
COMMENT ON TABLE tasks IS 'Mock tasks simulating PracticePanther API responses';
COMMENT ON TABLE exchange_participants IS 'Defines who can access each exchange chat and their permissions';