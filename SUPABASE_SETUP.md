# Peak 1031 Supabase Setup Instructions

## Step 1: Run the Database Schema

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Click **Run** to execute the schema

This will create:
- All database tables (users, exchanges, tasks, documents, etc.)
- Row Level Security policies
- Indexes for performance
- Triggers for updated_at timestamps
- Helper functions
- Views for common queries

## Step 2: Create Authentication Users

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click **Add user** and create these test users:

### Admin User
- **Email**: `admin@peak1031.com`
- **Password**: `admin123`
- **Confirm Password**: `admin123`
- **Auto Confirm User**: ✅ (checked)

### Coordinator User  
- **Email**: `coordinator@peak1031.com`
- **Password**: `coord123`
- **Confirm Password**: `coord123`
- **Auto Confirm User**: ✅ (checked)

### Client User
- **Email**: `client@peak1031.com`
- **Password**: `client123`
- **Confirm Password**: `client123`
- **Auto Confirm User**: ✅ (checked)

## Step 3: Update Seed Data with Real User IDs

1. After creating the users above, go to **Authentication** → **Users**
2. Copy the **User UID** for each user you created
3. Edit the `supabase-seed-data.sql` file
4. Replace these placeholder UUIDs with the actual User UIDs:
   ```sql
   -- Replace these lines with actual UUIDs:
   ('00000000-0000-0000-0000-000000000001', 'admin@peak1031.com', 'admin', 'John', 'Smith', ...),
   ('00000000-0000-0000-0000-000000000002', 'coordinator@peak1031.com', 'coordinator', 'Sarah', 'Johnson', ...),
   ('00000000-0000-0000-0000-000000000003', 'client@peak1031.com', 'client', 'Michael', 'Davis', ...),
   ```

   Update all references to these UUIDs throughout the seed data file.

## Step 4: Load Seed Data

1. Return to **SQL Editor** in Supabase
2. Click **New Query**
3. Copy and paste the updated contents of `supabase-seed-data.sql`
4. Click **Run** to execute the seed data

This will populate your database with:
- User profiles
- Sample contacts
- Sample exchanges
- Sample tasks
- Sample documents
- Sample messages
- Sample notifications
- Sample audit logs

## Step 5: Enable Storage (for Document Uploads)

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Create a bucket named `documents`
4. Set it as **Public bucket**: ❌ (unchecked for security)
5. Go to **Policies** tab for the bucket
6. Create policies for document access based on your needs

## Step 6: Test the Application

1. Make sure your frontend is running (`npm start`)
2. Go to `http://localhost:8000/login`
3. Try logging in with any of the created users:
   - Admin: `admin@peak1031.com` / `admin123`
   - Coordinator: `coordinator@peak1031.com` / `coord123`  
   - Client: `client@peak1031.com` / `client123`

## Step 7: Verify Everything Works

After login, you should see:
- ✅ Dashboard loads with real data from Supabase
- ✅ Exchanges, tasks, documents display correctly
- ✅ User profile information shows correctly
- ✅ Notifications appear
- ✅ No "Reconnecting..." message

## Troubleshooting

### If login fails:
1. Check that users were created successfully in Supabase Auth
2. Verify the Supabase URL and anon key in `src/services/supabase.ts`
3. Check browser console for error messages

### If data doesn't load:
1. Verify the schema was created successfully
2. Check that seed data was inserted (go to **Table Editor** in Supabase)
3. Verify Row Level Security policies are working

### If you see permission errors:
1. Check that RLS policies were created correctly
2. Verify the authenticated user has the correct role in the users table

## What's Now Working with Supabase

✅ **Real Authentication** - Users authenticate via Supabase Auth
✅ **Real Database** - All data stored in Supabase PostgreSQL  
✅ **Row Level Security** - Users can only see data they're authorized to access
✅ **Real-time Data** - Can be extended with Supabase real-time subscriptions
✅ **User Management** - Create/update users and profiles
✅ **Exchange Management** - Full CRUD operations on exchanges
✅ **Task Management** - Assign and track tasks
✅ **Document Management** - Upload and manage documents (with Supabase Storage)
✅ **Messaging System** - Send messages within exchanges
✅ **Notification System** - Real notifications stored in database
✅ **Audit Logging** - Track all user actions
✅ **Role-based Access** - Different views based on user role

The application now uses a real production-grade database instead of mock data!