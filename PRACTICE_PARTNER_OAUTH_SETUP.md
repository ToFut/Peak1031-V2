# PracticePanther OAuth 2.0 Integration Setup Guide

This guide walks you through implementing OAuth 2.0 Authorization Code flow for PracticePanther integration, following the [OAuth 2.0 Simplified guide](https://aaronparecki.com/oauth-2-simplified/).

## 🚀 Quick Start

### 1. Database Setup

First, execute the SQL migration to create the OAuth tokens table:

```sql
-- Execute this in your Supabase SQL editor
-- File: supabase-oauth-tokens-table.sql
```

This creates:
- `pp_oauth_tokens` table to securely store OAuth tokens
- Row Level Security (RLS) policies
- Proper indexes and triggers

### 2. Environment Configuration

Add these environment variables to your frontend `.env` file:

```bash
# PracticePanther OAuth Configuration
REACT_APP_PP_CLIENT_ID=your_client_id_here
REACT_APP_PP_CLIENT_SECRET=your_client_secret_here
REACT_APP_PP_REDIRECT_URI=http://localhost:8000/oauth/callback
```

**Important Notes:**
- Get your `client_id` and `client_secret` from PracticePanther development team
- The `redirect_uri` must be registered with PracticePanther
- In production, use HTTPS for the redirect URI

### 3. Integration Components

The implementation includes:

#### Core Service (`practicePartnerOAuth.ts`)
- **OAuth Flow Management**: Handles authorization URL generation and token exchange
- **Token Management**: Automatic refresh and secure storage
- **API Requests**: Authenticated requests to PracticePanther API
- **Security**: State parameter validation and CSRF protection

#### OAuth Callback Page (`OAuthCallback.tsx`)
- Handles the redirect from PracticePanther
- Exchanges authorization code for tokens
- User-friendly success/error handling
- Automatic redirect to admin dashboard

#### Integration Component (`PracticePartnerIntegration.tsx`)
- Connection status display
- OAuth flow initiation
- Disconnect functionality
- Token expiry monitoring

## 🔐 OAuth 2.0 Flow Implementation

### Step 1: Authorization Request

When user clicks "Connect to PracticePanther":

```typescript
// Generate authorization URL
const authUrl = practicePartnerOAuth.initiateOAuth();
// Redirects to: https://app.practicepanther.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&state=RANDOM_STATE
```

**Parameters:**
- `response_type=code`: Indicates authorization code flow
- `client_id`: Your application's client ID
- `redirect_uri`: Where PracticePanther redirects after authorization
- `state`: Random string for CSRF protection

### Step 2: User Authorization

User is redirected to PracticePanther where they:
1. Log into their PracticePanther account
2. Review permissions requested
3. Grant or deny access

### Step 3: Authorization Code Return

PracticePanther redirects back to your callback URL:
```
http://localhost:8000/oauth/callback?code=AUTHORIZATION_CODE&state=ORIGINAL_STATE
```

### Step 4: Token Exchange

The callback page exchanges the code for tokens:

```typescript
const tokenData = await practicePartnerOAuth.exchangeCodeForToken(code, state);
```

**POST Request to:** `https://app.practicepanther.com/oauth/token`

**Body (x-www-form-urlencoded):**
```
grant_type=authorization_code
code=AUTHORIZATION_CODE
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
redirect_uri=YOUR_REDIRECT_URI
```

**Response:**
```json
{
  "access_token": "EwO_-HQc2OZAGRIkc",
  "token_type": "bearer",
  "expires_in": 86399,
  "refresh_token": "6a4907393821401b8c14ff1dda620918"
}
```

## 🔄 Token Management

### Automatic Token Refresh

The service automatically refreshes expired tokens:

```typescript
// When making API requests, tokens are automatically refreshed if expired
const response = await practicePartnerOAuth.makeAuthenticatedRequest('/contacts');
```

### Token Storage

Tokens are securely stored in Supabase with:
- Row Level Security (RLS)
- User-specific access
- Automatic expiry tracking
- Encrypted at rest

## 🛡️ Security Features

### State Parameter Validation
- Random state generated for each OAuth flow
- State stored temporarily in localStorage
- Verified on callback to prevent CSRF attacks

### Token Security
- Tokens stored in secure Supabase database
- RLS ensures users only access their own tokens
- Automatic cleanup of expired tokens

### Error Handling
- Comprehensive error messages
- Retry mechanisms for failed requests
- Graceful handling of expired tokens

## 📡 Making API Requests

Once connected, make authenticated requests:

```typescript
// Get contacts from PracticePanther
const response = await practicePartnerOAuth.makeAuthenticatedRequest('/contacts');
const contacts = await response.json();

// Get matters
const mattersResponse = await practicePartnerOAuth.makeAuthenticatedRequest('/matters');
const matters = await mattersResponse.json();
```

The service automatically:
- Adds Bearer token to requests
- Handles token refresh if needed
- Retries failed requests once

## 🎛️ Admin Integration

Add the integration component to your admin dashboard:

```typescript
import PracticePartnerIntegration from '../components/PracticePartnerIntegration';

// In your admin dashboard
<PracticePartnerIntegration />
```

This provides:
- Connection status display
- One-click OAuth connection
- Disconnect functionality
- Token expiry information

## 🚦 Testing the Integration

### Development Testing

1. **Start the development server:**
   ```bash
   cd frontend
   npm start
   ```

2. **Navigate to admin dashboard:**
   - Go to `http://localhost:8000/admin`
   - Look for "PracticePanther Integration" section

3. **Test OAuth flow:**
   - Click "Connect to PracticePanther"
   - Complete authorization on PracticePanther
   - Verify successful connection

### Production Deployment

1. **Update environment variables:**
   ```bash
   REACT_APP_PP_REDIRECT_URI=https://yourdomain.com/oauth/callback
   ```

2. **Register production redirect URI:**
   - Contact PracticePanther development team
   - Register your production callback URL

3. **Test in production environment**

## 🔧 Troubleshooting

### Common Issues

**"Invalid redirect_uri" error:**
- Ensure redirect URI is registered with PracticePanther
- Check for exact match (including https/http)

**"Invalid client_id" error:**
- Verify client_id in environment variables
- Ensure client_id is active in PracticePanther

**Token refresh failures:**
- Check if refresh_token is still valid
- Re-authenticate if refresh token expired

**State parameter errors:**
- Clear browser localStorage
- Ensure state is properly generated and stored

### Debug Mode

In development, the OAuth callback page shows debug information including:
- Authorization code (truncated)
- State parameter
- Error details
- Current status

## 📋 Next Steps

After OAuth integration is working:

1. **Implement Data Sync Service**
   - Create sync jobs for contacts, matters, tasks
   - Handle incremental updates
   - Implement conflict resolution

2. **Add Webhook Support**
   - Receive real-time updates from PracticePanther
   - Process webhook events
   - Update local data accordingly

3. **Monitor and Logging**
   - Add comprehensive logging
   - Monitor OAuth token usage
   - Track sync performance

## 🔗 Related Files

- `frontend/src/services/practicePartnerOAuth.ts` - Core OAuth service
- `frontend/src/pages/OAuthCallback.tsx` - OAuth callback handler
- `frontend/src/components/PracticePartnerIntegration.tsx` - Admin integration UI
- `supabase-oauth-tokens-table.sql` - Database migration
- `frontend/src/App.tsx` - Route configuration

## 📚 References

- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)
- [PracticePanther API Documentation](https://app.practicepanther.com/content/apidocs/index.html)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Need Help?** Check the debug information in the OAuth callback page or review the console logs for detailed error messages. 