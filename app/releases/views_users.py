import logging
import os
import uuid

import stripe
from django.conf import settings
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_not_required, login_required
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from releases.models import AppUser
from releases.permissions import IsAppUser
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tasks import send_user_sign_up_email


class UserSerializers(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = "__all__"


logger = logging.getLogger(__name__)


class UserInfoAPIView(APIView):
    permission_classes = (
        IsAuthenticated,
        IsAppUser,
    )

    def delete(self, request):
        user = request.user
        user.delete()
        logout(request)
        return Response(
            {"message": "Account deleted successfully"}, status=status.HTTP_200_OK
        )

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Not authenticated"}, status=401)

        app_user = request.user.appuser

        # Get organizations and their projects
        organizations = app_user.organizations.all()
        org_projects = []
        for org in organizations:
            org_projects.append(
                {
                    "organization_id": org.id,
                    "organization_name": org.name,
                    "projects": list(org.projects.values("id", "name")),
                }
            )

        # get total repositories synced, get total blogs watched for this user
        permissions = list(request.user.get_all_permissions())
        return Response(
            status=status.HTTP_200_OK,
            data={
                "name": app_user.name,
                "email": app_user.user.email,
                "profile_image_url": app_user.profile_url,
                "date_joined": app_user.user.date_joined,
                "active_org": app_user.active_org.id if app_user.active_org else None,
                "permissions": permissions,
                "is_staff": app_user.user.is_staff,
                "organizations": org_projects,
                "is_email_verified": app_user.is_email_verified,
                "company_role": app_user.company_role,
                "usage_reason": app_user.usage_reason,
                "stripe_customer_id": app_user.stripe_customer_id,
                "stripe_price_id": app_user.stripe_price_id,
                "has_subscription_access": app_user.has_subscription_access,
                "subscription_renewal_date": app_user.subscription_renewal_date,
            },
        )

    def post(self, request):
        org_id = request.data.get("organization_id")
        app_user = request.user.appuser

        try:
            org = app_user.organizations.get(id=org_id)
            app_user.active_org = org
            app_user.save()
            return Response(status=status.HTTP_200_OK)
        except app_user.organizations.model.DoesNotExist:
            return Response(
                {"error": "Organization not found or you don't have access to it"},
                status=status.HTTP_404_NOT_FOUND,
            )


class TokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tokens = Token.objects.filter(user=request.user)
        return Response(
            [{"key": token.key, "created": token.created} for token in tokens]
        )

    def post(self, request):
        token = Token.objects.create(user=request.user)
        return Response({"key": token.key}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        key = request.data.get("key")
        if not key:
            return Response(
                {"error": "Token key is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = Token.objects.get(user=request.user, key=key)
            token.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Token.DoesNotExist:
            return Response(
                {"error": "Token not found"}, status=status.HTTP_404_NOT_FOUND
            )


def send_verification_email(request):
    """Send verification email to the user"""
    user = request.user
    app_user = AppUser.objects.get(user=user)

    # Generate a verification token
    verification_token = uuid.uuid4().hex
    app_user.verification_token = verification_token
    app_user.save()

    # Prepare verification link
    verification_url = f"{settings.SITE_URL}/verify-email?token={verification_token}"

    send_user_sign_up_email.delay(user.id, verification_url)


@method_decorator(login_required, name="dispatch")
class UserOnboardingView(APIView):
    @csrf_exempt
    def post(self, request):
        """Update user onboarding information"""
        try:
            user = request.user
            app_user = AppUser.objects.get(user=user)

            # Update user information
            if "name" in request.data:
                app_user.name = request.data["name"]
                user.first_name = request.data["name"]
                user.save()

            if "company_role" in request.data:
                app_user.company_role = request.data["company_role"]

            if "usage_reason" in request.data:
                app_user.usage_reason = request.data["usage_reason"]

            app_user.save()

            # Send verification email if not already verified
            if not app_user.is_email_verified:
                # Send verification email if not verified or if last email was sent more than 24 hours ago
                should_send = True
                if app_user.verification_sent_at:
                    time_since_last_email = (
                        timezone.now() - app_user.verification_sent_at
                    )
                    if (
                        time_since_last_email.total_seconds() < 86400
                    ):  # 24 hours in seconds
                        should_send = False

                if should_send:
                    send_verification_email(request)

            return Response({"success": True}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error updating user information: {str(e)}")
            return Response(
                {"error": "Failed to update user information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(login_required, name="dispatch")
class ResendVerificationView(APIView):
    @csrf_exempt
    def post(self, request):
        """Resend verification email"""
        try:
            if send_verification_email(request):
                return Response({"success": True}, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": "Failed to send verification email"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            logger.error(f"Error resending verification email: {str(e)}")
            return Response(
                {"error": "Failed to resend verification email"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(login_not_required, name="dispatch")
class VerifyEmailView(APIView):
    def get(self, request):
        """Verify user email with the token"""
        logger.info(f"Verifying email for token: {request.GET.get('token')}")
        token = request.GET.get("token")

        if not token:
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            app_user = AppUser.objects.get(verification_token=token)
            app_user.is_email_verified = True
            app_user.verification_token = None
            app_user.save()
            # create stripe customer if not exists
            if not app_user.stripe_customer_id:
                stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
                customer = stripe.Customer.create(email=app_user.user.email)
                app_user.stripe_customer_id = customer.id
                app_user.save()

            return Response({"success": True}, status=status.HTTP_200_OK)
        except AppUser.DoesNotExist:
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error verifying email: {str(e)}")
            return Response(
                {"error": "Verification failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
