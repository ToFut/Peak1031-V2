require('dotenv').config();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

async function fixAgencyLogin() {
  console.log('🔧 Fixing agency login...');
  
  // Create password hash
  const password = 'agency123';
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Connect to SQLite database
  const db = new sqlite3.Database('./database.sqlite');
  
  return new Promise((resolve, reject) => {
    // Check if agency user exists
    db.get("SELECT * FROM users WHERE email = 'agency@peak1031.com'", (err, row) => {
      if (err) {
        console.error('❌ Error checking user:', err);
        reject(err);
        return;
      }
      
      if (row) {
        // Update existing user
        db.run(
          "UPDATE users SET password_hash = ?, is_active = 1 WHERE email = 'agency@peak1031.com'",
          [passwordHash],
          function(err) {
            if (err) {
              console.error('❌ Error updating user:', err);
              reject(err);
            } else {
              console.log('✅ Updated agency user with correct password hash');
              resolve();
            }
          }
        );
      } else {
        // Create new user
        const userId = 'agency-' + Date.now();
        db.run(
          "INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [userId, 'agency@peak1031.com', passwordHash, 'agency', 'Agency', 'User', 1],
          function(err) {
            if (err) {
              console.error('❌ Error creating user:', err);
              reject(err);
            } else {
              console.log('✅ Created agency user with correct password hash');
              resolve();
            }
          }
        );
      }
    });
    
    db.close();
  });
}

fixAgencyLogin()
  .then(() => {
    console.log('🎉 Agency login fixed!');
    console.log('📋 Login credentials: agency@peak1031.com / agency123');
  })
  .catch(console.error);
