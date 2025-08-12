#!/usr/bin/env node
/**
 * Fix test user assignments - assign test users to existing exchanges
 */

const supabaseService = require('./services/supabase');

async function assignTestUsers() {
    console.log('🔧 Fixing test user assignments...\n');
    
    try {
        // Get test users
        const testUsers = [
            { email: 'test-coordinator@peak1031.com', role: 'coordinator' },
            { email: 'test-agency@peak1031.com', role: 'agency' }
        ];
        
        // Get some existing exchanges to assign them to
        const { data: exchanges, error: exchangesError } = await supabaseService.client
            .from('exchanges')
            .select('id, name, status')
            .limit(3);
            
        if (exchangesError || !exchanges || exchanges.length === 0) {
            console.log('❌ No exchanges found to assign');
            return;
        }
        
        console.log(`✅ Found ${exchanges.length} exchanges to assign users to:`);
        exchanges.forEach((exchange, i) => {
            console.log(`   ${i + 1}. ${exchange.id} (${exchange.status})`);
        });
        
        for (const testUser of testUsers) {
            console.log(`\n👤 Processing ${testUser.email} (${testUser.role})...`);
            
            // Get user details
            const { data: user, error: userError } = await supabaseService.client
                .from('users')
                .select('*')
                .eq('email', testUser.email)
                .single();
                
            if (userError || !user) {
                console.log(`❌ User ${testUser.email} not found`);
                continue;
            }
            
            console.log(`✅ Found user: ${user.first_name} ${user.last_name}`);
            console.log(`   User ID: ${user.id}`);
            console.log(`   Contact ID: ${user.contact_id}`);
            
            if (testUser.role === 'coordinator') {
                // For coordinators, add them as participants to exchanges
                console.log(`   📊 Adding coordinator to exchange participants...`);
                
                for (const exchange of exchanges) {
                    // Check if already assigned
                    const { data: existing } = await supabaseService.client
                        .from('exchange_participants')
                        .select('id')
                        .eq('exchange_id', exchange.id)
                        .eq('user_id', user.id)
                        .single();
                        
                    if (existing) {
                        console.log(`     ✓ Already assigned to ${exchange.id}`);
                        continue;
                    }
                    
                    // Add as participant
                    const { error: insertError } = await supabaseService.client
                        .from('exchange_participants')
                        .insert({
                            exchange_id: exchange.id,
                            contact_id: user.contact_id,
                            user_id: user.id,
                            role: 'coordinator',
                            permissions: ['read', 'comment', 'manage'],
                            assigned_by: '278304de-568f-4138-b35b-6fdcfbd2f1ce', // admin user
                            assigned_at: new Date().toISOString(),
                            is_active: true,
                            created_at: new Date().toISOString()
                        });
                        
                    if (insertError) {
                        console.log(`     ❌ Failed to assign to ${exchange.id}: ${insertError.message}`);
                    } else {
                        console.log(`     ✅ Assigned to ${exchange.id}`);
                    }
                }
                
            } else if (testUser.role === 'agency') {
                // For agency users, we need to:
                // 1. Create agency-third_party assignments
                // 2. Assign them to exchanges through third parties
                
                console.log(`   🏢 Setting up agency assignments...`);
                
                // Get a third party to assign to the agency
                const { data: thirdParty, error: tpError } = await supabaseService.client
                    .from('users')
                    .select('*')
                    .eq('role', 'third_party')
                    .limit(1)
                    .single();
                    
                if (tpError || !thirdParty) {
                    console.log(`     ❌ No third party found to assign`);
                    continue;
                }
                
                console.log(`     ✅ Found third party: ${thirdParty.email}`);
                
                // Create agency-third_party assignment
                const { error: assignError } = await supabaseService.client
                    .from('agency_third_party_assignments')
                    .upsert({
                        agency_contact_id: user.contact_id,
                        third_party_contact_id: thirdParty.contact_id,
                        assigned_by: user.id,
                        can_view_performance: true,
                        can_assign_exchanges: false,
                        is_active: true,
                        performance_score: 75
                    }, {
                        onConflict: 'agency_contact_id,third_party_contact_id'
                    });
                    
                if (assignError) {
                    console.log(`     ❌ Failed to create agency assignment: ${assignError.message}`);
                } else {
                    console.log(`     ✅ Created agency-third_party assignment`);
                }
                
                // Verify the assignment was created
                const { data: assignments } = await supabaseService.client
                    .from('agency_third_party_assignments')
                    .select('*')
                    .eq('agency_contact_id', user.contact_id)
                    .eq('is_active', true);
                    
                console.log(`     📊 Agency has ${assignments?.length || 0} third party assignments`);
            }
        }
        
        console.log('\n✅ Test user assignment fixes completed!');
        
        // Verify the fixes worked
        console.log('\n🔍 Verifying assignments...');
        
        for (const testUser of testUsers) {
            const { data: user } = await supabaseService.client
                .from('users')
                .select('*')
                .eq('email', testUser.email)
                .single();
                
            if (!user) continue;
            
            if (testUser.role === 'coordinator') {
                const { data: participantCount } = await supabaseService.client
                    .from('exchange_participants')
                    .select('exchange_id', { count: 'exact' })
                    .eq('user_id', user.id)
                    .eq('is_active', true);
                    
                console.log(`   ${testUser.email}: ${participantCount?.length || 0} exchange assignments`);
                
            } else if (testUser.role === 'agency') {
                const { data: assignments } = await supabaseService.client
                    .from('agency_third_party_assignments')
                    .select('third_party_contact_id')
                    .eq('agency_contact_id', user.contact_id)
                    .eq('is_active', true);
                    
                console.log(`   ${testUser.email}: ${assignments?.length || 0} third party assignments`);
                
                if (assignments && assignments.length > 0) {
                    // Get exchanges for the assigned third parties
                    const thirdPartyIds = assignments.map(a => a.third_party_contact_id);
                    const { data: exchangeCount } = await supabaseService.client
                        .from('exchange_participants')
                        .select('exchange_id', { count: 'exact' })
                        .in('contact_id', thirdPartyIds)
                        .eq('is_active', true);
                        
                    console.log(`   ${testUser.email}: ${exchangeCount?.length || 0} exchanges through third parties`);
                }
            }
        }
        
    } catch (error) {
        console.error('💥 Fix failed:', error.message);
    }
}

// Run the fix
assignTestUsers().catch(error => {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
});