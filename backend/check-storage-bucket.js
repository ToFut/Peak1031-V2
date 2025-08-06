const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndCreateBucket() {
  try {
    console.log('🔍 Checking storage buckets...');
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('📦 Existing buckets:', buckets.map(b => b.name));
    
    // Check if 'documents' bucket exists
    const documentsBucket = buckets.find(b => b.name === 'documents');
    
    if (!documentsBucket) {
      console.log('📝 Creating documents bucket...');
      
      const { data, error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
      } else {
        console.log('✅ Documents bucket created successfully');
      }
    } else {
      console.log('✅ Documents bucket already exists');
      
      // Update bucket settings if needed
      const { error: updateError } = await supabase.storage.updateBucket('documents', {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (updateError) {
        console.error('⚠️ Error updating bucket settings:', updateError);
      } else {
        console.log('✅ Bucket settings updated');
      }
    }
    
    // Test upload a simple file
    console.log('\n🧪 Testing file upload...');
    const testContent = 'This is a test file for storage bucket verification.';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload('test/test-file.txt', testContent, {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful:', uploadData.path);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove(['test/test-file.txt']);
        
      if (!deleteError) {
        console.log('🧹 Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndCreateBucket();