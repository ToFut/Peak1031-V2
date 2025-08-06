#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to delete (organized by category)
const filesToDelete = [
  // Debug/Check Scripts
  'check-people-table.js',
  'check-exchanges.js',
  'check-supabase-tables.js',
  'check-new-supabase.js',
  'check-user-tables.js',
  'check-exchange-count.js',
  'check-exchange-participants-schema.js',
  'check-exchanges-issue.js',
  'check-generated-docs-table.js',
  'check-progress-table.js',
  'check-storage-bucket.js',
  'check-template-schema.js',
  'check-token-refresh.js',
  'check-pp-tokens.js',
  'check-pp-scopes-and-permissions.js',
  'check-pp-exchanges-count.js',
  'check-db-structure.js',
  'check-and-update-db.js',
  'check-current-db-contacts.js',
  
  // API Debug Scripts
  'debug-pp-api.js',
  'debug-pp-matters-api.js',
  'debug-pp-response-format.js',
  'debug-contacts-api.js',
  
  // Status/Show Scripts (redundant)
  'show-db-status.js',
  'show-db-details.js',
  'show-generated-docs.js',
  
  // Token/Test Scripts
  'get-token.js',
  'create-test-token.js',
  'authenticate-pp.js',
  
  // Analysis Scripts
  'analyze-exchange-data.js',
  'analyze-contacts-data.js',
  'analyze-pp-data-compatibility.js',
  'analyze-table-vs-pp.js',
  'analyze-ui-compatibility.js',
  'compare-tables-analysis.js',
  
  // Migration/Conversion Scripts
  'migrate-people-to-contacts.js',
  'convert-people-to-users.js',
  'convert-to-pp-structure.js',
  'complete-migration-efficiently.js',
  'complete-table-restructure.js',
  'complete-pp-data-extraction.js',
  'complete-pp-data-population.js',
  'apply-migration.js',
  
  // Verification Scripts
  'verify-table-structure.js',
  'verify-final-database-state.js',
  'verify-conversion-results.js',
  
  // Import/Extraction Scripts
  'extract-all-pp-data.js',
  'extract-contacts-pp-data.js',
  'corrected-pp-extraction.js',
  'import-all-pp-contacts.js',
  'import-pp-exchanges.js',
  'import-sample-contacts.js',
  'sync-pp-contacts-to-db.js',
  
  // Setup Scripts
  'setup-pp-integration.js',
  'setup-pp-oauth.js',
  'setup-supabase-tables.js',
  'setup-template-documents.js',
  'quick-pp-setup.js',
  
  // Fix Scripts
  'fix-admin-password.js',
  'fix-admin-password-new.js',
  'fix-client-user.js',
  'fix-user-contact-linking.js',
  'enhanced-exchange-fields.js',
  
  // Utility Scripts
  'add-client-participant.js',
  'add-template-category.js',
  'clean-mock-data.js',
  'final-conversion-summary.js',
  'generate-pp-auth-url.js',
  'generate-pp-auth-url-with-scopes.js',
  'create-admin-auth-user.js',
  'create-all-user-accounts.js',
  'create-client-user.js',
  'continuous-pp-import.js',
  'run-pp-sync.js',
  'run-enterprise-migration.js',
  
  // Log Files
  'server.log',
  'import.log',
  'exchanges-import.log',
  'server_debug.log',
  
  // SQL Files
  'fix-and-continue-import.sql',
  'fix-all-constraints.sql',
  'ENTERPRISE_LIFECYCLE_MIGRATION.sql'
];

// Files to keep (for reference)
const filesToKeep = [
  'server.js',
  'app.js',
  'package.json',
  'package-lock.json',
  'Dockerfile.dev',
  'show-db-status-fixed.js',
  'CLEANUP_ANALYSIS.md',
  'cleanup-backend.js'
];

// Directories to keep
const dirsToKeep = [
  'config',
  'middleware',
  'models',
  'routes',
  'services',
  'utils',
  'docs',
  'migrations',
  'scripts',
  'supabase',
  'node_modules'
];

function cleanupBackend() {
  console.log('🧹 Starting backend cleanup...\n');
  
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
  
  console.log('\n🎉 Cleanup completed!');
  console.log('Your backend directory is now much cleaner and more organized.');
}

// Run cleanup
if (require.main === module) {
  cleanupBackend();
}

module.exports = { cleanupBackend, filesToDelete, filesToKeep, dirsToKeep }; 