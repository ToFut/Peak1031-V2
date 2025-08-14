const databaseService = require('./backend/services/database');

async function updateExistingAgency() {
  try {
    console.log('🔧 Updating existing agency user...');
    
    // Get the existing agency user
    const existingUser = await databaseService.getUserByEmail('agency@peak1031.com');
    
    if (existingUser) {
      console.log('📋 Current agency user data:', {
        id: existingUser.id,
        email: existingUser.email,
        first_name: existingUser.first_name,
        last_name: existingUser.last_name,
        company: existingUser.company,
        role: existingUser.role
      });
      
      // Update with proper data
      const updatedUser = await databaseService.updateUser(existingUser.id, {
        first_name: 'Peak',
        last_name: 'Agency',
        company: 'Peak 1031 Agency',
        phone_primary: '(555) 000-0000',
        display_name: 'Peak 1031 Agency'
      });
      
      console.log('✅ Updated agency user:', {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        company: updatedUser.company,
        role: updatedUser.role
      });
    } else {
      console.log('❌ Agency user not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating agency user:', error);
  }
}

// Run the update
updateExistingAgency();
