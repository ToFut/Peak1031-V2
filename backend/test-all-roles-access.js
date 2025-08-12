#!/usr/bin/env node

/**
 * Deep dive test for all role access issues
 * Tests agency, coordinator, and third_party access to exchanges
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testAllRolesAccess() {
  console.log('🔍 DEEP DIVE: Testing All Roles Exchange Access\n');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Find users of each role
    console.log('\n📋 Step 1: Finding users by role...\n');
    
    const roles = ['agency', 'coordinator', 'third_party'];
    const usersByRole = {};
    
    for (const role of roles) {
      const { data: users } = await supabaseService.client
        .from('users')
        .select('id, email, first_name, last_name, contact_id, role')
        .eq('role', role)
        .limit(5);
      
      usersByRole[role] = users || [];
      console.log(`${role.toUpperCase()}: Found ${usersByRole[role].length} users`);
      
      if (usersByRole[role].length > 0) {
        usersByRole[role].forEach(u => {
          console.log(`  - ${u.email} (ID: ${u.id.substring(0, 8)}...)`);
          console.log(`    Contact ID: ${u.contact_id || 'MISSING ❌'}`);
        });
      }
    }
    
    // Step 2: Check participant records for each role
    console.log('\n📋 Step 2: Checking participant records...\n');
    
    for (const role of roles) {
      console.log(`\n${role.toUpperCase()} PARTICIPANTS:`);
      
      // Check participants by role
      const { data: participants } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('role', role)
        .limit(10);
      
      if (participants && participants.length > 0) {
        console.log(`  Found ${participants.length} ${role} participant records`);
        
        // Check for missing user_id
        const missingUserId = participants.filter(p => !p.user_id);
        const hasUserId = participants.filter(p => p.user_id);
        
        console.log(`  ✅ With user_id: ${hasUserId.length}`);
        console.log(`  ❌ Missing user_id: ${missingUserId.length}`);
        
        if (missingUserId.length > 0) {
          console.log(`\n  ⚠️ Participants missing user_id (first 3):`);
          missingUserId.slice(0, 3).forEach(p => {
            console.log(`    - Participant ${p.id.substring(0, 8)}...`);
            console.log(`      Exchange: ${p.exchange_id.substring(0, 8)}...`);
            console.log(`      Contact: ${p.contact_id || 'NULL'}`);
          });
        }
      } else {
        console.log(`  No ${role} participants found`);
      }
    }
    
    // Step 3: Test specific user access
    console.log('\n📋 Step 3: Testing specific user exchange access...\n');
    
    // Test agency user
    if (usersByRole.agency.length > 0) {
      const agencyUser = usersByRole.agency[0];
      console.log(`\nTesting AGENCY user: ${agencyUser.email}`);
      
      // Check as participant
      const { data: agencyParticipant } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('user_id', agencyUser.id);
      
      console.log(`  As participant (by user_id): ${agencyParticipant?.length || 0} exchanges`);
      
      // Also check by contact_id
      if (agencyUser.contact_id) {
        const { data: byContact } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('contact_id', agencyUser.contact_id);
        
        console.log(`  As participant (by contact_id): ${byContact?.length || 0} exchanges`);
      }
    }
    
    // Test coordinator user
    if (usersByRole.coordinator.length > 0) {
      const coordUser = usersByRole.coordinator[0];
      console.log(`\nTesting COORDINATOR user: ${coordUser.email}`);
      
      // Check as participant
      const { data: coordParticipant } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('user_id', coordUser.id);
      
      console.log(`  As participant (by user_id): ${coordParticipant?.length || 0} exchanges`);
      
      // Check as primary coordinator
      const { data: asPrimary } = await supabaseService.client
        .from('exchanges')
        .select('id')
        .eq('coordinator_id', coordUser.id);
      
      console.log(`  As primary coordinator: ${asPrimary?.length || 0} exchanges`);
    }
    
    // Test third_party user
    if (usersByRole.third_party.length > 0) {
      const thirdPartyUser = usersByRole.third_party[0];
      console.log(`\nTesting THIRD_PARTY user: ${thirdPartyUser.email}`);
      
      // Check as participant
      const { data: tpParticipant } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('user_id', thirdPartyUser.id);
      
      console.log(`  As participant (by user_id): ${tpParticipant?.length || 0} exchanges`);
    }
    
    // Step 4: Check recent invitations
    console.log('\n📋 Step 4: Checking recent invitations...\n');
    
    const { data: recentInvites } = await supabaseService.client
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentInvites && recentInvites.length > 0) {
      console.log(`Found ${recentInvites.length} recent invitations:`);
      
      const byRole = {};
      recentInvites.forEach(inv => {
        if (!byRole[inv.role]) byRole[inv.role] = 0;
        byRole[inv.role]++;
      });
      
      Object.entries(byRole).forEach(([role, count]) => {
        console.log(`  ${role}: ${count} invitations`);
      });
      
      // Check if accepted invitations created proper participants
      const accepted = recentInvites.filter(inv => inv.status === 'accepted');
      if (accepted.length > 0) {
        console.log(`\n  Checking ${accepted.length} accepted invitations:`);
        
        for (const inv of accepted.slice(0, 3)) {
          // Check if participant record exists
          const { data: participant } = await supabaseService.client
            .from('exchange_participants')
            .select('user_id, contact_id')
            .eq('exchange_id', inv.exchange_id)
            .eq('role', inv.role);
          
          console.log(`    - ${inv.email} (${inv.role})`);
          if (participant && participant.length > 0) {
            const p = participant[0];
            console.log(`      ✅ Participant exists`);
            console.log(`      user_id: ${p.user_id ? '✅' : '❌ MISSING'}`);
          } else {
            console.log(`      ❌ No participant record found`);
          }
        }
      }
    }
    
    // Step 5: SQL query to find orphaned participants
    console.log('\n📋 Step 5: Finding orphaned participant records...\n');
    
    const { data: orphaned } = await supabaseService.client
      .from('exchange_participants')
      .select('id, role, user_id, contact_id')
      .is('user_id', null)
      .limit(20);
    
    if (orphaned && orphaned.length > 0) {
      console.log(`❌ Found ${orphaned.length} participants without user_id`);
      
      const byRoleOrphaned = {};
      orphaned.forEach(p => {
        if (!byRoleOrphaned[p.role]) byRoleOrphaned[p.role] = 0;
        byRoleOrphaned[p.role]++;
      });
      
      console.log('\nOrphaned participants by role:');
      Object.entries(byRoleOrphaned).forEach(([role, count]) => {
        console.log(`  ${role}: ${count} records without user_id`);
      });
    } else {
      console.log('✅ No orphaned participant records found');
    }
    
    // Summary and recommendations
    console.log('\n' + '=' .repeat(70));
    console.log('📊 ANALYSIS SUMMARY\n');
    
    const issues = [];
    
    // Check for missing user_ids
    if (orphaned && orphaned.length > 0) {
      issues.push({
        type: 'DATABASE',
        issue: `${orphaned.length} participant records missing user_id`,
        fix: 'Run fix-all-participant-user-ids.js to map contact_id to user_id'
      });
    }
    
    // Check if users have contact_ids
    let missingContactIds = 0;
    Object.values(usersByRole).forEach(users => {
      users.forEach(u => {
        if (!u.contact_id) missingContactIds++;
      });
    });
    
    if (missingContactIds > 0) {
      issues.push({
        type: 'DATABASE',
        issue: `${missingContactIds} users missing contact_id`,
        fix: 'Contact records need to be created for these users'
      });
    }
    
    if (issues.length > 0) {
      console.log('🔴 ISSUES FOUND:\n');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.type}] ${issue.issue}`);
        console.log(`   Fix: ${issue.fix}\n`);
      });
    } else {
      console.log('✅ No major issues found in database structure');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAllRolesAccess();