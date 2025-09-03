-- =================================================================
-- ADD SPECIFIC EXCHANGE: Ofer Butt - 10982 Roebling Avenue #363
-- Exchange ID: 4b7e0059-8154-4443-ae85-a0549edec8c4
-- PP Matter Number: 7981
-- =================================================================

-- First, add new fields to exchanges table if they don't exist
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS pp_matter_number INTEGER,
ADD COLUMN IF NOT EXISTS rel_property_address TEXT,
ADD COLUMN IF NOT EXISTS rel_property_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS rel_apn VARCHAR(50),
ADD COLUMN IF NOT EXISTS rel_escrow_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS rel_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS rel_contract_date DATE,
ADD COLUMN IF NOT EXISTS contract_type TEXT,
ADD COLUMN IF NOT EXISTS expected_closing_date DATE,
ADD COLUMN IF NOT EXISTS exchange_agreement_drafted DATE,
ADD COLUMN IF NOT EXISTS settlement_agent VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_vesting TEXT,
ADD COLUMN IF NOT EXISTS buyer_vesting TEXT,
ADD COLUMN IF NOT EXISTS buyer_1_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS buyer_2_name VARCHAR(255);

-- Insert/Update the client contact: Ofer Butt
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    email,
    pp_contact_id,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    'b94a6162-8528-4b29-84ad-408b61784088',
    'Ofer',
    'Butt',
    'Ofer Butt',
    'ofer.butt@example.com', -- Placeholder email, update with real if available
    'b94a6162-8528-4b29-84ad-408b61784088', -- PP ID
    ARRAY['client'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    pp_contact_id = EXCLUDED.pp_contact_id,
    updated_at = NOW();

-- Insert/Update the assigned user: Mark Potente
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    email,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Mark',
    'Potente',
    'Mark Potente',
    'mark_potente@yahoo.com',
    ARRAY['assigned_user'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Insert/Update Internal Credit: Steve Rosansky
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Steve',
    'Rosansky',
    'Steve Rosansky',
    ARRAY['internal_credit'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (display_name) DO NOTHING;

-- Insert/Update Referral Source: Josh Afi
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    email,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Josh',
    'Afi',
    'Josh Afi',
    'joshafi247@gmail.com',
    ARRAY['referral_source'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Insert/Update Settlement Agent: Bryan Spoltore
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Bryan',
    'Spoltore',
    'Bryan Spoltore',
    ARRAY['settlement_agent'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (display_name) DO NOTHING;

-- Insert/Update Buyer 1: Sanjeev Subherwal
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Sanjeev',
    'Subherwal',
    'Sanjeev Subherwal',
    ARRAY['buyer'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (display_name) DO NOTHING;

-- Insert/Update Buyer 2: Aarush Subherwal
INSERT INTO contacts (
    id,
    first_name,
    last_name,
    display_name,
    contact_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Aarush',
    'Subherwal',
    'Aarush Subherwal',
    ARRAY['buyer'],
    true,
    NOW(),
    NOW()
) ON CONFLICT (display_name) DO NOTHING;

-- Insert the specific exchange
INSERT INTO exchanges (
    id,
    exchange_number,
    name,
    exchange_type,
    client_id,
    status,
    pp_matter_id,
    pp_matter_number,
    pp_display_name,
    relinquished_property_value,
    rel_property_address,
    rel_property_type,
    rel_apn,
    rel_escrow_number,
    rel_value,
    rel_contract_date,
    contract_type,
    expected_closing_date,
    exchange_agreement_drafted,
    settlement_agent,
    client_vesting,
    buyer_vesting,
    buyer_1_name,
    buyer_2_name,
    sale_date,
    identification_deadline,
    exchange_deadline,
    tags,
    is_active,
    created_at,
    updated_at
) VALUES (
    '4b7e0059-8154-4443-ae85-a0549edec8c4',
    'EX-2025-7981',
    'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
    'delayed',
    'b94a6162-8528-4b29-84ad-408b61784088', -- Ofer Butt's contact ID
    'active', -- Status: Open
    '7981-matter-id', -- PP Matter ID placeholder
    7981, -- PP Matter Number: 7981
    'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
    588000.00, -- Value: $588,000
    '10982 Roebling Avenue #363, Los Angeles, CA 90024', -- Address
    'Residential', -- Type: Residential
    '4363-007-106', -- APN: 4363-007-106
    'CA-25-26225', -- Escrow Number: CA-25-26225
    588000.00, -- Value: $588,000
    '2025-08-28', -- Contract Date: August 28, 2025
    'Residential Purchase Agreement and Joint Escrow Instructions', -- Contract Type
    '2025-09-17', -- Expected Closing: September 17, 2025
    '2025-08-29', -- Exchange Agreement Drafted: August 29, 2025
    'Bryan Spoltore', -- Settlement Agent
    'Ofer Butt', -- Client Vesting: Ofer Butt
    'Sanjeev Subherwal and Aarush Subherwal', -- Buyer Vesting
    'Sanjeev Subherwal', -- Buyer 1: Sanjeev Subherwal
    'Aarush Subherwal', -- Buyer 2: Aarush Subherwal
    '2025-08-29', -- Sale date (created date)
    '2025-10-13', -- Identification deadline (45 days from sale)
    '2026-02-25', -- Exchange deadline (180 days from sale)
    ARRAY['residential', 'los-angeles', 'delayed'],
    true,
    '2025-08-29 00:00:00+00', -- Created: August 29, 2025
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    pp_matter_number = EXCLUDED.pp_matter_number,
    pp_display_name = EXCLUDED.pp_display_name,
    rel_property_address = EXCLUDED.rel_property_address,
    rel_property_type = EXCLUDED.rel_property_type,
    rel_apn = EXCLUDED.rel_apn,
    rel_escrow_number = EXCLUDED.rel_escrow_number,
    rel_value = EXCLUDED.rel_value,
    rel_contract_date = EXCLUDED.rel_contract_date,
    contract_type = EXCLUDED.contract_type,
    expected_closing_date = EXCLUDED.expected_closing_date,
    exchange_agreement_drafted = EXCLUDED.exchange_agreement_drafted,
    settlement_agent = EXCLUDED.settlement_agent,
    client_vesting = EXCLUDED.client_vesting,
    buyer_vesting = EXCLUDED.buyer_vesting,
    buyer_1_name = EXCLUDED.buyer_1_name,
    buyer_2_name = EXCLUDED.buyer_2_name,
    updated_at = NOW();

-- Create exchange participants for all involved parties
INSERT INTO exchange_participants (
    exchange_id,
    contact_id,
    role,
    is_primary,
    is_decision_maker,
    permission_level,
    can_view_documents,
    can_upload_documents,
    can_comment,
    can_view_financial,
    receive_notifications,
    created_at
) VALUES 
-- Client: Ofer Butt
(
    '4b7e0059-8154-4443-ae85-a0549edec8c4',
    'b94a6162-8528-4b29-84ad-408b61784088',
    'client',
    true,
    true,
    'full_access',
    true,
    true,
    true,
    true,
    true,
    NOW()
),
-- Assigned User: Mark Potente
(
    '4b7e0059-8154-4443-ae85-a0549edec8c4',
    (SELECT id FROM contacts WHERE email = 'mark_potente@yahoo.com' LIMIT 1),
    'coordinator',
    false,
    false,
    'full_access',
    true,
    true,
    true,
    true,
    true,
    NOW()
),
-- Referral Source: Josh Afi
(
    '4b7e0059-8154-4443-ae85-a0549edec8c4',
    (SELECT id FROM contacts WHERE email = 'joshafi247@gmail.com' LIMIT 1),
    'referral',
    false,
    false,
    'view_only',
    true,
    false,
    true,
    false,
    true,
    NOW()
)
ON CONFLICT (exchange_id, contact_id) DO NOTHING;

-- Add indexes for new searchable fields
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_number ON exchanges(pp_matter_number);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_address ON exchanges USING GIN (to_tsvector('english', rel_property_address));
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_type ON exchanges(rel_property_type);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_apn ON exchanges(rel_apn);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_escrow_number ON exchanges(rel_escrow_number);
CREATE INDEX IF NOT EXISTS idx_exchanges_client_vesting ON exchanges USING GIN (to_tsvector('english', client_vesting));
CREATE INDEX IF NOT EXISTS idx_exchanges_buyer_names ON exchanges USING GIN (to_tsvector('english', buyer_1_name || ' ' || COALESCE(buyer_2_name, '')));

-- Update exchange name to include full searchable name
UPDATE exchanges 
SET name = 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA'
WHERE id = '4b7e0059-8154-4443-ae85-a0549edec8c4';

-- Add comments for documentation
COMMENT ON COLUMN exchanges.pp_matter_number IS 'PracticePanther Matter Number for cross-reference';
COMMENT ON COLUMN exchanges.rel_property_address IS 'Full address of relinquished property';
COMMENT ON COLUMN exchanges.rel_property_type IS 'Type of relinquished property (Residential, Commercial, etc.)';
COMMENT ON COLUMN exchanges.rel_apn IS 'Assessor Parcel Number of relinquished property';
COMMENT ON COLUMN exchanges.rel_escrow_number IS 'Escrow account number';
COMMENT ON COLUMN exchanges.client_vesting IS 'How the client holds title to the property';
COMMENT ON COLUMN exchanges.buyer_vesting IS 'How the buyers will hold title';
COMMENT ON COLUMN exchanges.settlement_agent IS 'Settlement agent or escrow officer name';