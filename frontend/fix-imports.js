const fs = require('fs');
const path = require('path');

// Common import mapping patterns
const importMappings = {
  // Hooks
  'useAuth': '@/shared/hooks/useAuth',
  'useRolePermissions': '@/shared/hooks/useRolePermissions',
  'useChat': '@/features/messages/hooks/useChat',
  'useSocket': '@/shared/hooks/useSocket',
  'useNotifications': '@/shared/hooks/useNotifications',
  'useRoleBasedData': '@/shared/hooks/useRoleBasedData',
  
  // Services
  'api': '@/shared/services/api',
  'supabase': '@/shared/services/supabase',
  'chatService': '@/shared/services/chatService',
  'mockData': '@/shared/services/mockData',
  'fallbackData': '@/shared/services/fallbackData',
  'smartApi': '@/shared/services/smartApi',
  'roleBasedApiService': '@/shared/services/roleBasedApiService',
  'cache': '@/shared/services/cache',
  
  // Types
  'roles': '@/shared/types/roles',
  'exchange': '@/shared/types/exchange',
  'contact': '@/shared/types/contact',
  
  // UI Components
  'ModernCard': '@/shared/ui/ModernCard',
  'ModernDropdown': '@/shared/ui/ModernDropdown',
  'StatCard': '@/shared/ui/StatCard',
  'StatusBadge': '@/shared/ui/StatusBadge',
  'FilterChips': '@/shared/ui/FilterChips',
  
  // Shared Components
  'Layout': '@/shared/components/Layout',
  'DebugPanel': '@/shared/components/DebugPanel',
  'ConnectionStatus': '@/shared/components/ConnectionStatus',
  'DashboardHeader': '@/shared/components/dashboard/DashboardHeader',
  'DashboardTabs': '@/shared/components/dashboard/DashboardTabs',
  'RoleBasedDashboard': '@/shared/components/shared/RoleBasedDashboard',
  
  // Feature Components
  'ExchangeList': '@/features/exchanges/components/ExchangeList',
  'ExchangeCard': '@/features/exchanges/components/ExchangeCard',
  'ExchangeDetails': '@/features/exchanges/components/ExchangeDetails',
  'ExchangeChatBox': '@/features/exchanges/components/ExchangeChatBox',
  'EnterpriseParticipantsManager': '@/features/exchanges/components/EnterpriseParticipantsManager',
  'TaskBoard': '@/features/tasks/components/TaskBoard',
  'DocumentViewer': '@/features/documents/components/DocumentViewer',
  'EnterpriseDocumentManager': '@/features/documents/components/EnterpriseDocumentManager',
  'EnterpriseDocumentTemplateManager': '@/features/documents/components/EnterpriseDocumentTemplateManager',
  'TemplateManager': '@/features/documents/components/TemplateManager',
};

// Find all TypeScript/React files
function findFiles(dir, pattern = /\.(tsx?|jsx?)$/) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Fix imports in a file
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix extremely long relative paths
  const longPathRegex = /from\s+['"]([\.\/]{10,}[^'"]+)['"]/g;
  content = content.replace(longPathRegex, (match, importPath) => {
    const fileName = path.basename(importPath);
    const mappedImport = Object.entries(importMappings).find(([key]) => 
      fileName.includes(key)
    );
    
    if (mappedImport) {
      modified = true;
      return `from '${mappedImport[1]}'`;
    }
    return match;
  });
  
  // Fix broken relative imports
  const brokenImports = [
    // Fix hooks imports
    [/from\s+['"].*useAuth['"]/g, "from '@/shared/hooks/useAuth'"],
    [/from\s+['"].*useRolePermissions['"]/g, "from '@/shared/hooks/useRolePermissions'"],
    [/from\s+['"].*useChat['"]/g, "from '@/features/messages/hooks/useChat'"],
    [/from\s+['"].*useSocket['"]/g, "from '@/shared/hooks/useSocket'"],
    [/from\s+['"].*useNotifications['"]/g, "from '@/shared/hooks/useNotifications'"],
    
    // Fix services imports
    [/from\s+['"].*\/api['"]/g, "from '@/shared/services/api'"],
    [/from\s+['"].*\/supabase['"]/g, "from '@/shared/services/supabase'"],
    [/from\s+['"].*\/chatService['"]/g, "from '@/shared/services/chatService'"],
    
    // Fix types imports
    [/from\s+['"].*\/types\/roles['"]/g, "from '@/shared/types/roles'"],
    [/from\s+['"].*\/types\/exchange['"]/g, "from '@/shared/types/exchange'"],
    [/from\s+['"].*\/types\/contact['"]/g, "from '@/shared/types/contact'"],
    
    // Fix UI components
    [/from\s+['"].*\/ui\/ModernCard['"]/g, "from '@/shared/ui/ModernCard'"],
    [/from\s+['"].*\/ui\/ModernDropdown['"]/g, "from '@/shared/ui/ModernDropdown'"],
    [/from\s+['"].*\/ui\/StatCard['"]/g, "from '@/shared/ui/StatCard'"],
    [/from\s+['"].*\/ui\/StatusBadge['"]/g, "from '@/shared/ui/StatusBadge'"],
    
    // Fix components
    [/from\s+['"].*\/components\/Layout['"]/g, "from '@/shared/components/Layout'"],
    [/from\s+['"].*\/components\/DebugPanel['"]/g, "from '@/shared/components/DebugPanel'"],
  ];
  
  for (const [pattern, replacement] of brokenImports) {
    const oldContent = content;
    content = content.replace(pattern, replacement);
    if (oldContent !== content) modified = true;
  }
  
  // Fix relative imports within same feature
  const fileDir = path.dirname(filePath);
  const relativePath = path.relative(path.join(__dirname, 'src'), fileDir);
  
  // Convert relative imports to absolute imports for shared modules
  content = content.replace(/from\s+['"](\.\.\/)+shared\/([^'"]+)['"]/g, (match, dots, rest) => {
    modified = true;
    return `from '@/shared/${rest}'`;
  });
  
  // Convert relative imports to absolute imports for features
  content = content.replace(/from\s+['"](\.\.\/)+features\/([^'"]+)['"]/g, (match, dots, rest) => {
    modified = true;
    return `from '@/features/${rest}'`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${path.relative(__dirname, filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('Starting import fix process...\n');

const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`Found ${files.length} TypeScript/React files\n`);

let fixedCount = 0;
for (const file of files) {
  if (fixImports(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed imports in ${fixedCount} files`);
console.log('\nNext steps:');
console.log('1. Update tsconfig.json to support @ alias');
console.log('2. Run npm start to test the application');