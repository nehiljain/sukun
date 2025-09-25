import logging
import os
import uuid
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from user_org.models import AppUser

from .models import GmailToken
from .serializers import GmailDraftSerializer, GmailMessageSerializer
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
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Gmail-specific scopes
        scope = " ".join(
            [
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.compose",
            ]
        )

        state = uuid.uuid4().hex.upper()[0:15]
        # Create a temporary token to store user info instead of relying on session
        from .models import GmailOAuthState

        # Get the AppUser instance for the authenticated user
        try:
            app_user = AppUser.objects.get(user=request.user)
        except AppUser.DoesNotExist:
            logger.error(f"AppUser not found for user {request.user.id}")
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store the OAuth state with user info in database
        GmailOAuthState.objects.create(
            state=state,
            user=app_user,
            expires_at=timezone.now() + timedelta(minutes=10),  # 10 minute expiry
        )

        logger.info(
            f"Gmail auth initiated - state: {state}, app_user_id: {app_user.id}"
        )

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


def gmail_callback(request):
    """Handle Gmail OAuth callback"""
    code = request.GET.get("code")
    state = request.GET.get("state")

    if not code:
        logger.error("No authorization code received from Gmail OAuth")
        return redirect(
            "/dashboard?error=gmail_auth_failed&message=No authorization code received"
        )

    # Verify state using database instead of session
    from .models import GmailOAuthState

    try:
        oauth_state = GmailOAuthState.objects.get(state=state)
        app_user = oauth_state.user

        # Check if state has expired (use timezone-aware datetime)
        if oauth_state.expires_at < timezone.now():
            logger.error(f"OAuth state expired: {state}")
            oauth_state.delete()
            return redirect(
                "/dashboard?error=gmail_auth_failed&message=Authentication expired, please try again"
            )

        logger.info(
            f"Gmail callback - valid state: {state}, app_user_id: {app_user.id}"
        )

    except GmailOAuthState.DoesNotExist:
        logger.error(f"Invalid OAuth state: {state}")
        return redirect(
            "/dashboard?error=gmail_auth_failed&message=Invalid authentication state"
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
            return redirect(
                "/dashboard?error=gmail_auth_failed&message=Token exchange failed"
            )

        # Use the app_user from the OAuth state
        logger.info(f"Gmail callback - found user: {app_user.user.email}")

        # Store Gmail tokens
        expires_at = timezone.now() + timedelta(
            seconds=token_data.get("expires_in", 3600)
        )

        GmailToken.objects.update_or_create(
            user=app_user,
            defaults={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", ""),
                "token_expires_at": expires_at,
            },
        )

        # Clear OAuth state from database
        oauth_state.delete()  # Remove the OAuth state record

        return redirect("/dashboard?gmail_connected=true")

    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        return redirect(
            "/dashboard?error=gmail_auth_failed&message=Gmail connection failed"
        )


class GmailMessagesView(APIView):
    """Get Gmail messages"""

    @method_decorator(login_required)
    def get(self, request):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)

            # Get query parameters
            query = request.GET.get("q", "is:inbox")
            max_results = int(request.GET.get("max_results", 50))

            # Get messages from Gmail
            messages = gmail_service.get_messages(query=query, max_results=max_results)

            # Serialize and return
            serializer = GmailMessageSerializer(messages, many=True)
            return Response({"messages": serializer.data, "count": len(messages)})

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error getting Gmail messages: {e}")
            return Response(
                {"error": "Failed to fetch messages"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GmailTestView(APIView):
    """Test Gmail connection and show recent emails"""

    @method_decorator(login_required)
    def get(self, request):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)

            # Get the 5 most recent emails from inbox
            messages = gmail_service.get_messages(query="is:actionable", max_results=5)
            
            # Format for easy reading
            formatted_messages = []
            for msg in messages:
                formatted_messages.append({
                    "subject": msg["subject"],
                    "sender": msg["sender"],
                    "snippet": msg["snippet"][:100] + "..." if len(msg["snippet"]) > 100 else msg["snippet"],
                    "received_at": msg["received_at"].strftime("%Y-%m-%d %H:%M:%S"),
                    "is_important": msg["is_important"]
                })

            return Response({
                "status": "success",
                "user_email": app_user.user.email,
                "message_count": len(formatted_messages),
                "recent_emails": formatted_messages
            })

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error testing Gmail connection: {e}")
            return Response(
                {"error": f"Failed to test Gmail connection: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GmailStatusView(APIView):
    """Check Gmail connection status"""

    @method_decorator(login_required)
    def get(self, request):
        try:
            app_user = AppUser.objects.get(user=request.user)

            # Check if user has Gmail token
            try:
                gmail_token = GmailToken.objects.get(user=app_user)
                return Response(
                    {
                        "connected": True,
                        "connected_at": gmail_token.created_at,
                        "expires_at": gmail_token.token_expires_at,
                    }
                )
            except GmailToken.DoesNotExist:
                return Response(
                    {"connected": False, "connected_at": None, "expires_at": None}
                )

        except AppUser.DoesNotExist:
            return Response(
                {"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error checking Gmail status: {e}")
            return Response(
                {"error": "Failed to check Gmail status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error archiving message: {e}")
            return Response(
                {"error": "Failed to archive message"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                    {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )

            data = serializer.validated_data
            draft = gmail_service.create_draft(
                to=data["to"],
                subject=data["subject"],
                body=data["body"],
                thread_id=data.get("thread_id"),
            )

            return Response(
                {"message": "Draft created successfully", "draft_id": draft["id"]}
            )

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating draft: {e}")
            return Response(
                {"error": "Failed to create draft"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GmailImportantView(APIView):
    """Mark message as important/not important"""

    @method_decorator(login_required)
    def post(self, request, message_id):
        try:
            app_user = AppUser.objects.get(user=request.user)
            gmail_service = GmailService(app_user)

            important = request.data.get("important", True)
            success = gmail_service.mark_important(message_id, important)

            if success:
                status_text = (
                    "marked as important" if important else "unmarked as important"
                )
                return Response({"message": f"Message {status_text}"})
            else:
                return Response(
                    {"error": "Failed to update message importance"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating message importance: {e}")
            return Response(
                {"error": "Failed to update message importance"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
