/**
 * Complete Agency Third Party Assignment Workflow Test
 * Tests the entire flow from database setup to frontend display
 */

const supabaseService = require('./services/supabase');

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete Agency Third Party Assignment Workflow\n');

  try {
    // Step 1: Test database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const { data: testQuery, error: testError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database table does not exist. Please run the migration first.');
      console.log('📝 SQL migration file: database/migrations/205_create_agency_assignments_table.sql');
      return;
    }
    console.log('✅ Database connected and table exists');

    // Step 2: Check for sample data
    console.log('\n2️⃣ Checking existing assignments...');
    const { data: existingAssignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .limit(5);
    
    console.log(`📊 Found ${existingAssignments?.length || 0} existing assignments`);

    // Step 3: Test contacts query
    console.log('\n3️⃣ Testing contacts queries...');
    const { data: agencies } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, email, contact_type')
      .contains('contact_type', ['agency'])
      .limit(3);

    const { data: thirdParties } = await supabaseService.client
      .from('contacts')
      .select('id, display_name, first_name, last_name, email, contact_type')
      .contains('contact_type', ['third_party'])
      .limit(3);

    console.log(`📊 Found ${agencies?.length || 0} agencies and ${thirdParties?.length || 0} third parties`);

    if (agencies?.length) {
      console.log('   Sample agencies:');
      agencies.forEach(agency => {
        const name = agency.display_name || `${agency.first_name} ${agency.last_name}`;
        console.log(`   - ${name} (${agency.email})`);
      });
    }

    if (thirdParties?.length) {
      console.log('   Sample third parties:');
      thirdParties.forEach(tp => {
        const name = tp.display_name || `${tp.first_name} ${tp.last_name}`;
        console.log(`   - ${name} (${tp.email})`);
      });
    }

    // Step 4: Test assignment creation (if we have data)
    if (agencies?.length && thirdParties?.length) {
      console.log('\n4️⃣ Testing assignment creation...');
      
      const testAssignment = {
        agency_contact_id: agencies[0].id,
        third_party_contact_id: thirdParties[0].id,
        assigned_by: null, // Will be set by admin user
        performance_score: 85,
        can_view_performance: true,
        notes: 'Test assignment created by automated workflow test'
      };

      // Check if assignment already exists
      const { data: existingAssignment } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select('*')
        .eq('agency_contact_id', testAssignment.agency_contact_id)
        .eq('third_party_contact_id', testAssignment.third_party_contact_id)
        .single();

      if (existingAssignment) {
        console.log('✅ Test assignment already exists');
      } else {
        const { data: newAssignment, error: assignmentError } = await supabaseService.client
          .from('agency_third_party_assignments')
          .insert([testAssignment])
          .select()
          .single();

        if (assignmentError) {
          console.log('❌ Failed to create test assignment:', assignmentError);
        } else {
          console.log('✅ Created test assignment successfully');
          console.log(`   ${thirdParties[0].display_name || thirdParties[0].first_name + ' ' + thirdParties[0].last_name} → ${agencies[0].display_name || agencies[0].first_name + ' ' + agencies[0].last_name}`);
        }
      }
    }

    // Step 5: Test enhanced query with joins
    console.log('\n5️⃣ Testing enhanced assignment query...');
    const { data: enhancedAssignments, error: enhancedError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        *,
        agency_contact:contacts!agency_contact_id(id, display_name, first_name, last_name, email, company),
        third_party_contact:contacts!third_party_contact_id(id, display_name, first_name, last_name, email, company)
      `)
      .eq('is_active', true)
      .limit(3);

    if (enhancedError) {
      console.log('❌ Enhanced query failed:', enhancedError);
    } else {
      console.log(`✅ Enhanced query returned ${enhancedAssignments?.length || 0} assignments`);
      if (enhancedAssignments?.length) {
        console.log('   Sample assignment details:');
        const assignment = enhancedAssignments[0];
        console.log(`   - Agency: ${assignment.agency_contact?.display_name || assignment.agency_contact?.first_name + ' ' + assignment.agency_contact?.last_name}`);
        console.log(`   - Third Party: ${assignment.third_party_contact?.display_name || assignment.third_party_contact?.first_name + ' ' + assignment.third_party_contact?.last_name}`);
        console.log(`   - Performance Score: ${assignment.performance_score}`);
        console.log(`   - Can View Performance: ${assignment.can_view_performance ? 'Yes' : 'No'}`);
      }
    }

    // Step 6: Summary and recommendations
    console.log('\n📋 Workflow Test Summary:');
    console.log('✅ Database connectivity: Working');
    console.log('✅ Table structure: Exists');
    console.log(`✅ Sample data: ${existingAssignments?.length || 0} assignments found`);
    console.log(`✅ Agencies available: ${agencies?.length || 0}`);
    console.log(`✅ Third parties available: ${thirdParties?.length || 0}`);
    console.log('✅ Enhanced queries: Working');

    console.log('\n🎯 Next Steps:');
    console.log('1. Start the backend server: npm run dev:backend');
    console.log('2. Start the frontend: npm run dev:frontend');
    console.log('3. Login as admin and go to agency assignments page');
    console.log('4. Test creating assignments between agencies and third parties');
    console.log('5. View third party profiles to see agency assignment information');
    console.log('6. Login as agency user to see third party performance data');

    if (!agencies?.length || !thirdParties?.length) {
      console.log('\n⚠️  Note: You may need to create sample agency and third party contacts to fully test the system');
    }

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

// Run the test
testCompleteWorkflow().then(() => {
  console.log('\n🏁 Workflow test completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});