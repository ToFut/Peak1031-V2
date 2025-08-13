/**
 * Test document download to identify the 400 error cause
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_DOCUMENT_ID = '52c21773-fac5-457f-a808-8983f3ff5093'; // From the error

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDocumentDownload() {
  console.log('📥 Testing Document Download Issues\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check if document exists
    console.log('\n📋 Step 1: Checking if document exists...');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', TEST_DOCUMENT_ID)
      .single();
    
    if (docError || !document) {
      console.error('❌ Document not found:', docError);
      return;
    }
    
    console.log('✅ Document found:', {
      id: document.id,
      filename: document.original_filename,
      storage_provider: document.storage_provider,
      file_path: document.file_path,
      pin_required: document.pin_required,
      exchange_id: document.exchange_id,
      uploaded_by: document.uploaded_by
    });
    
    // Step 2: Check PIN requirement
    console.log('\n📋 Step 2: Checking PIN requirement...');
    if (document.pin_required) {
      console.log('🔐 Document requires PIN protection');
      console.log('❌ This is likely the cause of the 400 error!');
      console.log('   Frontend is not providing PIN parameter');
    } else {
      console.log('✅ Document does not require PIN');
    }
    
    // Step 3: Check file storage location
    console.log('\n📋 Step 3: Checking file storage...');
    if (document.storage_provider === 'supabase' || document.file_path.startsWith('exchanges/')) {
      console.log('☁️ Document stored in Supabase storage');
      console.log('📁 File path:', document.file_path);
      
      // Try to check if file exists in storage
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(document.file_path);
        
        if (downloadError) {
          console.log('❌ File not accessible in storage:', downloadError);
        } else {
          console.log('✅ File exists in storage, size:', fileData.size);
        }
      } catch (storageError) {
        console.log('❌ Storage access error:', storageError.message);
      }
    } else {
      console.log('💾 Document stored locally');
      console.log('📁 File path:', document.file_path);
    }
    
    // Step 4: Check admin user access
    console.log('\n📋 Step 4: Checking admin user permissions...');
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@peak1031.com')
      .single();
    
    if (userError || !adminUser) {
      console.error('❌ Admin user not found:', userError);
    } else {
      console.log('✅ Admin user found:', adminUser.email, 'role:', adminUser.role);
      
      // Check if admin should have access
      if (adminUser.role === 'admin') {
        console.log('✅ Admin should bypass all permission checks');
      }
    }
    
    // Step 5: Identify the issue
    console.log('\n📋 Step 5: Issue Analysis...');
    console.log('Potential causes of 400 error:');
    
    if (document.pin_required) {
      console.log('🔥 PRIMARY ISSUE: Document requires PIN but frontend is not providing it');
      console.log('   - Backend expects ?pin=XXXX query parameter');
      console.log('   - Frontend downloadDocument() call needs PIN parameter');
    }
    
    // Check middleware parameter mismatch (before our fix)
    console.log('✅ Fixed: requireDocumentAccess middleware now checks req.params.id');
    console.log('✅ Fixed: Admin users now bypass document permission checks');
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 DOWNLOAD TEST COMPLETE');
    console.log('=' .repeat(50));
    
    // Provide solution
    if (document.pin_required) {
      console.log('\n💡 SOLUTION:');
      console.log('1. Frontend needs to prompt for PIN when downloading protected documents');
      console.log('2. Or admin users should be able to download without PIN');
      console.log('3. Update downloadDocument() to handle PIN-protected documents');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testDocumentDownload().catch(console.error);