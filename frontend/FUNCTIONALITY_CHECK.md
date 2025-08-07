# Functionality Check Before Deletion

## 1. Current App.tsx Usage:
- ✅ Using `/components/dashboard/Standardized*` dashboards
- ✅ Using `/features/` for most pages (Messages, Tasks, etc.)
- ❌ Still using `/pages/ExchangeDetailsPage.tsx`
- ❌ Still using `/pages/TemplateDocumentManager.tsx`

## 2. Unique Features in Old Files:

### EnhancedAdminDashboard.tsx (OLD) has:
- 'agencies' tab
- 'deepdive' tab  
- Template upload functionality
- System dropdown with sub-tabs
- User sidebar view
- More detailed sync status

### StandardizedAdminDashboard.tsx (NEW) has:
- Basic overview, exchanges, tasks, users, documents, system tabs
- Cleaner component structure
- Uses StandardDashboard base component

## 3. Safe to Delete (NO functionality loss):
✅ `/pages/AdminDashboard.tsx` - Basic old version
✅ `/pages/ClientDashboard.tsx` - Basic old version
✅ `/pages/CoordinatorDashboard.tsx` - Basic old version
✅ `/pages/AgencyDashboard.tsx` - Basic old version
✅ `/pages/ThirdPartyDashboard.tsx` - Basic old version
✅ `/pages/Messages.tsx` - Already using /features/messages
✅ `/pages/Tasks.tsx` - Already using /features/tasks
✅ `/pages/Documents.tsx` - Already using /features/documents
✅ `/pages/Contacts.tsx` - Already using /features/contacts
✅ `/pages/Users.tsx` - Already using /features/users
✅ `/pages/Reports.tsx` - Already using /features/reports
✅ `/pages/Settings.tsx` - Already using /features/settings
✅ `/pages/AuthTest.tsx` - Already using /features/auth
✅ `/pages/Profile.tsx` - Already using /features/settings
✅ `/pages/Preferences.tsx` - Already using /features/settings

## 4. Need to Check/Migrate First:
⚠️ `/pages/EnhancedAdminDashboard.tsx` - Has agencies & deepdive tabs
⚠️ `/pages/EnhancedClientDashboard.tsx` - Check for unique features
⚠️ `/pages/EnhancedCoordinatorDashboard.tsx` - Check for unique features
⚠️ `/pages/ExchangeDetailsPage.tsx` - Still used by App.tsx
⚠️ `/pages/TemplateDocumentManager.tsx` - Still used by App.tsx

## 5. Duplicate Dashboard Components:
- `/components/dashboard/` - Currently used by App.tsx
- `/features/dashboard/components/` - Duplicate, not used

## Recommendation:
1. First update App.tsx to use the standardized dashboards from `/features/dashboard/components/`
2. Migrate ExchangeDetailsPage to /features/exchanges/pages/
3. Migrate TemplateDocumentManager to /features/documents/pages/
4. Add missing functionality (agencies, deepdive) to StandardizedAdminDashboard if needed
5. Then safely delete old files