# PracticePanther Integration Guide

## Overview
This guide covers the complete PracticePanther API integration with intelligent sync strategies, error handling, and admin controls.

## Features Implemented

### ✅ Core Integration
- **OAuth 2.0 Authentication**: Secure API access with automatic token refresh
- **Rate Limiting**: Respects PP's 300 requests per 5-minute limit
- **Error Handling**: Comprehensive error handling with retry logic
- **Data Transformation**: Maps PP data structure to our database schema

### ✅ Sync Strategies
- **Incremental Sync**: Only fetches changes since last sync (efficient)
- **Full Sync**: Complete data refresh (daily/manual)
- **Smart Pagination**: Handles large datasets efficiently
- **Dependency Management**: Syncs contacts → matters → tasks in correct order

### ✅ Automated Scheduling
- **Incremental Sync**: Every 15 minutes (configurable)
- **Full Sync**: Daily at 2 AM (configurable)
- **Collision Prevention**: Prevents multiple syncs running simultaneously
- **Background Processing**: Non-blocking sync execution

### ✅ Admin Controls
- **Manual Sync Triggers**: Instant sync for specific data types
- **Schedule Management**: Adjust sync frequencies
- **Status Monitoring**: Real-time sync status and history
- **Error Logging**: Detailed error tracking and statistics

## API Endpoints

### Sync Control Endpoints (Admin Only)

#### Get Sync Status
```http
GET /api/sync/status
```
Returns current sync status, scheduled jobs, and recent sync history.

#### Trigger Manual Sync
```http
POST /api/sync/trigger
Content-Type: application/json

{
  "syncType": "contacts" | "matters" | "tasks" | "full"
}
```

#### Test PP Connection
```http
GET /api/sync/test-connection
```
Tests the PracticePanther API connection and returns sample data.

#### Get Sync Logs
```http
GET /api/sync/logs?page=1&limit=20&syncType=contacts&status=success
```
Returns paginated sync logs with filtering options.

#### Get Sync Statistics
```http
GET /api/sync/statistics
```
Returns comprehensive sync statistics for the last 30 days.

#### Update Sync Schedule
```http
PUT /api/sync/schedule
Content-Type: application/json

{
  "incrementalInterval": 15,  // minutes
  "fullSyncHour": 2,         // 0-23
  "fullSyncMinute": 0        // 0-59
}
```

#### Emergency Stop/Restart
```http
POST /api/sync/stop     // Stop all syncs
POST /api/sync/restart  // Restart sync service
```

## Data Mapping

### PracticePanther → Our Database

#### Contacts
- `id` → `pp_contact_id`
- `first_name` → `first_name`
- `last_name` → `last_name`
- `email` → `email`
- `phone` → `phone`
- `company` → `company`
- `address` → `address` (JSON)
- Original PP data stored in `pp_data`

#### Matters → Exchanges
- `id` → `pp_matter_id`
- `name` → `name`
- `status` → `status` (mapped to our enum)
- `client_id` → `client_id` (resolved from contacts)
- `opened_date` → `start_date`
- `value` → `exchange_value`
- `description` → `notes`

#### Tasks
- `id` → `pp_task_id`
- `name` → `title`
- `description` → `description`
- `status` → `status` (mapped to our enum)
- `priority` → `priority` (mapped to our enum)
- `matter_id` → `exchange_id` (resolved from exchanges)
- `due_date` → `due_date`

### Status Mappings

#### Matter Status → Exchange Status
- `active`, `open`, `pending` → `PENDING`
- `in_progress` → `45D`
- `closed`, `completed` → `COMPLETED`
- `cancelled` → `TERMINATED`

#### Task Status Mapping
- `open`, `pending` → `PENDING`
- `in_progress`, `working` → `IN_PROGRESS`
- `completed`, `done` → `COMPLETED`
- `cancelled` → `CANCELLED`
- `on_hold` → `ON_HOLD`

#### Priority Mapping
- `low` → `LOW`
- `normal`, `medium` → `MEDIUM`
- `high` → `HIGH`
- `urgent`, `critical` → `URGENT`

## Sync Process Flow

### 1. Authentication
- Obtains OAuth 2.0 access token using client credentials
- Automatically refreshes tokens when expired
- Stores token with safety margin (5 minutes before expiry)

### 2. Rate Limiting
- Tracks API requests in 5-minute sliding window
- Waits when approaching 300 request limit
- Implements exponential backoff for rate limit errors

### 3. Incremental Sync Process
```
1. Check for running syncs (prevent collisions)
2. Get last sync timestamp from database
3. Fetch only records updated since last sync
4. Process in pages (100 records per page)
5. Transform and upsert each record
6. Track statistics (created, updated, errors)
7. Log completion with timestamps
```

### 4. Error Handling
- **Connection Errors**: Retry with backoff
- **Rate Limits**: Wait and retry
- **Data Errors**: Log and continue with other records
- **Token Expiry**: Refresh and retry
- **Validation Errors**: Log specific field issues

### 5. Dependency Resolution
- Contacts synced first (required for matters)
- Matters synced second (required for tasks)
- Tasks synced last (depend on matters and users)

## Configuration

### Environment Variables
```bash
# Required PP credentials
PP_CLIENT_ID=your_client_id
PP_CLIENT_SECRET=your_client_secret

# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_API_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key  # For server-side operations
```

### Default Settings
- **Incremental Sync**: Every 15 minutes
- **Full Sync**: Daily at 2:00 AM Eastern
- **Page Size**: 100 records per request
- **Max Pages**: 50 per sync (safety limit)
- **Rate Limit**: 300 requests per 5 minutes
- **Token Refresh**: 5 minutes before expiry

## Monitoring & Troubleshooting

### Sync Status Indicators
- **🟢 Success**: Sync completed without errors
- **🟡 Partial**: Sync completed with some errors
- **🔴 Error**: Sync failed completely
- **🔵 Running**: Sync currently in progress

### Common Issues & Solutions

#### Authentication Failures
```bash
# Check credentials in .env
PP_CLIENT_ID=correct_client_id
PP_CLIENT_SECRET=correct_client_secret

# Verify PP API access in their dashboard
```

#### Rate Limiting
- Sync service automatically handles rate limits
- If frequent rate limits occur, consider reducing sync frequency
- Check for other applications using the same PP account

#### Data Validation Errors
- Check sync logs for specific field validation issues
- Verify PP data quality in their system
- Update field mappings if PP changes their schema

#### Sync Collisions
- System prevents multiple syncs running simultaneously
- If sync appears stuck, use admin stop/restart endpoints
- Check for long-running queries in database

### Performance Optimization

#### For Large Datasets
1. Use incremental sync instead of full sync
2. Sync during off-peak hours
3. Monitor database performance during syncs
4. Consider increasing sync intervals if needed

#### Memory Usage
- Service processes records in batches
- Pagination prevents memory overflow
- Each sync runs in isolated context

## Database Schema Requirements

### Sync Logs Table
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  triggered_by UUID REFERENCES users(id)
);
```

### PP ID Fields in Tables
```sql
-- Add to existing tables
ALTER TABLE contacts ADD COLUMN pp_contact_id VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN pp_matter_id VARCHAR(50);
ALTER TABLE tasks ADD COLUMN pp_task_id VARCHAR(50);

-- Add sync tracking
ALTER TABLE contacts ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;

-- Store original PP data
ALTER TABLE contacts ADD COLUMN pp_data JSONB;
ALTER TABLE exchanges ADD COLUMN pp_data JSONB;
ALTER TABLE tasks ADD COLUMN pp_data JSONB;
```

## Frontend Integration

### Admin Dashboard Buttons
The admin dashboard already includes sync control buttons:
- **Sync Contacts**: Quick contact sync
- **Full Sync**: Complete data refresh
- **Sync Status**: View current sync operations

### API Service Integration
The frontend API service includes placeholder methods that call the sync endpoints:
```javascript
await apiService.triggerSync('contacts');
await apiService.getSyncLogs();
```

## Next Steps

### Immediate Tasks
1. **Apply Database Fixes**: Execute the SQL fixes in Supabase
2. **Test Connection**: Use `/api/sync/test-connection` endpoint
3. **Initial Sync**: Trigger a full sync to populate data
4. **Monitor**: Watch sync logs for any issues

### Future Enhancements
1. **Webhook Support**: Real-time sync when PP data changes
2. **Selective Sync**: Sync specific matters or date ranges
3. **Conflict Resolution**: Handle simultaneous edits
4. **Data Validation**: Pre-sync data quality checks
5. **Backup Integration**: Backup before major syncs

## Security Considerations

### Access Control
- All sync endpoints require admin authentication
- Service uses server-side Supabase keys
- PP credentials stored securely in environment variables

### Data Protection
- Original PP data preserved in `pp_data` fields
- Sync logs contain no sensitive data
- API responses exclude internal details

### Audit Trail
- All sync operations logged with timestamps
- User attribution for manual syncs
- Detailed error tracking for debugging

## Support & Maintenance

### Monitoring Checklist
- [ ] Daily sync success rate > 95%
- [ ] No sync jobs stuck for > 1 hour
- [ ] Rate limit usage < 80%
- [ ] Error rate < 5%
- [ ] Token refresh working properly

### Weekly Tasks
- [ ] Review sync statistics
- [ ] Check for data quality issues
- [ ] Verify PP API changes
- [ ] Update sync schedules if needed
- [ ] Clean old sync logs (>90 days)

This integration provides a robust, scalable foundation for keeping your 1031 exchange data synchronized with PracticePanther while maintaining system performance and data integrity.