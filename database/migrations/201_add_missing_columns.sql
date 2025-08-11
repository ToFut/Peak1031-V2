-- =================================================================
-- INCREMENTAL MIGRATION: Add Missing Columns to Existing Tables
-- This adds all the PP fields and new columns without recreating tables
-- =================================================================

-- First, let's add the missing columns to existing tables

-- =================================================================
-- 1. ADD MISSING COLUMNS TO EXCHANGES TABLE
-- =================================================================

-- Financial columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_property_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_property_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS cash_boot DECIMAL(12,2) DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS financing_amount DECIMAL(15,2);

-- Timeline columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS sale_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identification_deadline DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_deadline DATE;

-- Status columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS substatus VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Properties
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_properties JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_properties JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_locations JSONB DEFAULT '{}';

-- Compliance
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS regulatory_requirements JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending';

-- Chat System
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_chat_id UUID DEFAULT gen_random_uuid();
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true;

-- ALL PracticePanther Matter Fields
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_id VARCHAR(36);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_id VARCHAR(36);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_display_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_number INTEGER;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_display_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_notes TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_rate VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_open_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_close_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_statute_of_limitation_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_tags TEXT[] DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_status VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_assigned_to_users JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_practice_area VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_type VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_billing_info JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_custom_field_values JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Analytics
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS estimated_fees DECIMAL(12,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS actual_fees DECIMAL(12,2);

-- Make exchange_chat_id unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchanges_chat_id_unique ON exchanges(exchange_chat_id);

-- Add generated columns (these need to be done separately)
DO $$ 
BEGIN
    -- Add exchange_value computed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchanges' AND column_name = 'exchange_value'
    ) THEN
        ALTER TABLE exchanges ADD COLUMN exchange_value DECIMAL(15,2) 
        GENERATED ALWAYS AS (
            COALESCE(relinquished_property_value, 0) + COALESCE(replacement_property_value, 0)
        ) STORED;
    END IF;
    
    -- Add days_remaining computed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchanges' AND column_name = 'days_remaining'
    ) THEN
        ALTER TABLE exchanges ADD COLUMN days_remaining INTEGER 
        GENERATED ALWAYS AS (
            CASE 
                WHEN exchange_deadline IS NULL THEN NULL
                ELSE exchange_deadline - CURRENT_DATE
            END
        ) STORED;
    END IF;
    
    -- Add profitability computed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchanges' AND column_name = 'profitability'
    ) THEN
        ALTER TABLE exchanges ADD COLUMN profitability DECIMAL(12,2) 
        GENERATED ALWAYS AS (
            COALESCE(actual_fees, 0) - COALESCE(estimated_fees, 0)
        ) STORED;
    END IF;
END $$;

-- =================================================================
-- 2. ADD MISSING COLUMNS TO CONTACTS TABLE
-- =================================================================

-- Core contact info
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_work VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_home VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_fax VARCHAR(20);

-- Address
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'USA';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS coordinates POINT;

-- Business context
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS title VARCHAR(100);

-- Relationship intelligence
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_contact_for UUID;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assistant_contact_id UUID;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_strength INTEGER;

-- Financial intelligence
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS credit_score INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS net_worth_estimate DECIMAL(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS investment_capacity DECIMAL(15,2);

-- Communication preferences
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) DEFAULT 'email';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- ALL PracticePanther Contact Fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_id VARCHAR(36);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_account_ref_id VARCHAR(36);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_account_ref_display_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_is_primary_contact BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_display_name VARCHAR(300);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_first_name VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_middle_name VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_last_name VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_phone_mobile VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_phone_home VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_phone_fax VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_phone_work VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_email VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_custom_field_values JSONB DEFAULT '[]';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_address JSONB DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_company VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_title VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Intelligence & metadata
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 50;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_followup_date DATE;

-- Create unique index for pp_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_pp_id_unique ON contacts(pp_id) WHERE pp_id IS NOT NULL;

-- =================================================================
-- 3. ADD MISSING COLUMNS TO TASKS TABLE
-- =================================================================

-- Core task info
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Timeline
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_duration INTERVAL;

-- Status & priority
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 50;

-- Progress & quality
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS quality_score INTEGER;

-- Dependencies
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on_tasks UUID[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocks_tasks UUID[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id UUID;

-- Automation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_assign_rules JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_rules JSONB DEFAULT '{}';

-- ALL PracticePanther Task Fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_matter_ref_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_matter_ref_display_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_assigned_to_users JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_assigned_to_contacts JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_completed_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_priority VARCHAR(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_status VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_task_type VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_tags JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_custom_field_values JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_time_estimated INTERVAL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_time_actual INTERVAL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_billable BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_billed BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Metadata
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Add computed column for actual_duration
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'actual_duration'
    ) THEN
        ALTER TABLE tasks ADD COLUMN actual_duration INTERVAL 
        GENERATED ALWAYS AS (
            CASE 
                WHEN completed_at IS NULL OR start_date IS NULL THEN NULL
                ELSE completed_at - start_date
            END
        ) STORED;
    END IF;
END $$;

-- Create unique index for pp_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_pp_id_unique ON tasks(pp_id) WHERE pp_id IS NOT NULL;

-- =================================================================
-- 4. UPDATE/CREATE USERS TABLE WITH PP FIELDS
-- =================================================================

-- Add missing columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_work VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_home VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_fax VARCHAR(20);

-- Address
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'USA';

-- Business context
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bar_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_numbers JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

-- Communication
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- PP Integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_user_id VARCHAR(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_display_name VARCHAR(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_middle_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_phone_work VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_phone_mobile VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_phone_home VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_phone_fax VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Metadata
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Create unique index for pp_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pp_id_unique ON users(pp_user_id) WHERE pp_user_id IS NOT NULL;

-- =================================================================
-- 5. ADD COLUMNS TO EXISTING TABLES OR CREATE IF NOT EXISTS
-- =================================================================

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    exchange_id UUID REFERENCES exchanges(id),
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    invoice_type VARCHAR(50) DEFAULT 'service',
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 4) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    amount_outstanding DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    
    -- PP Integration
    pp_id VARCHAR(36) UNIQUE,
    pp_account_ref_id VARCHAR(36),
    pp_account_ref_display_name TEXT,
    pp_matter_ref_id VARCHAR(36),
    pp_matter_ref_display_name TEXT,
    pp_issue_date TIMESTAMP WITH TIME ZONE,
    pp_due_date TIMESTAMP WITH TIME ZONE,
    pp_items_time_entries JSONB DEFAULT '[]',
    pp_items_expenses JSONB DEFAULT '[]',
    pp_items_flat_fees JSONB DEFAULT '[]',
    pp_subtotal INTEGER DEFAULT 0,
    pp_tax INTEGER DEFAULT 0,
    pp_discount INTEGER DEFAULT 0,
    pp_total INTEGER DEFAULT 0,
    pp_total_paid INTEGER DEFAULT 0,
    pp_total_outstanding INTEGER DEFAULT 0,
    pp_invoice_type VARCHAR(50),
    pp_status VARCHAR(50),
    pp_payment_terms VARCHAR(100),
    pp_notes TEXT,
    pp_custom_field_values JSONB DEFAULT '[]',
    pp_created_at TIMESTAMP WITH TIME ZONE,
    pp_updated_at TIMESTAMP WITH TIME ZONE,
    pp_synced_at TIMESTAMP WITH TIME ZONE,
    pp_raw_data JSONB DEFAULT '{}',
    
    payment_terms VARCHAR(100),
    payment_method VARCHAR(50),
    payment_instructions TEXT,
    line_items JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =================================================================
-- 6. ADD BASIC INDEXES FOR PERFORMANCE
-- =================================================================

-- Exchange indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_id ON exchanges(pp_matter_id) WHERE pp_matter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines ON exchanges(identification_deadline, exchange_deadline);

-- Contact indexes  
CREATE INDEX IF NOT EXISTS idx_contacts_pp_account_ref ON contacts(pp_account_ref_id) WHERE pp_account_ref_id IS NOT NULL;

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_exchange_id ON tasks(exchange_id) WHERE exchange_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_pp_matter_ref ON tasks(pp_matter_ref_id) WHERE pp_matter_ref_id IS NOT NULL;

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_exchange_id ON invoices(exchange_id) WHERE exchange_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_pp_id ON invoices(pp_id) WHERE pp_id IS NOT NULL;

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================

/*
✅ INCREMENTAL MIGRATION COMPLETED!

Added ALL missing columns for complete PracticePanther integration:

📊 EXCHANGES TABLE:
- ✅ Financial fields (relinquished_property_value, replacement_property_value, etc.)
- ✅ Timeline fields (identification_deadline, exchange_deadline, days_remaining)
- ✅ ALL PP matter fields (pp_matter_id, pp_account_ref_id, pp_custom_field_values, etc.)
- ✅ Chat system (exchange_chat_id, chat_enabled)
- ✅ Analytics (estimated_fees, actual_fees, profitability)

📞 CONTACTS TABLE:
- ✅ ALL PP contact fields (pp_id, pp_account_ref_id, pp_custom_field_values, etc.)
- ✅ Enhanced contact info (all phone types, address, business context)
- ✅ Intelligence fields (importance_score, relationship_strength, etc.)

✅ TASKS TABLE:
- ✅ ALL PP task fields (pp_id, pp_assigned_to_users, pp_custom_field_values, etc.)
- ✅ Enhanced workflow (dependencies, automation rules, quality scoring)

👤 USERS TABLE:
- ✅ PP integration fields (pp_user_id, pp_permissions, etc.)
- ✅ Enhanced profile info (all phone types, address, business context)

💰 INVOICES TABLE:
- ✅ Complete PP invoice integration
- ✅ Financial intelligence with computed columns

🚀 READY TO SYNC ALL PRACTICEPANTHER DATA!
Next: Run node scripts/test-comprehensive-sync.js
*/