#!/usr/bin/env node

/**
 * Natural Language Query Test Runner
 * Executes the comprehensive test suite and generates detailed reports
 */

const fs = require('fs');
const path = require('path');
const { runAllTests } = require('./test-natural-language-queries');

async function generateTestReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, 'reports', `nl-query-test-${timestamp}.json`);
  
  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: results.passRate
    },
    categoryBreakdown: results.categoryStats,
    failedTests: results.failedTests,
    recommendations: generateRecommendations(results),
    allResults: results.allResults
  };
  
  // Write JSON report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate HTML report
  const htmlReportPath = reportPath.replace('.json', '.html');
  const htmlContent = generateHTMLReport(report);
  fs.writeFileSync(htmlReportPath, htmlContent);
  
  console.log(`\n📄 Reports generated:`);
  console.log(`  JSON: ${reportPath}`);
  console.log(`  HTML: ${htmlReportPath}`);
  
  return report;
}

function generateRecommendations(results) {
  const recommendations = [];
  
  // Analyze failure patterns
  const failedByCategory = {};
  results.failedTests.forEach(test => {
    if (!failedByCategory[test.category]) {
      failedByCategory[test.category] = [];
    }
    failedByCategory[test.category].push(test);
  });
  
  // Generate specific recommendations
  Object.entries(failedByCategory).forEach(([category, tests]) => {
    const sqlPatternFailures = tests.filter(t => !t.sqlPatternMatch).length;
    const resultMismatchFailures = tests.filter(t => !t.resultsMatch).length;
    
    if (sqlPatternFailures > 0) {
      recommendations.push({
        priority: 'HIGH',
        category,
        issue: 'SQL Pattern Generation',
        description: `${sqlPatternFailures} tests failed due to incorrect SQL pattern generation in ${category} queries`,
        suggestion: `Review and improve AI model's understanding of ${category.toLowerCase()} query patterns. Consider adding more training examples for this category.`
      });
    }
    
    if (resultMismatchFailures > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category,
        issue: 'Result Accuracy',
        description: `${resultMismatchFailures} tests showed result count mismatches in ${category} queries`,
        suggestion: `Verify database schema understanding and query logic for ${category.toLowerCase()} operations.`
      });
    }
  });
  
  // Overall recommendations
  if (results.passRate < 80) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Overall',
      issue: 'Low Pass Rate',
      description: `Overall pass rate of ${results.passRate}% is below acceptable threshold`,
      suggestion: 'Consider retraining the AI model with more diverse examples and improving natural language processing capabilities.'
    });
  } else if (results.passRate < 90) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Overall',
      issue: 'Moderate Pass Rate',
      description: `Pass rate of ${results.passRate}% has room for improvement`,
      suggestion: 'Focus on categories with highest failure rates and add more edge case handling.'
    });
  }
  
  return recommendations;
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Natural Language Query Test Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .metric-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-number { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .pass { color: #10b981; }
        .fail { color: #ef4444; }
        .warning { color: #f59e0b; }
        .section { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section h2 { margin-top: 0; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .status-pass { color: #10b981; font-weight: bold; }
        .status-fail { color: #ef4444; font-weight: bold; }
        .recommendation { padding: 15px; margin: 10px 0; border-left: 4px solid; border-radius: 4px; }
        .rec-critical { background: #fef2f2; border-color: #ef4444; color: #7f1d1d; }
        .rec-high { background: #fff7ed; border-color: #f59e0b; color: #92400e; }
        .rec-medium { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
        .chart-container { width: 100%; height: 300px; margin: 20px 0; }
        code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', monospace; font-size: 0.9em; }
        .test-details { display: none; }
        .toggle-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin: 10px 0; }
        .toggle-btn:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Natural Language Query Test Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Comprehensive testing of AI natural language to SQL conversion capabilities</p>
        </div>

        <div class="metric-cards">
            <div class="metric-card">
                <h3>Total Tests</h3>
                <div class="metric-number">${report.summary.totalTests}</div>
                <p>Complete test coverage</p>
            </div>
            <div class="metric-card">
                <h3>Tests Passed</h3>
                <div class="metric-number pass">${report.summary.passed}</div>
                <p>Successful conversions</p>
            </div>
            <div class="metric-card">
                <h3>Tests Failed</h3>
                <div class="metric-number fail">${report.summary.failed}</div>
                <p>Need improvement</p>
            </div>
            <div class="metric-card">
                <h3>Pass Rate</h3>
                <div class="metric-number ${report.summary.passRate >= 90 ? 'pass' : report.summary.passRate >= 70 ? 'warning' : 'fail'}">${report.summary.passRate}%</div>
                <p>Overall accuracy</p>
            </div>
        </div>

        <div class="section">
            <h2>📊 Results by Category</h2>
            <div class="chart-container">
                <canvas id="categoryChart"></canvas>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Success Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.categoryBreakdown).map(([category, stats]) => {
                      const successRate = Math.round((stats.passed / stats.total) * 100);
                      return `
                        <tr>
                            <td><strong>${category}</strong></td>
                            <td>${stats.total}</td>
                            <td class="status-pass">${stats.passed}</td>
                            <td class="status-fail">${stats.total - stats.passed}</td>
                            <td class="${successRate >= 90 ? 'status-pass' : 'status-fail'}">${successRate}%</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="section">
            <h2>💡 Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation rec-${rec.priority.toLowerCase()}">
                    <h4>${rec.priority}: ${rec.issue} (${rec.category})</h4>
                    <p><strong>Issue:</strong> ${rec.description}</p>
                    <p><strong>Suggestion:</strong> ${rec.suggestion}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${report.failedTests.length > 0 ? `
        <div class="section">
            <h2>❌ Failed Tests Details</h2>
            <button class="toggle-btn" onclick="toggleFailedTests()">Show/Hide Failed Test Details</button>
            <div id="failed-tests" class="test-details">
                <table>
                    <thead>
                        <tr>
                            <th>Test ID</th>
                            <th>Category</th>
                            <th>Natural Language Query</th>
                            <th>SQL Pattern Match</th>
                            <th>Result Accuracy</th>
                            <th>Generated SQL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.failedTests.map(test => `
                            <tr>
                                <td>${test.testId}</td>
                                <td>${test.category}</td>
                                <td><em>"${test.naturalLanguage}"</em></td>
                                <td class="${test.sqlPatternMatch ? 'status-pass' : 'status-fail'}">${test.sqlPatternMatch ? '✅' : '❌'}</td>
                                <td class="${test.accuracy >= 90 ? 'status-pass' : 'status-fail'}">${test.accuracy}%</td>
                                <td><code>${test.sqlGenerated || 'N/A'}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>🔍 All Test Results</h2>
            <button class="toggle-btn" onclick="toggleAllTests()">Show/Hide All Test Details</button>
            <div id="all-tests" class="test-details">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Category</th>
                            <th>Natural Language</th>
                            <th>Status</th>
                            <th>Accuracy</th>
                            <th>SQL Generated</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.allResults.map(test => `
                            <tr>
                                <td>${test.testId}</td>
                                <td>${test.category}</td>
                                <td><em>"${test.naturalLanguage}"</em></td>
                                <td class="${test.resultsMatch && test.sqlPatternMatch ? 'status-pass' : 'status-fail'}">
                                    ${test.resultsMatch && test.sqlPatternMatch ? '✅ PASS' : '❌ FAIL'}
                                </td>
                                <td>${test.accuracy}%</td>
                                <td><code>${(test.sqlGenerated || 'N/A').substring(0, 100)}${test.sqlGenerated && test.sqlGenerated.length > 100 ? '...' : ''}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Category chart
        const categoryData = ${JSON.stringify(report.categoryBreakdown)};
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    label: 'Passed',
                    data: Object.values(categoryData).map(stats => stats.passed),
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }, {
                    label: 'Failed',
                    data: Object.values(categoryData).map(stats => stats.total - stats.passed),
                    backgroundColor: '#ef4444',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });

        function toggleFailedTests() {
            const element = document.getElementById('failed-tests');
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }

        function toggleAllTests() {
            const element = document.getElementById('all-tests');
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    </script>
</body>
</html>`;
}

async function main() {
  console.log('🧪 Natural Language Query Testing Suite');
  console.log('==========================================\n');

  try {
    console.log('⏳ Running comprehensive test suite...');
    const results = await runAllTests();
    
    console.log('\n📊 Generating detailed reports...');
    const report = await generateTestReport(results);
    
    console.log('\n✅ Test suite completed successfully!');
    console.log(`Final Score: ${results.passRate}% (${results.passed}/${results.total} tests passed)`);
    
    if (results.passRate < 80) {
      console.log('⚠️  WARNING: Pass rate is below 80%. Consider improving the AI model.');
      process.exit(1);
    } else if (results.passRate < 90) {
      console.log('⚠️  NOTICE: Pass rate is below 90%. There is room for improvement.');
    } else {
      console.log('🎉 Excellent! Pass rate is above 90%.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateTestReport, generateRecommendations };