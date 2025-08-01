-- 05-tasks.sql
-- Seed data for tasks table

INSERT INTO public.tasks (id, title, description, status, priority, due_date, exchange_id, assigned_user_id, organization_id, created_at, updated_at) VALUES
-- Tasks for ABC Corp Dallas Office Exchange (exch-001)
('task-001', 'Review and Execute Exchange Agreement', 'Client needs to review and sign the exchange agreement documents', 'completed', 'high', '2025-01-20', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-15T10:30:00Z', '2025-01-18T14:00:00Z'),
('task-002', 'Contact Qualified Intermediary', 'Coordinate with QI for fund transfer and exchange documentation', 'completed', 'high', '2025-01-25', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-15T11:00:00Z', '2025-01-24T09:00:00Z'),
('task-003', 'Schedule Property Inspections', 'Arrange inspections for identified replacement property', 'in_progress', 'medium', '2025-02-10', 'exch-001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '2025-01-28T13:00:00Z', '2025-01-28T13:00:00Z'),
('task-004', 'Review Purchase Agreement', 'Legal review of purchase agreement for replacement property', 'pending', 'high', '2025-02-15', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-30T10:00:00Z', '2025-01-30T10:00:00Z'),

-- Tasks for Smith Holdings Retail Property (exch-002)
('task-005', 'Identify Replacement Properties', 'Research and identify 3-5 potential replacement properties', 'in_progress', 'critical', '2025-02-20', 'exch-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-10T16:00:00Z', '2025-01-15T08:00:00Z'),
('task-006', 'Property Tours Coordination', 'Schedule tours for identified properties in target markets', 'pending', 'high', '2025-02-25', 'exch-002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '2025-01-15T14:00:00Z', '2025-01-15T14:00:00Z'),
('task-007', 'Financial Analysis Report', 'Prepare ROI analysis for each potential replacement property', 'pending', 'medium', '2025-02-22', 'exch-002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '2025-01-18T11:00:00Z', '2025-01-18T11:00:00Z'),

-- Tasks for Johnson Trust Apartment Complex (exch-003)
('task-008', 'Market Analysis for Target Areas', 'Research multifamily market conditions in target cities', 'completed', 'high', '2025-02-05', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '2025-02-01T09:30:00Z', '2025-02-04T16:00:00Z'),
('task-009', 'Engage Property Management Companies', 'Interview potential property management for replacement property', 'in_progress', 'medium', '2025-03-01', 'exch-003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '2025-02-10T10:00:00Z', '2025-02-10T10:00:00Z'),
('task-010', 'Environmental Assessment', 'Order Phase I environmental assessment for top 2 properties', 'pending', 'high', '2025-03-15', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '2025-02-15T13:00:00Z', '2025-02-15T13:00:00Z'),

-- Overdue tasks (for testing)
('task-011', 'Submit 45-Day Identification', 'URGENT: Submit formal identification of replacement properties', 'pending', 'critical', '2025-01-25', 'exch-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-20T08:00:00Z', '2025-01-20T08:00:00Z'),

-- Recurring tasks
('task-012', 'Weekly Status Update - ABC Corp', 'Provide weekly update to client on exchange progress', 'pending', 'low', '2025-02-07', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-31T09:00:00Z', '2025-01-31T09:00:00Z'),
('task-013', 'Monthly Compliance Review', 'Review all active exchanges for IRS compliance', 'pending', 'medium', '2025-02-28', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2025-01-28T10:00:00Z', '2025-01-28T10:00:00Z'),

-- Completed historical tasks
('task-014', 'Initial Client Consultation', 'Initial meeting to discuss exchange objectives', 'completed', 'medium', '2025-01-10', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-05T14:00:00Z', '2025-01-10T15:00:00Z'),
('task-015', 'Closing Coordination', 'Coordinate closing for relinquished property sale', 'completed', 'high', '2025-01-30', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2025-01-20T11:00:00Z', '2025-01-30T16:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  due_date = EXCLUDED.due_date,
  exchange_id = EXCLUDED.exchange_id,
  assigned_user_id = EXCLUDED.assigned_user_id,
  organization_id = EXCLUDED.organization_id,
  updated_at = NOW();