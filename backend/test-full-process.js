const service = require('./services/oss-llm-query');

async function testFullProcess() {
  await service.initialize();
  const query = 'How many exchanges names are with - Katzovitz, Yechiel?';
  console.log('=== TESTING FULL QUERY PROCESSING ===');
  
  // Test hasNamePattern first
  const hasName = service.hasNamePattern(query);
  console.log('Has name pattern:', hasName);
  
  // Test generateComplexNameSearch
  const nameSQL = service.generateComplexNameSearch(query);
  console.log('Name search SQL exists:', (nameSQL !== null));
  if (nameSQL) {
    console.log('Generated SQL preview:', nameSQL.substring(0, 100) + '...');
  }
  
  // Test generateSQLWithLLM function directly
  try {
    const sql = await service.generateSQLWithLLM(query, {});
    console.log('Generated SQL from LLM:', sql);
  } catch (error) {
    console.log('Error generating SQL:', error.message);
  }
  
  // Test full process
  console.log('\n=== TESTING FULL PROCESS ===');
  const result = await service.processQuery(query);
  console.log('Final generated SQL:', result.generatedSQL);
  console.log('Error:', result.error);
}

testFullProcess().catch(console.error);