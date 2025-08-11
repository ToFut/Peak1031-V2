#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple exchanges using only basic fields
const simpleExchanges = [
  {
    id: 'exch-001',
    exchange_name: 'ABC Corp Dallas Office Building Exchange',
    status: 'active',
    day_45_deadline: '2025-03-15',
    day_180_deadline: '2025-08-15',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'exch-002', 
    exchange_name: 'Smith Holdings Retail Property Exchange',
    status: 'pending_45_day',
    day_45_deadline: '2025-02-28',
    day_180_deadline: '2025-07-28',
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-10T15:00:00Z'
  },
  {
    id: 'exch-003',
    exchange_name: 'Johnson Trust Apartment Complex Exchange', 
    status: 'identifying',
    day_45_deadline: '2025-04-10',
    day_180_deadline: '2025-09-10',
    created_at: '2025-02-01T09:00:00Z',
    updated_at: '2025-02-20T14:00:00Z'
  }
];

async function seedSimpleExchanges() {
  console.log('🌱 Seeding simple exchange data...');
  
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .upsert(simpleExchanges, { 
        onConflict: 'id',
        returning: 'minimal'
      });

    if (error) {
      console.error('❌ Error seeding exchanges:', error);
      return;
    }

    console.log(`✅ Successfully seeded ${simpleExchanges.length} exchanges`);
    
    // Verify
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('*');
      
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }
    
    console.log(`📊 Total exchanges in database: ${verifyData?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

seedSimpleExchanges().then(() => {
  console.log('🌟 Seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});