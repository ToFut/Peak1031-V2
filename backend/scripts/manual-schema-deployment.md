# Manual Schema Deployment Guide

## Step 1: Deploy Comprehensive Schema

1. **Go to Supabase Dashboard**
   - Open your Supabase project dashboard
   - Navigate to: **SQL Editor** > **New Query**

2. **Copy and paste the entire content** from:
   `/database/migrations/200_comprehensive_optimized_schema.sql`

3. **Run the migration** - This will:
   - Create all custom types (enums)
   - Create/update all tables with comprehensive PP fields
   - Add exchange chat system tables
   - Create comprehensive participant management
   - Add all performance indexes
   - Create materialized views for analytics

## Step 2: Verify Schema Deployment

After running the migration, verify these tables exist:

### Core Tables:
- `organizations`
- `users` (with PP integration fields)  
- `contacts` (with ALL PP contact fields)
- `exchanges` (with exchange_chat_id + ALL PP matter fields)
- `exchange_participants` (comprehensive 3-type management)
- `tasks` (with ALL PP task fields)
- `documents`
- `invoices` (with ALL PP invoice fields)

### Exchange Chat System:
- `exchange_chat_channels`
- `exchange_chat_messages` 
- `exchange_chat_participants`

### Analytics Views:
- `mv_exchange_analytics`
- `mv_user_analytics`

## Step 3: Test Schema

Run this test query to verify the schema:

```sql
-- Test that all tables exist and have the expected structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('exchanges', 'contacts', 'tasks', 'exchange_chat_channels')
ORDER BY table_name, ordinal_position;
```

## Next Steps

Once schema is deployed:
1. ✅ Update PP sync service with new field mappings
2. ✅ Run comprehensive PP data fetch
3. ✅ Test exchange chat system
4. ✅ Verify participant management