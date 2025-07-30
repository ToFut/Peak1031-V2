require('dotenv').config({ path: './backend/.env' });
const axios = require('./backend/node_modules/axios').default;

// Use the access token we just obtained
const ACCESS_TOKEN = '00xymrV9BEUoXPviItXSAmrKTmdgv2ErgBIwgg5Wec-oEz9Oe4yZFUxEAkubFJGRgzimcgKZEK36zuORz0nzSYfzmhrEQlqZUoT72DKftiBUMXqTUxDdF6yCTLv1gWnj6dF-uvcrpXSteKbMA-1u0wK2ZEPjRKyOTxlh7a9BJVYYLYNmuiHmmn4HJ6dXdPZMeqBi2IEzjIeSy-L9gInt803HepAq6I1qXVz-cYaYXCF7ALSaBKUmUM2zClifbQmsOrff-TzMAloqWf6YjB5JZ4JDCD_rBvcQVHTtcDBHB5v79T-IewCWsyf_cH48TSMs_G4hpoy9czi8XK21TjYKI659dZHl90xywb6SyQAEQ2uocfqAzUT4ajTFBPklO0i2II-cpxa2R0xFufeWLPx6OEm1DnJTkNV6WopBZCUsLuxFC9sdtGJdpLe-bkNnPWkSCBy5V-h3dnGK1Ep3vpsD1ZfU77QF5cu44xMnF1FnzAtd8hVrQvYUAcVAE4xjIucoOKKXrSFk1evHWgBH075HYdbXsbhuqosxcRLwNWJ-KCFYrHG8XUbIWlzjhQX0AsmA';

const client = axios.create({
  baseURL: 'https://app.practicepanther.com/api/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
});

async function fetchAllContacts() {
  console.log('👥 Fetching all contacts from PracticePanther...\n');

  try {
    let allContacts = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 50; // Safety limit

    while (hasMore && page <= maxPages) {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await client.get('/contacts', {
        params: {
          page: page,
          per_page: 100 // Maximum per page
        }
      });

      const contacts = response.data.results || response.data.data || [];
      allContacts = allContacts.concat(contacts);
      
      console.log(`✅ Page ${page}: ${contacts.length} contacts fetched`);
      
      // Check if there are more pages
      hasMore = response.data.has_more || (contacts.length === 100);
      page++;
      
      // Small delay between requests
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`\n🎯 Total contacts fetched: ${allContacts.length}`);
    
    if (allContacts.length > 0) {
      // Display sample contact data
      console.log('\n📋 Sample contact data:');
      const sampleContact = allContacts[0];
      console.log(JSON.stringify(sampleContact, null, 2));
      
      // Show summary
      console.log('\n📊 Contact Summary:');
      console.log(`Total contacts: ${allContacts.length}`);
      
      const withEmails = allContacts.filter(c => c.email && c.email.trim() !== '').length;
      const withPhones = allContacts.filter(c => c.phone && c.phone.trim() !== '').length;
      const withCompanies = allContacts.filter(c => c.company && c.company.trim() !== '').length;
      
      console.log(`Contacts with emails: ${withEmails}`);
      console.log(`Contacts with phones: ${withPhones}`);
      console.log(`Contacts with companies: ${withCompanies}`);
      
      // Show contact list
      console.log('\n👤 All Contacts:');
      allContacts.forEach((contact, index) => {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'No Name';
        const email = contact.email ? ` (${contact.email})` : '';
        const company = contact.company ? ` - ${contact.company}` : '';
        const phone = contact.phone ? ` | ${contact.phone}` : '';
        console.log(`${index + 1}. ${name}${email}${company}${phone}`);
      });
      
      // Export to JSON file
      const fs = require('fs');
      const filename = `practicepanther-contacts-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(allContacts, null, 2));
      console.log(`\n💾 Contacts exported to: ${filename}`);
    } else {
      console.log('📭 No contacts found in PracticePanther account');
    }

    return allContacts;

  } catch (error) {
    console.error('❌ Error fetching contacts:', error.message);
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
    }
    throw error;
  }
}

// Run the function
fetchAllContacts()
  .then(contacts => {
    console.log(`\n✨ Successfully retrieved ${contacts.length} contacts from PracticePanther!`);
  })
  .catch(error => {
    console.error('💥 Failed to fetch contacts:', error.message);
  });