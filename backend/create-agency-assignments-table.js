/**
 * Create agency third party assignments table
 * This table manages which third parties are assigned to which agencies
 */

const supabaseService = require('./services/supabase');

async function createAgencyAssignmentsTable() {
  try {
    console.log('🏗️ Creating agency_third_party_assignments table...');
    
    // Create the table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS agency_third_party_assignments (
        id SERIAL PRIMARY KEY,
        agency_contact_id VARCHAR(255) NOT NULL,
        third_party_contact_id VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        assigned_by VARCHAR(255),
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key constraints (assuming contacts table exists)
        -- CONSTRAINT fk_agency_contact FOREIGN KEY (agency_contact_id) REFERENCES contacts(id),
        -- CONSTRAINT fk_third_party_contact FOREIGN KEY (third_party_contact_id) REFERENCES contacts(id),
        
        -- Unique constraint to prevent duplicate assignments
        UNIQUE(agency_contact_id, third_party_contact_id)
      );
    `;
    
    const { data, error } = await supabaseService.client.rpc('exec_sql', {
      sql_query: createTableQuery
    });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      
      // Try alternative approach using direct SQL
      console.log('🔄 Trying alternative table creation...');
      
      // For now, let's just log the SQL and ask the user to create it manually
      console.log('\n📋 Please create this table in Supabase dashboard:');
      console.log('----------------------------------------------');
      console.log(createTableQuery);
      console.log('----------------------------------------------\n');
      
      return false;
    }
    
    console.log('✅ Table created successfully');
    
    // Insert some sample data for testing
    console.log('📊 Inserting sample agency assignments...');
    
    const sampleData = [
      {
        agency_contact_id: 'agency_1',
        third_party_contact_id: 'tp_1',
        is_active: true,
        assigned_by: 'admin'
      },
      {
        agency_contact_id: 'agency_1',
        third_party_contact_id: 'tp_2',
        is_active: true,
        assigned_by: 'admin'
      },
      {
        agency_contact_id: 'agency_1',
        third_party_contact_id: 'tp_3',
        is_active: true,
        assigned_by: 'admin'
      }
    ];
    
    for (const assignment of sampleData) {
      const { error: insertError } = await supabaseService.client
        .from('agency_third_party_assignments')
        .insert([assignment]);
      
      if (insertError) {
        console.log(`⚠️ Sample data insert failed (table may not exist):`, insertError.message);
      } else {
        console.log(`✅ Sample assignment created: agency ${assignment.agency_contact_id} -> tp ${assignment.third_party_contact_id}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in createAgencyAssignmentsTable:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createAgencyAssignmentsTable().then((success) => {
    console.log(success ? '✅ Setup complete' : '❌ Setup failed');
    process.exit(success ? 0 : 1);
  });
}

module.exports = { createAgencyAssignmentsTable };