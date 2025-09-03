#!/usr/bin/env node

/**
 * Extract All Entities from Synced PP Data
 * This script processes ALL exchanges with PP data and creates people records
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

// Extract all types of entities from PP data
function extractEntitiesFromExchange(exchange) {
  const entities = [];
  const ppData = exchange.pp_data;
  
  if (!ppData || typeof ppData !== 'object') return entities;
  
  // 1. Assigned users (attorneys, coordinators)
  if (ppData.assigned_to_users && Array.isArray(ppData.assigned_to_users)) {
    for (const user of ppData.assigned_to_users) {
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
  
  // 2. Extract from custom fields
  if (ppData.custom_field_values && Array.isArray(ppData.custom_field_values)) {
    for (const field of ppData.custom_field_values) {
      const label = field.custom_field_ref?.label?.toLowerCase() || '';
      const value = field.value_string || field.value_text;
      
      if (!value) continue;
      
      // Map field labels to contact types
      let contactType = null;
      if (label.includes('buyer')) contactType = 'buyer';
      else if (label.includes('seller')) contactType = 'seller';
      else if (label.includes('bank')) contactType = 'bank';
      else if (label.includes('attorney')) contactType = 'attorney';
      else if (label.includes('agent')) contactType = 'agent';
      else if (label.includes('broker')) contactType = 'broker';
      else if (label.includes('escrow')) contactType = 'escrow';
      else if (label.includes('title')) contactType = 'title_company';
      
      if (contactType && value.length > 2) {
        const parsed = parseName(value);
        if (parsed.first_name || parsed.last_name) {
          entities.push({
            ...parsed,
            contact_type: contactType,
            source: `pp_custom_field_${label}`,
            field_label: field.custom_field_ref?.label
          });
        }
      }
    }
  }
  
  // 3. Direct field mappings
  if (exchange.buyer_1_name) {
    const parsed = parseName(exchange.buyer_1_name);
    if (parsed.first_name || parsed.last_name) {
      entities.push({ ...parsed, contact_type: 'buyer', source: 'exchange_field' });
    }
  }
  
  if (exchange.buyer_2_name) {
    const parsed = parseName(exchange.buyer_2_name);
    if (parsed.first_name || parsed.last_name) {
      entities.push({ ...parsed, contact_type: 'buyer', source: 'exchange_field' });
    }
  }
  
  if (exchange.rep_1_seller_1_name) {
    const parsed = parseName(exchange.rep_1_seller_1_name);
    if (parsed.first_name || parsed.last_name) {
      entities.push({ ...parsed, contact_type: 'seller', source: 'exchange_field' });
    }
  }
  
  if (exchange.rep_1_seller_2_name) {
    const parsed = parseName(exchange.rep_1_seller_2_name);
    if (parsed.first_name || parsed.last_name) {
      entities.push({ ...parsed, contact_type: 'seller', source: 'exchange_field' });
    }
  }
  
  // 4. Client from PP data
  if (ppData.client_name) {
    const parsed = parseName(ppData.client_name);
    if (parsed.first_name || parsed.last_name) {
      entities.push({
        ...parsed,
        pp_contact_id: ppData.client_id?.toString(),
        contact_type: 'client',
        source: 'pp_client'
      });
    }
  }
  
  // 5. Account reference (could be organization)
  if (ppData.account_ref && ppData.account_ref.display_name) {
    const name = ppData.account_ref.display_name;
    // Check if it's an organization (no spaces, or contains LLC, Inc, etc)
    const isOrg = !name.includes(' ') || name.match(/\b(LLC|Inc|Corp|Company|Bank|Trust)\b/i);
    
    if (isOrg) {
      entities.push({
        first_name: name,
        last_name: '',
        company: name,
        pp_contact_id: ppData.account_ref.id?.toString(),
        contact_type: 'organization',
        source: 'pp_account_ref'
      });
    } else {
      const parsed = parseName(name);
      entities.push({
        ...parsed,
        pp_contact_id: ppData.account_ref.id?.toString(),
        contact_type: 'client',
        source: 'pp_account_ref'
      });
    }
  }
  
  return entities;
}

async function extractAllEntities() {
  console.log('=================================================');
  console.log('🔄 COMPREHENSIVE ENTITY EXTRACTION');
  console.log('=================================================\n');
  
  try {
    // Get all exchanges with PP data
    const { data: exchanges, error: fetchError } = await supabase
      .from('exchanges')
      .select('*')
      .not('pp_data', 'is', null)
      .order('created_at', { ascending: true });
      
    if (fetchError) {
      console.error('Error fetching exchanges:', fetchError);
      return;
    }
    
    // Filter to exchanges with actual PP data
    const withData = exchanges.filter(ex => 
      ex.pp_data && 
      typeof ex.pp_data === 'object' && 
      Object.keys(ex.pp_data).length > 5
    );
    
    console.log(`📊 Found ${withData.length} exchanges with PP data to process\n`);
    
    const stats = {
      totalEntities: 0,
      created: 0,
      updated: 0,
      errors: 0,
      byType: {}
    };
    
    // Process each exchange
    for (let i = 0; i < withData.length; i++) {
      const exchange = withData[i];
      const entities = extractEntitiesFromExchange(exchange);
      
      if (i % 10 === 0) {
        console.log(`\n[${i+1}/${withData.length}] Processing: ${exchange.name}`);
      }
      
      stats.totalEntities += entities.length;
      
      // Sync each entity
      for (const entity of entities) {
        if (!entity.first_name && !entity.last_name) continue;
        
        // Track by type
        stats.byType[entity.contact_type] = (stats.byType[entity.contact_type] || 0) + 1;
        
        try {
          // Check if person exists
          let query = supabase.from('people').select('id, assigned_exchanges');
          
          if (entity.pp_contact_id) {
            query = query.eq('pp_contact_id', entity.pp_contact_id);
          } else if (entity.email && !entity.email.includes('example.com')) {
            query = query.eq('email', entity.email);
          } else {
            // Match by name
            query = query.eq('first_name', entity.first_name);
            if (entity.last_name) {
              query = query.eq('last_name', entity.last_name);
            }
          }
          
          const { data: existing } = await query.single();
          
          if (existing) {
            // Update existing
            const assignedExchanges = existing.assigned_exchanges || [];
            if (!assignedExchanges.includes(exchange.id)) {
              assignedExchanges.push(exchange.id);
              
              const { error } = await supabase
                .from('people')
                .update({
                  assigned_exchanges: assignedExchanges,
                  contact_type: entity.contact_type,
                  last_exchange_assignment: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
                
              if (!error) stats.updated++;
            }
          } else {
            // Create new
            const email = entity.email || 
              `${(entity.first_name || '').toLowerCase()}.${(entity.last_name || '').toLowerCase()}@example.com`
              .replace(/[^a-z0-9.@]/g, '');
              
            const personData = {
              first_name: entity.first_name,
              last_name: entity.last_name,
              email: email,
              company: entity.company,
              pp_contact_id: entity.pp_contact_id,
              contact_type: entity.contact_type,
              assigned_exchanges: [exchange.id],
              last_exchange_assignment: new Date().toISOString(),
              source: entity.source,
              metadata: { field_label: entity.field_label },
              is_user: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
              .from('people')
              .insert(personData);
              
            if (!error) {
              stats.created++;
              if (stats.created % 10 === 0) {
                console.log(`  ✓ Created ${stats.created} people so far...`);
              }
            } else {
              stats.errors++;
            }
          }
        } catch (error) {
          stats.errors++;
        }
      }
    }
    
    // Final summary
    console.log('\n=================================================');
    console.log('📊 EXTRACTION SUMMARY');
    console.log('=================================================');
    console.log(`Total entities processed: ${stats.totalEntities}`);
    console.log(`✅ Created: ${stats.created} new people`);
    console.log(`📝 Updated: ${stats.updated} existing people`);
    console.log(`❌ Errors: ${stats.errors}`);
    
    console.log('\n📊 Breakdown by Contact Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Verify final counts
    const { data: peopleCount } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: true });
      
    console.log(`\n📋 Total people in database: ${peopleCount || 0}`);
    
    // Sample of created people
    const { data: sample } = await supabase
      .from('people')
      .select('first_name, last_name, contact_type, assigned_exchanges')
      .not('contact_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (sample && sample.length > 0) {
      console.log('\n📋 Recently created people:');
      sample.forEach(p => {
        const name = `${p.first_name} ${p.last_name}`.trim();
        console.log(`  - ${name} (${p.contact_type}): ${p.assigned_exchanges?.length || 0} exchanges`);
      });
    }
    
    console.log('\n✅ Entity extraction completed!');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the extraction
extractAllEntities().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});