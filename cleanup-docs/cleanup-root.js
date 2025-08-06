#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to delete (organized by category)
const filesToDelete = [
  // SQL Migration Files (One-time use - already executed)
  'CLEAR_PP_DATA_FIELDS.sql',
  'DROP_PEOPLE_TABLE.sql',
  'DROP_USERS_TABLE.sql',
  'COMPLETE_PP_MIGRATION.sql',
  'ENTERPRISE_LIFECYCLE_MIGRATION.sql',
  'FEATURE_READY_DATABASE_MIGRATION.sql',
  'FEATURE_READY_DATABASE_MIGRATION_FIXED.sql',
  'MINIMAL_CHAT_MIGRATION.sql',
  'STEP_BY_STEP_MIGRATION.sql',
  'SUPABASE_SETUP_COMPLETE.sql',
  'ADD_ENTERPRISE_COLUMNS.sql',
  'MERGE_PEOPLE_TO_CONTACTS.sql',
  'FIX_COLUMN_SIZES.sql',
  'FIX_CONTACTS_COLUMN_SIZES.sql',
  
  // Generated Docs SQL Files (Redundant versions)
  'SETUP_GENERATED_DOCS.sql',
  'SETUP_GENERATED_DOCS_CORRECT.sql',
  'SETUP_GENERATED_DOCS_FIXED.sql',
  'SETUP_GENERATED_DOCS_SIMPLE.sql',
  
  // Test/Debug JavaScript Files (One-time use)
  'test-supabase-connection.js',
  'test-supabase-users.js',
  'test-contact-insert.js',
  'check-db-schema.js',
  'check-db-with-anon.js',
  'check-supabase-status.js',
  'verify-service-key.js',
  'store-pp-token.js',
  
  // Large Data Files (Temporary/Development)
  'pp-data-extraction.json',
  'backend.log',
  'database.sqlite',
  
  // Redundant Documentation
  'PRACTICEPARTNER_INTEGRATION.md',
  'FEAT.md',
  'CHAT.md',
  'ExcahngeID.md'
];

// Files to keep (for reference)
const filesToKeep = [
  'package.json',
  'package-lock.json',
  'docker-compose.yml',
  'env.example',
  '.gitignore',
  'README.md',
  'QUICKSTART.md',
  'API_DOCUMENTATION.md',
  'PRACTICEPANTHER_INTEGRATION_GUIDE.md',
  'DATABASE_STRUCTURE.md',
  'ENTERPRISE_EXCHANGE_LIFECYCLE_DESIGN.md',
  'ENTERPRISE_FEATURES_STATUS.md',
  'EXCHANGE_CHAT_SYSTEM_EXPLAINED.md',
  'FeaturesContract.md',
  'DATABASE_REORGANIZATION_PLAN.md',
  'DATABASE_CLEANUP_PLAN.md',
  'RUN_INSTRUCTIONS.md',
  'setup-new-supabase.md',
  'START.sh',
  'RUN.sh',
  'ROOT_CLEANUP_ANALYSIS.md',
  'cleanup-root.js'
];

// Directories to keep
const dirsToKeep = [
  'backend',
  'frontend',
  'database',
  'sql',
  'scripts',
  'nginx',
  'deployment',
  'docs',
  'tests',
  'node_modules',
  '.git',
  '.claude',
  '.qodo'
];

function cleanupRoot() {
  console.log('🧹 Starting root directory cleanup...\n');
  
  let deletedCount = 0;
  let errorCount = 0;
  let totalSizeFreed = 0;
  
  // Delete files
  for (const file of filesToDelete) {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
      try {
        // Get file size before deletion
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        fs.unlinkSync(filePath);
        deletedCount++;
        totalSizeFreed += fileSize;
        
        console.log(`✅ Deleted: ${file} (${(fileSize / 1024).toFixed(2)} KB)`);
      } catch (error) {
        errorCount++;
        console.log(`❌ Error deleting ${file}: ${error.message}`);
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log('\n📊 Cleanup Summary:');
  console.log(`- Files deleted: ${deletedCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Space freed: ${(totalSizeFreed / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n✅ Files kept:');
  filesToKeep.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log('\n📁 Directories kept:');
  dirsToKeep.forEach(dir => {
    console.log(`  - ${dir}/`);
  });
  
  console.log('\n🎉 Root directory cleanup completed!');
  console.log('Your project root is now much cleaner and more organized.');
}

// Run cleanup
if (require.main === module) {
  cleanupRoot();
}

module.exports = { cleanupRoot, filesToDelete, filesToKeep, dirsToKeep }; 