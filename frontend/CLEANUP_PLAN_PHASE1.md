# Frontend Cleanup Plan - Phase 1: Safe Dashboard Cleanup

## Files to DELETE (100% Safe - Already Replaced)

### Old Dashboard Files (Replaced by Standardized versions)
```bash
# DELETE: Old dashboard implementations
rm /frontend/src/pages/AdminDashboard.tsx
rm /frontend/src/pages/EnhancedAdminDashboard.tsx  
rm /frontend/src/pages/EnhancedAdminDashboard.tsx.backup
rm /frontend/src/pages/EnhancedAdminDashboard.tsx.tmp
rm /frontend/src/pages/ClientDashboard.tsx
rm /frontend/src/pages/EnhancedClientDashboard.tsx
rm /frontend/src/pages/CoordinatorDashboard.tsx
rm /frontend/src/pages/EnhancedCoordinatorDashboard.tsx
rm /frontend/src/pages/ThirdPartyDashboard.tsx
rm /frontend/src/pages/AgencyDashboard.tsx
rm /frontend/src/pages/EnterpriseAdminDashboard.tsx
```

**Replacement:** All replaced by `/components/dashboard/Standardized*Dashboard.tsx`

### Migrated Feature Files (Moved to /features structure)
```bash
# DELETE: Old feature pages (moved to /features)
rm /frontend/src/pages/Login.tsx              # → /features/auth/pages/Login
rm /frontend/src/pages/AuthTest.tsx           # → /features/auth/pages/AuthTest  
rm /frontend/src/pages/Messages.tsx           # → /features/messages/pages/Messages
rm /frontend/src/pages/Exchanges.tsx          # → /features/exchanges/pages/Exchanges
rm /frontend/src/pages/Tasks.tsx              # → /features/tasks/pages/Tasks
rm /frontend/src/pages/Contacts.tsx           # → /features/contacts/pages/Contacts
rm /frontend/src/pages/Documents.tsx          # → /features/documents/pages/Documents
rm /frontend/src/pages/Users.tsx              # → /features/users/pages/Users
rm /frontend/src/pages/Reports.tsx            # → /features/reports/pages/Reports
rm /frontend/src/pages/Settings.tsx           # → /features/settings/pages/Settings
rm /frontend/src/pages/Profile.tsx            # → /features/settings/pages/Profile
rm /frontend/src/pages/Preferences.tsx        # → /features/settings/pages/Preferences
```

### Backup and Duplicate Files
```bash
# DELETE: Backup/duplicate files
rm /frontend/src/pages/AccountManagementPage.tsx.bak
rm /frontend/src/pages/ExchangeDetailsPageRefactored.tsx
rm /frontend/src/pages/TasksPage.tsx
```

### Unused Feature Files (Not imported anywhere)
```bash
# DELETE: Unused files (no imports/routes found)
rm /frontend/src/pages/AccountManagementPage.tsx
rm /frontend/src/pages/EnterpriseExchangeDetailsPage.tsx
rm /frontend/src/pages/OAuthCallback.tsx
```

## KEEP (Still in use)
- `/pages/ExchangeDetailsPage.tsx` - Still imported in App.tsx
- `/pages/TemplateDocumentManager.tsx` - Still imported in App.tsx

## Total Files to Delete: 26 files
## Space Saved: ~500KB+ of code
## Maintenance Reduction: Significant - removes 26 files to maintain

## Safety Check Before Deletion
1. ✅ All dashboard files replaced by standardized versions
2. ✅ All feature files moved to /features structure  
3. ✅ No imports found for unused files
4. ✅ Backup files are redundant