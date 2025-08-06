# Peak 1031 Database Structure

## Overview
The database uses PostgreSQL with Supabase as the backend. There are several organizational issues that need to be addressed.

## Core Tables

### 1. USERS Table
- **Purpose**: Authentication and user accounts
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `email` - Unique email for login
  - `password_hash` - Encrypted password
  - `role` - Values: 'admin', 'coordinator', 'client', 'third_party', 'agency'
  - `first_name`, `last_name`
  - `phone`
  - `is_active` - Account status
  - `two_fa_enabled`, `two_fa_secret` - 2FA settings
  - `last_login`
  - `created_at`, `updated_at`

### 2. CONTACTS Table
- **Purpose**: PracticePanther synchronized contact data
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `pp_contact_id` - PracticePanther ID (UNIQUE)
  - `first_name`, `last_name`
  - `email` - Not unique, can be null
  - `phone`
  - `company`
  - `address`
  - `pp_data` (JSONB) - Raw PracticePanther data
  - `last_sync_at`
  - `created_at`, `updated_at`

### 3. EXCHANGES Table
- **Purpose**: 1031 Exchange transactions
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `pp_matter_id` - PracticePanther matter ID
  - `name` - Exchange name
  - `exchange_name` - Alternate name field
  - `client_id` (UUID) - References CONTACTS table (not USERS!)
  - `coordinator_id` (UUID) - References USERS table
  - `status` - 'PENDING', '45D', '180D', 'COMPLETED', 'TERMINATED', 'ON_HOLD'
  - `priority` - 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  - Various date fields and property information
  - `is_active`
  - `created_at`, `updated_at`

### 4. EXCHANGE_PARTICIPANTS Table
- **Purpose**: Links users/contacts to exchanges with specific roles
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `exchange_id` (UUID) - References exchanges
  - `user_id` (UUID) - References USERS (can be null)
  - `contact_id` (UUID) - References CONTACTS (can be null)
  - `role` - Participant role in exchange
  - `permissions` (JSONB) - Specific permissions
  - `created_at`, `updated_at`

### 5. TASKS Table
- **Purpose**: Tasks within exchanges
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `exchange_id` (UUID) - References exchanges
  - `title`, `description`
  - `priority` - 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  - `status` - 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  - `assigned_to` (UUID) - References USERS
  - `created_by` (UUID) - References USERS
  - `due_date`
  - `completed_at`
  - `pp_task_id` - PracticePanther task ID
  - `created_at`, `updated_at`

### 6. DOCUMENTS Table
- **Purpose**: File storage metadata
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `exchangeId` (UUID) - References exchanges
  - `originalFilename` - Original file name
  - `storedFilename` - Stored file name
  - `filePath` - File storage path
  - `fileSize` - Size in bytes
  - `mimeType` - File type
  - `uploadedBy` (UUID) - References USERS
  - `category` - Document category
  - `pinRequired` - Boolean for PIN protection
  - `pinHash` - Encrypted PIN
  - `created_at`, `updated_at`

### 7. MESSAGES Table
- **Purpose**: Chat messages within exchanges
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `exchange_id` (UUID) - References exchanges
  - `sender_id` (UUID) - References USERS
  - `content` - Message text
  - `message_type` - Type of message
  - `attachment_id` (UUID) - References documents
  - `read_by` (JSONB) - Track read receipts
  - `created_at`, `updated_at`

### 8. AUDIT_LOGS Table
- **Purpose**: Track all system actions
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - References USERS
  - `action` - Action performed
  - `entity_type` - Type of entity affected
  - `entity_id` - ID of affected entity
  - `details` (JSONB) - Additional details
  - `ip_address`
  - `user_agent`
  - `created_at`

## Key Relationships

1. **USERS ↔ CONTACTS**: Currently NO DIRECT RELATIONSHIP (PROBLEM!)
   - Users login with email
   - Contacts have email but no link to Users
   - This breaks client access to their exchanges

2. **EXCHANGES → CONTACTS**: Via `client_id`
   - Exchanges belong to Contacts (not Users)
   - This is why clients can't see their exchanges

3. **EXCHANGES → USERS**: Via `coordinator_id`
   - Coordinators are Users, this works fine

4. **EXCHANGE_PARTICIPANTS**: Bridge table
   - Can link to either Users OR Contacts
   - Allows flexibility but adds complexity

## Major Issues

1. **No User-Contact Link**: Clients who login can't be matched to their Contact record
2. **Mixed References**: Some tables reference Users, others reference Contacts
3. **Duplicate Data**: Same person might exist in both Users and Contacts
4. **Field Name Inconsistency**: Mix of camelCase and snake_case

## Recommended Fixes

1. Add `contact_id` to Users table
2. Create migration to link existing Users to Contacts by email
3. Standardize field naming (prefer snake_case)
4. Consider merging Users and Contacts tables or creating clear separation

## Current Data Flow

1. **PracticePanther Sync**:
   - Creates/updates CONTACTS
   - Creates/updates EXCHANGES (with client_id → contacts)
   - Creates/updates TASKS

2. **User Login**:
   - Authenticates against USERS table
   - No automatic link to CONTACTS
   - Can't find their exchanges without manual linking

3. **Exchange Access**:
   - Admins: See all exchanges
   - Coordinators: See assigned exchanges (via coordinator_id)
   - Clients: BROKEN - can't find their exchanges