#!/usr/bin/env node

/**
 * Test script for verifying exchange participant permissions
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');
const permissionService = require('./services/permissionService');
const rbacService = require('./services/rbacService');

async function testPermissions() {
  console.log('🧪 Testing Exchange Participant Permissions System');
  console.log('================================================\n');

  try {
    // 1. Get a sample exchange
    const { data: exchanges, error: exchangeError } = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_type, status')
      .limit(1);
    
    if (exchangeError) {
      console.log('❌ Error fetching exchanges:', exchangeError.message);
      return;
    }

    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found in database');
      return;
    }

    const exchangeId = exchanges[0].id;
    console.log(`✅ Using exchange: ${exchanges[0].exchange_type} - ${exchanges[0].status} (${exchangeId})\n`);

    // 2. Get participants for this exchange
    const { data: participants } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('is_active', true);

    console.log(`📥 Found ${participants?.length || 0} active participants\n`);

    if (participants && participants.length > 0) {
      for (const participant of participants.slice(0, 3)) { // Test first 3 participants
        console.log(`\n👤 Testing participant: ${participant.user_id || participant.contact_id}`);
        console.log(`   Role: ${participant.role}`);
        
        // Parse permissions
        let permissions = {};
        try {
          permissions = typeof participant.permissions === 'string' 
            ? JSON.parse(participant.permissions) 
            : participant.permissions || {};
        } catch (error) {
          console.error('   ❌ Error parsing permissions:', error.message);
        }

        console.log('   Permissions:', permissions);

        // Test specific permission checks
        const permissionsToTest = [
          'can_send_messages',
          'can_upload_documents', 
          'can_edit',
          'can_delete',
          'can_add_participants'
        ];

        for (const perm of permissionsToTest) {
          const hasPermission = await permissionService.checkPermission(
            participant.user_id,
            exchangeId,
            perm
          );
          
          const expected = permissions[perm] === true;
          const icon = hasPermission === expected ? '✅' : '❌';
          
          console.log(`   ${icon} ${perm}: ${hasPermission} (expected: ${expected})`);
        }
      }
    }

    // 3. Test RBAC service integration
    console.log('\n\n🔐 Testing RBAC Service Integration');
    console.log('====================================\n');

    // Get a test user
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .limit(3);

    if (users && users.length > 0) {
      for (const user of users) {
        console.log(`\n👤 Testing user: ${user.email} (${user.role})`);
        
        // Check exchange access
        const hasAccess = await rbacService.canUserAccessExchange(user, exchangeId);
        console.log(`   Exchange access: ${hasAccess ? '✅' : '❌'}`);

        // Check specific permissions
        if (hasAccess) {
          const canSendMessages = await rbacService.checkExchangePermission(user, exchangeId, 'can_send_messages');
          const canUploadDocs = await rbacService.checkExchangePermission(user, exchangeId, 'can_upload_documents');
          
          console.log(`   Can send messages: ${canSendMessages ? '✅' : '❌'}`);
          console.log(`   Can upload documents: ${canUploadDocs ? '✅' : '❌'}`);
        }
      }
    }

    // 4. Test document access
    console.log('\n\n📄 Testing Document Access');
    console.log('==========================\n');

    const { data: documents } = await supabaseService.client
      .from('documents')
      .select('id, filename')
      .eq('exchange_id', exchangeId)
      .limit(2);

    if (documents && documents.length > 0 && participants && participants.length > 0) {
      const testUser = participants[0].user_id;
      const testDoc = documents[0];

      console.log(`Testing document: ${testDoc.filename}`);
      console.log(`Testing with user: ${testUser}\n`);

      const canRead = await permissionService.checkDocumentAccess(testUser, testDoc.id, 'read');
      const canWrite = await permissionService.checkDocumentAccess(testUser, testDoc.id, 'write');
      const canDownload = await permissionService.checkDocumentAccess(testUser, testDoc.id, 'download');

      console.log(`   Read access: ${canRead ? '✅' : '❌'}`);
      console.log(`   Write access: ${canWrite ? '✅' : '❌'}`);
      console.log(`   Download access: ${canDownload ? '✅' : '❌'}`);
    }

    console.log('\n\n✅ Permission system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }

  process.exit(0);
}

// Run the test
testPermissions();