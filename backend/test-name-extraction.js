const service = require('./services/oss-llm-query');

async function testNameExtraction() {
  const query = 'How many exchanges names are with - Katzovitz, Yechiel?';
  console.log('=== TESTING FIXED NAME EXTRACTION ===');
  console.log('Query:', query);

  // Test the fixed regex
  const dashPattern = /names?.*with.*[-:]\s*(.+?)(?:\?|$)/i;
  const dashMatch = query.match(dashPattern);
  console.log('Fixed dash pattern match:', dashMatch);

  if (dashMatch) {
    const nameText = dashMatch[1].trim();
    console.log('Extracted name text:', nameText);
    const names = nameText.split(',').map(n => n.trim()).filter(n => n.length > 1);
    console.log('Split names:', names);
  }

  // Test the entire function
  const result = service.generateComplexNameSearch(query);
  const success = (result !== null);
  console.log('Generated SQL result:', success ? 'SUCCESS' : 'FAILED');
  if (result) {
    console.log('SQL Preview:', result.substring(0, 200) + '...');
  }
}

testNameExtraction().catch(console.error);