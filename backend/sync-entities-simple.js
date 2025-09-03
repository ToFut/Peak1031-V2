#!/usr/bin/env node

/**
 * Simple Entity Sync - Extract entities from PP data and populate people table
 * Uses only existing columns in the people table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

// Parse name into components
function parseName(fullName) {
  if (!fullName) return { first_name: '', last_name: '' };
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  const lastName = parts.pop();
  const firstName = parts.join(' ');
  return { first_name: firstName, last_name: lastName };
}

async function syncEntities() {
  console.log('=================================================');
  console.log('🔄 SIMPLE ENTITY EXTRACTION AND SYNC');
  console.log('=================================================\n');
  
  try {
    // Get exchanges with PP data
    const { data: exchanges, error: fetchError } = await supabase
      .from('exchanges')
      .select('id, name, pp_data, buyer_1_name, buyer_2_name, rep_1_seller_1_name, rep_1_seller_2_name')
      .not('pp_data', 'is', null)
      .limit(50); // Process first 50 for testing
      
    if (fetchError) {
      console.error('Error fetching exchanges:', fetchError);
      return;
    }
    
    // Filter exchanges with actual PP data
    const withData = exchanges.filter(ex => 
      ex.pp_data && Object.keys(ex.pp_data).length > 5
    );
    
    console.log(`📊 Processing ${withData.length} exchanges with PP data\n`);
    
    let totalCreated = 0;
    let totalUpdated = 0;
    
    for (const exchange of withData) {
      const entities = [];
      
      // Extract entities from PP data
      
      // 1. Assigned users (coordinators, attorneys)
      if (exchange.pp_data.assigned_to_users) {
        for (const user of exchange.pp_data.assigned_to_users) {
          const parsed = parseName(user.display_name);
          entities.push({
            ...parsed,
            email: user.email || `${user.id}@practicepanther.com`,
            pp_contact_id: user.id?.toString(),
            contact_type: 'attorney',
            source: 'pp_assigned_user'
          });
        }
      }
      
      // 2. Buyers from custom fields
      if (exchange.buyer_1_name) {
        const parsed = parseName(exchange.buyer_1_name);
        entities.push({
          ...parsed,
          contact_type: 'buyer',
          source: 'pp_custom_field'
        });
      }
      
      if (exchange.buyer_2_name) {
        const parsed = parseName(exchange.buyer_2_name);
        entities.push({
          ...parsed,
          contact_type: 'buyer',
          source: 'pp_custom_field'
        });
      }
      
      // 3. Sellers from custom fields
      if (exchange.rep_1_seller_1_name) {
        const parsed = parseName(exchange.rep_1_seller_1_name);
        entities.push({
          ...parsed,
          contact_type: 'seller',
          source: 'pp_custom_field'
        });
      }
      
      if (exchange.rep_1_seller_2_name) {
        const parsed = parseName(exchange.rep_1_seller_2_name);
        entities.push({
          ...parsed,
          contact_type: 'seller',
          source: 'pp_custom_field'
        });
      }
      
      // 4. Primary client from PP data
      if (exchange.pp_data.client_name) {
        const parsed = parseName(exchange.pp_data.client_name);
        entities.push({
          ...parsed,
          pp_contact_id: exchange.pp_data.client_id?.toString(),
          contact_type: 'client',
          source: 'pp_client'
        });
      }
      
      console.log(`Processing ${exchange.name}: ${entities.length} entities`);
      
      // Sync each entity to people table
      for (const entity of entities) {
        if (!entity.first_name && !entity.last_name) continue;
        
        try {
          // Check if person exists
          let query = supabase.from('people').select('id, assigned_exchanges');
          
          if (entity.pp_contact_id) {
            query = query.eq('pp_contact_id', entity.pp_contact_id);
          } else if (entity.email) {
            query = query.eq('email', entity.email);
          } else {
            query = query.eq('first_name', entity.first_name)
                        .eq('last_name', entity.last_name);
          }
          
          const { data: existing } = await query.single();
          
          if (existing) {
            // Update existing person
            const assignedExchanges = existing.assigned_exchanges || [];
            if (!assignedExchanges.includes(exchange.id)) {
              assignedExchanges.push(exchange.id);
            }
            
            const { error: updateError } = await supabase
              .from('people')
              .update({
                assigned_exchanges: assignedExchanges,
                contact_type: entity.contact_type,
                last_exchange_assignment: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
              
            if (!updateError) {
              console.log(`  ✓ Updated: ${entity.first_name} ${entity.last_name} (${entity.contact_type})`);
              totalUpdated++;
            }
          } else {
            // Create new person
            const personData = {
              first_name: entity.first_name,
              last_name: entity.last_name,
              email: entity.email || `${entity.first_name.toLowerCase()}.${entity.last_name.toLowerCase()}@example.com`,
              pp_contact_id: entity.pp_contact_id,
              contact_type: entity.contact_type,
              assigned_exchanges: [exchange.id],
              last_exchange_assignment: new Date().toISOString(),
              source: entity.source,
              is_user: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { error: insertError } = await supabase
              .from('people')
              .insert(personData);
              
            if (!insertError) {
              console.log(`  ✓ Created: ${entity.first_name} ${entity.last_name} (${entity.contact_type})`);
              totalCreated++;
            } else {
              console.log(`  ❌ Failed: ${entity.first_name} ${entity.last_name}:`, insertError.message);
            }
          }
          
        } catch (error) {
          console.error(`  ❌ Error processing ${entity.first_name} ${entity.last_name}:`, error.message);
        }
      }
    }
    
    console.log('\n=================================================');
    console.log('📊 SYNC SUMMARY');
    console.log('=================================================');
    console.log(`✅ Created: ${totalCreated} new people`);
    console.log(`📝 Updated: ${totalUpdated} existing people`);
    
    // Verify results
    const { data: peopleCount } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: true });
      
    console.log(`\n📋 Total people in database: ${peopleCount || 0}`);
    
    // Show sample
    const { data: sample } = await supabase
      .from('people')
      .select('first_name, last_name, contact_type, assigned_exchanges')
      .not('assigned_exchanges', 'is', null)
      .limit(5);
      
    if (sample && sample.length > 0) {
      console.log('\n📋 Sample people with exchange assignments:');
      sample.forEach(p => {
        console.log(`  - ${p.first_name} ${p.last_name} (${p.contact_type}): ${p.assigned_exchanges.length} exchanges`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the sync
syncEntities().then(() => {
  console.log('\n✅ Entity sync completed!');
  process.exit(0);
}).catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
});