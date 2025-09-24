import logging
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from user_org.models import AppUser
from .models import GmailToken, GmailMessage

logger = logging.getLogger(__name__)

# Gmail API scopes
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
]


class GmailService:
    """Service class for Gmail API operations"""
    
    def __init__(self, user: AppUser):
        self.user = user
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Gmail API service with user's credentials"""
        try:
            gmail_token = GmailToken.objects.get(user=self.user)
            
            creds = Credentials(
                token=gmail_token.access_token,
                refresh_token=gmail_token.refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=os.getenv('GMAIL_CLIENT_ID'),
                client_secret=os.getenv('GMAIL_CLIENT_SECRET'),
                scopes=GMAIL_SCOPES
            )
            
            # Refresh token if needed
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                # Update stored token
                gmail_token.access_token = creds.token
                gmail_token.token_expires_at = creds.expiry
                gmail_token.save()
            
            self.service = build('gmail', 'v1', credentials=creds)
            
        except GmailToken.DoesNotExist:
            logger.error(f"No Gmail token found for user {self.user}")
            raise ValueError("Gmail not connected for this user")
        except Exception as e:
            logger.error(f"Error initializing Gmail service: {e}")
            raise
    
    def get_messages(self, query: str = "is:inbox", max_results: int = 50) -> List[Dict]:
        """Get messages from Gmail"""
        try:
            # Get message list
            results = self.service.users().messages().list(
                userId='me', 
                q=query, 
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            detailed_messages = []
            
            for message in messages:
                # Get full message details
                msg_detail = self.service.users().messages().get(
                    userId='me', 
                    id=message['id']
                ).execute()
                
                # Extract relevant information
                headers = msg_detail['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
                
                # Parse sender email
                sender_email = sender.split('<')[-1].split('>')[0].strip() if '<' in sender else sender
                
                message_data = {
                    'message_id': message['id'],
                    'thread_id': message['threadId'],
                    'subject': subject,
                    'sender': sender_email,
                    'snippet': msg_detail.get('snippet', ''),
                    'labels': msg_detail.get('labelIds', []),
                    'received_at': datetime.fromtimestamp(
                        int(msg_detail['internalDate']) / 1000
                    ),
                    'is_important': 'IMPORTANT' in msg_detail.get('labelIds', []),
                    'is_archived': 'INBOX' not in msg_detail.get('labelIds', [])
                }
                
                detailed_messages.append(message_data)
                
                # Cache message in database
                GmailMessage.objects.update_or_create(
                    user=self.user,
                    message_id=message['id'],
                    defaults=message_data
                )
            
            return detailed_messages
            
        except HttpError as e:
            logger.error(f"Gmail API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            raise
    
    def archive_message(self, message_id: str) -> bool:
        """Archive a message by removing INBOX label"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['INBOX']}
            ).execute()
            
            # Update local cache
            GmailMessage.objects.filter(
                user=self.user, 
                message_id=message_id
            ).update(is_archived=True)
            
            return True
            
        except HttpError as e:
            logger.error(f"Error archiving message {message_id}: {e}")
            return False
    
    def create_draft(self, to: str, subject: str, body: str, thread_id: str = None) -> Dict:
        """Create a draft message"""
        try:
            # Create message
            message = {
                'raw': self._create_message_raw(to, subject, body, thread_id)
            }
            
            if thread_id:
                message['threadId'] = thread_id
            
            # Create draft
            draft = self.service.users().drafts().create(
                userId='me',
                body={'message': message}
            ).execute()
            
            return {
                'id': draft['id'],
                'message': draft['message'],
                'created': True
            }
            
        except HttpError as e:
            logger.error(f"Error creating draft: {e}")
            raise
    
    def _create_message_raw(self, to: str, subject: str, body: str, thread_id: str = None) -> str:
        """Create raw message string for Gmail API"""
        import base64
        import email.mime.text
        
        message = email.mime.text.MIMEText(body)
        message['to'] = to
        message['subject'] = subject
        
        if thread_id:
            message['In-Reply-To'] = thread_id
            message['References'] = thread_id
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return raw
    
    def mark_important(self, message_id: str, important: bool = True) -> bool:
        """Mark message as important or not important"""
        try:
            if important:
                self.service.users().messages().modify(
                    userId='me',
                    id=message_id,
                    body={'addLabelIds': ['IMPORTANT']}
                ).execute()
            else:
                self.service.users().messages().modify(
                    userId='me',
                    id=message_id,
                    body={'removeLabelIds': ['IMPORTANT']}
                ).execute()
            
            # Update local cache
            GmailMessage.objects.filter(
                user=self.user, 
                message_id=message_id
            ).update(is_important=important)
            
            return True
            
        except HttpError as e:
            logger.error(f"Error marking message {message_id} as important: {e}")
            return False
