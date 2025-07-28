# PracticePartner Integration System

## Overview

This system provides comprehensive integration with PracticePartner (legal practice management software) to automatically sync data into the Peak 1031 Platform database. The integration includes data transformation, duplicate handling, incremental updates, error handling, and audit trails.

## Features

### 🔄 **Data Transformation**
- **Client Data**: Maps PracticePartner client records to Peak 1031 contacts
- **Matter Data**: Converts PracticePartner matters to 1031 exchanges
- **Document Data**: Imports documents with metadata preservation
- **Field Mapping**: Flexible mapping between different data structures

### 🔍 **Duplicate Handling**
- **Smart Detection**: Identifies existing records by PracticePartner IDs
- **Update Strategy**: Updates existing records with new data
- **Conflict Resolution**: Handles data conflicts gracefully
- **Audit Trail**: Tracks all changes and updates

### ⚡ **Incremental Updates**
- **Change Detection**: Only syncs records that have changed
- **Efficient Processing**: Reduces API calls and processing time
- **Scheduled Sync**: Automatic synchronization at configurable intervals
- **Manual Sync**: On-demand full or incremental syncs

### 🛡️ **Error Handling**
- **Validation**: Validates data before processing
- **Error Recovery**: Continues processing despite individual record errors
- **Detailed Logging**: Comprehensive error tracking and reporting
- **Retry Logic**: Automatic retry for transient failures

### 📊 **Audit Trail**
- **Sync History**: Complete record of all sync operations
- **Statistics**: Detailed metrics on sync performance
- **Error Tracking**: Logs all errors with context
- **User Attribution**: Tracks who initiated each sync

## Architecture

```
PracticePartner API → Data Transformation → Database Storage → Audit Trail
```

### Components

1. **PracticePartnerService** (`backend/services/practicePartnerService.js`)
   - Handles API communication with PracticePartner
   - Performs data transformation
   - Manages duplicate detection and resolution

2. **ScheduledSyncService** (`backend/services/scheduledSyncService.js`)
   - Manages automatic synchronization
   - Handles scheduled sync intervals
   - Prevents concurrent sync operations

3. **PracticePartnerSync Model** (`backend/models/PracticePartnerSync.js`)
   - Tracks sync operations
   - Stores audit trail data
   - Maintains sync configuration

4. **API Routes** (`backend/routes/practicePartner.js`)
   - RESTful endpoints for sync management
   - Status monitoring
   - Configuration management

5. **Frontend Component** (`frontend/src/components/PracticePartnerSync.tsx`)
   - User interface for sync management
   - Real-time status monitoring
   - Configuration interface

## Data Mapping

### Client Data Transformation
```javascript
// PracticePartner Client → Peak 1031 Contact
{
  firstName: ppClient.firstName || ppClient.givenName,
  lastName: ppClient.lastName || ppClient.familyName,
  email: ppClient.email,
  phone: ppClient.phone || ppClient.telephone,
  company: ppClient.company || ppClient.organization,
  address: {
    street: ppClient.address?.street,
    city: ppClient.address?.city,
    state: ppClient.address?.state,
    zipCode: ppClient.address?.zipCode,
    country: ppClient.address?.country || 'US'
  },
  ppClientId: ppClient.id,
  source: 'practicepartner'
}
```

### Matter Data Transformation
```javascript
// PracticePartner Matter → Peak 1031 Exchange
{
  title: ppMatter.title || ppMatter.name,
  description: ppMatter.description || ppMatter.notes,
  status: mapMatterStatus(ppMatter.status),
  type: '1031_exchange',
  ppMatterId: ppMatter.id,
  ppClientId: ppMatter.clientId,
  source: 'practicepartner'
}
```

### Document Data Transformation
```javascript
// PracticePartner Document → Peak 1031 Document
{
  originalFilename: ppDocument.filename || ppDocument.name,
  fileSize: ppDocument.fileSize,
  mimeType: ppDocument.mimeType || ppDocument.contentType,
  ppDocumentId: ppDocument.id,
  ppMatterId: ppDocument.matterId,
  source: 'practicepartner'
}
```

## API Endpoints

### Sync Management
- `GET /api/practicepartner/sync/status` - Get current sync status
- `POST /api/practicepartner/sync/start` - Start manual sync
- `GET /api/practicepartner/sync/history` - Get sync history
- `GET /api/practicepartner/sync/:syncId` - Get sync details
- `PUT /api/practicepartner/sync/config` - Update sync configuration
- `GET /api/practicepartner/sync/statistics` - Get sync statistics

### Connection & Testing
- `POST /api/practicepartner/test-connection` - Test PracticePartner connection
- `POST /api/practicepartner/mapping/preview` - Preview data transformation

## Configuration

### Environment Variables
```bash
PRACTICEPARTNER_API_URL=https://api.practicepartner.com
PRACTICEPARTNER_API_KEY=your_api_key_here
SYNC_INTERVAL_MINUTES=30
AUTO_SYNC_ENABLED=true
```

### Sync Configuration
```javascript
{
  enabled: true,
  syncInterval: 30, // minutes
  lastSyncTime: "2024-01-15T10:30:00Z",
  nextSyncTime: "2024-01-15T11:00:00Z"
}
```

## Usage Examples

### Starting a Manual Sync
```javascript
// Frontend
const result = await apiService.startPracticePartnerSync('incremental');

// Backend
const result = await practicePartnerService.syncData('incremental', userId);
```

### Monitoring Sync Status
```javascript
// Get current status
const status = await apiService.getPracticePartnerSyncStatus();

// Get sync history
const history = await apiService.getPracticePartnerSyncHistory({
  limit: 50,
  page: 1
});
```

### Updating Configuration
```javascript
await apiService.updatePracticePartnerSyncConfig({
  enabled: true,
  syncInterval: 60 // 1 hour
});
```

## Error Handling

### Validation Errors
```javascript
{
  recordId: "client_123",
  recordType: "client",
  error: "Missing required field: firstName"
}
```

### API Errors
```javascript
{
  recordId: "SYSTEM",
  recordType: "sync",
  error: "Connection timeout to PracticePartner API"
}
```

### Sync Statistics
```javascript
{
  totalRecords: 150,
  importedRecords: 25,
  updatedRecords: 120,
  skippedRecords: 0,
  errorRecords: 5
}
```

## Monitoring & Alerts

### Sync Status Monitoring
- Real-time sync status tracking
- Performance metrics collection
- Error rate monitoring
- Success rate tracking

### Alert Conditions
- Sync failures
- High error rates
- Connection timeouts
- Data validation failures

## Security Considerations

### API Security
- Secure API key storage
- HTTPS communication
- Rate limiting
- Request validation

### Data Security
- Encrypted data transmission
- Secure database storage
- Access control
- Audit logging

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Verify API credentials
   - Check network connectivity
   - Validate API endpoint

2. **Data Transformation Errors**
   - Review field mappings
   - Check data validation rules
   - Verify required fields

3. **Duplicate Detection Issues**
   - Review duplicate detection logic
   - Check ID field mappings
   - Verify update strategies

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Performance Optimization

### Sync Performance
- Incremental sync reduces processing time
- Batch processing for large datasets
- Parallel processing where possible
- Efficient database queries

### Monitoring Metrics
- Sync duration tracking
- Records processed per second
- Error rate monitoring
- Success rate tracking

## Future Enhancements

### Planned Features
- Real-time sync notifications
- Advanced conflict resolution
- Custom field mapping UI
- Sync performance analytics
- Multi-tenant support

### Integration Extensions
- Additional practice management systems
- Document content extraction
- Advanced data validation
- Machine learning for data mapping 