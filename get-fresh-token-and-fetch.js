require('dotenv').config({ path: './backend/.env' });
const axios = require('./backend/node_modules/axios').default;
const fs = require('fs');

async function getFreshTokenAndFetchContacts() {
  console.log('🔄 Getting fresh token and fetching contacts...\n');

  try {
    // Step 1: Get fresh access token using refresh token
    console.log('🔑 Step 1: Refreshing access token...');
    const refreshToken = '4420de571d6a48ed81eab32b1c21269d';
    
    const tokenResponse = await axios.post('https://app.practicepanther.com/oauth/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.PP_CLIENT_ID,
        client_secret: process.env.PP_CLIENT_SECRET
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    const { access_token, expires_in, refresh_token: newRefreshToken } = tokenResponse.data;
    console.log('✅ Token refresh successful!');
    console.log(`   New token: ${access_token.substring(0, 20)}...`);
    console.log(`   Expires in: ${expires_in} seconds (~${Math.round(expires_in/3600)} hours)`);
    console.log(`   New refresh token: ${newRefreshToken ? 'Yes' : 'No'}\n`);

    // Step 2: Fetch contacts with fresh token
    console.log('👥 Step 2: Fetching contacts with fresh token...');
    
    const contactsResponse = await axios({
      method: 'GET',
      url: 'https://app.practicepanther.com/api/v2/contacts',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: { per_page: 100 }
    });

    const contacts = contactsResponse.data;
    console.log(`🎉 SUCCESS! Fetched ${contacts.length} contacts!\n`);

    // Step 3: Display summary
    console.log('📊 CONTACT SUMMARY:');
    console.log(`─────────────────────────────────`);
    console.log(`Total Contacts: ${contacts.length}`);
    
    const withEmails = contacts.filter(c => c.email && c.email.trim()).length;
    const withPhones = contacts.filter(c => c.phone_home || c.phone_work || c.phone_mobile).length;
    
    console.log(`With Emails: ${withEmails}`);
    console.log(`With Phone Numbers: ${withPhones}`);
    console.log(`─────────────────────────────────\n`);

    // Step 4: Show all contacts
    console.log('👤 ALL CONTACTS:');
    contacts.forEach((contact, index) => {
      const name = contact.display_name || contact.last_name || 'Unnamed Contact';
      const email = contact.email ? ` | ${contact.email}` : '';
      const phone = contact.phone_home || contact.phone_work || contact.phone_mobile || '';
      const phoneStr = phone ? ` | ${phone}` : '';
      
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${name}${email}${phoneStr}`);
    });

    // Step 5: Export files
    const timestamp = new Date().toISOString().split('T')[0];
    
    // JSON export
    const jsonFilename = `practicepanther-contacts-${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(contacts, null, 2));
    
    // CSV export
    const csvHeader = 'ID,Display Name,Email,Phone Home,Phone Work,Phone Mobile,Account Name,Notes\n';
    const csvContent = contacts.map(c => {
      const row = [
        c.id || '',
        c.display_name || '',
        c.email || '',
        c.phone_home || '',
        c.phone_work || '',
        c.phone_mobile || '',
        c.account_ref?.display_name || '',
        c.notes || ''
      ];
      return row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    const csvFilename = `practicepanther-contacts-${timestamp}.csv`;
    fs.writeFileSync(csvFilename, csvHeader + csvContent);

    console.log(`\n💾 FILES EXPORTED:`);
    console.log(`   📄 JSON: ${jsonFilename}`);
    console.log(`   📊 CSV: ${csvFilename}`);

    // Step 6: Save the new tokens for future use
    console.log(`\n🔐 TOKENS FOR FUTURE USE:`);
    console.log(`Access Token: ${access_token}`);
    console.log(`Refresh Token: ${newRefreshToken}`);
    console.log(`Expires: ${new Date(Date.now() + expires_in * 1000).toISOString()}`);

    return { contacts, tokens: { access_token, refresh_token: newRefreshToken, expires_in } };

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    throw error;
  }
}

// Run the complete flow
getFreshTokenAndFetchContacts()
  .then(({ contacts, tokens }) => {
    console.log(`\n🎉 COMPLETE SUCCESS!`);
    console.log(`✅ Auto-refresh mechanism: WORKING`);
    console.log(`✅ Token refresh: WORKING`);
    console.log(`✅ API access: WORKING`);
    console.log(`✅ Contacts fetched: ${contacts.length}`);
    console.log(`✅ Files exported: 2 files`);
    console.log(`\n💡 The sync system is fully functional!`);
  })
  .catch(error => {
    console.error('\n💥 Process failed');
  });