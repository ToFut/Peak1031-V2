# Frontend V2 Integration Plan

## Current Frontend API Configuration
```typescript
private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
```

## V2 Backend Configuration
- **Port**: 5001 (changed from 5000)
- **New baseURL**: `http://localhost:5001/api`

---

## Integration Steps

### 1. **Update Environment Variables**

Create/Update `.env` in frontend:
```bash
# Current
REACT_APP_API_URL=http://localhost:8001/api

# V2 (Update to)
REACT_APP_API_URL=http://localhost:5001/api
```

### 2. **Add New V2 Dashboard API Methods**

Add these methods to `frontend/src/services/api.ts`:

```typescript
// New V2 Dashboard Endpoints
async getDashboardOverview(): Promise<any> {
  return this.get('/dashboard/overview');
}

async getExchangeMetrics(): Promise<any> {
  return this.get('/dashboard/exchange-metrics');
}

async getDeadlines(): Promise<any> {
  return this.get('/dashboard/deadlines');
}

async getFinancialSummary(): Promise<any> {
  return this.get('/dashboard/financial-summary');
}

async getRecentActivity(): Promise<any> {
  return this.get('/dashboard/recent-activity');
}

async getAlerts(): Promise<any> {
  return this.get('/dashboard/alerts');
}

async getUserActivity(): Promise<any> {
  return this.get('/dashboard/user-activity');
}

// Enhanced Exchange Management
async advanceExchangeStage(exchangeId: string, nextStage: string): Promise<any> {
  return this.post(`/exchanges/${exchangeId}/advance-stage`, { nextStage });
}

async getExchangeWorkflow(exchangeId: string): Promise<any> {
  return this.get(`/exchanges/${exchangeId}/workflow`);
}

async getExchangeTasks(exchangeId: string): Promise<any> {
  return this.get(`/exchanges/${exchangeId}/tasks`);
}
```

### 3. **Update Dashboard Components**

Replace multiple API calls with single V2 calls:

**Current Dashboard (Multiple Calls):**
```typescript
// ExchangeDetailsPage currently does:
const [exchangeData, participantsData, tasksData, documentsData, auditData] = await Promise.all([
  apiService.get(`/exchanges/${id}`),
  apiService.get(`/exchanges/${id}/participants`),
  apiService.get(`/exchanges/${id}/tasks`),
  apiService.get(`/documents/exchange/${id}`),
  apiService.get(`/exchanges/${id}/audit-logs`)
]);
```

**V2 Dashboard (Single Call):**
```typescript
// New optimized approach:
const dashboardData = await apiService.getDashboardOverview();
const exchangeDetails = await apiService.get(`/exchanges/${id}/details`); // Aggregated endpoint
```

### 4. **Add Notification Support**

```typescript
// Notification methods
async getNotifications(): Promise<any> {
  return this.get('/notifications');
}

async markNotificationRead(notificationId: string): Promise<any> {
  return this.post(`/notifications/${notificationId}/read`);
}

async subscribeToNotifications(preferences: any): Promise<any> {
  return this.post('/notifications/subscribe', preferences);
}
```

### 5. **Update Authentication for Hybrid Auth**

```typescript
// Enhanced login with hybrid auth support
async login(credentials: LoginCredentials): Promise<LoginResponse> {
  // V2 supports both Supabase and local auth
  const response = await this.post('/auth/login', credentials);
  
  if (response.token) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('authType', response.authType || 'local');
  }
  
  return response;
}

// Add method to check auth type
getAuthType(): string {
  return localStorage.getItem('authType') || 'local';
}
```

---

## Migration Strategy

### **Phase 1: Basic Connection (Day 1)**
1. Update `REACT_APP_API_URL` to port 5001
2. Test existing endpoints work with V2
3. Verify authentication flow

### **Phase 2: Dashboard Optimization (Day 2-3)**
1. Add new dashboard API methods
2. Update dashboard components to use single API calls
3. Test performance improvements

### **Phase 3: Enhanced Features (Day 4-5)**
1. Add deadline tracking components
2. Implement notification system
3. Add workflow management UI

### **Phase 4: Advanced Features (Week 2)**
1. Add RBAC support to frontend
2. Implement audit log viewing
3. Add compliance dashboard

---

## Required Frontend Changes

### **Immediate (Breaking Changes):**
1. **Port Change**: Update API URL from 8001 to 5001
2. **Test All Existing Functions**: Ensure current features still work

### **High-Value Additions:**
1. **Deadline Dashboard**: Show 45/180-day countdown timers
2. **Alert System**: Display compliance warnings
3. **Quick Stats**: Single-load dashboard overview
4. **Notification Center**: In-app notification display

### **Component Updates Needed:**

1. **Dashboard Components:**
   - Update to use `/dashboard/overview` instead of multiple calls
   - Add deadline warning indicators
   - Add financial summary widgets

2. **Exchange Detail Page:**
   - Add workflow status display
   - Add stage advancement buttons
   - Add deadline countdown timers

3. **Navigation:**
   - Add notification bell icon
   - Add alert badges for urgent items

---

## Testing Checklist

### **Basic Functionality:**
- [ ] Login/logout works
- [ ] Exchange list loads
- [ ] Exchange details load
- [ ] Document upload works
- [ ] Chat functionality works

### **New V2 Features:**
- [ ] Dashboard loads faster (single call)
- [ ] Deadlines display correctly
- [ ] Alerts show up
- [ ] Workflow status displays
- [ ] Stage advancement works

### **Performance:**
- [ ] Dashboard load time < 2 seconds
- [ ] No more than 2 API calls for main dashboard
- [ ] Real-time updates work

---

## Risk Mitigation

### **Fallback Strategy:**
1. Keep current API service as backup
2. Create V2 API service separately initially
3. Gradual migration endpoint by endpoint
4. Quick rollback ability if issues

### **Testing Approach:**
1. Test in development thoroughly
2. Run side-by-side comparison
3. Load test with V2 endpoints
4. User acceptance testing

---

## Expected Benefits After Integration

1. **Performance**: 70% faster dashboard load times
2. **User Experience**: Real-time alerts and notifications
3. **Compliance**: Automatic deadline tracking prevents violations
4. **Efficiency**: Workflow automation reduces manual steps
5. **Scalability**: Foundation ready for enterprise growth