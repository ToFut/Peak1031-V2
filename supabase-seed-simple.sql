-- Peak 1031 Exchange Management System - Simple Seed Data
-- This version only uses the one admin user you created

-- Update users table with profile data for your admin user
INSERT INTO public.users (id, email, role, first_name, last_name, phone, is_active, two_fa_enabled) VALUES
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'admin@peak1031.com', 'admin', 'John', 'Smith', '+1-555-0101', true, true)
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

-- Sample Exchanges (all assigned to your admin user as coordinator)
INSERT INTO public.exchanges (id, pp_matter_id, name, status, client_id, coordinator_id, start_date, exchange_value, identification_deadline, completion_deadline, notes, pp_data) VALUES
('e1000000-0000-0000-0000-000000000001', 'PP_MATTER_001', 'Wilson Property Exchange - Manhattan Office', 'PENDING', 'c1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-01-15T10:00:00Z', 2500000.00, '2024-03-01T17:00:00Z', '2024-07-15T17:00:00Z', 'High-value commercial property exchange in Manhattan', '{"pp_matter_id": "PP_MATTER_001", "type": "commercial"}'),
('e1000000-0000-0000-0000-000000000002', 'PP_MATTER_002', 'Brown Real Estate Exchange - LA Apartments', '45D', 'c1000000-0000-0000-0000-000000000002', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-01-20T09:00:00Z', 1800000.00, '2024-03-06T17:00:00Z', '2024-07-20T17:00:00Z', 'Multi-unit residential property exchange', '{"pp_matter_id": "PP_MATTER_002", "type": "residential"}'),
('e1000000-0000-0000-0000-000000000003', 'PP_MATTER_003', 'Martinez Holdings Exchange - Chicago Warehouse', '180D', 'c1000000-0000-0000-0000-000000000003', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2023-12-10T11:00:00Z', 3200000.00, '2024-01-25T17:00:00Z', '2024-06-10T17:00:00Z', 'Industrial warehouse property exchange', '{"pp_matter_id": "PP_MATTER_003", "type": "industrial"}'),
('e1000000-0000-0000-0000-000000000004', 'PP_MATTER_004', 'Anderson Exchange - Miami Retail', 'COMPLETED', 'c1000000-0000-0000-0000-000000000004', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2023-11-01T08:00:00Z', 950000.00, '2023-12-16T17:00:00Z', '2024-04-01T17:00:00Z', 'Retail property exchange - completed successfully', '{"pp_matter_id": "PP_MATTER_004", "type": "retail"}');

-- Sample Exchange Participants
INSERT INTO public.exchange_participants (exchange_id, contact_id, user_id, role, permissions) VALUES
('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', NULL, 'qualified_intermediary', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true, "manage_funds": true}'),
('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', NULL, 'intermediary', '{"view_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}'),
('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', NULL, 'client', '{"view_documents": true, "upload_documents": true, "view_messages": true, "send_messages": true}');

-- Sample Tasks (all assigned to your admin user)
INSERT INTO public.tasks (id, pp_task_id, title, description, status, priority, exchange_id, assigned_to, due_date) VALUES
('t1000000-0000-0000-0000-000000000001', 'PP_TASK_001', 'Initial Property Identification', 'Client needs to identify replacement properties within 45 days', 'PENDING', 'HIGH', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-03-01T17:00:00Z'),
('t1000000-0000-0000-0000-000000000002', 'PP_TASK_002', 'Property Valuation Report', 'Obtain professional valuation of relinquished property', 'IN_PROGRESS', 'MEDIUM', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-02-15T17:00:00Z'),
('t1000000-0000-0000-0000-000000000003', 'PP_TASK_003', 'Title Insurance Review', 'Review title insurance for replacement property', 'PENDING', 'MEDIUM', 'e1000000-0000-0000-0000-000000000002', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-02-28T17:00:00Z'),
('t1000000-0000-0000-0000-000000000004', 'PP_TASK_004', 'Closing Coordination', 'Coordinate closing process with all parties', 'IN_PROGRESS', 'HIGH', 'e1000000-0000-0000-0000-000000000003', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-02-20T17:00:00Z'),
('t1000000-0000-0000-0000-000000000005', 'PP_TASK_005', 'Final Documentation Review', 'Review all final exchange documentation', 'COMPLETED', 'HIGH', 'e1000000-0000-0000-0000-000000000004', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '2024-01-30T17:00:00Z');

-- Sample Documents (uploaded by your admin user)
INSERT INTO public.documents (id, filename, original_filename, file_path, file_size, mime_type, exchange_id, uploaded_by, category, tags, pin_required) VALUES
('d1000000-0000-0000-0000-000000000001', '20240115_purchase_agreement.pdf', 'Purchase Agreement - Wilson Property.pdf', '/documents/e1000000-0000-0000-0000-000000000001/purchase_agreement.pdf', 2458624, 'application/pdf', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'contracts', ARRAY['purchase', 'agreement', 'legal'], false),
('d1000000-0000-0000-0000-000000000002', '20240115_property_deed.pdf', 'Property Deed - Manhattan Office.pdf', '/documents/e1000000-0000-0000-0000-000000000001/property_deed.pdf', 1854720, 'application/pdf', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'legal', ARRAY['deed', 'title', 'legal'], true),
('d1000000-0000-0000-0000-000000000003', '20240120_appraisal_report.pdf', 'Property Appraisal Report.pdf', '/documents/e1000000-0000-0000-0000-000000000002/appraisal_report.pdf', 3247104, 'application/pdf', 'e1000000-0000-0000-0000-000000000002', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'financial', ARRAY['appraisal', 'valuation'], false),
('d1000000-0000-0000-0000-000000000004', '20240210_inspection_report.pdf', 'Property Inspection Report.pdf', '/documents/e1000000-0000-0000-0000-000000000003/inspection_report.pdf', 1967872, 'application/pdf', 'e1000000-0000-0000-0000-000000000003', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'inspection', ARRAY['inspection', 'property'], false);

-- Sample Messages (sent by your admin user)
INSERT INTO public.messages (id, content, exchange_id, sender_id, message_type, read_by) VALUES
('m1000000-0000-0000-0000-000000000001', 'Initial exchange setup complete. Please review the attached purchase agreement.', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'text', ARRAY['9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3']),
('m1000000-0000-0000-0000-000000000002', 'Property appraisal has been completed and uploaded to the document section.', 'e1000000-0000-0000-0000-000000000002', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'text', ARRAY['9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3']),
('m1000000-0000-0000-0000-000000000003', 'Reminder: Identification deadline is approaching in 15 days.', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'system', ARRAY['9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3']),
('m1000000-0000-0000-0000-000000000004', 'Closing process is proceeding on schedule. All documentation looks good.', 'e1000000-0000-0000-0000-000000000003', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'text', ARRAY['9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3']);

-- Sample Notifications (for your admin user)
INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id) VALUES
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'Task Due Soon', 'Property Valuation Report task is due in 3 days', 'warning', 'task', 't1000000-0000-0000-0000-000000000002'),
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'Exchange Deadline Approaching', '45-day identification deadline for Wilson Property Exchange is in 15 days', 'info', 'exchange', 'e1000000-0000-0000-0000-000000000001'),
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'New Document Uploaded', 'Property Appraisal Report has been uploaded', 'info', 'document', 'd1000000-0000-0000-0000-000000000003'),
('9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', 'Exchange Completed', 'Anderson Exchange - Miami Retail has been completed successfully', 'success', 'exchange', 'e1000000-0000-0000-0000-000000000004');

-- Sample Audit Logs
INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details) VALUES
('CREATE', 'exchange', 'e1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '{"exchange_name": "Wilson Property Exchange - Manhattan Office", "client": "Robert Wilson"}'),
('UPDATE', 'exchange', 'e1000000-0000-0000-0000-000000000002', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '{"field": "status", "old_value": "PENDING", "new_value": "45D"}'),
('CREATE', 'task', 't1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '{"task_title": "Initial Property Identification", "assigned_to": "John Smith"}'),
('UPLOAD', 'document', 'd1000000-0000-0000-0000-000000000001', '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3', '{"filename": "Purchase Agreement - Wilson Property.pdf", "size": "2.4 MB"}');

-- Sample Sync Logs
INSERT INTO public.sync_logs (sync_type, status, started_at, completed_at, records_processed, records_updated, records_created, triggered_by) VALUES
('full', 'success', '2024-01-15T08:00:00Z', '2024-01-15T08:15:00Z', 150, 75, 25, '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3'),
('incremental', 'success', '2024-01-16T08:00:00Z', '2024-01-16T08:05:00Z', 25, 15, 5, '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3'),
('manual', 'success', '2024-01-17T14:30:00Z', '2024-01-17T14:35:00Z', 10, 8, 2, '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3'),
('incremental', 'error', '2024-01-18T08:00:00Z', '2024-01-18T08:02:00Z', 0, 0, 0, '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3');