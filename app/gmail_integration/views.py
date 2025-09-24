import logging
import os
import uuid
from datetime import datetime, timedelta

from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from user_org.models import AppUser
from .models import GmailToken
from .serializers import GmailMessageSerializer, GmailDraftSerializer
from .services import GmailService

logger = logging.getLogger(__name__)

# Gmail OAuth configuration
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI")


class GmailAuthView(APIView):
    """Initiate Gmail OAuth flow"""
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Gmail-specific scopes
        scope = " ".join([
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify", 
            "https://www.googleapis.com/auth/gmail.compose"
        ])
        
        state = uuid.uuid4().hex.upper()[0:15]
        request.session['gmail_oauth_state'] = state
        
        url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"response_type=code&"
            f"scope={scope}&"
            f"redirect_uri={GMAIL_REDIRECT_URI}&"
            f"client_id={GMAIL_CLIENT_ID}&"
            f"state={state}&"
            f"access_type=offline&"
            f"prompt=consent"
        )
        
        return redirect(url)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gmail_callback(request):
    """Handle Gmail OAuth callback"""
    code = request.GET.get("code")
    state = request.GET.get("state")
    
    if not code:
        return Response(
            {"error": "No authorization code received"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify state
    if state != request.session.get('gmail_oauth_state'):
        return Response(
            {"error": "Invalid state parameter"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        import requests
        
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": GMAIL_CLIENT_ID,
            "client_secret": GMAIL_CLIENT_SECRET,
            "redirect_uri": GMAIL_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        response = requests.post(token_url, data=payload)
        token_data = response.json()
        
        if "error" in token_data:
            logger.error(f"Token exchange error: {token_data}")
            return Response(
                {"error": "Token exchange failed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's AppUser instance
        app_user = AppUser.objects.get(user=request.user)
        
        # Store Gmail tokens
        expires_at = datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))
        
        GmailToken.objects.update_or_create(
            user=app_user,
            defaults={
                'access_token': token_data['access_token'],
                'refresh_token': token_data.get('refresh_token', ''),
                'token_expires_at': expires_at
            }
        )
        
        # Clear state from session
        if 'gmail_oauth_state' in request.session:
            del request.session['gmail_oauth_state']
        
        return redirect("/dashboard?gmail_connected=true")
        
    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        return Response(
            {"error": "Gmail connection failed"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class GmailMessagesView(APIView):
    """Get Gmail messages"""
    
    @method_decorator(login_required)
    def get(self, request):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)
            
            # Get query parameters
            query = request.GET.get('q', 'is:inbox')
            max_results = int(request.GET.get('max_results', 50))
            
            # Get messages from Gmail
            messages = gmail_service.get_messages(query=query, max_results=max_results)
            
            # Serialize and return
            serializer = GmailMessageSerializer(messages, many=True)
            return Response({
                'messages': serializer.data,
                'count': len(messages)
            })
            
        except ValueError as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error getting Gmail messages: {e}")
            return Response(
                {"error": "Failed to fetch messages"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GmailArchiveView(APIView):
    """Archive Gmail message"""
    
    @method_decorator(login_required)
    def post(self, request, message_id):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)
            
            success = gmail_service.archive_message(message_id)
            
            if success:
                return Response({"message": "Message archived successfully"})
            else:
                return Response(
                    {"error": "Failed to archive message"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error archiving message: {e}")
            return Response(
                {"error": "Failed to archive message"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GmailDraftView(APIView):
    """Create Gmail draft"""
    
    @method_decorator(login_required)
    def post(self, request):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)
            
            serializer = GmailDraftSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = serializer.validated_data
            draft = gmail_service.create_draft(
                to=data['to'],
                subject=data['subject'],
                body=data['body'],
                thread_id=data.get('thread_id')
            )
            
            return Response({
                "message": "Draft created successfully",
                "draft_id": draft['id']
            })
            
        except ValueError as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating draft: {e}")
            return Response(
                {"error": "Failed to create draft"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GmailImportantView(APIView):
    """Mark message as important/not important"""
    
    @method_decorator(login_required)
    def post(self, request, message_id):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)
            
            important = request.data.get('important', True)
            success = gmail_service.mark_important(message_id, important)
            
            if success:
                status_text = "marked as important" if important else "unmarked as important"
                return Response({"message": f"Message {status_text}"})
            else:
                return Response(
                    {"error": "Failed to update message importance"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating message importance: {e}")
            return Response(
                {"error": "Failed to update message importance"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
