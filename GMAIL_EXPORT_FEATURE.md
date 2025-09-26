# Gmail Email Export Feature

This document describes the Gmail email export functionality that allows users to search and export their Gmail emails as individual JSON files.

## Overview

The Gmail export feature provides:
- **Search functionality** using Gmail's advanced search syntax
- **Complete email content** including all message parts and headers
- **Background processing** with Celery for large exports
- **Individual JSON files** for each email with full data
- **Progress tracking** with real-time updates
- **Toast notifications** for user feedback
- **Date restrictions** (emails older than 1 week are excluded)

### Enhanced Content Extraction

Based on the [Gmail API Message reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages#Message), the export now includes:

- **Full Message Parts**: All MIME parts including text/plain, text/html, and attachments
- **Complete Headers**: All email headers including custom headers
- **Message Threading**: References, In-Reply-To, and Message-ID for conversation tracking
- **Attachment Metadata**: Filename, MIME type, size, and attachment IDs
- **Sender/Recipient Details**: From, To, CC, BCC, Reply-To with parsed names
- **Message Metadata**: Size estimate, history ID, and internal timestamps

## Architecture

### Backend Components

1. **Celery Task** (`app/gmail_integration/tasks.py`)
   - `search_and_export_emails`: Main export task
   - Handles Gmail API calls and file creation
   - Provides progress updates and error handling

2. **API Endpoints** (`app/gmail_integration/views.py`)
   - `POST /api/gmail/export`: Start email export
   - `GET /api/gmail/export/status/{task_id}/`: Check export status

3. **File Storage**
   - Directory structure: `data/{user_id}/exports/{query_hash}_{timestamp}/`
   - Individual JSON files per email
   - Summary file with export metadata

### Frontend Components

1. **Export Modal** (`web/src/components/gmail/GmailExportModal.tsx`)
   - Search query input with Gmail syntax support
   - Progress tracking with real-time updates
   - Download functionality for completed exports

2. **Dashboard Integration** (`web/src/components/gmail/GmailDashboardCard.tsx`)
   - Export button in Gmail dashboard card
   - Modal trigger and state management

## Usage

### Starting an Export

1. **Connect Gmail**: Ensure Gmail is connected via the dashboard
2. **Click Export**: Click "Export Emails" button in Gmail dashboard card
3. **Enter Query**: Use Gmail search syntax (e.g., `from:example.com is:unread`)
4. **Set Limits**: Specify maximum number of emails (1-500)
5. **Start Export**: Click "Start Export" to begin background processing

### Gmail Search Syntax

The feature supports Gmail's advanced search syntax:

- `from:example.com` - Emails from specific sender
- `to:example.com` - Emails to specific recipient
- `subject:meeting` - Emails with specific subject
- `is:unread` - Unread emails
- `is:important` - Important emails
- `after:2024/01/01` - Emails after specific date
- `before:2024/12/31` - Emails before specific date
- `has:attachment` - Emails with attachments

**Note**: Emails older than 1 week are automatically excluded.

### Export Process

1. **Task Creation**: Export request creates a Celery background task
2. **Gmail API Call**: Task fetches emails using Gmail API
3. **File Creation**: Each email saved as individual JSON file
4. **Progress Updates**: Real-time progress via polling
5. **Completion**: Toast notification and download option

### File Structure

```
data/
└── {user_id}/
    └── exports/
        └── {query_hash}_{timestamp}/
            ├── {message_id_1}.json
            ├── {message_id_2}.json
            ├── ...
            └── export_summary.json
```

### JSON File Format

Each email JSON file contains comprehensive email data:

```json
{
  "export_metadata": {
    "export_id": "uuid",
    "exported_at": "2024-01-01T10:00:00Z",
    "search_query": "is:inbox",
    "enhanced_query": "is:inbox after:2024/01/01",
    "user_id": 123,
    "user_email": "user@example.com",
    "export_dir": "data/123/exports/abc123_20240101_100000"
  },
  "email_data": {
    "message_id": "gmail_message_id",
    "thread_id": "gmail_thread_id",
    "subject": "Email Subject",
    "snippet": "Email preview...",
    "labels": ["INBOX", "UNREAD"],
    "received_at": "2024-01-01T10:00:00Z",
    "is_important": false,
    "is_archived": false,
    "size_estimate": 12345,
    "history_id": "123456789",
    
    "sender": "sender@example.com",
    "sender_name": "John Doe",
    "to": "recipient@example.com",
    "cc": "cc@example.com",
    "bcc": "bcc@example.com",
    "reply_to": "noreply@example.com",
    
    "message_id_header": "<message-id@example.com>",
    "references": "<ref1@example.com> <ref2@example.com>",
    "in_reply_to": "<parent@example.com>",
    "date": "Mon, 1 Jan 2024 10:00:00 +0000",
    
    "raw_headers": [
      {"name": "From", "value": "John Doe <sender@example.com>"},
      {"name": "To", "value": "recipient@example.com"},
      {"name": "Subject", "value": "Email Subject"},
      {"name": "Date", "value": "Mon, 1 Jan 2024 10:00:00 +0000"}
    ],
    
    "full_content": {
      "text_plain": "Plain text version of the email...",
      "text_html": "<html><body>HTML version of the email...</body></html>",
      "attachments": [
        {
          "filename": "document.pdf",
          "mime_type": "application/pdf",
          "size": 1024000,
          "attachment_id": "attachment_id_123",
          "part_id": "1.2"
        }
      ],
      "parts": [
        {
          "part_id": "0",
          "mime_type": "multipart/alternative",
          "filename": "",
          "headers": [],
          "body_size": 0,
          "content": ""
        },
        {
          "part_id": "1",
          "mime_type": "text/plain",
          "filename": "",
          "headers": [],
          "body_size": 500,
          "content": "Plain text content..."
        },
        {
          "part_id": "2",
          "mime_type": "text/html",
          "filename": "",
          "headers": [],
          "body_size": 1000,
          "content": "<html><body>HTML content...</body></html>"
        }
      ]
    }
  }
}
```

## API Reference

### Start Export

```http
POST /api/gmail/export
Content-Type: application/json
Authorization: Token <your-token>

{
  "search_query": "is:inbox from:example.com",
  "max_results": 100
}
```

**Response:**
```json
{
  "message": "Email export started successfully",
  "task_id": "celery-task-id",
  "export_id": "export-uuid",
  "search_query": "is:inbox from:example.com",
  "max_results": 100,
  "status_url": "/api/gmail/export/status/celery-task-id/"
}
```

### Check Status

```http
GET /api/gmail/export/status/{task_id}/
Authorization: Token <your-token>
```

**Response (Progress):**
```json
{
  "task_id": "celery-task-id",
  "status": "PROGRESS",
  "message": "Exported 5 of 10 emails",
  "progress": 50,
  "current": 5,
  "total": 10
}
```

**Response (Success):**
```json
{
  "task_id": "celery-task-id",
  "status": "SUCCESS",
  "message": "Successfully exported 10 emails",
  "export_id": "export-uuid",
  "export_dir": "data/123/exports/abc123_20240101_100000",
  "email_count": 10,
  "files": [...],
  "summary_file": "data/123/exports/abc123_20240101_100000/export_summary.json"
}
```

## Error Handling

### Common Errors

1. **Gmail Not Connected**
   - Error: "Gmail not connected. Please connect your Gmail account first."
   - Solution: Connect Gmail via dashboard

2. **Invalid Search Query**
   - Error: "Search query is required"
   - Solution: Provide a valid search query

3. **Invalid Max Results**
   - Error: "max_results must be between 1 and 500"
   - Solution: Use valid number between 1-500

4. **Gmail API Limits**
   - Error: Gmail API rate limiting
   - Solution: Wait and retry, or reduce max_results

### Task Failures

- Tasks automatically retry up to 3 times
- Failed tasks are logged with error details
- Users receive error notifications via toast

## Security Considerations

1. **Authentication Required**: All endpoints require valid authentication
2. **User Isolation**: Users can only export their own emails
3. **File Permissions**: Export files are stored with appropriate permissions
4. **Gmail Scopes**: Uses minimal required Gmail API scopes

## Performance Considerations

1. **Background Processing**: Large exports don't block the UI
2. **Progress Updates**: Real-time progress via polling
3. **File Size**: Individual JSON files for efficient processing
4. **Rate Limiting**: Respects Gmail API limits

## Testing

Run the test script to verify functionality:

```bash
python test_gmail_export.py
```

Or test manually:

1. Start development server: `make dev/up`
2. Connect Gmail account
3. Use export feature via dashboard
4. Check `data/` directory for results

## Troubleshooting

### Common Issues

1. **Export Not Starting**
   - Check Gmail connection status
   - Verify Celery worker is running
   - Check server logs for errors

2. **Progress Not Updating**
   - Check browser console for errors
   - Verify polling is working
   - Check task status endpoint

3. **Files Not Created**
   - Check file permissions
   - Verify data directory exists
   - Check Celery worker logs

4. **Gmail API Errors**
   - Check Gmail token validity
   - Verify API quotas
   - Check Gmail service status

### Debug Mode

Enable debug logging:

```python
# In settings.py
LOGGING = {
    'loggers': {
        'gmail_integration': {
            'level': 'DEBUG',
        }
    }
}
```

## Future Enhancements

1. **ZIP Downloads**: Create zip files for easy download
2. **Email Filters**: Additional filtering options
3. **Scheduled Exports**: Recurring export jobs
4. **Export History**: Track previous exports
5. **Cloud Storage**: Store exports in S3/GCS
6. **Email Attachments**: Include attachment metadata
7. **Advanced Search**: UI for building complex queries
