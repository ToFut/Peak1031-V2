require('dotenv').config({ path: './backend/.env' });
const express = require('./backend/node_modules/express');
const session = require('./backend/node_modules/express-session');
const practicePartnerService = require('./backend/services/practicePartnerService');

const app = express();
const PORT = 8000;

// Session middleware
app.use(session({
  secret: 'test-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Allow HTTP for testing
}));

app.use(express.json());

// Test route to start OAuth flow
app.get('/test-oauth', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const authUrl = practicePartnerService.generateAuthUrl(state);
  
  // Store state in session
  req.session.oauthState = state;
  
  res.json({
    message: 'Visit this URL to authorize PracticePanther access',
    authUrl: authUrl,
    instructions: 'After authorization, you will be redirected back to this server'
  });
});

// OAuth callback route (this will receive the authorization code)
app.get('/', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('📥 OAuth callback received:');
    console.log(`Code: ${code ? code.substring(0, 20) + '...' : 'None'}`);
    console.log(`State: ${state || 'None'}`);
    console.log(`Error: ${error || 'None'}`);
    
    if (error) {
      return res.json({
        success: false,
        error: `OAuth authorization failed: ${error}`
      });
    }
    
    if (!code) {
      return res.json({
        success: false,
        error: 'No authorization code received'
      });
    }
    
    // Validate state
    if (req.session.oauthState && req.session.oauthState !== state) {
      return res.json({
        success: false,
        error: 'Invalid state parameter - possible security issue'
      });
    }
    
    console.log('🔄 Exchanging code for token...');
    
    // Exchange code for token
    const tokenData = await practicePartnerService.exchangeCodeForToken(code, state);
    
    console.log('✅ Token exchange successful!');
    
    // Clear session state
    delete req.session.oauthState;
    
    // Now test the API connection
    console.log('🧪 Testing API connection...');
    const connectionTest = await practicePartnerService.testConnection();
    
    res.json({
      success: true,
      message: 'PracticePanther OAuth authorization successful!',
      tokenReceived: !!tokenData.access_token,
      expiresIn: tokenData.expires_in,
      hasRefreshToken: !!tokenData.refresh_token,
      apiConnectionTest: connectionTest
    });
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Test API connection after OAuth
app.get('/test-connection', async (req, res) => {
  try {
    const result = await practicePartnerService.testConnection();
    res.json({
      success: true,
      connection: result
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OAuth Test Server running on https://localhost:${PORT}`);
  console.log(`📋 Steps to test OAuth flow:`);
  console.log(`1. Visit: https://localhost:${PORT}/test-oauth`);
  console.log(`2. Follow the authorization URL provided`);
  console.log(`3. Complete PracticePanther authorization`);
  console.log(`4. You'll be redirected back with the result`);
  console.log(`5. Test API: https://localhost:${PORT}/test-connection`);
});