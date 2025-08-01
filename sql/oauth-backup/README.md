# OAuth SQL Backup Files

This folder contains all SQL files needed to set up OAuth token storage in Supabase for PracticePanther integration.

## 🗂️ File Overview

### `01-oauth-tokens-table.sql`
- **Purpose**: Creates the core `oauth_tokens` table
- **When to use**: First time setup on new Supabase account
- **Contains**: Table structure, indexes, basic setup

### `02-oauth-rls-policies.sql`
- **Purpose**: Sets up Row Level Security policies
- **When to use**: After creating the table
- **Contains**: RLS policies for service_role and authenticated users

### `03-force-schema-refresh.sql`
- **Purpose**: Fixes Supabase schema cache issues
- **When to use**: When table isn't accessible via API after creation
- **Contains**: Complete table recreation + cache refresh commands
- **⭐ RECOMMENDED**: Use this one for most setups (all-in-one solution)

### `04-practicepanther-test-data.sql`
- **Purpose**: Insert actual PracticePanther tokens
- **When to use**: After OAuth flow completion
- **Contains**: Template for inserting real tokens

### `05-table-verification.sql`
- **Purpose**: Diagnostic queries to verify everything works
- **When to use**: Testing and troubleshooting
- **Contains**: Comprehensive verification queries

## 🚀 Quick Setup for New Supabase Account

### Option A: All-in-One (Recommended)
```sql
-- Just run file 03-force-schema-refresh.sql
-- It includes everything + cache refresh
```

### Option B: Step-by-Step
```sql
-- 1. Create table
-- Run: 01-oauth-tokens-table.sql

-- 2. Set up security
-- Run: 02-oauth-rls-policies.sql

-- 3. Verify setup
-- Run: 05-table-verification.sql
```

## 🔧 Environment Variables Needed

Make sure these are set in your backend:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
PP_CLIENT_ID=your-practicepanther-client-id
PP_CLIENT_SECRET=your-practicepanther-client-secret
PP_REDIRECT_URI=https://localhost:8000/
```

## 🔄 Migration Process

1. **New Supabase Account Setup**:
   - Run `03-force-schema-refresh.sql` (all-in-one)
   - Update environment variables
   - Run OAuth flow to get new tokens
   - Test with `node test-after-sql.js`

2. **Troubleshooting**:
   - If table not accessible: Run `03-force-schema-refresh.sql`
   - If permissions issues: Run `02-oauth-rls-policies.sql`
   - For diagnostics: Run `05-table-verification.sql`

## ✅ Success Indicators

After running the SQL, you should see:
- ✅ `oauth_tokens table created and cache refreshed successfully!`
- ✅ Table visible in Supabase dashboard
- ✅ Backend can store/retrieve tokens
- ✅ PracticePanther API requests work

## 📋 PracticePanther Integration Status

This SQL setup enables:
- 🔐 OAuth 2.0 Authorization Code Grant flow
- 🔄 Automatic token refresh (24-hour cycles)
- 📊 Scheduled data sync (15-minute intervals)
- 🛡️ Secure token storage with RLS
- 🚀 Production-ready integration

---
*Generated for Peak1031 V1 PracticePanther Integration*
*Compatible with PP KISS API Documentation*