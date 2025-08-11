const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUserConstraints() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const userId = '278304de-568f-4138-b35b-6fdcfbd2f1ce'; // Admin user ID from token
  
  try {
    console.log('🔍 Checking user constraints for document upload...');
    
    // Check if user exists in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.log('❌ Error finding user in users table:', userError);
    } else {
      console.log('✅ User found in users table:', user.email);
    }
    
    // Check if user exists in people table (which might be the foreign key reference)
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('id', userId);
    
    if (personError) {
      console.log('❌ Error checking people table:', personError);
    } else if (person.length === 0) {
      console.log('⚠️ User not found in people table - this might be causing the foreign key issue');
      console.log('   Need to create corresponding person record or change foreign key reference');
    } else {
      console.log('✅ User found in people table');
    }
    
    // Check documents table constraints
    console.log('\n🔍 Checking documents table foreign key constraints...');
    
    // Check what columns exist in documents table
    const { data: sampleDoc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);
    
    if (!docError && sampleDoc.length > 0) {
      console.log('📋 Sample document columns:', Object.keys(sampleDoc[0]));
    }
    
    // Try to find existing documents with uploaded_by field to see what values work
    const { data: existingDocs, error: existingError } = await supabase
      .from('documents')
      .select('uploaded_by, exchange_id')
      .limit(5);
    
    if (!existingError && existingDocs.length > 0) {
      console.log('\n📄 Existing document uploaded_by values:');
      existingDocs.forEach((doc, i) => {
        console.log(`   ${i + 1}. uploaded_by: ${doc.uploaded_by}, exchange_id: ${doc.exchange_id}`);
      });
    } else {
      console.log('⚠️ No existing documents found or error:', existingError);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkUserConstraints();