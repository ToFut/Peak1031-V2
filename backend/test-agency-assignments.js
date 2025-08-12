require('dotenv').config();
const supabaseService = require('./services/supabase');

async function checkAgencyAssignments() {
  try {
    console.log('🔍 Checking agency third party assignments...');
    
    // Get agency user
    const { data: agencyUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'agency@peak1031.com')
      .single();
    
    if (!agencyUser) {
      console.log('❌ Agency user not found');
      return;
    }
    
    console.log('✅ Agency user:', agencyUser.email, 'contact_id:', agencyUser.contact_id);
    
    // Check assignments table
    const { data: assignments, error } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .eq('agency_contact_id', agencyUser.contact_id);
    
    if (error) {
      console.log('❌ Error fetching assignments:', error);
      return;
    }
    
    console.log('📊 Found', assignments?.length || 0, 'assignments for this agency');
    
    if (assignments?.length > 0) {
      assignments.forEach((a, i) => {
        console.log('   ' + (i+1) + '. Third party ID: ' + a.third_party_contact_id + ', Active: ' + a.is_active);
      });
    }
    
    // Check what third party contacts exist
    const { data: thirdParties } = await supabaseService.client
      .from('contacts')
      .select('id, first_name, last_name, role')
      .eq('role', 'third_party');
    
    console.log('\n📋 Available third party contacts:');
    thirdParties?.forEach((tp, i) => {
      console.log('   ' + (i+1) + '. ' + tp.first_name + ' ' + tp.last_name + ' (ID: ' + tp.id + ')');
    });
    
    // Check what third party users exist
    const { data: thirdPartyUsers } = await supabaseService.client
      .from('users')
      .select('id, email, contact_id, role')
      .eq('role', 'third_party');
    
    console.log('\n👤 Third party users:');
    thirdPartyUsers?.forEach((user, i) => {
      console.log('   ' + (i+1) + '. ' + user.email + ' (contact_id: ' + user.contact_id + ')');
    });

    // If we have third party users but no assignments, create some sample assignments
    if (thirdPartyUsers?.length > 0 && assignments?.length === 0) {
      console.log('\n🔧 Creating sample assignments...');
      
      // Assign first third party to the agency
      const assignment = {
        agency_contact_id: agencyUser.contact_id,
        third_party_contact_id: thirdPartyUsers[0].contact_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newAssignment, error: assignError } = await supabaseService.client
        .from('agency_third_party_assignments')
        .insert([assignment])
        .select();
      
      if (assignError) {
        console.log('❌ Error creating assignment:', assignError);
      } else {
        console.log('✅ Created assignment:', newAssignment);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAgencyAssignments();