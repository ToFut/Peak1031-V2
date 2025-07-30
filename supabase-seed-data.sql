-- Peak 1031 Exchange Management System - Seed Data
-- Run this AFTER the schema has been created and you have created auth users

-- Note: Replace the UUIDs below with actual auth.users IDs from your Supabase dashboard
-- You'll need to create these users first in Supabase Auth, then update this file

-- Sample Users (update with real auth.users IDs)
-- First create these users in Supabase Auth:
-- 1. admin@peak1031.com (password: admin123) - role: admin
-- 2. coordinator@peak1031.com (password: coord123) - role: coordinator  
-- 3. client@peak1031.com (password: client123) - role: client

-- Update users table with additional profile data
-- Replace these UUIDs with actual ones from your auth.users table
INSERT INTO public.users (id, email, role, first_name, last_name, phone, is_active, two_fa_enabled) VALUES
-- Replace with actual UUID from auth.users
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'admin@peak1031.com', 'admin', 'John', 'Smith', '+1-555-0101', true, true),
('00000000-0000-0000-0000-000000000002', 'coordinator@peak1031.com', 'coordinator', 'Sarah', 'Johnson', '+1-555-0102', true, false),
('00000000-0000-0000-0000-000000000003', 'client@peak1031.com', 'client', 'Michael', 'Davis', '+1-555-0103', true, false)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  two_fa_enabled = EXCLUDED.two_fa_enabled;

-- Sample Contacts
INSERT INTO public.contacts (id, pp_contact_id, first_name, last_name, email, phone, company, address, pp_data) VALUES
('c1000000-0000-0000-0000-000000000001', 'PP_CONTACT_001', 'Robert', 'Wilson', 'robert.wilson@email.com', '+1-555-1001', 'Wilson Investments LLC', '123 Main St, New York, NY 10001', '{"pp_id": "PP_CONTACT_001", "type": "client"}'),
('c1000000-0000-0000-0000-000000000002', 'PP_CONTACT_002', 'Jennifer', 'Brown', 'jennifer.brown@email.com', '+1-555-1002', 'Brown Real Estate Corp', '456 Oak Ave, Los Angeles, CA 90210', '{"pp_id": "PP_CONTACT_002", "type": "client"}'),
('c1000000-0000-0000-0000-000000000003', 'PP_CONTACT_003', 'David', 'Martinez', 'david.martinez@email.com', '+1-555-1003', 'Martinez Holdings', '789 Pine St, Chicago, IL 60601', '{"pp_id": "PP_CONTACT_003", "type": "client"}'),
('c1000000-0000-0000-0000-000000000004', 'PP_CONTACT_004', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '+1-555-1004', 'Anderson Properties', '321 Elm St, Miami, FL 33101', '{"pp_id": "PP_CONTACT_004", "type": "intermediary"}'),
('c1000000-0000-0000-0000-000000000005', 'PP_CONTACT_005', 'James', 'Taylor', 'james.taylor@email.com', '+1-555-1005', 'Taylor QI Services', '654 Maple Dr, Seattle, WA 98101', '{"pp_id": "PP_CONTACT_005", "type": "qualified_intermediary"}');

-- Sample Exchanges
INSERT INTO public.exchanges (id, pp_matter_id, name, status, client_id, coordinator_id, start_date, exchange_value, identification_deadline, completion_deadline, notes, pp_data) VALUES
('e1000000-0000-0000-0000-000000000001', 'PP_MATTER_001', 'Wilson Property Exchange - Manhattan Office', 'PENDING', 'c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2024-01-15T10:00:00Z', 2500000.00, '2024-03-01T17:00:00Z', '2024-07-15T17:00:00Z', 'High-value commercial property exchange in Manhattan', '{"pp_matter_id": "PP_MATTER_001", "type": "commercial"}'),
('e1000000-0000-0000-0000-000000000002', 'PP_MATTER_002', 'Brown Real Estate Exchange - LA Apartments', '45D', 'c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2024-01-20T09:00:00Z', 1800000.00, '2024-03-06T17:00:00Z', '2024-07-20T17:00:00Z', 'Multi-unit residential property exchange', '{"pp_matter_id": "PP_MATTER_002", "type": "residential"}'),
('e1000000-0000-0000-0000-000000000003', 'PP_MATTER_003', 'Martinez Holdings Exchange - Chicago Warehouse', '180D', 'c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '2023-12-10T11:00:00Z', 3200000.00, '2024-01-25T17:00:00Z', '2024-06-10T17:00:00Z', 'Industrial warehouse property exchange', '{"pp_matter_id": "PP_MATTER_003", "type": "industrial"}'),
('e1000000-0000-0000-0000-000000000004', 'PP_MATTER_004', 'Anderson Exchange - Miami Retail', 'COMPLETED', 'c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '2023-11-01T08:00:00Z', 950000.00, '2023-12-16T17:00:00Z', '2024-04-01T17:00:00Z', 'Retail property exchange - completed successfully', '{"pp_matter_id": "PP_MATTER_004", "type": "retail"}');

-- Sample Exchange Participants
INSERT INTO public.exchange_participants (exchange_id, contact_id, user_id, role, permissions) VALUES
('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', NULL, 'qualified_intermediary', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true, "manage_funds": true}'),
('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', NULL, 'intermediary', '{"view_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}');

-- Sample Tasks
INSERT INTO public.tasks (id, pp_task_id, title, description, status, priority, exchange_id, assigned_to, due_date) VALUES
('t1000000-0000-0000-0000-000000000001', 'PP_TASK_001', 'Initial Property Identification', 'Client needs to identify replacement properties within 45 days', 'PENDING', 'HIGH', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2024-03-01T17:00:00Z'),
('t1000000-0000-0000-0000-000000000002', 'PP_TASK_002', 'Property Valuation Report', 'Obtain professional valuation of relinquished property', 'IN_PROGRESS', 'MEDIUM', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2024-02-15T17:00:00Z'),
('t1000000-0000-0000-0000-000000000003', 'PP_TASK_003', 'Title Insurance Review', 'Review title insurance for replacement property', 'PENDING', 'MEDIUM', 'e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '2024-02-28T17:00:00Z'),
('t1000000-0000-0000-0000-000000000004', 'PP_TASK_004', 'Closing Coordination', 'Coordinate closing process with all parties', 'IN_PROGRESS', 'HIGH', 'e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '2024-02-20T17:00:00Z'),
('t1000000-0000-0000-0000-000000000005', 'PP_TASK_005', 'Final Documentation Review', 'Review all final exchange documentation', 'COMPLETED', 'HIGH', 'e1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '2024-01-30T17:00:00Z');

-- Sample Documents
INSERT INTO public.documents (id, filename, original_filename, file_path, file_size, mime_type, exchange_id, uploaded_by, category, tags, pin_required) VALUES
('d1000000-0000-0000-0000-000000000001', '20240115_purchase_agreement.pdf', 'Purchase Agreement - Wilson Property.pdf', '/documents/e1000000-0000-0000-0000-000000000001/purchase_agreement.pdf', 2458624, 'application/pdf', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'contracts', ARRAY['purchase', 'agreement', 'legal'], false),
('d1000000-0000-0000-0000-000000000002', '20240115_property_deed.pdf', 'Property Deed - Manhattan Office.pdf', '/documents/e1000000-0000-0000-0000-000000000001/property_deed.pdf', 1854720, 'application/pdf', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'legal', ARRAY['deed', 'title', 'legal'], true),
('d1000000-0000-0000-0000-000000000003', '20240120_appraisal_report.pdf', 'Property Appraisal Report.pdf', '/documents/e1000000-0000-0000-0000-000000000002/appraisal_report.pdf', 3247104, 'application/pdf', 'e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'financial', ARRAY['appraisal', 'valuation'], false),
('d1000000-0000-0000-0000-000000000004', '20240210_inspection_report.pdf', 'Property Inspection Report.pdf', '/documents/e1000000-0000-0000-0000-000000000003/inspection_report.pdf', 1967872, 'application/pdf', 'e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'inspection', ARRAY['inspection', 'property'], false);

-- Sample Messages
INSERT INTO public.messages (id, content, exchange_id, sender_id, message_type, read_by) VALUES
('m1000000-0000-0000-0000-000000000001', 'Initial exchange setup complete. Please review the attached purchase agreement.', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'text', ARRAY['00000000-0000-0000-0000-000000000002']),
('m1000000-0000-0000-0000-000000000002', 'Property appraisal has been completed and uploaded to the document section.', 'e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'text', ARRAY['00000000-0000-0000-0000-000000000002']),
('m1000000-0000-0000-0000-000000000003', 'Reminder: Identification deadline is approaching in 15 days.', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'system', ARRAY['00000000-0000-0000-0000-000000000002']),
('m1000000-0000-0000-0000-000000000004', 'Closing process is proceeding on schedule. All documentation looks good.', 'e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'text', ARRAY['00000000-0000-0000-0000-000000000002']);

-- Sample Notifications
INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id) VALUES
('00000000-0000-0000-0000-000000000002', 'Task Due Soon', 'Property Valuation Report task is due in 3 days', 'warning', 'task', 't1000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000002', 'Exchange Deadline Approaching', '45-day identification deadline for Wilson Property Exchange is in 15 days', 'info', 'exchange', 'e1000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000001', 'New Document Uploaded', 'Property Appraisal Report has been uploaded', 'info', 'document', 'd1000000-0000-0000-0000-000000000003'),
('00000000-0000-0000-0000-000000000002', 'Exchange Completed', 'Anderson Exchange - Miami Retail has been completed successfully', 'success', 'exchange', 'e1000000-0000-0000-0000-000000000004');

-- Sample Audit Logs
INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details) VALUES
('CREATE', 'exchange', 'e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '{"exchange_name": "Wilson Property Exchange - Manhattan Office", "client": "Robert Wilson"}'),
('UPDATE', 'exchange', 'e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"field": "status", "old_value": "PENDING", "new_value": "45D"}'),
('CREATE', 'task', 't1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '{"task_title": "Initial Property Identification", "assigned_to": "Sarah Johnson"}'),
('UPLOAD', 'document', 'd1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '{"filename": "Purchase Agreement - Wilson Property.pdf", "size": "2.4 MB"}');

-- Sample Sync Logs
INSERT INTO public.sync_logs (sync_type, status, started_at, completed_at, records_processed, records_updated, records_created, triggered_by) VALUES
('full', 'success', '2024-01-15T08:00:00Z', '2024-01-15T08:15:00Z', 150, 75, 25, '00000000-0000-0000-0000-000000000001'),
('incremental', 'success', '2024-01-16T08:00:00Z', '2024-01-16T08:05:00Z', 25, 15, 5, '00000000-0000-0000-0000-000000000001'),
('manual', 'success', '2024-01-17T14:30:00Z', '2024-01-17T14:35:00Z', 10, 8, 2, '00000000-0000-0000-0000-000000000002'),
('incremental', 'error', '2024-01-18T08:00:00Z', '2024-01-18T08:02:00Z', 0, 0, 0, '00000000-0000-0000-0000-000000000001');

-- Create some views for common queries
CREATE OR REPLACE VIEW public.exchange_summary AS
SELECT 
  e.id,
  e.name,
  e.status,
  e.exchange_value,
  e.start_date,
  e.identification_deadline,
  e.completion_deadline,
  c.first_name || ' ' || c.last_name AS client_name,
  c.company AS client_company,
  u.first_name || ' ' || u.last_name AS coordinator_name,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.exchange_id = e.id) AS total_tasks,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.exchange_id = e.id AND t.status = 'COMPLETED') AS completed_tasks,
  (SELECT COUNT(*) FROM public.documents d WHERE d.exchange_id = e.id) AS total_documents,
  e.created_at,
  e.updated_at
FROM public.exchanges e
LEFT JOIN public.contacts c ON e.client_id = c.id
LEFT JOIN public.users u ON e.coordinator_id = u.id;

CREATE OR REPLACE VIEW public.task_summary AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.completed_at,
  e.name AS exchange_name,
  u.first_name || ' ' || u.last_name AS assigned_to_name,
  CASE 
    WHEN t.due_date < NOW() AND t.status != 'COMPLETED' THEN true
    ELSE false
  END AS is_overdue,
  t.created_at,
  t.updated_at
FROM public.tasks t
LEFT JOIN public.exchanges e ON t.exchange_id = e.id
LEFT JOIN public.users u ON t.assigned_to = u.id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;