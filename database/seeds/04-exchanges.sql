-- 04-exchanges.sql
-- Seed data for exchanges table

INSERT INTO public.exchanges (id, exchange_name, status, client_id, coordinator_id, organization_id, day_45_deadline, day_180_deadline, sale_property, purchase_property, created_at, updated_at) VALUES
-- Active exchanges
('exch-001', 'ABC Corp Dallas Office Building Exchange', 'active', 'cont-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 
  '2025-03-15', '2025-08-15', 
  '{"address": "1234 Main Street, Dallas, TX 75201", "type": "Office Building", "sale_price": 2500000, "closing_date": "2025-01-30", "square_feet": 15000, "year_built": 1985}',
  '{"address": "5678 Commerce Street, Plano, TX 75024", "type": "Office Building", "target_price": 2800000, "target_closing_date": "2025-06-15", "identified": true, "under_contract": false}',
  '2025-01-15T10:00:00Z', '2025-01-15T10:00:00Z'),

('exch-002', 'Smith Holdings Retail Property Exchange', 'pending_45_day', 'cont-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
  '2025-02-28', '2025-07-28',
  '{"address": "789 Oak Avenue, Fort Worth, TX 76102", "type": "Retail Strip Center", "sale_price": 3500000, "closing_date": "2025-01-10", "square_feet": 22000, "year_built": 1995, "tenants": 8}',
  '{"status": "identifying", "target_price": 3800000, "property_types": ["Retail", "Mixed Use"], "target_markets": ["Dallas", "Austin", "Houston"]}',
  '2025-01-05T11:00:00Z', '2025-01-10T15:00:00Z'),

('exch-003', 'Johnson Trust Apartment Complex Exchange', 'identifying', 'cont-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
  '2025-04-10', '2025-09-10',
  '{"address": "321 Elm Street, Arlington, TX 76010", "type": "Multifamily", "sale_price": 5200000, "closing_date": "2025-02-25", "units": 48, "year_built": 2001, "occupancy_rate": 0.92}',
  '{"status": "identifying", "target_price": 5500000, "property_types": ["Multifamily", "Senior Living"], "minimum_units": 40}',
  '2025-02-01T09:00:00Z', '2025-02-20T14:00:00Z'),

-- Completed exchanges
('exch-004', 'ABC Corp Industrial Warehouse Exchange', 'completed', 'cont-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
  '2024-09-15', '2025-02-15',
  '{"address": "999 Industrial Blvd, Irving, TX 75038", "type": "Industrial", "sale_price": 1800000, "closing_date": "2024-08-01", "square_feet": 25000, "loading_docks": 4}',
  '{"address": "1111 Distribution Way, Mesquite, TX 75149", "type": "Industrial", "purchase_price": 2100000, "closing_date": "2024-12-15", "square_feet": 30000, "loading_docks": 6}',
  '2024-07-15T08:00:00Z', '2024-12-15T16:00:00Z'),

('exch-005', 'Smith Holdings Office to Retail Exchange', 'completed', 'cont-002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
  '2024-08-20', '2025-01-20',
  '{"address": "555 Business Park Dr, Richardson, TX 75081", "type": "Office", "sale_price": 2200000, "closing_date": "2024-07-05", "square_feet": 18000}',
  '{"address": "777 Shopping Center Ln, Frisco, TX 75034", "type": "Retail", "purchase_price": 2400000, "closing_date": "2024-11-20", "square_feet": 16000, "anchor_tenant": "Whole Foods"}',
  '2024-06-20T10:00:00Z', '2024-11-20T15:00:00Z'),

-- Failed exchange
('exch-006', 'Johnson Trust Failed Exchange', 'failed', 'cont-003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
  '2024-10-01', '2025-03-01',
  '{"address": "888 Failed St, Dallas, TX 75201", "type": "Office", "sale_price": 1500000, "closing_date": "2024-08-15"}',
  '{"status": "failed_to_identify", "reason": "Could not find suitable replacement property within 45-day identification period"}',
  '2024-08-01T11:00:00Z', '2024-10-01T17:00:00Z'),

-- Pending exchanges with various statuses
('exch-007', 'New Client Exchange - Under Review', 'draft', 'cont-013', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
  NULL, NULL,
  '{"address": "TBD", "type": "Commercial", "estimated_sale_price": 3000000, "target_closing_date": "2025-03-01"}',
  '{}',
  '2025-01-20T13:00:00Z', '2025-01-20T13:00:00Z'),

('exch-008', 'Complex Multi-Property Exchange', 'active', 'cont-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
  '2025-03-30', '2025-08-30',
  '{"properties": [{"address": "100 First St, Dallas, TX", "sale_price": 1000000}, {"address": "200 Second Ave, Dallas, TX", "sale_price": 1200000}], "total_sale_price": 2200000, "closing_date": "2025-02-15"}',
  '{"target_property": {"address": "500 Fifth Plaza, Austin, TX 78701", "type": "Mixed Use", "purchase_price": 2500000, "identified": true, "under_contract": true}}',
  '2025-02-01T10:00:00Z', '2025-02-10T11:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  exchange_name = EXCLUDED.exchange_name,
  status = EXCLUDED.status,
  client_id = EXCLUDED.client_id,
  coordinator_id = EXCLUDED.coordinator_id,
  organization_id = EXCLUDED.organization_id,
  day_45_deadline = EXCLUDED.day_45_deadline,
  day_180_deadline = EXCLUDED.day_180_deadline,
  sale_property = EXCLUDED.sale_property,
  purchase_property = EXCLUDED.purchase_property,
  updated_at = NOW();