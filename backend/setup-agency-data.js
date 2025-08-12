/**
 * Setup Agency Database Structure and Sample Data
 * Creates the necessary database structure for agency functionality
 */

const supabaseService = require('./services/supabase');
const bcrypt = require('bcryptjs');

async function setupAgencyData() {
  try {
    console.log('🎯 Setting up Agency database structure and data...');
    
    // Check if we can access the database
    const { data: testQuery, error: testError } = await supabaseService.client
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to database:', testError);
      return false;
    }
    
    console.log('✅ Database connection verified');
    
    // Step 1: Check if agency_third_party_assignments table exists
    console.log('🔍 Checking for agency_third_party_assignments table...');
    
    const { data: tableCheck, error: tableError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Table agency_third_party_assignments does not exist');
      console.log('📋 Please create this table in Supabase dashboard:');
      console.log('----------------------------------------------');
      console.log(`
CREATE TABLE agency_third_party_assignments (
  id BIGSERIAL PRIMARY KEY,
  agency_contact_id UUID NOT NULL,
  third_party_contact_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID,
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_contact_id, third_party_contact_id)
);

-- Add RLS policy
ALTER TABLE agency_third_party_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for agencies to see their own assignments
CREATE POLICY "Agencies can view their assignments" ON agency_third_party_assignments
  FOR SELECT USING (agency_contact_id = auth.uid());

-- Policy for admins to manage all assignments  
CREATE POLICY "Admins can manage all assignments" ON agency_third_party_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
      `);
      console.log('----------------------------------------------');
      console.log('🔄 After creating the table, run this script again');
      return false;
    } else if (tableError) {
      console.error('❌ Error checking table:', tableError);
      return false;
    }
    
    console.log('✅ agency_third_party_assignments table exists');
    
    // Step 2: Create agency user if doesn't exist
    console.log('👤 Setting up agency user...');
    
    const agencyEmail = 'agency@peak1031.com';
    
    // Check if agency user exists
    const { data: existingUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', agencyEmail)
      .single();
    
    let agencyUser = existingUser;
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const { data: newUser, error: userError } = await supabaseService.client
        .from('users')
        .insert([{
          email: agencyEmail,
          password_hash: hashedPassword,
          role: 'agency',
          first_name: 'Peak',
          last_name: 'Agency',
          is_active: true
        }])
        .select()
        .single();
      
      if (userError) {
        console.error('❌ Error creating agency user:', userError);
        return false;
      }
      
      agencyUser = newUser;
      console.log('✅ Agency user created:', agencyEmail);
    } else {
      console.log('✅ Agency user exists:', agencyEmail);
    }
    
    // Step 3: Create third party users and contacts
    console.log('👥 Setting up third party users and contacts...');
    
    const thirdParties = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'thirdparty1@peak1031.com',
        company: 'Premier Property Advisors',
        phone: '(555) 123-4567'
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'thirdparty2@peak1031.com',
        company: 'Capital Exchange Partners',
        phone: '(555) 234-5678'
      },
      {
        first_name: 'Mike',
        last_name: 'Davis',
        email: 'thirdparty3@peak1031.com',
        company: 'Metro Realty Solutions',
        phone: '(555) 345-6789'
      }
    ];
    
    const thirdPartyContacts = [];
    
    for (const tp of thirdParties) {
      // Step 3a: Create third party USER first
      const { data: existingUser } = await supabaseService.client
        .from('users')
        .select('*')
        .eq('email', tp.email)
        .single();
      
      let thirdPartyUser = existingUser;
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const { data: newUser, error: userError } = await supabaseService.client
          .from('users')
          .insert([{
            email: tp.email,
            password_hash: hashedPassword,
            role: 'third_party',
            first_name: tp.first_name,
            last_name: tp.last_name,
            is_active: true
          }])
          .select()
          .single();
        
        if (userError) {
          console.log(`⚠️ Error creating user ${tp.email}:`, userError.message);
          continue;
        }
        
        thirdPartyUser = newUser;
        console.log(`✅ Third party user created: ${tp.email}`);
      } else {
        console.log(`✅ Third party user exists: ${tp.email}`);
      }
      
      // Step 3b: Create/update contact linked to the user
      const { data: existingContact } = await supabaseService.client
        .from('contacts')
        .select('*')
        .eq('email', tp.email)
        .single();
      
      let contact = existingContact;
      
      if (!existingContact) {
        const { data: newContact, error: contactError } = await supabaseService.client
          .from('contacts')
          .insert([tp])  // Create contact without user_id field
          .select()
          .single();
        
        if (contactError) {
          console.log(`⚠️ Error creating contact for ${tp.company}:`, contactError.message);
        } else {
          console.log(`✅ Third party contact created: ${tp.company}`);
          contact = newContact;
        }
      } else {
        console.log(`✅ Third party contact exists: ${tp.company}`);
        contact = existingContact;
      }
      
      if (contact) {
        // Store both user and contact info for later use
        thirdPartyContacts.push({
          ...contact,
          user_id: thirdPartyUser.id,
          user: thirdPartyUser
        });
      }
    }
    
    // Step 4: Create agency assignments
    console.log('🔗 Setting up agency assignments...');
    
    for (const contact of thirdPartyContacts) {
      // Check if assignment exists
      const { data: existingAssignment } = await supabaseService.client
        .from('agency_third_party_assignments')
        .select('*')
        .eq('agency_contact_id', agencyUser.id)
        .eq('third_party_contact_id', contact.id)
        .single();
      
      if (existingAssignment) {
        console.log(`✅ Assignment exists: ${contact.company}`);
      } else {
        const { error: assignmentError } = await supabaseService.client
          .from('agency_third_party_assignments')
          .insert([{
            agency_contact_id: agencyUser.id,
            third_party_contact_id: contact.id,
            is_active: true,
            assigned_by: agencyUser.id
          }]);
        
        if (assignmentError) {
          console.log(`⚠️ Error creating assignment for ${contact.company}:`, assignmentError.message);
        } else {
          console.log(`✅ Assignment created: ${contact.company}`);
        }
      }
    }
    
    // Step 5: Get existing exchanges (including SEGEV DEMO)
    console.log('📄 Finding existing exchanges...');
    
    const { data: existingExchanges, error: exchangeError } = await supabaseService.client
      .from('exchanges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (exchangeError) {
      console.error('❌ Error fetching existing exchanges:', exchangeError);
      return false;
    }
    
    console.log(`✅ Found ${existingExchanges.length} existing exchanges:`);
    existingExchanges.forEach(ex => {
      console.log(`   - ${ex.name || ex.display_name || 'Unnamed Exchange'} (${ex.id})`);
    });
    
    const createdExchanges = existingExchanges;
    
    // Step 6: Create exchange participants (assign third parties to exchanges)
    console.log('🔗 Setting up exchange participants...');
    
    if (thirdPartyContacts.length === 0) {
      console.log('⚠️ No third party contacts available for participant assignments');
      return true; // Still consider this successful
    }
    
    for (let i = 0; i < createdExchanges.length && i < 5; i++) { // Limit to first 5 exchanges
      const exchange = createdExchanges[i];
      const thirdParty = thirdPartyContacts[i % thirdPartyContacts.length];
      
      if (!thirdParty || !thirdParty.id) {
        console.log(`⚠️ Invalid third party data at index ${i}`);
        continue;
      }
      
      const { data: existingParticipant } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('exchange_id', exchange.id)
        .eq('contact_id', thirdParty.id)
        .single();
      
      if (existingParticipant) {
        console.log(`✅ Participant exists: ${thirdParty.company} -> ${exchange.name || exchange.display_name || 'Exchange'}`);
      } else {
        const { error: participantError } = await supabaseService.client
          .from('exchange_participants')
          .insert([{
            exchange_id: exchange.id,
            contact_id: thirdParty.id,
            is_active: true
          }]);
        
        if (participantError) {
          console.log(`⚠️ Error creating participant:`, participantError.message);
        } else {
          console.log(`✅ Participant created: ${thirdParty.company} -> ${exchange.name || exchange.display_name || 'Exchange'}`);
        }
      }
    }
    
    console.log('\n🎉 Agency database setup complete!');
    console.log('📊 Summary:');
    console.log(`   👤 Agency user: ${agencyEmail} (password: password123)`);
    console.log(`   👥 Third party users created:`);
    thirdPartyContacts.forEach(tp => {
      if (tp.user) {
        console.log(`      - ${tp.user.email} (${tp.company}) - password: password123`);
      }
    });
    console.log(`   📄 Connected to ${createdExchanges.length} existing exchanges`);
    console.log(`   🔗 Created ${thirdPartyContacts.length} agency assignments`);
    console.log('\n✅ The Agency dashboard should now load REAL DATA from the database!');
    console.log('🎯 Test by logging in as agency@peak1031.com and viewing the third parties');
    console.log('🎯 Each third party user can also log in to see their assigned exchanges');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in setupAgencyData:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setupAgencyData().then((success) => {
    console.log(success ? '✅ Setup complete' : '❌ Setup failed');
    process.exit(success ? 0 : 1);
  });
}

module.exports = { setupAgencyData };