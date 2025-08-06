require('dotenv').config();

function verifyServiceKey() {
  console.log('🔍 VERIFYING SERVICE KEY\n');
  
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!serviceKey) {
    console.log('❌ No service key found in .env file');
    return;
  }
  
  console.log('Service Key Length:', serviceKey.length);
  console.log('Anon Key Length:', anonKey.length);
  
  // Check if they're the same
  if (serviceKey === anonKey) {
    console.log('❌ WARNING: Service key and anon key are identical!');
    console.log('This means you copied the wrong key.');
    return;
  }
  
  // Decode JWT payload (second part)
  try {
    const parts = serviceKey.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid JWT format');
      return;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('\n📋 JWT Payload:');
    console.log('- Role:', payload.role);
    console.log('- Issuer:', payload.iss);
    console.log('- Expires:', new Date(payload.exp * 1000).toISOString());
    console.log('- Issued At:', new Date(payload.iat * 1000).toISOString());
    
    if (payload.role === 'service_role') {
      console.log('\n✅ Service key appears to be correct!');
      console.log('Role is "service_role" as expected.');
    } else {
      console.log('\n❌ Service key has wrong role:', payload.role);
      console.log('Expected "service_role", got:', payload.role);
    }
    
    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.log('\n❌ Service key is expired!');
      console.log('Expired at:', new Date(payload.exp * 1000).toISOString());
    } else {
      console.log('\n✅ Service key is not expired');
    }
    
  } catch (error) {
    console.log('❌ Error decoding JWT:', error.message);
  }
}

verifyServiceKey(); 