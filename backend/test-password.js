const { sequelize } = require('./config/database');
const User = require('./models/User');

async function testPassword() {
  try {
    await sequelize.sync();
    
    const user = await User.findOne({ where: { email: 'admin@peak1031.com' } });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('Password hash exists:', !!user.passwordHash);
    console.log('Password hash length:', user.passwordHash ? user.passwordHash.length : 0);
    
    if (user.passwordHash) {
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare('admin123', user.passwordHash);
      console.log('Password validation:', isValid);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

testPassword();
