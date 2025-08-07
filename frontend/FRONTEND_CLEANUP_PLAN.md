# Frontend Cleanup Plan - Complete Structure Fix

## Current Problems:
1. **27 dashboard files** when we only need 5 + shared components
2. **Duplicate standardized dashboards** in both /components and /features
3. **Mixed folder structure** - some V2 (/features), some old (/pages)
4. **Inconsistent imports** - @/ aliases vs relative paths

## PHASE 1: Delete Redundant Dashboard Files (SAFE TO DELETE)

### Old Dashboard Pages (replaced by standardized versions):
- ❌ `/pages/AdminDashboard.tsx` - Old version
- ❌ `/pages/ClientDashboard.tsx` - Old version  
- ❌ `/pages/CoordinatorDashboard.tsx` - Old version
- ❌ `/pages/AgencyDashboard.tsx` - Old version
- ❌ `/pages/ThirdPartyDashboard.tsx` - Old version
- ❌ `/pages/EnhancedAdminDashboard.tsx` - Intermediate version
- ❌ `/pages/EnhancedClientDashboard.tsx` - Intermediate version
- ❌ `/pages/EnhancedCoordinatorDashboard.tsx` - Intermediate version
- ❌ `/pages/EnterpriseAdminDashboard.tsx` - Another variant

### Duplicate Components (keep only one location):
- ❌ `/components/dashboard/` - DELETE (duplicate of /features/dashboard/components/)
- ✅ `/features/dashboard/components/` - KEEP (proper V2 location)

### Other Old Pages to Delete:
- ❌ `/pages/Messages.tsx` - Already migrated to /features/messages
- ❌ `/pages/Exchanges.tsx` - Already migrated to /features/exchanges
- ❌ `/pages/Tasks.tsx` - Already migrated to /features/tasks
- ❌ `/pages/Documents.tsx` - Already migrated to /features/documents
- ❌ `/pages/Contacts.tsx` - Already migrated to /features/contacts
- ❌ `/pages/Users.tsx` - Already migrated to /features/users
- ❌ `/pages/Reports.tsx` - Already migrated to /features/reports
- ❌ `/pages/Settings.tsx` - Already migrated to /features/settings
- ❌ `/pages/AuthTest.tsx` - Already migrated to /features/auth
- ❌ `/pages/Profile.tsx` - Already migrated to /features/settings
- ❌ `/pages/Preferences.tsx` - Already migrated to /features/settings

### Backup Files to Delete:
- ❌ `/pages/AccountManagementPage.tsx.bak`
- ❌ `/pages/EnhancedAdminDashboard.tsx.backup`
- ❌ `/pages/EnhancedAdminDashboard.tsx.tmp`

## PHASE 2: Move & Consolidate Components

### Components to Move to Proper Features:
1. **Exchange Components** (move to /features/exchanges/components/):
   - `/components/ExchangeCard.tsx`
   - `/components/ExchangeDetails.tsx` 
   - `/components/ExchangeList.tsx`
   - `/components/ExchangeParticipantsManager.tsx`

2. **Document Components** (move to /features/documents/components/):
   - `/components/DocumentGenerationSystem.tsx`
   - `/components/DocumentViewer.tsx`
   - `/components/EnterpriseDocumentManager.tsx`
   - `/components/EnterpriseDocumentTemplateManager.tsx`
   - `/components/TemplateManager.tsx`

3. **Task Components** (move to /features/tasks/components/):
   - `/components/TaskBoard.tsx`

4. **User Components** (move to /features/users/components/):
   - `/components/UserManagement.tsx`
   - `/components/ContactCard.tsx`

5. **Message Components** (move to /features/messages/components/):
   - `/components/ChatBox.tsx`
   - `/components/UnifiedChatInterface.tsx`
   - `/components/DebugChatInfo.tsx`

6. **Shared UI Components** (move to /shared/ui/components/):
   - `/components/ConnectionStatus.tsx`
   - `/components/DebugPanel.tsx`
   - `/components/Layout.tsx`
   - `/components/VirtualizedList.tsx`
   - `/components/ui/ModernCard.tsx`
   - `/components/ui/ModernDropdown.tsx`
   - `/components/ui/StatCard.tsx`
   - `/components/ui/FilterChips.tsx`

7. **Admin/Integration Components** (move to /features/admin/components/):
   - `/components/PPIntegratedDashboard.tsx`
   - `/components/PPImportProgress.tsx`
   - `/components/PracticePantherOAuthRunner.tsx`
   - `/components/PracticePartnerIntegration.tsx`
   - `/components/PracticePartnerSync.tsx`
   - `/components/AuditLogSystem.tsx`

## PHASE 3: Fix Import Paths

After moving files, update all imports to use consistent @/ aliases:
- `@/features/` - for feature modules
- `@/shared/` - for shared utilities
- NO relative imports like `../../../`

## PHASE 4: Final Structure

```
/frontend/src/
├── features/              # Feature-based modules (V2 style)
│   ├── auth/
│   ├── dashboard/
│   │   └── components/   # Standardized dashboards
│   ├── exchanges/
│   ├── documents/
│   ├── messages/
│   ├── tasks/
│   ├── users/
│   ├── settings/
│   ├── reports/
│   └── admin/           # Admin & integrations
├── shared/              # Shared code
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── ui/             # Generic UI components
│       ├── components/
│       ├── molecules/
│       └── organisms/
├── pages/              # DELETE or keep only for special pages
└── components/         # DELETE (move everything to proper features)
```

## Expected Results:
- From 27 dashboard files → 5 role dashboards + shared components
- Clear separation of features
- Consistent import paths
- No duplicate components
- Clean, maintainable structure