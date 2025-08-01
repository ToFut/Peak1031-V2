-- 08-notifications.sql
-- Seed data for notifications table

INSERT INTO public.notifications (id, type, title, message, urgency, read, user_id, related_exchange_id, created_at) VALUES
-- Unread notifications for coordinators
('notif-001', 'deadline_reminder', '45-Day Deadline Approaching', 'ABC Corp exchange has 20 days until 45-day identification deadline (March 15, 2025)', 'medium', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-02-23T08:00:00Z'),
('notif-002', 'deadline_reminder', 'URGENT: 45-Day Deadline in 5 Days', 'Smith Holdings exchange identification deadline is February 28, 2025 - only 5 days remaining!', 'critical', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-002', '2025-02-23T08:00:00Z'),
('notif-003', 'task_assigned', 'New Task Assigned', 'You have been assigned: "Review Purchase Agreement" for ABC Corp Exchange', 'medium', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-01-30T10:00:00Z'),
('notif-004', 'document_uploaded', 'New Document Available', 'Property Inspection Report has been uploaded for ABC Corp Exchange', 'low', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-02-15T14:00:00Z'),

-- Notifications for Sarah (coordinator)
('notif-005', 'exchange_created', 'New Exchange Assigned', 'You have been assigned as coordinator for Johnson Trust Apartment Complex Exchange', 'high', true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'exch-003', '2025-02-01T09:00:00Z'),
('notif-006', 'message_received', 'New Message', 'William Anderson sent a message in Johnson Trust Exchange', 'low', false, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'exch-003', '2025-03-02T13:00:00Z'),

-- Admin notifications
('notif-007', 'system_alert', 'Monthly Compliance Review Due', 'Time to complete the monthly compliance review for all active exchanges', 'medium', false, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '2025-02-28T08:00:00Z'),
('notif-008', 'exchange_completed', 'Exchange Completed Successfully', 'ABC Corp Industrial Warehouse Exchange has been completed successfully', 'low', true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exch-004', '2024-12-15T16:00:00Z'),

-- Client notifications
('notif-009', 'status_update', 'Exchange Status Update', 'Your exchange status has been updated to "Active". Sale proceeds received by QI.', 'high', true, 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'exch-001', '2025-01-30T17:00:00Z'),
('notif-010', 'document_required', 'Action Required: Sign Exchange Agreement', 'Please review and sign the exchange agreement for your Dallas Office Exchange', 'high', true, 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjj', 'exch-001', '2025-01-15T11:00:00Z'),
('notif-011', 'property_identified', 'Property Tour Scheduled', 'Tour scheduled for Plano property on Tuesday at 2:00 PM', 'medium', false, 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjj', 'exch-001', '2025-01-25T09:30:00Z'),

-- Agency staff notifications
('notif-012', 'task_overdue', 'Overdue Task Alert', 'Task "Submit 45-Day Identification" is overdue for Smith Holdings Exchange', 'critical', false, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'exch-002', '2025-01-26T08:00:00Z'),
('notif-013', 'new_lead', 'New Exchange Lead', 'New client inquiry from Premier Realty Group', 'medium', false, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, '2025-01-28T14:00:00Z'),

-- Third party notifications
('notif-014', 'document_review', 'Document Review Request', 'Purchase agreement ready for legal review - ABC Corp Exchange', 'high', false, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'exch-001', '2025-02-18T09:00:00Z'),
('notif-015', 'exchange_participation', 'Added to Exchange', 'You have been added as legal counsel for ABC Corp Exchange', 'medium', true, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'exch-001', '2025-02-01T10:00:00Z'),

-- System-wide notifications
('notif-016', 'maintenance', 'Scheduled Maintenance', 'System maintenance scheduled for Sunday 2:00 AM - 4:00 AM CST', 'low', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, '2025-02-20T15:00:00Z'),
('notif-017', 'feature_update', 'New Feature Available', 'Document e-signature integration is now available for all exchanges', 'low', false, 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '2025-01-15T12:00:00Z'),
('notif-018', 'training_reminder', 'Training Session Tomorrow', 'Reminder: 1031 Exchange Best Practices webinar tomorrow at 10:00 AM', 'medium', false, 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, '2025-01-24T16:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  message = EXCLUDED.message,
  urgency = EXCLUDED.urgency,
  read = EXCLUDED.read,
  user_id = EXCLUDED.user_id,
  related_exchange_id = EXCLUDED.related_exchange_id,
  created_at = EXCLUDED.created_at;