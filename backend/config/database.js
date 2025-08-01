const { Sequelize } = require('sequelize');
const path = require('path');

// For development, use Supabase REST API for data operations
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const useSupabase = true; // Always use Supabase
const useSQLite = false; // Never use SQLite

console.log('🔧 Database Service: Using Supabase REST API only');

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