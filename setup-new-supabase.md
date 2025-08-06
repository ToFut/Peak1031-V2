# Setting Up a New Supabase Project

## Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `peak1031-v1`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to you
5. Click "Create new project"

## Step 2: Get API Keys

1. Once project is created, go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Update Environment Variables

Update your `.env` file with the new values:

```env
# Supabase Configuration
SUPABASE_URL=https://your-new-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-new-service-role-key
SUPABASE_ANON_KEY=your-new-anon-key

# React App Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-new-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-new-anon-key
```

## Step 4: Run the Setup Script

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire `SUPABASE_SETUP_COMPLETE.sql` file
3. Paste and run it

## Step 5: Verify Setup

Run the check script:
```bash
node check-supabase-status.js
```

## Step 6: Migrate Data (Optional)

If you want to migrate your existing SQLite data:
1. Export data from SQLite
2. Transform to match new schema
3. Import to Supabase 