-- 07-documents.sql
-- Seed data for documents table

INSERT INTO public.documents (id, filename, file_type, file_size, file_url, exchange_id, uploaded_by, created_at) VALUES
-- Documents for ABC Corp Dallas Office Exchange (exch-001)
('doc-001', 'Exchange_Agreement_ABC_Corp.pdf', 'application/pdf', 245000, '/documents/exch-001/exchange_agreement.pdf', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-15T11:00:00Z'),
('doc-002', 'Sale_Contract_Dallas_Office.pdf', 'application/pdf', 380000, '/documents/exch-001/sale_contract.pdf', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-16T09:00:00Z'),
('doc-003', 'QI_Agreement_National_Exchange.pdf', 'application/pdf', 195000, '/documents/exch-001/qi_agreement.pdf', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-20T14:00:00Z'),
('doc-004', 'Property_Inspection_Report_Plano.pdf', 'application/pdf', 2500000, '/documents/exch-001/inspection_report_plano.pdf', 'exch-001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-02-15T14:00:00Z'),
('doc-005', 'Financial_Analysis_Replacement_Properties.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 125000, '/documents/exch-001/financial_analysis.xlsx', 'exch-001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-28T16:00:00Z'),
('doc-006', 'Title_Report_Dallas_Property.pdf', 'application/pdf', 450000, '/documents/exch-001/title_report_dallas.pdf', 'exch-001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '2025-01-22T10:00:00Z'),

-- Documents for Smith Holdings Retail Property (exch-002)
('doc-007', 'Exchange_Agreement_Smith_Holdings.pdf', 'application/pdf', 248000, '/documents/exch-002/exchange_agreement.pdf', 'exch-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-05T14:00:00Z'),
('doc-008', 'Property_Photos_Fort_Worth_Retail.zip', 'application/zip', 15800000, '/documents/exch-002/property_photos.zip', 'exch-002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2025-01-08T11:00:00Z'),
('doc-009', 'Market_Analysis_Texas_Retail.pdf', 'application/pdf', 890000, '/documents/exch-002/market_analysis.pdf', 'exch-002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-01-12T13:00:00Z'),
('doc-010', 'Tenant_Rent_Roll_Current.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 98000, '/documents/exch-002/rent_roll.xlsx', 'exch-002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-01-10T15:00:00Z'),

-- Documents for Johnson Trust Apartment Complex (exch-003)
('doc-011', 'Exchange_Agreement_Johnson_Trust.pdf', 'application/pdf', 252000, '/documents/exch-003/exchange_agreement.pdf', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-02-01T10:00:00Z'),
('doc-012', 'Multifamily_Market_Report_Q1_2025.pdf', 'application/pdf', 3200000, '/documents/exch-003/market_report.pdf', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-02-28T11:00:00Z'),
('doc-013', 'Property_Brochure_Austin_52_Units.pdf', 'application/pdf', 5600000, '/documents/exch-003/austin_property_brochure.pdf', 'exch-003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2025-03-01T14:00:00Z'),
('doc-014', 'Operating_Statements_2023_2024.pdf', 'application/pdf', 780000, '/documents/exch-003/operating_statements.pdf', 'exch-003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-02-05T16:00:00Z'),

-- Legal documents
('doc-015', 'IRS_Form_8824_Instructions.pdf', 'application/pdf', 125000, '/documents/general/irs_form_8824.pdf', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-01-01T08:00:00Z'),
('doc-016', 'Texas_1031_Exchange_Guidelines.pdf', 'application/pdf', 340000, '/documents/general/texas_guidelines.pdf', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-01-01T08:00:00Z'),
('doc-017', 'Purchase_Agreement_Template.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 68000, '/documents/templates/purchase_agreement.docx', NULL, 'ffffffff-ffff-ffff-ffff-ffffffffffff', '2025-01-10T10:00:00Z'),

-- Completed exchange documents
('doc-018', 'Closing_Statement_Final.pdf', 'application/pdf', 185000, '/documents/exch-004/closing_statement.pdf', 'exch-004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-12-15T16:00:00Z'),
('doc-019', 'Exchange_Completion_Certificate.pdf', 'application/pdf', 95000, '/documents/exch-004/completion_certificate.pdf', 'exch-004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-12-16T09:00:00Z'),
('doc-020', 'Final_Tax_Documentation.zip', 'application/zip', 2400000, '/documents/exch-004/tax_docs.zip', 'exch-004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-12-20T14:00:00Z')

ON CONFLICT (id) DO UPDATE SET
  filename = EXCLUDED.filename,
  file_type = EXCLUDED.file_type,
  file_size = EXCLUDED.file_size,
  file_url = EXCLUDED.file_url,
  exchange_id = EXCLUDED.exchange_id,
  uploaded_by = EXCLUDED.uploaded_by,
  created_at = EXCLUDED.created_at;