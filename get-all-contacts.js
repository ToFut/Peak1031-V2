require('dotenv').config({ path: './backend/.env' });
const practicePartnerService = require('./backend/services/practicePartnerService');

async function getAllContacts() {
  console.log('👥 Getting all contacts from PracticePanther...\n');

  try {
    // First check if we have a valid token
    console.log('🔑 Checking authentication status...');
    try {
      await practicePartnerService.ensureValidToken();
      console.log('✅ Authentication valid, proceeding with contact fetch...\n');
    } catch (authError) {
      console.error('❌ Authentication required. Please complete OAuth flow first.');
      console.log('🔗 Use this URL to authorize:');
      console.log(practicePartnerService.generateAuthUrl());
      console.log('\nOr run the OAuth test server: node test-oauth-server.js');
      return;
    }

    // Fetch all contacts with pagination
    console.log('📥 Fetching contacts...');
    let allContacts = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 10; // Safety limit

    while (hasMore && page <= maxPages) {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await practicePartnerService.fetchContacts({
        page: page,
        per_page: 100 // Maximum per page
      });

      const contacts = response.results || [];
      allContacts = allContacts.concat(contacts);
      
      console.log(`✅ Page ${page}: ${contacts.length} contacts fetched`);
      
      // Check if there are more pages
      hasMore = response.hasMore && contacts.length > 0;
      page++;
      
      // Small delay between requests to be nice to the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n🎯 Total contacts fetched: ${allContacts.length}`);
    
    // Display sample contact data
    if (allContacts.length > 0) {
      console.log('\n📋 Sample contact data:');
      const sampleContact = allContacts[0];
      console.log(JSON.stringify(sampleContact, null, 2));
      
      // Show summary of all contacts
      console.log('\n📊 Contact Summary:');
      console.log(`Total contacts: ${allContacts.length}`);
      
      const withEmails = allContacts.filter(c => c.email && c.email.trim() !== '').length;
      const withPhones = allContacts.filter(c => c.phone && c.phone.trim() !== '').length;
      const withCompanies = allContacts.filter(c => c.company && c.company.trim() !== '').length;
      
      console.log(`Contacts with emails: ${withEmails}`);
      console.log(`Contacts with phones: ${withPhones}`);
      console.log(`Contacts with companies: ${withCompanies}`);
      
      // Show contact names
      console.log('\n👤 Contact Names:');
      allContacts.slice(0, 10).forEach((contact, index) => {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        const email = contact.email ? ` (${contact.email})` : '';
        const company = contact.company ? ` - ${contact.company}` : '';
        console.log(`${index + 1}. ${name}${email}${company}`);
      });
      
      if (allContacts.length > 10) {
        console.log(`... and ${allContacts.length - 10} more contacts`);
      }
    }

    return allContacts;

  } catch (error) {
    console.error('❌ Error fetching contacts:', error.message);
    if (error.response?.data) {
      console.error('API Error Details:', error.response.data);
    }
  }
}

// Run the function
getAllContacts().then(contacts => {
  if (contacts) {
    console.log(`\n✨ Successfully retrieved ${contacts.length} contacts from PracticePanther!`);
  }
}).catch(error => {
  console.error('💥 Script failed:', error);
});