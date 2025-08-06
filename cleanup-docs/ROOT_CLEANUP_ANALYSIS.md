# Root Directory Cleanup Analysis

## 🗑️ **SAFE TO DELETE** (One-time scripts, SQL files, temporary files)

### **SQL Migration Files** (One-time use - already executed)
- `CLEAR_PP_DATA_FIELDS.sql` - One-time cleanup script
- `DROP_PEOPLE_TABLE.sql` - One-time table drop
- `DROP_USERS_TABLE.sql` - One-time table drop
- `COMPLETE_PP_MIGRATION.sql` - One-time migration
- `ENTERPRISE_LIFECYCLE_MIGRATION.sql` - One-time migration
- `FEATURE_READY_DATABASE_MIGRATION.sql` - One-time migration
- `FEATURE_READY_DATABASE_MIGRATION_FIXED.sql` - One-time migration
- `MINIMAL_CHAT_MIGRATION.sql` - One-time migration
- `STEP_BY_STEP_MIGRATION.sql` - One-time migration
- `SUPABASE_SETUP_COMPLETE.sql` - One-time setup
- `ADD_ENTERPRISE_COLUMNS.sql` - One-time addition
- `MERGE_PEOPLE_TO_CONTACTS.sql` - One-time merge
- `FIX_COLUMN_SIZES.sql` - One-time fix
- `FIX_CONTACTS_COLUMN_SIZES.sql` - One-time fix

### **Generated Docs SQL Files** (Redundant versions)
- `SETUP_GENERATED_DOCS.sql` - Redundant
- `SETUP_GENERATED_DOCS_CORRECT.sql` - Redundant
- `SETUP_GENERATED_DOCS_FIXED.sql` - Redundant
- `SETUP_GENERATED_DOCS_SIMPLE.sql` - Redundant

### **Test/Debug JavaScript Files** (One-time use)
- `test-supabase-connection.js` - One-time test script
- `test-supabase-users.js` - One-time test script
- `test-contact-insert.js` - One-time test script
- `check-db-schema.js` - One-time check script
- `check-db-with-anon.js` - One-time check script
- `check-supabase-status.js` - One-time check script
- `verify-service-key.js` - One-time verification script
- `store-pp-token.js` - One-time setup script

### **Large Data Files** (Temporary/Development)
- `pp-data-extraction.json` - 38KB extracted data (temporary)
- `backend.log` - 16MB log file (temporary)
- `database.sqlite` - 16KB local database (development)

### **Redundant Documentation** (Keep only essential)
- `PRACTICEPARTNER_INTEGRATION.md` - Redundant with PRACTICEPANTHER_INTEGRATION_GUIDE.md
- `FEAT.md` - Brief feature list (redundant)
- `CHAT.md` - Brief chat info (redundant)
- `ExcahngeID.md` - Typo in filename, likely redundant

---

## ✅ **KEEP** (Essential files)

### **Core Application Files**
- `package.json` - Root dependencies
- `package-lock.json` - Lock file
- `docker-compose.yml` - Docker configuration
- `env.example` - Environment template
- `.gitignore` - Git ignore rules

### **Essential Documentation**
- `README.md` - Main documentation
- `QUICKSTART.md` - Quick start guide
- `API_DOCUMENTATION.md` - API docs
- `PRACTICEPANTHER_INTEGRATION_GUIDE.md` - Integration guide
- `DATABASE_STRUCTURE.md` - Database documentation
- `ENTERPRISE_EXCHANGE_LIFECYCLE_DESIGN.md` - Design docs
- `ENTERPRISE_FEATURES_STATUS.md` - Feature status
- `EXCHANGE_CHAT_SYSTEM_EXPLAINED.md` - System explanation
- `FeaturesContract.md` - Feature contract
- `DATABASE_REORGANIZATION_PLAN.md` - Reorganization plan
- `DATABASE_CLEANUP_PLAN.md` - Cleanup plan
- `RUN_INSTRUCTIONS.md` - Run instructions
- `setup-new-supabase.md` - Supabase setup

### **Essential Directories**
- `backend/` - Backend application
- `frontend/` - Frontend application
- `database/` - Database files
- `sql/` - SQL files
- `scripts/` - Useful scripts
- `nginx/` - Nginx configuration
- `deployment/` - Deployment files
- `docs/` - Documentation
- `tests/` - Test files
- `node_modules/` - Dependencies

### **Essential Scripts**
- `START.sh` - Start script
- `RUN.sh` - Run script

---

## 🤔 **REVIEW** (Decide based on current needs)

### **Potentially Useful Files** (Review if still needed)
- Files in `scripts/` directory - Review each one
- Files in `sql/` directory - Review each one

---

## 📊 **Summary**

**Total files to delete:** ~30+ files
**Total files to keep:** ~20+ files
**Space saved:** ~20+ MB (mostly from backend.log and SQL files)

**Benefits of cleanup:**
- Reduced clutter in root directory
- Easier navigation
- Faster git operations
- Clearer project structure
- Reduced confusion for new developers

**Risk level:** LOW - All files marked for deletion are one-time scripts or temporary files 