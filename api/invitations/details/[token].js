// Vercel serverless function for invitation details
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log('🔍 Validating invitation token:', token);

    // Find invitation in database
    const { data: invitations, error: selectError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending');

    if (selectError) {
      console.error('Database error:', selectError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!invitations || invitations.length === 0) {
      console.log('❌ No invitation found for token:', token);
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    const invitation = invitations[0];
    console.log('✅ Found invitation:', invitation.email);

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log('❌ Invitation expired:', invitation.expires_at);
      
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
        
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get exchange details
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', invitation.exchange_id)
      .single();

    if (exchangeError || !exchange) {
      console.error('Exchange error:', exchangeError);
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Get inviter details
    let inviterName = 'Unknown';
    if (invitation.invited_by) {
      const { data: inviter } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', invitation.invited_by)
        .single();
      
      if (inviter) {
        inviterName = inviter.first_name && inviter.last_name 
          ? `${inviter.first_name} ${inviter.last_name}`
          : inviter.email;
      }
    }

    // Return invitation details
    const response = {
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      role: invitation.role,
      customMessage: invitation.custom_message,
      exchange: {
        id: exchange.id,
        name: exchange.name || exchange.exchange_number,
        exchangeNumber: exchange.exchange_number
      },
      inviter: {
        name: inviterName
      },
      expiresAt: invitation.expires_at
    };

    console.log('✅ Returning invitation details for:', invitation.email);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Invitation details error:', error);
    return res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
}