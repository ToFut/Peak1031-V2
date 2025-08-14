const databaseService = require('./services/database');

async function testDatabaseService() {
  try {
    const user = await databaseService.getUserByEmail('admin@peak1031.com');
    
    console.log('User from database service:', user ? user.email : 'null');
    console.log('User keys:', user ? Object.keys(user) : 'null');
    console.log('Password hash exists:', user ? !!user.passwordHash : 'null');
    
    if (user) {
      console.log('User object:', JSON.stringify(user, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabaseService();

