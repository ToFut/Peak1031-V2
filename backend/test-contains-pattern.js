const service = require('./services/oss-llm-query');

function testContainsPattern() {
  const query = "Show me all exchanges where the client's last name contains 'smith' but the exchange was created before January 2024";
  console.log('=== TESTING IMPROVED NAME EXTRACTION ===');
  console.log('Query:', query);

  const result = service.generateComplexNameSearch(query);
  if (result) {
    console.log('✅ Generated SQL successfully');
    console.log('SQL preview:', result.substring(0, 200) + '...');
  } else {
    console.log('❌ No SQL generated - trying patterns manually');
    
    // Test the contains pattern specifically
    const containsPatterns = [
      /last name contains ['"]([^'"]+)['"]/i,
      /client'?s?\s+last name contains ['"]([^'"]+)['"]/i,
      /name contains ['"]([^'"]+)['"]/i
    ];
    
    for (const pattern of containsPatterns) {
      const match = query.match(pattern);
      if (match) {
        console.log('✅ Pattern matched:', pattern);
        console.log('Extracted name:', match[1]);
        break;
      }
    }
  }
}

testContainsPattern();