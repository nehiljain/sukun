# Gmail Integration Setup Guide

## Step 1: Google Cloud Console Setup

### 1.1 Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `chotu-automations`
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API" and click on it
5. Click **Enable**

### 1.2 Update OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Find your OAuth 2.0 Client ID: `<YOUR_GOOGLE_OAUTH_CLIENT_ID>`
3. Click on it to edit
4. Add these **Authorized redirect URIs**:
   - `http://localhost:8000/auth/google/callback` (for user auth)
   - `http://localhost:8000/auth/gmail/callback` (for Gmail auth)
   - `https://yourdomain.com/auth/google/callback` (production user auth)
   - `https://yourdomain.com/auth/gmail/callback` (production Gmail auth)

### 1.3 OAuth Scopes Configuration
The Gmail integration will request these scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read messages
- `https://www.googleapis.com/auth/gmail.modify` - Archive messages  
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts

## Step 2: Environment Variables

Add these to your `.env` file:

```bash
# Gmail API Integration
GMAIL_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
GMAIL_CLIENT_SECRET=<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>
GMAIL_REDIRECT_URI=http://localhost:8000/auth/gmail/callback

# Gmail Polling (no additional config needed)
```

## Step 3: Required OAuth Scopes

The Gmail integration will request these scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read messages
- `https://www.googleapis.com/auth/gmail.modify` - Archive messages
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts

## Step 4: Testing

1. Start your development server: `make dev/up`
2. Navigate to `http://localhost:8000/auth/gmail`
3. Complete OAuth flow
4. Test Gmail API endpoints

## Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#gmail)
- [Gmail API Python Client](https://github.com/googleapis/google-api-python-client)
