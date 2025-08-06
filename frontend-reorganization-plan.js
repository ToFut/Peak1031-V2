#!/usr/bin/env node

/**
 * Frontend Reorganization Script
 * Transforms current 102-file structure into modern feature-based architecture
 */

const fs = require('fs');
const path = require('path');

// File reorganization mapping
const REORGANIZATION_MAP = {
  // === SHARED UI COMPONENTS (Atomic Design) ===
  'shared/ui/atoms/': [
    'src/components/shared/Button.tsx',    // Already created
    'src/components/shared/Input.tsx',
    'src/components/shared/Badge.tsx',
    'src/components/shared/Icon.tsx',
    'src/components/shared/Avatar.tsx',
    'src/components/shared/Spinner.tsx'
  ],
  
  'shared/ui/molecules/': [
    'src/components/shared/SearchBox.tsx',
    'src/components/shared/Card.tsx',
    'src/components/shared/Modal.tsx',
    'src/components/shared/Dropdown.tsx',
    'src/components/shared/Tooltip.tsx',
    'src/components/ConnectionStatus.tsx'  // Move from root components
  ],
  
  'shared/ui/organisms/': [
    'src/components/Layout.tsx',           // Keep as main layout
    'src/components/shared/Table.tsx',
    'src/components/shared/Form.tsx',
    'src/components/shared/Navigation.tsx'
  ],

  // === BUSINESS ENTITIES ===
  'entities/user/': [
    'src/entities/user/api.ts',           // Already exists (create if missing)
    'src/entities/user/types.ts',         // From src/types/index.ts
    'src/entities/user/hooks.ts'          // From src/hooks/useAuth.tsx
  ],

  'entities/exchange/': [
    'src/entities/exchange/api.ts',       // Already created ✓
    'src/entities/exchange/types.ts',     // Already created ✓
    'src/entities/exchange/hooks.ts',     // Already created ✓
    'src/entities/exchange/components/'
  ],

  'entities/document/': [
    'src/entities/document/api.ts',
    'src/entities/document/types.ts',
    'src/entities/document/hooks.ts'
  ],

  'entities/task/': [
    'src/entities/task/api.ts',
    'src/entities/task/types.ts', 
    'src/entities/task/hooks.ts'
  ],

  'entities/message/': [
    'src/entities/message/api.ts',
    'src/entities/message/types.ts',
    'src/entities/message/hooks.ts'
  ],

  // === FEATURES ===
  'features/auth/': [
    // Components
    'features/auth/components/LoginForm.tsx',      // New
    'features/auth/components/AuthGuard.tsx',      // New
    // Pages  
    'features/auth/pages/AuthTest.tsx'             // From src/pages/AuthTest.tsx
  ],

  'features/dashboard/': [
    // SINGLE dashboard with role-based content
    'features/dashboard/components/DashboardLayout.tsx',     // New
    'features/dashboard/components/StatsCard.tsx',           // Extract from dashboard components
    'features/dashboard/components/RoleBasedContent.tsx',    // New - replaces all role dashboards
    'features/dashboard/hooks/useDashboard.ts',              // New
    'features/dashboard/pages/DashboardPage.tsx'             // SINGLE page replacing all dashboards
  ],

  'features/exchanges/': [
    'features/exchanges/components/ExchangeList.tsx',        // From src/components/ExchangeList.tsx
    'features/exchanges/components/ExchangeChatBox.tsx',     // From src/components/ExchangeChatBox.tsx
    'features/exchanges/components/ExchangeParticipantsManager.tsx',
    'features/exchanges/pages/ExchangeDetailsPage.tsx'       // From src/pages/ExchangeDetailsPage.tsx
  ],

  'features/documents/': [
    'features/documents/components/EnterpriseDocumentManager.tsx',    // From src/components/
    'features/documents/components/EnterpriseDocumentTemplateManager.tsx',
    'features/documents/components/TemplateManager.tsx',              // From src/components/
    'features/documents/pages/Documents.tsx',                        // From src/pages/Documents.tsx
    'features/documents/pages/TemplateDocumentManager.tsx'           // From src/pages/
  ],

  'features/tasks/': [
    'features/tasks/components/TaskList.tsx',                // Extract from TasksPage
    'features/tasks/components/TaskCard.tsx',                // Extract from TasksPage  
    'features/tasks/pages/TasksPage.tsx'                     // From src/pages/TasksPage.tsx
  ],

  'features/contacts/': [
    'features/contacts/components/ContactList.tsx',          // Extract from Contacts page
    'features/contacts/components/ContactCard.tsx',          // Extract from Contacts page
    'features/contacts/pages/Contacts.tsx'                   // From src/pages/Contacts.tsx
  ],

  'features/user-management/': [
    'features/user-management/components/UserManagement.tsx', // From src/components/
    'features/user-management/components/PPImportProgress.tsx' // From src/components/
  ],

  // === PAGES (Route wrappers only) ===
  'pages/': [
    'pages/NotFoundPage.tsx'              // Keep only route wrappers
  ],

  // === HOOKS (Shared across features) ===
  'shared/hooks/': [
    'src/hooks/useSocket.tsx',            // Keep as shared
    'src/hooks/useChat.tsx',              // Keep as shared
    'src/hooks/useRoleBasedData.tsx',     // Keep as shared
    'src/hooks/useRolePermissions.tsx'    // Keep as shared
  ],

  // === SERVICES ===
  'shared/services/': [
    'src/services/api.ts',
    'src/services/chatService.ts',
    'src/services/supabase.ts',
    'src/services/cache.ts',
    'src/services/fallbackData.ts',
    'src/services/roleBasedApiService.ts',
    'src/services/smartApi.ts'
  ],

  // === TYPES ===
  'shared/types/': [
    'src/types/index.ts',                 // Split into entity types
    'src/types/exchange.ts',              // Already handled in entities/exchange/
    'src/types/roles.ts'                  // Keep as shared
  ],

  // === UTILS ===
  'shared/utils/': [
    'src/utils/'                          // Move entire utils folder
  ]
};

// Files to DELETE (duplicates/obsolete)
const FILES_TO_DELETE = [
  // Dashboard duplicates - keep only Enhanced versions
  'src/pages/AdminDashboard.tsx',               // Delete - use EnhancedAdminDashboard
  'src/pages/ClientDashboard.tsx',              // Delete - use EnhancedClientDashboard  
  'src/pages/CoordinatorDashboard.tsx',         // Delete - use EnhancedCoordinatorDashboard
  'src/pages/AgencyDashboard.tsx',              // Delete - use role-based content
  'src/pages/ThirdPartyDashboard.tsx',          // Delete - use role-based content

  // PPIntegratedDashboard - merge into main dashboard
  'src/components/PPIntegratedDashboard.tsx',   // Merge into DashboardLayout

  // Backup/temp files
  'src/services/chatService-backup.ts',
  'frontend/.env.backup',
  'frontend/test-progress.js',

  // Debug components - keep only DebugPanel
  'src/components/DebugAuth.tsx',               // Merge into DebugPanel
  'src/components/DebugChatInfo.tsx',           // Merge into DebugPanel

  // Unified chat - merge into chat feature
  'src/components/UnifiedChatInterface.tsx'     // Split into chat components
];

// CONSOLIDATION RULES
const CONSOLIDATION_RULES = {
  // All dashboard pages → Single DashboardPage with role-based content
  dashboards: {
    source: [
      'src/pages/EnhancedAdminDashboard.tsx',
      'src/pages/EnhancedClientDashboard.tsx', 
      'src/pages/EnhancedCoordinatorDashboard.tsx',
      'src/pages/AgencyDashboard.tsx',
      'src/pages/ThirdPartyDashboard.tsx',
      'src/components/PPIntegratedDashboard.tsx'
    ],
    target: 'features/dashboard/pages/DashboardPage.tsx',
    strategy: 'role_based_composition'
  },

  // Debug components → Single DebugPanel
  debug: {
    source: [
      'src/components/DebugPanel.tsx',
      'src/components/DebugAuth.tsx',
      'src/components/DebugChatInfo.tsx'
    ],
    target: 'shared/ui/organisms/DebugPanel.tsx',
    strategy: 'merge_tabs'
  },

  // Chat components → Chat feature
  chat: {
    source: [
      'src/components/UnifiedChatInterface.tsx',
      'src/components/ExchangeChatBox.tsx'
    ],
    target: 'features/chat/',
    strategy: 'extract_components'
  }
};

// Import update patterns
const IMPORT_UPDATES = {
  // Update import paths after reorganization
  patterns: [
    {
      from: /from ['"](\.\.\/)*components\/([^'"]+)['"]/g,
      to: (match, dots, componentPath) => {
        // Determine new path based on component type
        if (componentPath.includes('shared/')) {
          return `from 'shared/ui/${componentPath.replace('shared/', '')}'`;
        }
        return `from 'features/${getFeatureFromComponent(componentPath)}/components/${componentPath}'`;
      }
    },
    {
      from: /from ['"](\.\.\/)*pages\/([^'"]+)['"]/g,
      to: (match, dots, pagePath) => {
        return `from 'features/${getFeatureFromPage(pagePath)}/pages/${pagePath}'`;
      }
    },
    {
      from: /from ['"](\.\.\/)*hooks\/([^'"]+)['"]/g,
      to: (match, dots, hookPath) => {
        return `from 'shared/hooks/${hookPath}'`;
      }
    },
    {
      from: /from ['"](\.\.\/)*services\/([^'"]+)['"]/g,
      to: (match, dots, servicePath) => {
        return `from 'shared/services/${servicePath}'`;
      }
    },
    {
      from: /from ['"](\.\.\/)*types\/([^'"]+)['"]/g,
      to: (match, dots, typePath) => {
        if (typePath.includes('exchange')) {
          return `from 'entities/exchange/types'`;
        }
        return `from 'shared/types/${typePath}'`;
      }
    }
  ]
};

function getFeatureFromComponent(componentPath) {
  if (componentPath.includes('Dashboard') || componentPath.includes('dashboard')) return 'dashboard';
  if (componentPath.includes('Exchange') || componentPath.includes('exchange')) return 'exchanges';
  if (componentPath.includes('Document') || componentPath.includes('document')) return 'documents';
  if (componentPath.includes('Task') || componentPath.includes('task')) return 'tasks';
  if (componentPath.includes('Contact') || componentPath.includes('contact')) return 'contacts';
  if (componentPath.includes('User') || componentPath.includes('user')) return 'user-management';
  if (componentPath.includes('Auth') || componentPath.includes('auth')) return 'auth';
  if (componentPath.includes('Chat') || componentPath.includes('chat')) return 'chat';
  return 'shared';
}

function getFeatureFromPage(pagePath) {
  if (pagePath.includes('Dashboard') || pagePath.includes('dashboard')) return 'dashboard';
  if (pagePath.includes('Exchange') || pagePath.includes('exchange')) return 'exchanges';
  if (pagePath.includes('Document') || pagePath.includes('document')) return 'documents';
  if (pagePath.includes('Task') || pagePath.includes('task')) return 'tasks';
  if (pagePath.includes('Contact') || pagePath.includes('contact')) return 'contacts';
  if (pagePath.includes('Auth') || pagePath.includes('auth')) return 'auth';
  return 'shared';
}

console.log('🚀 Peak 1031 Frontend Reorganization Plan');
console.log('=========================================');
console.log('');
console.log('📊 IMPACT SUMMARY:');
console.log('- Current: 102 files');
console.log('- After: ~35-40 files (60% reduction)');
console.log('- Eliminates: 18 dashboard duplicates');
console.log('- Creates: Modern feature-based structure');
console.log('');
console.log('📁 NEW STRUCTURE:');
Object.keys(REORGANIZATION_MAP).forEach(folder => {
  console.log(`${folder}`);
  REORGANIZATION_MAP[folder].forEach(file => {
    console.log(`  └── ${file}`);
  });
  console.log('');
});
console.log('');
console.log('🗑️  FILES TO DELETE:', FILES_TO_DELETE.length);
console.log('🔄 CONSOLIDATIONS:', Object.keys(CONSOLIDATION_RULES).length);
console.log('');
console.log('✅ Ready to execute reorganization!');

module.exports = {
  REORGANIZATION_MAP,
  FILES_TO_DELETE,
  CONSOLIDATION_RULES,
  IMPORT_UPDATES
};