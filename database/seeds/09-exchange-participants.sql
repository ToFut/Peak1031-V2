-- 09-exchange-participants.sql
-- Seed data for exchange_participants table (who has access to each exchange)

INSERT INTO public.exchange_participants (id, exchange_id, user_id, contact_id, role, permissions, created_at) VALUES
-- ABC Corp Dallas Office Exchange (exch-001) participants
('part-001', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'coordinator', '{"can_edit": true, "can_delete": false, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-01-15T10:00:00Z'),
('part-002', 'exch-001', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', NULL, 'client', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-01-15T10:00:00Z'),
('part-003', 'exch-001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, 'agent', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-01-25T09:00:00Z'),
('part-004', 'exch-001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', NULL, 'attorney', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-02-01T10:00:00Z'),
('part-005', 'exch-001', NULL, 'cont-007', 'intermediary', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": false}', '2025-01-20T14:00:00Z'),

-- Smith Holdings Retail Property (exch-002) participants
('part-006', 'exch-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'coordinator', '{"can_edit": true, "can_delete": false, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-01-05T11:00:00Z'),
('part-007', 'exch-002', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', NULL, 'client', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-01-05T11:00:00Z'),
('part-008', 'exch-002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, 'agent', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-01-08T10:00:00Z'),
('part-009', 'exch-002', NULL, 'cont-008', 'intermediary', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": false}', '2025-01-10T12:00:00Z'),
('part-010', 'exch-002', NULL, 'cont-016', 'accountant', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-01-12T14:00:00Z'),

-- Johnson Trust Apartment Complex (exch-003) participants
('part-011', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 'coordinator', '{"can_edit": true, "can_delete": false, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-02-01T09:00:00Z'),
('part-012', 'exch-003', 'llllllll-llll-llll-llll-llllllllllll', NULL, 'client', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-02-01T09:00:00Z'),
('part-013', 'exch-003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, 'agent', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": true}', '2025-02-05T11:00:00Z'),
('part-014', 'exch-003', NULL, 'cont-009', 'intermediary', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": true, "can_send_messages": false}', '2025-02-10T13:00:00Z'),

-- Completed exchange participants (exch-004)
('part-015', 'exch-004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'coordinator', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": false, "can_send_messages": false}', '2024-07-15T08:00:00Z'),
('part-016', 'exch-004', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', NULL, 'client', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": false, "can_send_messages": false}', '2024-07-15T08:00:00Z'),

-- Admin access to all exchanges
('part-017', 'exch-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'admin', '{"can_edit": true, "can_delete": true, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-01-15T10:00:00Z'),
('part-018', 'exch-002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'admin', '{"can_edit": true, "can_delete": true, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-01-05T11:00:00Z'),
('part-019', 'exch-003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'admin', '{"can_edit": true, "can_delete": true, "can_add_participants": true, "can_upload_documents": true, "can_send_messages": true}', '2025-02-01T09:00:00Z'),

-- View-only access for compliance
('part-020', 'exch-001', NULL, 'cont-017', 'compliance', '{"can_edit": false, "can_delete": false, "can_add_participants": false, "can_upload_documents": false, "can_send_messages": false, "view_only": true}', '2025-01-20T16:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  exchange_id = EXCLUDED.exchange_id,
  user_id = EXCLUDED.user_id,
  contact_id = EXCLUDED.contact_id,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  created_at = EXCLUDED.created_at;