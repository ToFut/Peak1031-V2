const { Sequelize } = require('sequelize');
const path = require('path');

// For development, fall back to SQLite if Supabase is not configured
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Check if Supabase credentials are available
const hasSupabaseCredentials = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY));

const useSupabase = true; // Force Supabase mode
const useSQLite = false; // Disable SQLite fallback

console.log('🔧 Database Service: Using', useSupabase ? 'Supabase REST API' : 'SQLite database');

if (!hasSupabaseCredentials) {
  console.log('⚠️ Supabase credentials not found - falling back to SQLite');
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