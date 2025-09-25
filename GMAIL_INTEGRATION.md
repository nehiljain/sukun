# Gmail Integration - Complete Setup & Implementation Guide

## Overview

This guide covers the complete Gmail integration implementation for the Gestral application, including setup, configuration, and usage instructions.

## ✅ What's Been Implemented

### Backend (Django)
1. **Gmail Integration App** (`app/gmail_integration/`)
   - Models: `GmailToken`, `GmailMessage`
   - Services: `GmailService` for API interactions
   - Views: OAuth flow, message management, archiving, drafts
   - URLs: Complete API endpoint structure

2. **API Endpoints**
   - `GET /auth/gmail` - Initiate Gmail OAuth
   - `GET /auth/gmail/callback` - Handle OAuth callback
   - `GET /api/gmail/messages` - Get messages with query support
   - `POST /api/gmail/messages/{id}/archive` - Archive message
   - `POST /api/gmail/messages/{id}/important` - Mark as important
   - `POST /api/gmail/drafts` - Create draft

3. **Database Models**
   - `GmailToken`: Stores OAuth tokens per user
   - `GmailMessage`: Caches messages for performance

### Frontend (React)
1. **Components**
   - `GmailConnect`: OAuth connection component
   - `GmailMessages`: Message list with actions
   - `GmailDashboard`: Main dashboard page

2. **Features**
   - Gmail OAuth flow
   - Message listing with search
   - Archive/Unarchive messages
   - Mark as important/unimportant
   - Create drafts
   - Real-time updates

## 🔧 Setup Steps Required

### Step 1: Google Cloud Console Setup

#### 1.1 Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `chotu-automations`
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API" and click on it
5. Click **Enable**

#### 1.2 Update OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Find your OAuth 2.0 Client ID: `<YOUR_GOOGLE_OAUTH_CLIENT_ID>`
3. Click on it to edit
4. Add these **Authorized redirect URIs**:
   - `http://localhost:8000/auth/google/callback` (for user auth)
   - `http://localhost:8000/auth/gmail/callback` (for Gmail auth)
   - `https://yourdomain.com/auth/google/callback` (production user auth)
   - `https://yourdomain.com/auth/gmail/callback` (production Gmail auth)

#### 1.3 OAuth Scopes Configuration
The Gmail integration will request these scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read messages
- `https://www.googleapis.com/auth/gmail.modify` - Archive messages  
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts

### Step 2: Environment Variables

Add these to your `.env` file:

```bash
# Gmail API Integration
GMAIL_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
GMAIL_CLIENT_SECRET=<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>
GMAIL_REDIRECT_URI=http://localhost:8000/auth/gmail/callback
```

### Step 3: Install Dependencies

The required dependencies are already included in `pyproject.toml`:
- `google-api-python-client>=2.183.0`
- `google-auth>=2.38.0`

To install:
```bash
# Install new Python dependencies
uv sync

# Or if using pip
pip install google-api-python-client google-auth
```

### Step 4: Database Migration

```bash
# Run migrations
python app/manage.py makemigrations gmail_integration
python app/manage.py migrate
```

### Step 5: Start Development Server

```bash
# Start backend
make dev/up

# Start frontend (in another terminal)
make fe/dev
```

## 🚀 Testing the Integration

### Happy Path Flow
1. **Connect Gmail**: Visit `http://localhost:8000/auth/gmail`
2. **OAuth Flow**: Complete OAuth authentication
3. **View Messages**: Access `http://localhost:8000/api/gmail/messages`
4. **Archive**: Use archive endpoint to archive messages
5. **Mark Important**: Use important endpoint to mark messages
6. **Create Draft**: Use drafts endpoint to create drafts

### API Testing

#### Get Messages
```bash
# Get inbox messages
curl "http://localhost:8000/api/gmail/messages?q=is:inbox"

# Get messages with authentication (requires login)
curl -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:8000/api/gmail/messages?q=is:inbox"
```

#### Archive a Message
```bash
curl -X POST "http://localhost:8000/api/gmail/messages/MESSAGE_ID/archive" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create a Draft
```bash
curl -X POST "http://localhost:8000/api/gmail/drafts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"to":"test@example.com","subject":"Test","body":"Hello"}'
```

#### Mark as Important
```bash
curl -X POST "http://localhost:8000/api/gmail/messages/MESSAGE_ID/important" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"important": true}'
```

## 📁 File Structure

```
app/gmail_integration/
├── __init__.py
├── apps.py
├── models.py
├── serializers.py
├── services.py
├── views.py
├── urls.py
└── migrations/
    ├── __init__.py
    ├── 0001_initial.py
    └── 0002_rename_gmail_messages_user_important_idx_gmail_messa_user_id_6ef690_idx_and_more.py

web/src/
├── components/gmail/
│   ├── GmailConnect.tsx
│   └── GmailMessages.tsx
└── pages/
    └── gmail-dashboard.tsx
```

## 🔍 OAuth Scopes Used

- `https://www.googleapis.com/auth/gmail.readonly` - Read messages
- `https://www.googleapis.com/auth/gmail.modify` - Archive messages
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts

## 🎯 Quick Start Checklist

1. **Complete Google Cloud Setup** (5 minutes)
   - [ ] Enable Gmail API
   - [ ] Update OAuth 2.0 credentials with redirect URIs
   
2. **Add Environment Variables** (2 minutes)
   - [ ] Add GMAIL_CLIENT_ID to .env
   - [ ] Add GMAIL_CLIENT_SECRET to .env
   - [ ] Add GMAIL_REDIRECT_URI to .env
   
3. **Run Migrations** (1 minute)
   - [ ] Run `python app/manage.py migrate`
   
4. **Test Integration** (10 minutes)
   - [ ] Start development server
   - [ ] Test OAuth flow
   - [ ] Test API endpoints

## 🐛 Troubleshooting

### Common Issues

1. **"Gmail not connected"**: 
   - Check OAuth redirect URIs in Google Cloud Console
   - Verify GMAIL_REDIRECT_URI matches exactly

2. **"Token exchange failed"**: 
   - Verify GMAIL_CLIENT_SECRET is correct
   - Check that Gmail API is enabled

3. **"No messages found"**: 
   - Check Gmail API is enabled in Google Cloud Console
   - Verify OAuth scopes are correct

4. **CORS errors**: 
   - Ensure frontend is running on correct port
   - Check CORS settings in Django

5. **"Authentication required"**: 
   - This is expected behavior for protected endpoints
   - Complete OAuth flow first

### Debug Commands

```bash
# Check Django logs
docker logs sukun-web-1

# Check if Gmail API is accessible
curl "https://gmail.googleapis.com/gmail/v1/users/me/profile"

# Test Gmail service import
docker exec sukun-web-1 bash -c "cd /app && python manage.py shell -c 'from gmail_integration.services import GmailService; print(\"Gmail service imported successfully\")'"

# Check environment variables
docker exec sukun-web-1 bash -c "cd /app && python manage.py shell -c 'import os; print(\"GMAIL_CLIENT_ID:\", os.getenv(\"GMAIL_CLIENT_ID\", \"NOT_SET\"))'"
```

### Verification Steps

1. **Check Dependencies**:
   ```bash
   docker exec sukun-web-1 bash -c "python -c 'import google.auth; import googleapiclient; print(\"Google API libraries installed\")'"
   ```

2. **Check Database**:
   ```bash
   docker exec sukun-web-1 bash -c "cd /app && python manage.py showmigrations gmail_integration"
   ```

3. **Check Endpoints**:
   ```bash
   curl -v "http://localhost:8000/api/gmail/messages"
   # Should return 302 redirect (authentication required)
   ```

## 📚 Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#gmail)
- [Gmail API Python Client](https://github.com/googleapis/google-api-python-client)
- [Django REST Framework](https://www.django-rest-framework.org/)

## 🔄 Current Status

✅ **Google API client**: Installed and working  
✅ **Gmail integration**: Fully functional  
✅ **Docker containers**: Running properly  
✅ **Database**: Migrations applied  
✅ **Environment variables**: Configured correctly  
✅ **API endpoints**: Responding correctly  

**The Gmail integration is ready to use!** 🎉

---

*Last updated: September 2025*
