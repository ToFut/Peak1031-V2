-- 06-messages.sql
-- Seed data for messages table (exchange chat/communication)

INSERT INTO public.messages (id, content, sender_id, exchange_id, created_at) VALUES
-- Messages for ABC Corp Dallas Office Exchange (exch-001)
('msg-001', 'Good morning! I have initiated your 1031 exchange for the Dallas office building. The QI has been notified and we are ready to proceed.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-01-15T10:35:00Z'),
('msg-002', 'Thank you John. What are the next steps we need to take?', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'exch-001', '2025-01-15T11:15:00Z'),
('msg-003', 'The next step is to review and sign the exchange agreement I sent to your email. Once signed, we can proceed with setting up the QI account for the sale proceeds.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-01-15T11:20:00Z'),
('msg-004', 'I have reviewed and signed the agreement. Sending it back now.', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'exch-001', '2025-01-18T14:00:00Z'),
('msg-005', 'Perfect! I have received the signed agreement. The QI account is now active. Remember, we have until March 15 to identify replacement properties.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-01-18T14:30:00Z'),
('msg-006', 'We have identified a property in Plano that looks promising. Can we schedule a tour?', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'exch-001', '2025-01-25T09:00:00Z'),
('msg-007', 'Absolutely! I will coordinate with our agent Michael to schedule the tour. How does next Tuesday work for you?', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-01-25T09:30:00Z'),

-- Messages for Smith Holdings Retail Property (exch-002)
('msg-008', 'Urgent: We need to identify replacement properties soon. The 45-day deadline is approaching on February 28th.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-002', '2025-01-15T08:00:00Z'),
('msg-009', 'I understand. We are looking at properties in Dallas, Austin, and Houston. Will have a shortlist by end of week.', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'exch-002', '2025-01-15T10:00:00Z'),
('msg-010', 'Great. Please make sure we have at least 3 properties identified to be safe. I am scheduling tours for next week.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-002', '2025-01-15T10:15:00Z'),
('msg-011', 'Question: Can we identify properties in multiple states or should we stay in Texas?', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'exch-002', '2025-01-16T14:00:00Z'),
('msg-012', 'You can identify properties in any state. However, consider the management logistics if the property is far from your base of operations.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-002', '2025-01-16T14:30:00Z'),

-- Messages for Johnson Trust Apartment Complex (exch-003)
('msg-013', 'Welcome to your exchange journey! I am Sarah and will be your coordinator. The sale of your Arlington property closed successfully.', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'exch-003', '2025-02-25T16:00:00Z'),
('msg-014', 'Thank you Sarah. We are interested in multifamily properties with at least 40 units. Preferably newer construction.', 'llllllll-llll-llll-llll-llllllllllll', 'exch-003', '2025-02-26T09:00:00Z'),
('msg-015', 'I have found several properties matching your criteria. Sending you a detailed report with financial analysis for each.', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'exch-003', '2025-02-28T11:00:00Z'),
('msg-016', 'The property in Austin looks very promising. 52 units, built in 2018, 95% occupancy. Can we move forward with due diligence?', 'llllllll-llll-llll-llll-llllllllllll', 'exch-003', '2025-03-02T13:00:00Z'),

-- System messages
('msg-017', '[SYSTEM] Exchange status updated to "active". Sale proceeds of $2,500,000 have been received by the QI.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exch-001', '2025-01-30T17:00:00Z'),
('msg-018', '[SYSTEM] Reminder: 45-day identification deadline is in 20 days (March 15, 2025).', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exch-001', '2025-02-23T08:00:00Z'),
('msg-019', '[SYSTEM] Document uploaded: "Property_Inspection_Report_Plano.pdf"', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exch-001', '2025-02-15T14:00:00Z'),

-- Attorney/Third party messages
('msg-020', 'I have reviewed the purchase agreement for the Plano property. Found a few items that need clarification. See attached notes.', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'exch-001', '2025-02-18T10:00:00Z'),
('msg-021', 'Thank you Robert. I will discuss these points with the seller attorney and get back to you by EOD.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'exch-001', '2025-02-18T10:30:00Z')

ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  sender_id = EXCLUDED.sender_id,
  exchange_id = EXCLUDED.exchange_id,
  created_at = EXCLUDED.created_at;