#!/usr/bin/env node
/**
 * Direct database test to check exchanges and participants data
 */

const supabaseService = require('./services/supabase');

async function testDatabase() {
    console.log('🔍 Testing direct database queries...\n');

    try {
        // Test 1: Check exchanges table
        console.log('📊 Checking exchanges table...');
        const { data: exchanges, error: exchangesError } = await supabaseService.client
            .from('exchanges')
            .select('*')
            .limit(5);
        
        if (exchangesError) {
            console.error('❌ Exchanges query error:', exchangesError);
        } else {
            console.log(`✅ Found ${exchanges?.length || 0} exchanges`);
            if (exchanges && exchanges.length > 0) {
                console.log('   Sample exchanges:');
                exchanges.forEach((exchange, i) => {
                    console.log(`     ${i + 1}. ID: ${exchange.id}, Property: ${exchange.property_name || 'N/A'}, Status: ${exchange.status || 'N/A'}`);
                });
            }
        }

        // Test 2: Check exchange_participants table
        console.log('\n👥 Checking exchange_participants table...');
        const { data: participants, error: participantsError } = await supabaseService.client
            .from('exchange_participants')
            .select('*')
            .limit(10);
        
        if (participantsError) {
            console.error('❌ Participants query error:', participantsError);
        } else {
            console.log(`✅ Found ${participants?.length || 0} participant records`);
            if (participants && participants.length > 0) {
                console.log('   Sample participants:');
                participants.forEach((participant, i) => {
                    console.log(`     ${i + 1}. Exchange: ${participant.exchange_id}, Contact: ${participant.contact_id}, User: ${participant.user_id || 'N/A'}, Role: ${participant.participant_type || 'N/A'}`);
                });
            }
        }

        // Test 3: Check users table for our test users
        console.log('\n👤 Checking specific test users...');
        const testEmails = [
            'test-coordinator@peak1031.com',
            'test-agency@peak1031.com', 
            'client@peak1031.com'
        ];
        
        for (const email of testEmails) {
            const { data: user, error: userError } = await supabaseService.client
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
                
            if (userError) {
                console.log(`❌ User ${email}: ${userError.message}`);
            } else if (user) {
                console.log(`✅ User ${email}:`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Contact ID: ${user.contact_id || 'N/A'}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active}`);
                
                // Check their participants
                if (user.contact_id) {
                    const { data: userParticipants } = await supabaseService.client
                        .from('exchange_participants')
                        .select('exchange_id, participant_type')
                        .eq('contact_id', user.contact_id);
                    console.log(`   Participant records: ${userParticipants?.length || 0}`);
                }
                
                if (user.id) {
                    const { data: userIdParticipants } = await supabaseService.client
                        .from('exchange_participants')
                        .select('exchange_id, participant_type')
                        .eq('user_id', user.id);
                    console.log(`   User ID participant records: ${userIdParticipants?.length || 0}`);
                }
            } else {
                console.log(`❌ User ${email}: Not found`);
            }
        }

        // Test 4: Check if contacts table has the required data
        console.log('\n📇 Checking contacts table...');
        const { data: contacts, error: contactsError } = await supabaseService.client
            .from('contacts')
            .select('id, first_name, last_name, email, contact_type')
            .limit(10);
            
        if (contactsError) {
            console.error('❌ Contacts query error:', contactsError);
        } else {
            console.log(`✅ Found ${contacts?.length || 0} contacts`);
            if (contacts && contacts.length > 0) {
                console.log('   Sample contacts:');
                contacts.forEach((contact, i) => {
                    console.log(`     ${i + 1}. ${contact.first_name} ${contact.last_name} (${contact.email}) - Type: ${JSON.stringify(contact.contact_type)}`);
                });
            }
        }

    } catch (error) {
        console.error('💥 Database test failed:', error);
    }
}

// Run the test
testDatabase().then(() => {
    console.log('\n🏁 Database test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
});