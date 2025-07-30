# Debug PracticePanther OAuth 400 Error

## 🔍 Get Detailed Error Information

1. **Open Browser Developer Tools:**
   - Press `F12` or right-click → "Inspect"
   - Go to **Network** tab
   - Clear any existing requests

2. **Try the OAuth URL:**
   ```
   https://app.practicepanther.com/oauth/authorize?response_type=code&client_id=c1ba43b4-155b-4a69-90cb-55cf7f1e7f41&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Foauth%2Fcallback&state=a6d66205e744e77c1b52d60f31b29e00144eb42216293a6edb3bdb92a9fa4973
   ```

3. **Find the Failed Request:**
   - Look for red/failed requests in Network tab
   - Click on the failed request
   - Go to **Response** tab
   - Copy the exact error message

## 🚨 Common OAuth 400 Error Messages:

### "invalid_client"
- Your client_id is not recognized
- Need to verify client_id with PracticePanther

### "invalid_redirect_uri" 
- Redirect URI not registered
- Contact PracticePanther to register your URI

### "invalid_request"
- Missing or malformed parameters
- Check URL encoding

### "unauthorized_client"
- Your app doesn't have OAuth permissions
- Need approval from PracticePanther

## 📋 Information to Send to PracticePanther Support:

**Email Template:**
```
Subject: OAuth Integration - Register Redirect URI

Hi PracticePanther Team,

I'm integrating OAuth with your API and need to register my redirect URI.

Client ID: c1ba43b4-155b-4a69-90cb-55cf7f1e7f41
Redirect URI (Development): http://localhost:8000/oauth/callback
Redirect URI (Production): [Your production domain]/oauth/callback

Current Error: 400 Bad Request when accessing /oauth/authorize

Could you please register these redirect URIs for my OAuth application?

Thank you!
```

## 🔧 Alternative Testing:

Try these variations while waiting for PracticePanther:

1. **Different ports:**
   - `http://localhost:3000/oauth/callback`
   - `http://127.0.0.1:8000/oauth/callback`

2. **HTTPS variations:**
   - `https://localhost:8000/oauth/callback`

3. **Check if they have a default/test redirect URI** 