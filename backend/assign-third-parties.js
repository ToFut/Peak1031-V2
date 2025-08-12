/**
 * Assign all existing third party users to the agency
 */

const supabaseService = require('./services/supabase');

async function assignThirdPartiesToAgency() {
  try {
    console.log('🔗 Assigning all third party users to agency...');
    
    // Get agency user
    const { data: agencyUser } = await supabaseService.client
      .from('users')
      .select('id, email')
      .eq('email', 'agency@peak1031.com')
      .single();
    
    if (!agencyUser) {
      console.error('❌ Agency user not found');
      return;
    }
    
    console.log(`👤 Agency user: ${agencyUser.email} (ID: ${agencyUser.id})`);
    
    // Get all third party users
    const { data: thirdPartyUsers } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name, contact_id')
      .eq('role', 'third_party')
      .eq('is_active', true);
    
    console.log(`\n📋 Found ${thirdPartyUsers.length} third party users to assign:`);
    
    let assignedCount = 0;
    let skippedCount = 0;
    
    for (const tpUser of thirdPartyUsers) {
      console.log(`\n🔗 Processing: ${tpUser.first_name} ${tpUser.last_name} (${tpUser.email})`);
      
      if (!tpUser.contact_id) {
        console.log('   ⚠️ No contact_id - skipping');
        skippedCount++;
        continue;
      }
      
      // Check if assignment already exists
      const { data: existingAssignment } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select('*')
        .eq('agency_contact_id', agencyUser.id)
        .eq('third_party_contact_id', tpUser.contact_id)
        .single();
      
      if (existingAssignment) {
        console.log(`   ✅ Assignment already exists (Active: ${existingAssignment.is_active})`);
        skippedCount++;
      } else {
        // Create new assignment
        const { error } = await supabaseService.client
          .from('agency_third_party_assignments')
          .insert([{
            agency_contact_id: agencyUser.id,
            third_party_contact_id: tpUser.contact_id,
            is_active: true,
            assigned_by: agencyUser.id,
            assigned_date: new Date().toISOString()
          }]);
          
        if (error) {
          console.error(`   ❌ Error creating assignment: ${error.message}`);
        } else {
          console.log('   ✅ New assignment created');
          assignedCount++;
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ New assignments: ${assignedCount}`);
    console.log(`   ⏭️ Skipped (already exist/no contact_id): ${skippedCount}`);
    console.log(`   📈 Total processed: ${assignedCount + skippedCount}`);
    
    // Verify final state
    console.log('\n🔍 Verifying final agency assignments...');
    const { data: allAssignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        third_party_contact_id,
        is_active
      `)
      .eq('agency_contact_id', agencyUser.id)
      .eq('is_active', true);
    
    console.log(`📋 Agency now manages ${allAssignments?.length || 0} active third party assignments`);
    
    // Get details of assigned third parties
    if (allAssignments && allAssignments.length > 0) {
      const contactIds = allAssignments.map(a => a.third_party_contact_id);
      
      const { data: assignedUsers } = await supabaseService.client
        .from('users')
        .select('first_name, last_name, email, contact_id')
        .in('contact_id', contactIds)
        .eq('role', 'third_party');
      
      console.log('\n👥 Assigned third parties:');
      assignedUsers?.forEach(user => {
        console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
      });
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

// Run the assignment
assignThirdPartiesToAgency().then(() => {
  console.log('\n✅ Assignment process completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Assignment process failed:', error);
  process.exit(1);
});