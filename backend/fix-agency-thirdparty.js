#!/usr/bin/env node
/**
 * Fix agency third party assignment - assign third party to exchanges
 */

const supabaseService = require('./services/supabase');

async function fixAgencyThirdParty() {
    console.log('🔧 Fixing agency third party assignments...\n');
    
    try {
        // Get the agency user
        const { data: agencyUser, error: agencyError } = await supabaseService.client
            .from('users')
            .select('*')
            .eq('email', 'test-agency@peak1031.com')
            .single();
            
        if (agencyError || !agencyUser) {
            console.log('❌ Agency user not found');
            return;
        }
        
        console.log(`✅ Found agency user: ${agencyUser.first_name} ${agencyUser.last_name}`);
        console.log(`   User ID: ${agencyUser.id}`);
        console.log(`   Contact ID: ${agencyUser.contact_id}`);
        
        // Get the third party assignments for this agency
        const { data: assignments, error: assignError } = await supabaseService.client
            .from('agency_third_party_assignments')
            .select('third_party_contact_id')
            .eq('agency_contact_id', agencyUser.contact_id)
            .eq('is_active', true);
            
        if (assignError || !assignments || assignments.length === 0) {
            console.log('❌ No third party assignments found for agency');
            return;
        }
        
        console.log(`✅ Found ${assignments.length} third party assignments`);
        
        // Get the third party contact details
        const thirdPartyContactId = assignments[0].third_party_contact_id;
        const { data: thirdPartyUser, error: tpUserError } = await supabaseService.client
            .from('users')
            .select('*')
            .eq('contact_id', thirdPartyContactId)
            .single();
            
        if (tpUserError || !thirdPartyUser) {
            console.log('❌ Third party user not found');
            return;
        }
        
        console.log(`✅ Found third party user: ${thirdPartyUser.email}`);
        
        // Get some exchanges to assign the third party to
        const { data: exchanges, error: exchangesError } = await supabaseService.client
            .from('exchanges')
            .select('id, name, status')
            .limit(3);
            
        if (exchangesError || !exchanges || exchanges.length === 0) {
            console.log('❌ No exchanges found');
            return;
        }
        
        console.log(`✅ Found ${exchanges.length} exchanges to assign third party to`);
        
        // Assign third party to exchanges
        for (const exchange of exchanges) {
            // Check if already assigned
            const { data: existing } = await supabaseService.client
                .from('exchange_participants')
                .select('id')
                .eq('exchange_id', exchange.id)
                .eq('user_id', thirdPartyUser.id)
                .single();
                
            if (existing) {
                console.log(`   ✓ Third party already assigned to ${exchange.name}`);
                continue;
            }
            
            // Add as participant
            const { error: insertError } = await supabaseService.client
                .from('exchange_participants')
                .insert({
                    exchange_id: exchange.id,
                    contact_id: thirdPartyUser.contact_id,
                    user_id: thirdPartyUser.id,
                    role: 'third_party',
                    permissions: ['read', 'comment'],
                    assigned_by: '278304de-568f-4138-b35b-6fdcfbd2f1ce', // admin user
                    assigned_at: new Date().toISOString(),
                    is_active: true,
                    created_at: new Date().toISOString()
                });
                
            if (insertError) {
                console.log(`   ❌ Failed to assign third party to ${exchange.name}: ${insertError.message}`);
            } else {
                console.log(`   ✅ Assigned third party to ${exchange.name}`);
            }
        }
        
        // Verify the assignments
        const { data: tpParticipants } = await supabaseService.client
            .from('exchange_participants')
            .select('exchange_id')
            .eq('user_id', thirdPartyUser.id)
            .eq('is_active', true);
            
        console.log(`\n✅ Third party now has ${tpParticipants?.length || 0} exchange assignments`);
        console.log(`   Agency should now see ${tpParticipants?.length || 0} exchanges through third party assignments`);
        
    } catch (error) {
        console.error('💥 Fix failed:', error.message);
    }
}

// Run the fix
fixAgencyThirdParty().catch(error => {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
});