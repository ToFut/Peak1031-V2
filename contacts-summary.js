require('dotenv').config({ path: './backend/.env' });
const axios = require('./backend/node_modules/axios').default;
const fs = require('fs');

// Use the access token we obtained
const ACCESS_TOKEN = '00xymrV9BEUoXPviItXSAmrKTmdgv2ErgBIwgg5Wec-oEz9Oe4yZFUxEAkubFJGRgzimcgKZEK36zuORz0nzSYfzmhrEQlqZUoT72DKftiBUMXqTUxDdF6yCTLv1gWnj6dF-uvcrpXSteKbMA-1u0wK2ZEPjRKyOTxlh7a9BJVYYLYNmuiHmmn4HJ6dXdPZMeqBi2IEzjIeSy-L9gInt803HepAq6I1qXVz-cYaYXCF7ALSaBKUmUM2zClifbQmsOrff-TzMAloqWf6YjB5JZ4JDCD_rBvcQVHTtcDBHB5v79T-IewCWsyf_cH48TSMs_G4hpoy9czi8XK21TjYKI659dZHl90xywb6SyQAEQ2uocfqAzUT4ajTFBPklO0i2II-cpxa2R0xFufeWLPx6OEml1DnJTkNV6WopBZCUsLuxFC9sdtGJdpLe-bkNnPWkSCBy5V-h3dnGK1Ep3vpsD1ZfU77QF5cu44xMnF1FnzAtd8hVrQvYUAcVAE4xjIucoOKKXrSFk1evHWgBH075HYdbXsbhuqosxcRLwNWJ-KCFYrHG8XUbIWlzjhQX0AsmA';

async function getContactsSummary() {
  console.log('👥 Fetching PracticePanther Contacts Summary\n');

  try {
    const response = await axios({
      method: 'GET',
      url: 'https://app.practicepanther.com/api/v2/contacts',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: { per_page: 100 }
    });

    const contacts = response.data;
    console.log(`✅ Successfully fetched ${contacts.length} contacts!\n`);

    // Generate summary
    console.log('📊 CONTACT SUMMARY:');
    console.log(`Total Contacts: ${contacts.length}`);
    
    const withEmails = contacts.filter(c => c.email && c.email.trim() !== '').length;
    const withPhones = contacts.filter(c => c.phone_home || c.phone_work || c.phone_mobile).length;
    const withDisplayNames = contacts.filter(c => c.display_name && c.display_name.trim() !== '').length;
    
    console.log(`With Emails: ${withEmails}`);
    console.log(`With Phone Numbers: ${withPhones}`);
    console.log(`With Display Names: ${withDisplayNames}`);
    console.log('---\n');

    // List all contacts in a clean format
    console.log('👤 ALL CONTACTS:');
    contacts.forEach((contact, index) => {
      const name = contact.display_name || contact.last_name || 'Unnamed Contact';
      const email = contact.email ? ` | ${contact.email}` : '';
      const phone = contact.phone_home || contact.phone_work || contact.phone_mobile || '';
      const phoneStr = phone ? ` | ${phone}` : '';
      const company = contact.account_ref?.display_name ? ` (${contact.account_ref.display_name})` : '';
      
      console.log(`${index + 1}. ${name}${email}${phoneStr}${company}`);
    });

    // Export to files
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Full JSON export
    const jsonFilename = `practicepanther-contacts-full-${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(contacts, null, 2));
    
    // CSV export (simplified)
    const csvData = contacts.map(c => ({
      id: c.id,
      display_name: c.display_name || '',
      email: c.email || '',
      phone_home: c.phone_home || '',
      phone_work: c.phone_work || '',
      phone_mobile: c.phone_mobile || '',
      account_name: c.account_ref?.display_name || '',
      notes: c.notes || '',
      referred_by: c.custom_field_values?.find(f => f.custom_field_ref?.label === 'Referred By')?.value_string || ''
    }));
    
    const csvFilename = `practicepanther-contacts-summary-${timestamp}.csv`;
    const csvHeader = 'ID,Display Name,Email,Phone Home,Phone Work,Phone Mobile,Account Name,Notes,Referred By\n';
    const csvContent = csvData.map(row => 
      Object.values(row).map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    fs.writeFileSync(csvFilename, csvHeader + csvContent);

    console.log(`\n💾 Files exported:`);
    console.log(`   📄 Full JSON: ${jsonFilename}`);
    console.log(`   📊 CSV Summary: ${csvFilename}`);
    
    return contacts;

  } catch (error) {
    console.error('❌ Error fetching contacts:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    throw error;
  }
}

// Run the summary
getContactsSummary()
  .then(contacts => {
    console.log(`\n🎉 Successfully processed ${contacts.length} contacts from PracticePanther!`);
    console.log('✨ All contact data has been fetched and exported to files.');
  })
  .catch(error => {
    console.error('💥 Failed to fetch contacts summary');
  });