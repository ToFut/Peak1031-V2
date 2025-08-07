const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');

async function analyzePPDataStructure() {
  try {
    console.log('🔍 Analyzing PracticePanther data structures...\n');
    
    const tokenManager = new PPTokenManager();
    const storedToken = await tokenManager.getStoredToken();
    
    if (!storedToken) {
      console.error('❌ No stored token found');
      return;
    }
    
    // Analyze each table structure
    const tables = [
      { name: 'contacts', url: 'https://app.practicepanther.com/api/v2/contacts?limit=1' },
      { name: 'tasks', url: 'https://app.practicepanther.com/api/v2/tasks?limit=1' },
      { name: 'notes', url: 'https://app.practicepanther.com/api/v2/notes?limit=1' },
      { name: 'invoices', url: 'https://app.practicepanther.com/api/v2/invoices?limit=1' },
      { name: 'expenses', url: 'https://app.practicepanther.com/api/v2/expenses?limit=1' },
      { name: 'users', url: 'https://app.practicepanther.com/api/v2/users?limit=1' }
    ];
    
    console.log('📊 Analyzing data structure for each table:\n');
    
    for (const table of tables) {
      try {
        console.log(`🔍 Analyzing ${table.name.toUpperCase()} structure:`);
        
        const response = await axios.get(table.url, {
          headers: {
            'Authorization': `Bearer ${storedToken.access_token}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const sample = response.data[0];
          console.log(`✅ ${table.name} - Sample record structure:`);
          
          // Analyze field types and structure
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const type = typeof value;
            const isNull = value === null;
            const isArray = Array.isArray(value);
            
            let fieldInfo = `   ${key.padEnd(25)} : `;
            
            if (isNull) {
              fieldInfo += 'NULL';
            } else if (isArray) {
              fieldInfo += `ARRAY[${value.length}]`;
              if (value.length > 0) {
                fieldInfo += ` of ${typeof value[0]}`;
              }
            } else if (type === 'string') {
              fieldInfo += `STRING(${value.length})`;
              // Check if it looks like a date
              if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                fieldInfo += ' - DATETIME';
              }
            } else if (type === 'number') {
              fieldInfo += Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
            } else if (type === 'boolean') {
              fieldInfo += 'BOOLEAN';
            } else if (type === 'object') {
              fieldInfo += `OBJECT(${Object.keys(value).length} keys)`;
            } else {
              fieldInfo += type.toUpperCase();
            }
            
            console.log(fieldInfo);
          });
          
          console.log('');
          
        } else {
          console.log(`⚠️ ${table.name} - No sample data available`);
          console.log('');
        }
        
      } catch (error) {
        console.log(`❌ ${table.name} - Error: ${error.response?.status} ${error.message}`);
        console.log('');
      }
    }
    
    // Also try matters if it works
    try {
      console.log('🔍 Analyzing MATTERS structure (if available):');
      const mattersResponse = await axios.get('https://app.practicepanther.com/api/v2/matters?limit=1', {
        headers: {
          'Authorization': `Bearer ${storedToken.access_token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });
      
      if (mattersResponse.data && Array.isArray(mattersResponse.data) && mattersResponse.data.length > 0) {
        const sample = mattersResponse.data[0];
        console.log('✅ matters - Sample record structure:');
        
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = typeof value;
          const isNull = value === null;
          const isArray = Array.isArray(value);
          
          let fieldInfo = `   ${key.padEnd(25)} : `;
          
          if (isNull) {
            fieldInfo += 'NULL';
          } else if (isArray) {
            fieldInfo += `ARRAY[${value.length}]`;
          } else if (type === 'string') {
            fieldInfo += `STRING(${value.length})`;
            if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              fieldInfo += ' - DATETIME';
            }
          } else if (type === 'number') {
            fieldInfo += Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
          } else if (type === 'boolean') {
            fieldInfo += 'BOOLEAN';
          } else if (type === 'object') {
            fieldInfo += `OBJECT(${Object.keys(value).length} keys)`;
          } else {
            fieldInfo += type.toUpperCase();
          }
          
          console.log(fieldInfo);
        });
      }
    } catch (error) {
      console.log(`❌ matters - Error: ${error.response?.status} ${error.message}`);
    }
    
    console.log('\n🎯 Analysis complete! Use this structure to create database tables.');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzePPDataStructure();