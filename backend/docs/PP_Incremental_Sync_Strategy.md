# PracticePanther Incremental Sync Strategy
## Efficient 15-Minute Polling for Exchange Data

**📅 Created**: July 30, 2025  
**🎯 Goal**: Only fetch NEW/UPDATED data every 15 minutes  
**📊 Current Load**: 11,171+ total records → Only changed records per sync

---

## 🔄 Incremental Sync Parameters

Based on [PracticePanther API Documentation](https://app.practicepanther.com/content/apidocs/index.html), these endpoints support incremental sync:

### ✅ Supported Incremental Parameters:
- **`created_since`**: Get records created after timestamp
- **`updated_since`**: Get records updated after timestamp  
- **`account_id`**: Filter by specific client
- **`assigned_to_user_id`**: Filter by assigned staff member

---

## 📊 15-Minute Polling Strategy

### **Priority 1: Core Exchange Data (Every 15 Minutes)**

```javascript
// 1. NEW/UPDATED MATTERS (Exchange Cases) - MOST IMPORTANT
GET /api/v2/matters?updated_since={last_sync_timestamp}
// Example: /api/v2/matters?updated_since=2025-07-30T16:45:00Z
// Returns: Only matters changed in last 15 minutes

// 2. NEW/UPDATED CLIENTS  
GET /api/v2/accounts?updated_since={last_sync_timestamp}
// Returns: Only new clients or client info changes

// 3. NEW/UPDATED CONTACTS (if different from accounts)
GET /api/v2/contacts?updated_since={last_sync_timestamp}
// Returns: Only contact changes

// 4. NEW TASKS ONLY (avoid re-syncing completed tasks)
GET /api/v2/tasks?created_since={last_sync_timestamp}&status=NotCompleted
// Returns: Only new pending tasks
```

### **Priority 2: Recent Activity (Every 15 Minutes)**

```javascript
// 5. NEW NOTES/COMMUNICATIONS
GET /api/v2/notes?created_since={last_sync_timestamp}
// Returns: Only new case notes

// 6. NEW EMAILS  
GET /api/v2/emails?created_since={last_sync_timestamp}
// Returns: Only new email communications

// 7. UPCOMING EVENTS (next 30 days only)
GET /api/v2/events?start_date={today}&end_date={next_30_days}&updated_since={last_sync_timestamp}
// Returns: Only updated upcoming deadlines
```

---

## 🕐 Timestamp Management Strategy

### **Last Sync Tracking**
```javascript
// Store in database or config
const syncTimestamps = {
  matters: '2025-07-30T16:45:00Z',
  accounts: '2025-07-30T16:45:00Z', 
  contacts: '2025-07-30T16:45:00Z',
  tasks: '2025-07-30T16:45:00Z',
  notes: '2025-07-30T16:45:00Z',
  emails: '2025-07-30T16:45:00Z',
  events: '2025-07-30T16:45:00Z'
};

// Update after successful sync
syncTimestamps.matters = new Date().toISOString();
```

### **Fallback Strategy**
```javascript
// If no timestamp stored, use 24 hours ago as safe starting point
const fallbackTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const lastSyncTime = storedTimestamp || fallbackTimestamp;
```

---

## 📈 Efficiency Comparison

### **Before (Full Sync Every 15 Min)**
```
❌ ALL matters: ~1000+ records every 15 min
❌ ALL accounts: 11,171 records every 15 min  
❌ ALL contacts: 11,171 records every 15 min
❌ Total: ~23,000+ records every 15 min
❌ API calls: ~77 requests every 15 min (rate limit risk)
```

### **After (Incremental Sync Every 15 Min)**
```
✅ NEW/UPDATED matters: ~5-20 records every 15 min
✅ NEW/UPDATED accounts: ~2-10 records every 15 min
✅ NEW/UPDATED contacts: ~2-10 records every 15 min  
✅ NEW tasks: ~1-5 records every 15 min
✅ Total: ~10-45 records every 15 min
✅ API calls: ~7 requests every 15 min (well under limit)
```

**🚀 Result: 99%+ reduction in data transfer and API calls!**

---

## 🛠️ Implementation Code

### **Enhanced Scheduled Sync Service**

```javascript
class ScheduledSyncService {
  constructor() {
    this.syncTimestamps = new Map();
    this.loadSyncTimestamps();
  }

  async performIncrementalSync() {
    try {
      console.log('🔄 Starting incremental sync (15-min interval)...');
      
      const currentTime = new Date().toISOString();
      
      // 1. Sync NEW/UPDATED matters (most important)
      await this.syncMattersIncremental();
      
      // 2. Sync NEW/UPDATED accounts  
      await this.syncAccountsIncremental();
      
      // 3. Sync NEW tasks only
      await this.syncTasksIncremental();
      
      // 4. Sync recent communications
      await this.syncNotesIncremental();
      
      // Update all timestamps after successful sync
      this.updateAllSyncTimestamps(currentTime);
      
      console.log('✅ Incremental sync completed successfully');
      
    } catch (error) {
      console.error('❌ Incremental sync failed:', error.message);
    }
  }

  async syncMattersIncremental() {
    const lastSync = this.getSyncTimestamp('matters');
    const url = `${this.baseURL}/matters?updated_since=${lastSync}`;
    
    console.log(`⚖️  Syncing matters updated since: ${lastSync}`);
    
    const response = await this.makeAPICall(url);
    const newMatters = response.data;
    
    console.log(`📊 Found ${newMatters.length} updated matters`);
    
    if (newMatters.length > 0) {
      // Process only the new/updated matters
      await this.processMatters(newMatters);
      console.log(`✅ Processed ${newMatters.length} matter updates`);
    }
  }

  async syncAccountsIncremental() {
    const lastSync = this.getSyncTimestamp('accounts');
    const url = `${this.baseURL}/accounts?updated_since=${lastSync}`;
    
    console.log(`👥 Syncing accounts updated since: ${lastSync}`);
    
    const response = await this.makeAPICall(url);
    const newAccounts = response.data;
    
    console.log(`📊 Found ${newAccounts.length} updated accounts`);
    
    if (newAccounts.length > 0) {
      await this.processAccounts(newAccounts);
      console.log(`✅ Processed ${newAccounts.length} account updates`);
    }
  }

  async syncTasksIncremental() {
    const lastSync = this.getSyncTimestamp('tasks');
    // Get only NEW tasks that are NotCompleted
    const url = `${this.baseURL}/tasks?created_since=${lastSync}&status=NotCompleted`;
    
    console.log(`📝 Syncing new tasks created since: ${lastSync}`);
    
    const response = await this.makeAPICall(url);
    const newTasks = response.data;
    
    console.log(`📊 Found ${newTasks.length} new tasks`);
    
    if (newTasks.length > 0) {
      await this.processTasks(newTasks);
      console.log(`✅ Processed ${newTasks.length} new tasks`);
    }
  }

  getSyncTimestamp(endpoint) {
    // Get stored timestamp or fallback to 24 hours ago
    const stored = this.syncTimestamps.get(endpoint);
    const fallback = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return stored || fallback;
  }

  updateAllSyncTimestamps(timestamp) {
    this.syncTimestamps.set('matters', timestamp);
    this.syncTimestamps.set('accounts', timestamp);
    this.syncTimestamps.set('contacts', timestamp);
    this.syncTimestamps.set('tasks', timestamp);
    this.syncTimestamps.set('notes', timestamp);
    
    // Save to persistent storage (database or file)
    this.saveSyncTimestamps();
  }
}
```

---

## 🎯 Smart Polling Rules

### **High Priority (Every 15 Minutes)**
- **Matters**: `updated_since` - Critical exchange data
- **Tasks**: `created_since` + `status=NotCompleted` - New action items
- **Accounts**: `updated_since` - Client changes

### **Medium Priority (Every Hour)**  
- **Notes**: `created_since` - New communications
- **Emails**: `created_since` - New emails
- **Events**: `updated_since` + next 30 days - Deadline changes

### **Low Priority (Daily)**
- **Time Entries**: `created_since` - Billing data
- **Users**: `updated_since` - Staff changes
- **Custom Fields**: Check for new field definitions

---

## 📊 API Call Budget (15-Min Window)

With **300 requests per 5 minutes** limit:

```
✅ Incremental Strategy:
- Matters: 1 call
- Accounts: 1 call  
- Tasks: 1 call
- Notes: 1 call
- Emails: 1 call
- Events: 1 call
- Buffer: 294 calls remaining
- Risk: VERY LOW ✅
```

```
❌ Full Sync Strategy:
- All endpoints: ~77 calls
- Risk: MEDIUM (26% of limit)
- No room for retries or errors ❌
```

---

## 🔄 Error Handling & Recovery

### **If Incremental Sync Fails**
```javascript
async handleIncrementalSyncFailure(endpoint, error) {
  if (error.status === 401) {
    // Token expired - refresh and retry
    await this.refreshToken();
    return this.retryIncrementalSync(endpoint);
  }
  
  if (error.status === 400 && error.message.includes('invalid timestamp')) {
    // Bad timestamp - reset to 24 hours ago
    const fallback = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    this.syncTimestamps.set(endpoint, fallback);
    return this.retryIncrementalSync(endpoint);
  }
  
  // Other errors - skip this cycle, try again in 15 minutes
  console.error(`⚠️ Skipping ${endpoint} sync this cycle due to error:`, error.message);
}
```

### **Timestamp Validation**
```javascript
validateTimestamp(timestamp) {
  const now = new Date();
  const syncTime = new Date(timestamp);
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Don't sync more than 7 days of history
  if (now - syncTime > maxAge) {
    return new Date(now - maxAge).toISOString();
  }
  
  return timestamp;
}
```

---

## 🎉 Expected Results

### **Efficiency Gains**
- **99%+ less data transfer** per sync
- **95%+ fewer API calls** per sync  
- **Faster sync completion** (seconds vs minutes)
- **Lower system load** and resource usage
- **Better rate limit compliance**

### **Business Benefits**
- **Real-time updates** of exchange data
- **Immediate task notifications** for new action items
- **Fresh client information** within 15 minutes
- **Timely deadline tracking** for exchanges
- **Reduced risk** of hitting API limits

---

*This incremental strategy transforms your 15-minute sync from a heavy full-data pull into a lightweight, efficient update process that keeps your exchange business data fresh while respecting API limits and system resources.*