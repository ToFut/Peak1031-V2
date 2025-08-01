// Diagnostic script to check what's happening with authentication
// Run this in the browser console while logged in to your app

console.log('=== AUTHENTICATION DIAGNOSTIC ===');

// Check if Supabase is available
if (typeof window !== 'undefined' && window.supabase) {
    console.log('✓ Supabase client found');
    
    // Get current session
    const getSession = async () => {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error getting session:', error);
            return;
        }
        
        if (!session) {
            console.error('❌ No active session found');
            return;
        }
        
        console.log('✓ Active session found');
        console.log('User ID:', session.user.id);
        console.log('Email:', session.user.email);
        console.log('Role:', session.user.role);
        
        // Test a direct query
        console.log('\n=== TESTING DIRECT QUERIES ===');
        
        // 1. Test exchanges query
        const { data: exchanges, error: exchangeError } = await window.supabase
            .from('exchanges')
            .select('*')
            .limit(5);
            
        console.log('Exchanges query result:', exchanges ? exchanges.length + ' exchanges' : 'No data');
        if (exchangeError) console.error('Exchange error:', exchangeError);
        
        // 2. Test if user exists in users table
        const { data: userData, error: userError } = await window.supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        console.log('User in database:', userData ? 'Found' : 'NOT FOUND');
        if (userData) {
            console.log('Database user:', userData);
        }
        if (userError) console.error('User lookup error:', userError);
        
        // 3. Test exchange_participants
        const { data: participants, error: partError } = await window.supabase
            .from('exchange_participants')
            .select('*')
            .eq('user_id', session.user.id);
            
        console.log('User participations:', participants ? participants.length : 0);
        if (partError) console.error('Participants error:', partError);
        
        // 4. Check with email instead of ID
        const { data: userByEmail, error: emailError } = await window.supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();
            
        if (userByEmail && userByEmail.id !== session.user.id) {
            console.error('❌ CRITICAL: User ID mismatch!');
            console.log('Auth ID:', session.user.id);
            console.log('Database ID:', userByEmail.id);
            console.log('This is why you see 0 exchanges!');
        }
    };
    
    getSession();
} else {
    console.error('❌ Supabase client not found on window');
    console.log('Try running this in the browser console while on your app');
}

// Also check localStorage for any stored auth data
console.log('\n=== LOCAL STORAGE CHECK ===');
const authToken = localStorage.getItem('sb-ynwfrmykghcozqnuszho-auth-token');
if (authToken) {
    try {
        const parsed = JSON.parse(authToken);
        console.log('Auth token found, user:', parsed.user?.email);
    } catch (e) {
        console.log('Auth token exists but cannot parse');
    }
} else {
    console.log('No auth token in localStorage');
}