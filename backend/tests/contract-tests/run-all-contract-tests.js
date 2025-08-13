const colors = require('colors');
const path = require('path');

// Import all test suites
const AuthenticationTestSuite = require('./01-authentication-test');
const ExchangeManagementTestSuite = require('./02-exchange-management-test');
const MessagingSystemTestSuite = require('./03-messaging-system-test');
const DocumentManagementTestSuite = require('./04-document-management-test');
const TaskManagementTestSuite = require('./05-task-management-test');
const PracticePantherIntegrationTestSuite = require('./06-practice-panther-integration-test');
const AuditLoggingTestSuite = require('./07-audit-logging-test');
const AdminDashboardTestSuite = require('./08-admin-dashboard-test');

class ContractTestRunner {
  constructor() {
    this.testSuites = [
      { name: 'Authentication & Security', suite: AuthenticationTestSuite, contract: 'A.3.1 & A.4' },
      { name: 'Exchange Management', suite: ExchangeManagementTestSuite, contract: 'A.3.2' },
      { name: 'Messaging System', suite: MessagingSystemTestSuite, contract: 'A.3.3' },
      { name: 'Document Management', suite: DocumentManagementTestSuite, contract: 'A.3.4' },
      { name: 'Task Management', suite: TaskManagementTestSuite, contract: 'A.3.5' },
      { name: 'PracticePanther Integration', suite: PracticePantherIntegrationTestSuite, contract: 'A.3.6' },
      { name: 'Audit Logging', suite: AuditLoggingTestSuite, contract: 'A.3.7' },
      { name: 'Admin Dashboard', suite: AdminDashboardTestSuite, contract: 'A.3.8' }
    ];
    
    this.results = {
      totalPassed: 0,
      totalFailed: 0,
      suiteResults: [],
      startTime: null,
      endTime: null
    };
  }

  async run() {
    console.log('\n🚀 PEAK1031 CONTRACT COMPLIANCE TEST SUITE'.cyan.bold);
    console.log('='.repeat(80));
    console.log('Testing all contract requirements from CONTRACT/SPECS.md'.yellow);
    console.log('='.repeat(80));
    
    this.results.startTime = new Date();
    
    for (let i = 0; i < this.testSuites.length; i++) {
      const testSuite = this.testSuites[i];
      console.log(`\n📋 Running Test Suite ${i + 1}/${this.testSuites.length}: ${testSuite.name} (${testSuite.contract})`.cyan.bold);
      console.log('-'.repeat(60));
      
      try {
        const suite = new testSuite.suite();
        await suite.run();
        
        // Capture results
        const suiteResult = {
          name: testSuite.name,
          contract: testSuite.contract,
          passed: suite.testResults.passed,
          failed: suite.testResults.failed,
          successRate: ((suite.testResults.passed / (suite.testResults.passed + suite.testResults.failed)) * 100).toFixed(1)
        };
        
        this.results.suiteResults.push(suiteResult);
        this.results.totalPassed += suite.testResults.passed;
        this.results.totalFailed += suite.testResults.failed;
        
        console.log(`\n✅ ${testSuite.name} completed: ${suite.testResults.passed} passed, ${suite.testResults.failed} failed`);
        
      } catch (error) {
        console.log(`❌ ${testSuite.name} failed to run: ${error.message}`);
        this.results.suiteResults.push({
          name: testSuite.name,
          contract: testSuite.contract,
          passed: 0,
          failed: 1,
          successRate: '0.0',
          error: error.message
        });
        this.results.totalFailed++;
      }
      
      // Add delay between test suites
      if (i < this.testSuites.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next test suite...'.yellow);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.results.endTime = new Date();
    this.printFinalResults();
  }

  printFinalResults() {
    const duration = this.results.endTime - this.results.startTime;
    const totalTests = this.results.totalPassed + this.results.totalFailed;
    const overallSuccessRate = totalTests > 0 ? ((this.results.totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL CONTRACT COMPLIANCE TEST RESULTS'.cyan.bold);
    console.log('='.repeat(80));
    
    // Overall summary
    console.log(`\n🎯 OVERALL SUMMARY:`.cyan.bold);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${this.results.totalPassed}`.green);
    console.log(`   ❌ Failed: ${this.results.totalFailed}`.red);
    console.log(`   📈 Success Rate: ${overallSuccessRate}%`);
    console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(1)} seconds`);
    
    // Contract compliance status
    console.log(`\n📋 CONTRACT COMPLIANCE STATUS:`.cyan.bold);
    const compliantSuites = this.results.suiteResults.filter(r => parseFloat(r.successRate) >= 80);
    const nonCompliantSuites = this.results.suiteResults.filter(r => parseFloat(r.successRate) < 80);
    
    if (compliantSuites.length > 0) {
      console.log(`\n✅ COMPLIANT FEATURES (≥80% success):`.green);
      compliantSuites.forEach(suite => {
        console.log(`   • ${suite.name} (${suite.contract}): ${suite.successRate}%`);
      });
    }
    
    if (nonCompliantSuites.length > 0) {
      console.log(`\n❌ NON-COMPLIANT FEATURES (<80% success):`.red);
      nonCompliantSuites.forEach(suite => {
        console.log(`   • ${suite.name} (${suite.contract}): ${suite.successRate}%`);
        if (suite.error) {
          console.log(`     Error: ${suite.error}`.red);
        }
      });
    }
    
    // Detailed results
    console.log(`\n📊 DETAILED RESULTS BY FEATURE:`.cyan.bold);
    console.log('─'.repeat(80));
    console.log('Feature'.padEnd(30) + 'Contract'.padEnd(12) + 'Passed'.padEnd(8) + 'Failed'.padEnd(8) + 'Success Rate');
    console.log('─'.repeat(80));
    
    this.results.suiteResults.forEach(suite => {
      const status = parseFloat(suite.successRate) >= 80 ? '✅' : '❌';
      console.log(
        `${suite.name.padEnd(30)} ${suite.contract.padEnd(12)} ${suite.passed.toString().padEnd(8)} ${suite.failed.toString().padEnd(8)} ${suite.successRate}% ${status}`
      );
    });
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`.cyan.bold);
    if (parseFloat(overallSuccessRate) >= 90) {
      console.log('🎉 Excellent! The system is highly compliant with contract requirements.'.green);
    } else if (parseFloat(overallSuccessRate) >= 80) {
      console.log('✅ Good! The system meets most contract requirements with minor issues to address.'.yellow);
    } else if (parseFloat(overallSuccessRate) >= 60) {
      console.log('⚠️  Fair! The system has significant gaps in contract compliance that need attention.'.red);
    } else {
      console.log('🚨 Critical! The system has major compliance issues that require immediate attention.'.red);
    }
    
    if (nonCompliantSuites.length > 0) {
      console.log('\n🔧 PRIORITY FIXES NEEDED:'.red);
      nonCompliantSuites.forEach(suite => {
        console.log(`   • ${suite.name} (${suite.contract}) - ${suite.successRate}% success rate`);
      });
    }
    
    // Contract coverage
    const coveredContracts = this.results.suiteResults.map(r => r.contract);
    console.log(`\n📋 CONTRACT COVERAGE:`.cyan.bold);
    console.log(`   Tested Requirements: ${coveredContracts.join(', ')}`);
    console.log(`   Coverage: ${this.results.suiteResults.length}/8 major feature areas`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 CONTRACT COMPLIANCE TESTING COMPLETE'.cyan.bold);
    console.log('='.repeat(80));
  }
}

// Run the test runner if this file is executed directly
if (require.main === module) {
  const runner = new ContractTestRunner();
  runner.run().catch(console.error);
}

module.exports = ContractTestRunner;




