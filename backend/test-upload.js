require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testUpload() {
  console.log('🧪 Testing Supabase upload functionality...');
  
  try {
    // 1. Check if bucket exists
    console.log('📁 Checking if documents bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'documents');
    console.log(`📦 Documents bucket exists: ${bucketExists}`);
    
    if (!bucketExists) {
      console.log('📁 Creating documents bucket...');
      const { data, error: createError } = await supabase.storage.createBucket('documents', {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
          'application/zip',
          'application/x-zip-compressed'
        ],
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ Documents bucket created successfully');
    }
    
    // 2. Create a test file
    const testContent = 'This is a test file for upload verification.';
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    // 3. Test upload
    console.log('📤 Testing file upload...');
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePathInStorage = `exchanges/test-exchange/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFilePathInStorage, fs.readFileSync(testFilePath), {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // 4. Test download
    console.log('📥 Testing file download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(testFilePathInStorage);
    
    if (downloadError) {
      console.error('❌ Download failed:', downloadError);
      return;
    }
    
    console.log('✅ Download successful, file size:', downloadData.size);
    
    // 5. Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Test file cleaned up');
    
    console.log('🎉 All upload tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUpload();




