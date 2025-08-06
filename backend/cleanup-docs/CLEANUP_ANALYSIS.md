# Backend Cleanup Analysis

## 🗑️ **SAFE TO DELETE** (One-time scripts, debugging, temporary files)

### **Debug/Check Scripts** (One-time use)
- `check-people-table.js` - Debug script for people table
- `check-exchanges.js` - Debug script for exchanges
- `check-supabase-tables.js` - Debug script for Supabase tables
- `check-new-supabase.js` - Debug script for new Supabase setup
- `check-user-tables.js` - Debug script for user tables
- `check-exchange-count.js` - Debug script for exchange count
- `check-exchange-participants-schema.js` - Debug script for schema
- `check-exchanges-issue.js` - Debug script for exchange issues
- `check-generated-docs-table.js` - Debug script for docs table
- `check-progress-table.js` - Debug script for progress table
- `check-storage-bucket.js` - Debug script for storage
- `check-template-schema.js` - Debug script for template schema
- `check-token-refresh.js` - Debug script for token refresh
- `check-pp-tokens.js` - Debug script for PP tokens
- `check-pp-scopes-and-permissions.js` - Debug script for PP permissions
- `check-pp-exchanges-count.js` - Debug script for PP exchanges
- `check-db-structure.js` - Debug script for DB structure
- `check-and-update-db.js` - Debug script for DB updates
- `check-current-db-contacts.js` - Debug script for contacts

### **API Debug Scripts** (One-time use)
- `debug-pp-api.js` - Debug PP API responses
- `debug-pp-matters-api.js` - Debug PP matters API
- `debug-pp-response-format.js` - Debug PP response format
- `debug-contacts-api.js` - Debug contacts API

### **Status/Show Scripts** (Redundant)
- `show-db-status.js` - Redundant with show-db-status-fixed.js
- `show-db-details.js` - One-time debugging script
- `show-generated-docs.js` - One-time debugging script

### **Token/Test Scripts** (One-time use)
- `get-token.js` - Simple test script
- `create-test-token.js` - One-time setup script
- `authenticate-pp.js` - One-time setup script

### **Analysis Scripts** (One-time use)
- `analyze-exchange-data.js` - One-time analysis
- `analyze-contacts-data.js` - One-time analysis
- `analyze-pp-data-compatibility.js` - One-time analysis
- `analyze-table-vs-pp.js` - One-time analysis
- `analyze-ui-compatibility.js` - One-time analysis
- `compare-tables-analysis.js` - One-time analysis

### **Migration/Conversion Scripts** (One-time use)
- `migrate-people-to-contacts.js` - One-time migration
- `convert-people-to-users.js` - One-time conversion
- `convert-to-pp-structure.js` - One-time conversion
- `complete-migration-efficiently.js` - One-time migration
- `complete-table-restructure.js` - One-time migration
- `complete-pp-data-extraction.js` - One-time migration
- `complete-pp-data-population.js` - One-time migration
- `apply-migration.js` - One-time migration

### **Verification Scripts** (One-time use)
- `verify-table-structure.js` - One-time verification
- `verify-final-database-state.js` - One-time verification
- `verify-conversion-results.js` - One-time verification

### **Import/Extraction Scripts** (One-time use)
- `extract-all-pp-data.js` - One-time extraction
- `extract-contacts-pp-data.js` - One-time extraction
- `corrected-pp-extraction.js` - One-time extraction
- `import-all-pp-contacts.js` - One-time import
- `import-pp-exchanges.js` - One-time import
- `import-sample-contacts.js` - One-time import
- `sync-pp-contacts-to-db.js` - One-time sync

### **Setup Scripts** (One-time use)
- `setup-pp-integration.js` - One-time setup
- `setup-pp-oauth.js` - One-time setup
- `setup-supabase-tables.js` - One-time setup
- `setup-template-documents.js` - One-time setup
- `quick-pp-setup.js` - One-time setup

### **Fix Scripts** (One-time use)
- `fix-admin-password.js` - One-time fix
- `fix-admin-password-new.js` - One-time fix
- `fix-client-user.js` - One-time fix
- `fix-user-contact-linking.js` - One-time fix
- `enhanced-exchange-fields.js` - One-time enhancement

### **Utility Scripts** (One-time use)
- `add-client-participant.js` - One-time utility
- `add-template-category.js` - One-time utility
- `clean-mock-data.js` - One-time cleanup
- `final-conversion-summary.js` - One-time summary
- `generate-pp-auth-url.js` - One-time utility
- `generate-pp-auth-url-with-scopes.js` - One-time utility
- `create-admin-auth-user.js` - One-time creation
- `create-all-user-accounts.js` - One-time creation
- `create-client-user.js` - One-time creation
- `continuous-pp-import.js` - One-time import
- `run-pp-sync.js` - One-time sync
- `run-enterprise-migration.js` - One-time migration

### **Log Files** (Temporary)
- `server.log` - Log file
- `import.log` - Log file (4.9MB!)
- `exchanges-import.log` - Log file
- `server_debug.log` - Log file (1.2MB!)

### **SQL Files** (One-time use)
- `fix-and-continue-import.sql` - One-time SQL
- `fix-all-constraints.sql` - One-time SQL
- `ENTERPRISE_LIFECYCLE_MIGRATION.sql` - One-time SQL

---

## ✅ **KEEP** (Essential files)

### **Core Application Files**
- `server.js` - Main server file
- `app.js` - Express application
- `package.json` - Dependencies
- `package-lock.json` - Lock file
- `Dockerfile.dev` - Docker configuration

### **Essential Directories**
- `config/` - Configuration files
- `middleware/` - Middleware functions
- `models/` - Data models
- `routes/` - API routes
- `services/` - Business logic services
- `utils/` - Utility functions
- `docs/` - Documentation
- `migrations/` - Database migrations
- `scripts/` - Useful scripts
- `supabase/` - Supabase configuration

### **Keep One Status Script**
- `show-db-status-fixed.js` - Most comprehensive status script

---

## 🤔 **REVIEW** (Decide based on current needs)

### **Potentially Useful Scripts** (Review if still needed)
- `server-enterprise.js` - Enterprise server (check if used)
- Files in `scripts/` directory - Review each one

---

## 📊 **Summary**

**Total files to delete:** ~60+ files
**Total files to keep:** ~15-20 files
**Space saved:** ~10-15MB (mostly from log files)

**Benefits of cleanup:**
- Reduced clutter
- Easier navigation
- Faster git operations
- Clearer project structure
- Reduced confusion for new developers

**Risk level:** LOW - All files marked for deletion are one-time scripts or temporary files 