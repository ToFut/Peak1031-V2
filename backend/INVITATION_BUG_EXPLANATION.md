# The Invitation Token Bug Explained

## THE PROBLEM: Two Different Tokens Were Being Generated

### What Was Happening:

1. **In routes/invitations.js** (Line 458):
   ```javascript
   const invitationToken = crypto.randomBytes(32).toString('hex');
   // Example: Generated token A = "abc123..."
   ```

2. **Then called invitationService.sendInvitation()** WITHOUT passing the token:
   ```javascript
   const inviteResult = await invitationService.sendInvitation({
     email: invitation.email,
     // ❌ NO invitationToken parameter was passed!
   });
   ```

3. **Inside invitationService.js** (Line 172):
   ```javascript
   const token = invitationToken || this.generateInvitationToken();
   // Since no token was passed, it generated a NEW token B = "xyz789..."
   ```

4. **The email was sent with Token B**:
   ```javascript
   const inviteUrl = `${this.frontendUrl}/invite/${token}`; // Token B
   // Email contained: https://site.com/invite/xyz789...
   ```

5. **But the database saved Token A**:
   ```javascript
   await supabaseService.insert('invitations', {
     invitation_token: invitationToken, // Token A from step 1
   });
   ```

## THE RESULT:
- **Email had**: `https://site.com/invite/xyz789...` (Token B)
- **Database had**: Token A = `abc123...`
- **When user clicked the link**: "Invalid invitation" (Token B doesn't exist in DB)

## THE FIX: Pass the Same Token

### What We Changed:

**routes/invitations.js** (Line 465):
```javascript
const inviteResult = await invitationService.sendInvitation({
  email: invitation.email,
  invitationToken: invitationToken, // ✅ NOW WE PASS THE TOKEN!
});
```

Now the flow is:
1. Generate token once: `abc123...`
2. Pass it to invitationService
3. Email contains: `https://site.com/invite/abc123...`
4. Database saves: `abc123...`
5. User clicks link: ✅ Works! (Token exists in DB)

## VISUAL DIAGRAM:

### BEFORE (Broken):
```
routes/invitations.js          invitationService.js
        |                              |
   Generate Token A                    |
        |                              |
   Call sendInvitation() ------>       |
   (no token passed)                   |
        |                         Generate Token B
        |                              |
        |                         Send email with Token B
        |                              |
   Save Token A to DB                  |
        |                              |
   
Result: Email has Token B, DB has Token A = MISMATCH!
```

### AFTER (Fixed):
```
routes/invitations.js          invitationService.js
        |                              |
   Generate Token A                    |
        |                              |
   Call sendInvitation() ------>       |
   (Token A passed)                    |
        |                         Use Token A (passed in)
        |                              |
        |                         Send email with Token A
        |                              |
   Save Token A to DB                  |
        |                              |
   
Result: Email has Token A, DB has Token A = MATCH!
```

## WHY IT HAPPENED:
- The `invitationService.sendInvitation()` function was designed to accept an optional token
- If no token was provided, it would generate its own
- The routes code was generating a token but not passing it
- This created two different tokens for the same invitation

## THE COMPLETE FIX:
We updated 3 places in routes/invitations.js:
1. Line 465: Pass token to main invitation endpoint
2. Line 524: Pass token in fallback/development mode
3. Line 135: Pass token in the simple /send endpoint

Now ALL invitation creation flows use the same token for both email and database!