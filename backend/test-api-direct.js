#!/usr/bin/env node

/**
 * Test the raw API response for different users
 * Simulates what the frontend receives
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testAPIDirectly() {
  console.log('🧪 Testing Raw API Response for Different Roles\n');
  console.log('=' .repeat(70));
  
  // Import the buildExchangeWhereClause function
  const databaseService = require('./services/database');
  const { Op } = require('sequelize');
  
  // Mock function to replicate buildExchangeWhereClause
  async function buildExchangeWhereClause(user, filters = {}) {
    const whereClause = {};
    
    // Base active filter
    if (!filters.include_inactive) {
      whereClause.is_active = true;
    }
    
    // Role-based filtering
    if (user.role === 'client') {
      if (user.contact_id) {
        const participants = await databaseService.getExchangeParticipants({
          where: { contact_id: user.contact_id }
        });
        
        const exchangeIds = participants.map(p => p.exchange_id);
        
        if (exchangeIds.length > 0) {
          whereClause[Op.or] = [
            { client_id: user.contact_id },
            { id: { [Op.in]: exchangeIds } }
          ];
        } else {
          whereClause.client_id = user.contact_id;
        }
      }
    } else if (user.role === 'coordinator') {
      const participantQueries = [{ user_id: user.id }];
      if (user.contact_id) {
        participantQueries.push({ contact_id: user.contact_id });
      }
      
      const participants = await databaseService.getExchangeParticipants({
        where: { [Op.or]: participantQueries }
      });
      
      const participantExchangeIds = [...new Set(participants.map(p => p.exchange_id))];
      
      if (participantExchangeIds.length > 0) {
        whereClause[Op.or] = [
          { coordinator_id: user.id },
          { id: { [Op.in]: participantExchangeIds } }
        ];
      } else {
        whereClause.coordinator_id = user.id;
      }
    } else if (user.role === 'third_party' || user.role === 'agency') {
      const participantQueries = [{ user_id: user.id }];
      if (user.contact_id) {
        participantQueries.push({ contact_id: user.contact_id });
      }
      
      const participants = await databaseService.getExchangeParticipants({
        where: { [Op.or]: participantQueries }
      });
      
      const exchangeIds = [...new Set(participants.map(p => p.exchange_id))];
      
      if (exchangeIds.length > 0) {
        whereClause.id = { [Op.in]: exchangeIds };
      } else {
        whereClause.id = null;
      }
    } else if (user.role === 'admin' || user.role === 'staff') {
      // No additional filtering
    }
    
    return whereClause;
  }
  
  const testUsers = [
    {
      role: 'coordinator',
      email: 'coordinator@peak1031.com',
      id: '12bbeccd-4c85-43ac-8bcf-bfe73fee3525',
      contact_id: '6c025471-4c45-4328-820d-804eed3229dd'
    },
    {
      role: 'agency',
      email: 'agency@peak1031.com',
      id: 'dcd1d389-55ed-4091-b6e2-366e9c01dc03',
      contact_id: '92297c5b-b445-4663-bad9-17501cef0a28'
    },
    {
      role: 'third_party',
      email: 'thirdparty1@peak1031.com',
      id: '0772aa76-81ff-49fa-8d64-cf354a60cca1',
      contact_id: 'c73b20ef-735e-47dd-b853-5e2d6aa0117d'
    }
  ];
  
  for (const user of testUsers) {
    console.log(`\n📋 Testing ${user.role.toUpperCase()} (${user.email})\n`);
    
    try {
      // Build where clause as the API would
      const whereClause = await buildExchangeWhereClause(user, {});
      
      console.log('Where clause:', JSON.stringify(whereClause, null, 2));
      
      // Get exchanges using the where clause
      const exchanges = await databaseService.getExchanges({
        where: whereClause,
        limit: 20
      });
      
      console.log(`\n✅ Database returned ${exchanges.length} exchanges`);
      
      if (exchanges.length > 0) {
        console.log('Examples:');
        exchanges.slice(0, 3).forEach(ex => {
          console.log(`  - ${ex.name || ex.exchange_number}`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 ANALYSIS\n');
  console.log('If the database returns exchanges but frontend shows 0:');
  console.log('1. Check if backend server needs restart');
  console.log('2. Check browser console for API errors');
  console.log('3. Clear browser cache/localStorage');
  console.log('4. Check network tab for actual API response');
}

testAPIDirectly();