import logging
import os
import uuid

import requests
import stripe
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import redirect
from django.utils.crypto import get_random_string
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from user_org.models import AppUser, Membership, Organization, Workspace

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")


def ensure_user_has_organization(app_user):
    # First check if the user is an AppUser

    # if not hasattr(user, 'appuser'):
    #     print("returning None")
    #     return None

    # Check if user has any organization where they are an owner
    has_org = Membership.objects.filter(user=app_user, role="owner").exists()

    if not has_org:
        # Create new organization for user
        org = Organization.objects.create(
            name=f"{app_user.name}'s Org", created_by=app_user
        )
        app_user.active_org = org
        app_user.save()
        # Add the user as an owner
        Membership.objects.create(user=app_user, organization=org, role="owner")
        # Create default project
        Workspace.objects.create(
            name="Default Project", organization=org, user=app_user
        )
        return org
    return None


def ensure_user_is_stripe_customer(app_user):
    if not app_user.stripe_customer_id:
        # Create a new Stripe customer
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        customer = stripe.Customer.create(email=app_user.user.email)
        app_user.stripe_customer_id = customer.id
        app_user.save()
    return app_user.stripe_customer_id


def app_logout(request):
    logout(request)
    return redirect("/")


def google_auth(request):
    """
    Initiate Google OAuth2 authentication flow
    """
    if os.environ.get("ENVIRONMENT") == "local":
        logger.info("Env set to local")
        user = User.objects.filter(is_staff=False).first()
        if user:
            request.user = user
            login(request, request.user)
            return redirect("/dashboard")
        else:
            logger.error("No non-staff user found for local development")
            return redirect("/")

    if not request.user.is_authenticated:
        scope = "email profile"
        state = uuid.uuid4().hex.upper()[0:15]
        url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&scope={scope}&redirect_uri={GOOGLE_REDIRECT_URI}&client_id={GOOGLE_CLIENT_ID}&state={state}"
        return redirect(url)

    return redirect("/dashboard")


def google_callback(request):
    code = request.GET.get("code")

    if code is None:
        logger.error("No code received from Google OAuth")
        return redirect("/#?error=state_mismatch")

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    try:
        res = requests.post(token_url, data=payload)
        token_data = res.json()

        if "error" in token_data:
            logger.error(f"Error in token response: {token_data}")
            return redirect("/#?error=token_error")

        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            token_data["id_token"], google_requests.Request(), GOOGLE_CLIENT_ID
        )

        # Get user info
        email = idinfo["email"]
        name = idinfo.get("name", "")
        profile_url = idinfo.get("picture", "")

        logger.info(f"Received user info - email: {email}, name: {name}")

        # Create or get user
        try:
            user = User.objects.get(email=email)
            logger.info(f"Found existing user with email {email}")
        except User.DoesNotExist:
            username = email.split("@")[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            logger.info(f"Creating new user with username: {username}, email: {email}")
            try:
                with transaction.atomic():
                    user = User.objects.create(
                        username=username, email=email, first_name=name, is_active=True
                    )
                    user.set_password(get_random_string(length=8))
                    user.save()
                    logger.info(f"Created new user: {user}")

                    app_user = AppUser.objects.create(
                        user=user,
                        name=name,
                        profile_url=profile_url,
                    )
                    logger.info(f"Created new AppUser {app_user}")
                    ensure_user_has_organization(app_user)
            except Exception as e:
                logger.exception(f"Error creating user and app_user: {str(e)}")
                return redirect("/#?error=user_creation_failed")

        # Get or create AppUser if it doesn't exist
        app_user, app_user_created = AppUser.objects.get_or_create(
            user=user,
            defaults={
                "name": name,
                "profile_url": profile_url,
            },
        )

        app_user.auth_token = {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "id_token": token_data["id_token"],
        }
        app_user.save()

        login(request, user)

        # Send verification email if user is not verified
        if not app_user.is_email_verified:
            try:
                # Import here to avoid circular imports
                from user_org.views_users import send_verification_email

                send_verification_email(request)
            except Exception as e:
                logger.error(f"Error sending verification email: {str(e)}")

        # Check if this is a new user or needs onboarding
        if user_needs_onboarding(app_user):
            login(request, user)
            return redirect("/onboarding")
        else:
            login(request, user)
            return redirect("/dashboard")

    except Exception as e:
        logger.error(f"Google authentication error: {str(e)}", exc_info=True)
        return redirect("/#?error=authentication_failed")


# Helper function to check if user needs onboarding
def user_needs_onboarding(app_user):
    """Check if a user needs to complete the onboarding flow"""
    # User needs onboarding if company_role or usage_reason is not set
    return (
        not app_user.company_role
        or not app_user.usage_reason
        or not app_user.is_email_verified
    )
