const { Sequelize } = require('sequelize');
const path = require('path');

// Use SQLite for development, PostgreSQL for production
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const sequelize = new Sequelize(
  isDevelopment 
    ? {
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../database.sqlite'),
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      }
    : {
        database: process.env.DB_NAME || 'peak1031_dev',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection }; 