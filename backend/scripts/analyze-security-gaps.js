require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Security anti-patterns that indicate missing role-based filtering
const SECURITY_ANTIPATTERNS = [
  // Direct database queries without role filtering
  /supabaseService\.client\.from\(['"](\w+)['"]\)\.select\([^)]*\)(?!\s*\.\s*(?:eq|in|or|filter|match)\s*\()/,
  /databaseService\.get\w+\(\s*\)/, // Gets all data without filters
  /\.from\(['"](\w+)['"]\)\.select\([^)]*\)(?!\s*\.(?:eq|in|or|filter|match))/,
  
  // Comments indicating RBAC bypass
  /avoid\s+rbac/i,
  /skip\s+rbac/i,
  /bypass\s+rbac/i,
  
  // Getting all data patterns
  /getUsers\(\s*\)/,
  /getAllExchanges/,
  /getAllTasks/,
  /getAllDocuments/,
  
  // Direct SELECT without WHERE clauses for user data
  /SELECT\s+\*\s+FROM\s+\w+(?!\s+WHERE)/i,
];

const GOOD_PATTERNS = [
  /rbacService\.getExchangesForUser/,
  /allowedExchangeIds/,
  /req\.user\.role/,
  /\.eq\('user_id',\s*req\.user\.id\)/,
  /\.in\('id',\s*exchangeIds\)/,
];

async function analyzeSecurityGaps() {
  const routesDir = '/Users/segevbin/Desktop/Peak1031 V1 /backend/routes';
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  console.log(`🔍 Analyzing ${files.length} route files for security gaps...\n`);
  
  const vulnerableFiles = [];
  const secureFiles = [];
  const findings = {};
  
  for (const file of files) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let vulnerabilities = [];
    let securityFeatures = [];
    let hasRoutes = false;
    
    // Check if file has route handlers
    if (content.includes('router.get') || content.includes('router.post')) {
      hasRoutes = true;
      
      // Check for anti-patterns
      lines.forEach((line, index) => {
        SECURITY_ANTIPATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            vulnerabilities.push({
              line: index + 1,
              content: line.trim(),
              type: 'Potential unfiltered query'
            });
          }
        });
        
        // Check for good patterns
        GOOD_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            securityFeatures.push({
              line: index + 1,
              content: line.trim(),
              type: 'Role-based filtering detected'
            });
          }
        });
      });
    }
    
    if (hasRoutes) {
      findings[file] = {
        vulnerabilities,
        securityFeatures,
        riskLevel: vulnerabilities.length > securityFeatures.length ? 'HIGH' : 
                  vulnerabilities.length > 0 ? 'MEDIUM' : 'LOW'
      };
      
      if (vulnerabilities.length > 0) {
        vulnerableFiles.push(file);
      } else {
        secureFiles.push(file);
      }
    }
  }
  
  // Report findings
  console.log('📊 SECURITY ANALYSIS RESULTS:');
  console.log('=' .repeat(50));
  
  console.log(`\n🔴 HIGH RISK FILES (${vulnerableFiles.filter(f => findings[f].riskLevel === 'HIGH').length}):`);
  vulnerableFiles.filter(f => findings[f].riskLevel === 'HIGH').forEach(file => {
    console.log(`\n  📁 ${file} (${findings[file].vulnerabilities.length} issues)`);
    findings[file].vulnerabilities.forEach(vuln => {
      console.log(`    Line ${vuln.line}: ${vuln.content}`);
    });
  });
  
  console.log(`\n🟡 MEDIUM RISK FILES (${vulnerableFiles.filter(f => findings[f].riskLevel === 'MEDIUM').length}):`);
  vulnerableFiles.filter(f => findings[f].riskLevel === 'MEDIUM').forEach(file => {
    console.log(`  📁 ${file} (${findings[file].vulnerabilities.length} issues, ${findings[file].securityFeatures.length} protections)`);
  });
  
  console.log(`\n🟢 SECURE FILES (${secureFiles.length}):`);
  secureFiles.forEach(file => {
    console.log(`  ✅ ${file}`);
  });
  
  // Priority fix list
  console.log(`\n🎯 PRIORITY FIXES NEEDED:`);
  const highRiskFiles = vulnerableFiles.filter(f => findings[f].riskLevel === 'HIGH');
  
  if (highRiskFiles.length > 0) {
    console.log('These files need immediate attention:');
    highRiskFiles.forEach(file => {
      console.log(`  🚨 ${file}`);
      // Show most critical lines
      findings[file].vulnerabilities.slice(0, 3).forEach(vuln => {
        console.log(`     Line ${vuln.line}: ${vuln.content.substring(0, 80)}${vuln.content.length > 80 ? '...' : ''}`);
      });
    });
  }
  
  return {
    vulnerableFiles,
    secureFiles, 
    findings,
    totalRouteFiles: files.filter(f => findings[f]).length
  };
}

analyzeSecurityGaps().catch(console.error);