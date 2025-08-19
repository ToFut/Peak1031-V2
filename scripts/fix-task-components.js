const fs = require('fs');
const path = require('path');

// Fix TaskDetailModal.tsx
const taskDetailModalPath = path.join(__dirname, '../frontend/src/features/tasks/components/TaskDetailModal.tsx');
let content = fs.readFileSync(taskDetailModalPath, 'utf8');

// Fix the remaining users.length > 0 checks
content = content.replace(/{users\.length > 0 && \(/g, '{(users || []).length > 0 && (');

fs.writeFileSync(taskDetailModalPath, content);
console.log('✅ Fixed TaskDetailModal.tsx');

console.log('🎉 All task component fixes applied successfully!');
