require('dotenv').config();
const SupabaseService = require('./services/supabase');

const supabaseService = new SupabaseService();
console.log('Client initialized:', supabaseService.client !== null);

if (supabaseService.client) {
  console.log('Testing Supabase connection...');
} else {
  console.log('Client not initialized - credentials missing');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
}