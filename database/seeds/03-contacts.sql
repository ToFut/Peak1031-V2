-- 03-contacts.sql
-- Seed data for contacts table (clients, attorneys, intermediaries, etc.)

INSERT INTO public.contacts (id, display_name, first_name, last_name, email, phone, contact_type, company, organization_id, created_at, updated_at) VALUES
-- Clients
('cont-001', 'ABC Corporation', 'ABC', 'Corporation', 'exchanges@abccorp.com', '214-555-0100', 'Client', 'ABC Corporation', '11111111-1111-1111-1111-111111111111', '2024-03-01T10:00:00Z', '2024-03-01T10:00:00Z'),
('cont-002', 'Smith Holdings LLC', 'John', 'Smith', 'john@smithholdings.com', '972-555-0200', 'Client', 'Smith Holdings LLC', '11111111-1111-1111-1111-111111111111', '2024-03-05T11:00:00Z', '2024-03-05T11:00:00Z'),
('cont-003', 'Johnson Real Estate Trust', 'Mary', 'Johnson', 'mary@johnsonret.com', '469-555-0300', 'Client', 'Johnson Real Estate Trust', '11111111-1111-1111-1111-111111111111', '2024-03-10T09:00:00Z', '2024-03-10T09:00:00Z'),

-- Attorneys
('cont-004', 'Robert Wilson', 'Robert', 'Wilson', 'rwilson@wilsonlaw.com', '214-555-0400', 'Attorney', 'Wilson Law Firm', '11111111-1111-1111-1111-111111111111', '2024-02-15T14:00:00Z', '2024-02-15T14:00:00Z'),
('cont-005', 'Jennifer Davis', 'Jennifer', 'Davis', 'jdavis@davisllp.com', '972-555-0500', 'Attorney', 'Davis & Associates LLP', '11111111-1111-1111-1111-111111111111', '2024-02-20T15:00:00Z', '2024-02-20T15:00:00Z'),
('cont-006', 'Michael Chen', 'Michael', 'Chen', 'mchen@chenlaw.com', '469-555-0600', 'Attorney', 'Chen Legal Group', '11111111-1111-1111-1111-111111111111', '2024-02-25T16:00:00Z', '2024-02-25T16:00:00Z'),

-- Qualified Intermediaries
('cont-007', 'National Exchange Services', 'National Exchange', 'Services', 'info@nationalexchange.com', '800-555-0700', 'Intermediary', 'National Exchange Services Inc.', '11111111-1111-1111-1111-111111111111', '2024-01-15T08:00:00Z', '2024-01-15T08:00:00Z'),
('cont-008', 'Southwest QI Company', 'Southwest QI', 'Company', 'contact@southwestqi.com', '800-555-0800', 'Intermediary', 'Southwest Qualified Intermediary LLC', '11111111-1111-1111-1111-111111111111', '2024-01-20T09:00:00Z', '2024-01-20T09:00:00Z'),
('cont-009', 'American Deferred Exchange', 'American Deferred', 'Exchange', 'support@ade.com', '800-555-0900', 'Intermediary', 'American Deferred Exchange Corp.', '11111111-1111-1111-1111-111111111111', '2024-01-25T10:00:00Z', '2024-01-25T10:00:00Z'),

-- Title Companies
('cont-010', 'First Title Company', 'First Title', 'Company', 'closings@firsttitle.com', '214-555-1000', 'Title_Company', 'First Title Company of Texas', '11111111-1111-1111-1111-111111111111', '2024-02-01T11:00:00Z', '2024-02-01T11:00:00Z'),
('cont-011', 'Premier Title Services', 'Premier Title', 'Services', 'escrow@premiertitle.com', '972-555-1100', 'Title_Company', 'Premier Title Services LLC', '11111111-1111-1111-1111-111111111111', '2024-02-05T12:00:00Z', '2024-02-05T12:00:00Z'),
('cont-012', 'Landmark Title Insurance', 'Landmark Title', 'Insurance', 'orders@landmarktitle.com', '469-555-1200', 'Title_Company', 'Landmark Title Insurance Agency', '11111111-1111-1111-1111-111111111111', '2024-02-10T13:00:00Z', '2024-02-10T13:00:00Z'),

-- Real Estate Agents/Brokers
('cont-013', 'Patricia Miller', 'Patricia', 'Miller', 'pmiller@remax.com', '214-555-1300', 'Agent', 'RE/MAX Dallas', '11111111-1111-1111-1111-111111111111', '2024-03-15T14:00:00Z', '2024-03-15T14:00:00Z'),
('cont-014', 'James Thompson', 'James', 'Thompson', 'jthompson@kw.com', '972-555-1400', 'Agent', 'Keller Williams Realty', '11111111-1111-1111-1111-111111111111', '2024-03-20T15:00:00Z', '2024-03-20T15:00:00Z'),
('cont-015', 'Linda Garcia', 'Linda', 'Garcia', 'lgarcia@cbdfw.com', '469-555-1500', 'Agent', 'Coldwell Banker DFW', '11111111-1111-1111-1111-111111111111', '2024-03-25T16:00:00Z', '2024-03-25T16:00:00Z'),

-- Accountants/CPAs
('cont-016', 'Richard Brown CPA', 'Richard', 'Brown', 'rbrown@browncpa.com', '214-555-1600', 'Accountant', 'Brown & Associates CPAs', '11111111-1111-1111-1111-111111111111', '2024-04-01T09:00:00Z', '2024-04-01T09:00:00Z'),
('cont-017', 'Susan Lee', 'Susan', 'Lee', 'slee@leetax.com', '972-555-1700', 'Accountant', 'Lee Tax Advisory Group', '11111111-1111-1111-1111-111111111111', '2024-04-05T10:00:00Z', '2024-04-05T10:00:00Z'),
('cont-018', 'David Martinez', 'David', 'Martinez', 'dmartinez@mtzcpa.com', '469-555-1800', 'Accountant', 'Martinez CPA Firm', '11111111-1111-1111-1111-111111111111', '2024-04-10T11:00:00Z', '2024-04-10T11:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  contact_type = EXCLUDED.contact_type,
  company = EXCLUDED.company,
  organization_id = EXCLUDED.organization_id,
  updated_at = NOW();