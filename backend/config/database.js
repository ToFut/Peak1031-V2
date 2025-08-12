const { Sequelize } = require('sequelize');
const path = require('path');

// For development, fall back to SQLite if Supabase is not configured
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Check if Supabase credentials are available
const hasSupabaseCredentials = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY));

// Use Supabase only if credentials are available, otherwise use SQLite
const useSupabase = hasSupabaseCredentials;
const useSQLite = !hasSupabaseCredentials;

console.log('🔧 Database Service: Using', useSupabase ? 'Supabase REST API' : 'SQLite database');

if (useSupabase && !hasSupabaseCredentials) {
  console.error('❌ CRITICAL: Supabase credentials not found!');
  console.error('❌ Please configure SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY in your .env file');
  console.error('❌ The application will not work without Supabase credentials');
}

// Create a minimal Sequelize instance for model definitions
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection, useSupabase }; 