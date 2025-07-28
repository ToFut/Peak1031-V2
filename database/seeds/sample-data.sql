-- Sample data for development
-- This file contains test data to populate the database for development

-- Sample contacts
INSERT INTO contacts (pp_contact_id, first_name, last_name, email, phone, company, pp_data) VALUES
('PP001', 'John', 'Smith', 'john.smith@example.com', '+1-555-0101', 'Smith Properties LLC', '{"pp_id": "PP001", "type": "client"}'),
('PP002', 'Sarah', 'Johnson', 'sarah.johnson@example.com', '+1-555-0102', 'Johnson Real Estate', '{"pp_id": "PP002", "type": "client"}'),
('PP003', 'Michael', 'Brown', 'michael.brown@example.com', '+1-555-0103', 'Brown Investments', '{"pp_id": "PP003", "type": "client"}'),
('PP004', 'Lisa', 'Davis', 'lisa.davis@example.com', '+1-555-0104', 'Davis & Associates', '{"pp_id": "PP004", "type": "intermediary"}'),
('PP005', 'Robert', 'Wilson', 'robert.wilson@example.com', '+1-555-0105', 'Wilson Title Co', '{"pp_id": "PP005", "type": "third_party"}');

-- Sample exchanges
INSERT INTO exchanges (pp_matter_id, name, status, client_id, start_date, completion_date, pp_data) VALUES
('PP_MATTER_001', 'Smith Property Exchange', 'PENDING', (SELECT id FROM contacts WHERE pp_contact_id = 'PP001'), '2024-01-15', NULL, '{"pp_matter_id": "PP_MATTER_001", "type": "1031_exchange"}'),
('PP_MATTER_002', 'Johnson Commercial Exchange', '45D', (SELECT id FROM contacts WHERE pp_contact_id = 'PP002'), '2024-01-10', NULL, '{"pp_matter_id": "PP_MATTER_002", "type": "1031_exchange"}'),
('PP_MATTER_003', 'Brown Investment Exchange', '180D', (SELECT id FROM contacts WHERE pp_contact_id = 'PP003'), '2023-12-01', NULL, '{"pp_matter_id": "PP_MATTER_003", "type": "1031_exchange"}'),
('PP_MATTER_004', 'Davis Multi-Property Exchange', 'COMPLETED', (SELECT id FROM contacts WHERE pp_contact_id = 'PP004'), '2023-10-01', '2024-01-15', '{"pp_matter_id": "PP_MATTER_004", "type": "1031_exchange"}');

-- Sample tasks
INSERT INTO tasks (pp_task_id, title, description, status, priority, exchange_id, due_date, pp_data) VALUES
('PP_TASK_001', 'Complete Identification', 'Identify replacement property within 45 days', 'PENDING', 'HIGH', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), '2024-02-15', '{"pp_task_id": "PP_TASK_001"}'),
('PP_TASK_002', 'Property Inspection', 'Schedule inspection of replacement property', 'IN_PROGRESS', 'MEDIUM', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_002'), '2024-01-25', '{"pp_task_id": "PP_TASK_002"}'),
('PP_TASK_003', 'Document Review', 'Review all exchange documents', 'COMPLETED', 'LOW', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_003'), '2024-01-20', '{"pp_task_id": "PP_TASK_003"}'),
('PP_TASK_004', 'Closing Coordination', 'Coordinate closing of replacement property', 'PENDING', 'HIGH', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), '2024-03-01', '{"pp_task_id": "PP_TASK_004"}');

-- Sample documents
INSERT INTO documents (filename, original_filename, file_path, file_size, mime_type, exchange_id, uploaded_by, category, pin_required) VALUES
('doc_001.pdf', 'exchange_agreement.pdf', '/uploads/exchanges/PP_MATTER_001/exchange_agreement.pdf', 1024000, 'application/pdf', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'agreements', false),
('doc_002.pdf', 'property_identification.pdf', '/uploads/exchanges/PP_MATTER_001/property_identification.pdf', 512000, 'application/pdf', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'identification', true),
('doc_003.pdf', 'closing_statement.pdf', '/uploads/exchanges/PP_MATTER_002/closing_statement.pdf', 2048000, 'application/pdf', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_002'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'closing', false);

-- Sample messages
INSERT INTO messages (content, exchange_id, sender_id, message_type) VALUES
('Exchange agreement has been uploaded for review.', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'text'),
('Property identification deadline is approaching. Please review the documents.', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_001'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'text'),
('Closing has been scheduled for next week. All parties confirmed.', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_002'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), 'text');

-- Sample audit logs
INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details) VALUES
('LOGIN', 'user', (SELECT id FROM users WHERE email = 'admin@peak1031.com'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), '{"ip": "127.0.0.1"}'),
('DOCUMENT_UPLOAD', 'document', (SELECT id FROM documents WHERE filename = 'doc_001.pdf'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), '{"filename": "exchange_agreement.pdf", "size": 1024000}'),
('EXCHANGE_STATUS_UPDATE', 'exchange', (SELECT id FROM exchanges WHERE pp_matter_id = 'PP_MATTER_002'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), '{"old_status": "PENDING", "new_status": "45D"}'),
('TASK_COMPLETED', 'task', (SELECT id FROM tasks WHERE pp_task_id = 'PP_TASK_003'), (SELECT id FROM users WHERE email = 'admin@peak1031.com'), '{"task_title": "Document Review"}');

-- Sample sync logs
INSERT INTO sync_logs (sync_type, status, started_at, completed_at, records_processed, records_updated, records_created, triggered_by) VALUES
('contacts', 'success', '2024-01-20 10:00:00', '2024-01-20 10:05:00', 5, 0, 5, (SELECT id FROM users WHERE email = 'admin@peak1031.com')),
('exchanges', 'success', '2024-01-20 10:05:00', '2024-01-20 10:08:00', 4, 0, 4, (SELECT id FROM users WHERE email = 'admin@peak1031.com')),
('tasks', 'success', '2024-01-20 10:08:00', '2024-01-20 10:10:00', 4, 0, 4, (SELECT id FROM users WHERE email = 'admin@peak1031.com')); 