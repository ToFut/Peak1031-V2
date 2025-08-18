const databaseService = require('./services/database');
const { transformToCamelCase } = require('./utils/caseTransform');

async function testDirectExchangeData() {
  try {
    console.log('🔍 Testing Direct Exchange Data from Database...\n');
    
    // Get a sample exchange ID
    const supabaseService = require('./services/supabase');
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, name')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('No exchanges found in database');
      return;
    }
    
    const exchangeId = exchanges[0].id;
    console.log(`📋 Testing with exchange: ${exchanges[0].name} (${exchangeId})\n`);
    
    // Get exchange using the same method as the API
    const exchange = await databaseService.getExchangeById(exchangeId);
    
    console.log('📦 Raw Database Response (before transformation):');
    console.log('================================\n');
    
    console.log('🏢 Basic Information:');
    console.log(`  - name: ${exchange.name}`);
    console.log(`  - exchange_number: ${exchange.exchange_number}`);
    console.log(`  - status: ${exchange.status}`);
    console.log(`  - exchange_type: ${exchange.exchange_type}`);
    
    console.log('\n🏠 Property Fields in Database:');
    const propertyFields = [
      'property_sold_address',
      'property_sold_value',
      'property_bought_address',
      'property_bought_value',
      'rel_property_address',
      'rel_property_state',
      'rel_property_city',
      'rel_property_zip',
      'rep_1_property_address',
      'relinquished_property_value',
      'replacement_property_value'
    ];
    
    propertyFields.forEach(field => {
      console.log(`  - ${field}: ${exchange[field] || 'null'}`);
    });
    
    console.log('\n📅 Date Fields in Database:');
    const dateFields = [
      'close_of_escrow_date',
      'sale_date',
      'start_date',
      'completion_date',
      'forty_five_day_deadline',
      'one_eighty_day_deadline',
      'day_45',
      'day_180',
      'identification_deadline',
      'exchange_deadline'
    ];
    
    dateFields.forEach(field => {
      console.log(`  - ${field}: ${exchange[field] || 'null'}`);
    });
    
    console.log('\n👥 People Information:');
    console.log(`  - client_id: ${exchange.client_id}`);
    console.log(`  - coordinator_id: ${exchange.coordinator_id}`);
    console.log(`  - client object: ${exchange.client ? 'Present' : 'null'}`);
    console.log(`  - coordinator object: ${exchange.coordinator ? 'Present' : 'null'}`);
    
    // Now transform to camelCase as the API does
    const transformedData = transformToCamelCase(exchange);
    
    console.log('\n\n📦 After CamelCase Transformation:');
    console.log('================================\n');
    
    console.log('🏢 Basic Information:');
    console.log(`  - name: ${transformedData.name}`);
    console.log(`  - exchangeNumber: ${transformedData.exchangeNumber}`);
    console.log(`  - status: ${transformedData.status}`);
    console.log(`  - exchangeType: ${transformedData.exchangeType}`);
    
    console.log('\n🏠 Property Fields After Transform:');
    console.log(`  - propertySoldAddress: ${transformedData.propertySoldAddress || 'undefined'}`);
    console.log(`  - propertySoldValue: ${transformedData.propertySoldValue || 'undefined'}`);
    console.log(`  - propertyBoughtAddress: ${transformedData.propertyBoughtAddress || 'undefined'}`);
    console.log(`  - propertyBoughtValue: ${transformedData.propertyBoughtValue || 'undefined'}`);
    console.log(`  - relPropertyAddress: ${transformedData.relPropertyAddress || 'undefined'}`);
    console.log(`  - relPropertyState: ${transformedData.relPropertyState || 'undefined'}`);
    console.log(`  - relPropertyCity: ${transformedData.relPropertyCity || 'undefined'}`);
    console.log(`  - rep1PropertyAddress: ${transformedData.rep1PropertyAddress || 'undefined'}`);
    console.log(`  - relinquishedPropertyValue: ${transformedData.relinquishedPropertyValue || 'undefined'}`);
    console.log(`  - replacementPropertyValue: ${transformedData.replacementPropertyValue || 'undefined'}`);
    
    console.log('\n📅 Date Fields After Transform:');
    console.log(`  - closeOfEscrowDate: ${transformedData.closeOfEscrowDate || 'undefined'}`);
    console.log(`  - saleDate: ${transformedData.saleDate || 'undefined'}`);
    console.log(`  - startDate: ${transformedData.startDate || 'undefined'}`);
    console.log(`  - completionDate: ${transformedData.completionDate || 'undefined'}`);
    console.log(`  - fortyFiveDayDeadline: ${transformedData.fortyFiveDayDeadline || 'undefined'}`);
    console.log(`  - oneEightyDayDeadline: ${transformedData.oneEightyDayDeadline || 'undefined'}`);
    console.log(`  - day45: ${transformedData.day45 || 'undefined'}`);
    console.log(`  - day180: ${transformedData.day180 || 'undefined'}`);
    console.log(`  - identificationDeadline: ${transformedData.identificationDeadline || 'undefined'}`);
    console.log(`  - exchangeDeadline: ${transformedData.exchangeDeadline || 'undefined'}`);
    
    console.log('\n🔑 Sample of All Keys After Transform:');
    const sampleKeys = Object.keys(transformedData).slice(0, 30);
    sampleKeys.forEach(key => {
      const value = transformedData[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = value === null ? 'null' :
                       value === undefined ? 'undefined' :
                       type === 'string' ? value.substring(0, 30) : 
                       type === 'number' ? value :
                       type === 'boolean' ? value :
                       type === 'array' ? `[${value.length} items]` :
                       '{object}';
      console.log(`  ${key}: ${preview} (${type})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectExchangeData();