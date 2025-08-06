require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupSupabaseTables() {
  try {
    console.log('🔧 Setting up Supabase tables...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`\n🔧 Running migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        // Split SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
              console.log(`⚠️ Statement failed: ${error.message}`);
              console.log(`   SQL: ${statement.substring(0, 100)}...`);
            }
          }
        }
        
        console.log(`✅ Migration ${file} completed`);
      } catch (error) {
        console.log(`❌ Migration ${file} failed: ${error.message}`);
      }
    }
    
    // Create admin user
    console.log('\n👤 Creating admin user...');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert({
        email: 'admin@peak1031.com',
        password_hash: passwordHash,
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        is_active: true
      })
      .select()
      .single();
    
    if (adminError) {
      console.log(`❌ Failed to create admin user: ${adminError.message}`);
    } else {
      console.log(`✅ Admin user created: ${adminUser.email}`);
    }
    
    console.log('\n🎉 Supabase setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up Supabase:', error.message);
  }
}

setupSupabaseTables(); 