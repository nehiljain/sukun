import logging
import os

import stripe
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpResponse
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from user_org.models import AppUser, Membership, Organization, Workspace

logger = logging.getLogger(__name__)


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


@csrf_exempt
def stripe_webhook_handler(request):
    logger.info("Stripe webhook received")
    if request.method != "POST":
        return HttpResponse(status=405)  # Method Not Allowed

    webhook_secret = os.environ.get("WEBHOOK_SIGNING_SECRET")
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    event = None

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as e:
        logger.error(f"Invalid payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {str(e)}")
        return HttpResponse(status=400)

    data = event.data
    event_type = event.type
    logger.info(f"Processing event type: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            # First payment is successful and subscription created
            session = stripe.checkout.Session.retrieve(
                data.object.id, expand=["line_items"]
            )

            # Log the session data for debugging
            logger.info(f"Session data for {event_type}: {session}")

            # Safely get customer_id with validation
            customer_id = session.get("customer")
            if not customer_id:
                # then check customer_details["email"]
                customer_email = session.get("customer_details", {}).get("email")
                if customer_email:
                    logger.info(f"Found email in customer_details: {customer_email}")
                    customer_id = stripe.Customer.search(
                        query=f"email:'{customer_email}'"
                    )

                logger.error("No customer ID found in checkout session")
                return HttpResponse(
                    status=200
                )  # Still return 200 to acknowledge receipt

            # Now retrieve customer with valid ID
            customer = stripe.Customer.retrieve(customer_id)
            subscription_id = session.get("subscription")

            price_id = None
            renewal_date = None

            # Get subscription details to extract renewal date
            if subscription_id:
                subscription = stripe.Subscription.retrieve(subscription_id)
                renewal_date = subscription.get("current_period_end")

            # Safely access line items data
            line_items = session.get("line_items", {})
            if line_items and isinstance(line_items, dict) and line_items.get("data"):
                try:
                    price_id = line_items["data"][0]["price"]["id"]
                    logger.info(f"Price ID: {price_id}")
                except (IndexError, KeyError) as e:
                    logger.error(f"Error extracting price ID: {str(e)}")

            if customer.email:
                try:
                    # Find user by email
                    user = User.objects.get(email=customer.email)
                    app_user = user.appuser
                except User.DoesNotExist:
                    # Create new user if doesn't exist
                    with transaction.atomic():
                        user = User.objects.create(
                            username=customer.email.split("@")[0],
                            email=customer.email,
                            first_name=customer.name or "",
                            is_active=True,
                        )
                        user.set_password(get_random_string(length=8))
                        user.save()

                        app_user = AppUser.objects.create(
                            user=user,
                            name=customer.name or customer.email,
                            stripe_customer_id=customer_id,
                        )
                        ensure_user_has_organization(app_user)

                # Update user data and grant access
                app_user.stripe_price_id = price_id
                app_user.has_subscription_access = True

                # Store subscription renewal date if available
                if renewal_date:
                    from datetime import datetime

                    app_user.subscription_renewal_date = datetime.fromtimestamp(
                        renewal_date
                    )
                    logger.info(
                        f"Set subscription renewal date to {app_user.subscription_renewal_date}"
                    )

                app_user.save()

                logger.info(
                    f"Subscription access granted to user {app_user.user.email}"
                )
            else:
                logger.error("No customer email found in checkout session")

        elif event_type == "customer.subscription.created":
            # Handle new subscription creation
            subscription = data.object  # contains a stripe.Subscription
            customer_id = subscription.customer
            price_id = None
            renewal_date = subscription.get("current_period_end")

            # Get the price ID from the subscription items
            if (
                hasattr(subscription, "items")
                and isinstance(subscription.items, dict)
                and "data" in subscription.items
            ):
                try:
                    price_id = subscription.items["data"][0]["price"]["id"]
                    logger.info(f"Subscription created with Price ID: {price_id}")
                except (IndexError, KeyError) as e:
                    logger.error(
                        f"Error extracting price ID from subscription: {str(e)}"
                    )

            logger.info(f"Subscription: {subscription}")
            logger.info(f"Subscription items: {subscription.items}")
            logger.info(f"Price ID: {price_id}")
            logger.info(f"Subscription ID: {subscription.id}")
            logger.info(f"Customer ID: {customer_id}")

            # Alternative approach if the above doesn't work
            # Retrieve the full subscription to ensure we have all data
            try:
                # Find user by customer ID
                app_user = AppUser.objects.get(stripe_customer_id=customer_id)

                # Update user data and grant access
                if price_id:
                    app_user.stripe_price_id = price_id

                app_user.has_subscription_access = True

                # Store subscription renewal date if available
                if renewal_date:
                    from datetime import datetime

                    app_user.subscription_renewal_date = datetime.fromtimestamp(
                        renewal_date
                    )
                    logger.info(
                        f"Set subscription renewal date to {app_user.subscription_renewal_date}"
                    )

                app_user.save()
                logger.info(
                    f"Subscription access granted to user {app_user.user.email} via subscription.created event"
                )

            except AppUser.DoesNotExist:
                # If we can't find the user by customer ID, try to get customer details and find by email
                try:
                    customer = stripe.Customer.retrieve(customer_id)
                    if customer.email:
                        try:
                            user = User.objects.get(email=customer.email)
                            app_user = user.appuser

                            # Update the customer ID if it's not set
                            if not app_user.stripe_customer_id:
                                app_user.stripe_customer_id = customer_id

                            # Update subscription details
                            if price_id:
                                app_user.stripe_price_id = price_id

                            app_user.has_subscription_access = True

                            # Store subscription renewal date
                            if renewal_date:
                                from datetime import datetime

                                app_user.subscription_renewal_date = (
                                    datetime.fromtimestamp(renewal_date)
                                )

                            app_user.save()
                            logger.info(
                                f"Updated existing user {app_user.user.email} with new subscription"
                            )

                        except User.DoesNotExist:
                            logger.error(
                                f"No user found with email {customer.email} for customer ID {customer_id}"
                            )
                    else:
                        logger.error(f"No email found for customer ID {customer_id}")
                except Exception as e:
                    logger.error(f"Error retrieving customer {customer_id}: {str(e)}")

        elif event_type == "customer.subscription.deleted":
            # Revoke access to the product
            subscription = stripe.Subscription.retrieve(data.object.id)
            customer_id = subscription.customer

            try:
                app_user = AppUser.objects.get(stripe_customer_id=customer_id)
                # Revoke access
                app_user.has_subscription_access = False
                # Clear subscription renewal date
                app_user.subscription_renewal_date = None
                app_user.save()
                logger.info(
                    f"Subscription access revoked for user {app_user.user.email}"
                )
            except AppUser.DoesNotExist:
                logger.error(f"No user found with customer ID {customer_id}")
                logger.info(f"Subscription: {data.object.id}")

        elif event_type == "customer.subscription.updated":
            # Update subscription information
            subscription = stripe.Subscription.retrieve(data.object.id)
            customer_id = subscription.customer
            renewal_date = subscription.get("current_period_end")

            try:
                app_user = AppUser.objects.get(stripe_customer_id=customer_id)
                # Update renewal date
                if renewal_date:
                    from datetime import datetime

                    app_user.subscription_renewal_date = datetime.fromtimestamp(
                        renewal_date
                    )
                    app_user.save()
                    logger.info(
                        f"Updated subscription renewal date to {app_user.subscription_renewal_date} for user {app_user.user.email}"
                    )
            except AppUser.DoesNotExist:
                logger.error(f"No user found with customer ID {customer_id}")

        else:
            logger.info(f"Unhandled event type: {event_type}")

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        # We still return 200 to acknowledge receipt to Stripe

    return HttpResponse(status=200)


class SubscriptionPlansView(APIView):
    permission_classes = [IsAuthenticated]

    plan_descriptions = [
        {
            "id": "lite",
            "name": "Lite Plan",
            "price": "$89/month",
            "features": [
                "20 Videos/month",
                "2 Custom Branded Template",
                "1080p Exports",
                "3 Motion magic/video",
                "Max 1 min/video",
                "Free B-rolls and Audio",
                "No Watermark",
                "Auto Beat Sync",
                "Email support",
                "24hr response time",
            ],
            "isPopular": False,
        },
        {
            "id": "pro",
            "name": "Pro Plan",
            "price": "$199/month",
            "features": [
                "100 videos/month",
                "10 Custom Branded Templates",
                "4k Exports",
                "20 Motion magic/video",
                "API Access",
                "AI Assistant",
                "Auto - Captions",
                "Generate Storyboards",
                "AI Voiceover",
                "Background Removal",
                "Auto volume adjustment",
                "Slack support",
                "8hr response time",
            ],
            "isPopular": True,
        },
        {
            "id": "enterprise",
            "name": "Enterprise Plan",
            "price": "Contact Us",
            "features": [
                "All Pro features",
                "Custom # of Editors",
                "Higher usage limits",
                "Volume discounts",
                "Custom AI models",
                "Dedicated support",
                "Custom SLA",
            ],
            "isPopular": False,
        },
    ]

    test_plans_stripe_urls = {
        "lite": {
            "stripe_url": "https://buy.stripe.com/test_aEUcQc1iOfsC05a9AB",
            "price_id": "price_1RBdkqRw0uVSEtOs3JpI4erh",
        },
        "pro": {
            "stripe_url": "https://buy.stripe.com/test_cN2dUgf9E94e05a5km",
            "price_id": "price_1RBdVxRw0uVSEtOslYFbUgJj",
        },
        "enterprise": {
            "email": "founders@demodrive.tech",
        },
    }

    prod_plans_stripe_urls = {
        "lite": {
            "stripe_url": "https://buy.stripe.com/6oE161cTL7Ewe1W3cf",
            "price_id": "price_1RCTS1Rw0uVSEtOspRSszdzY",
        },
        "pro": {
            "stripe_url": "https://buy.stripe.com/3cs4id3jb3og6zu4gi",
            "price_id": "price_1RCoIORw0uVSEtOsCBLNA7aL",
        },
        "enterprise": {
            "email": "founders@demodrive.tech",
        },
    }

    def get(self, request):
        # Test environment plans
        selected_plans_stripe_urls = self.test_plans_stripe_urls
        if not settings.DEBUG and settings.SITE_URL == "https://app.demodrive.tech":
            selected_plans_stripe_urls = self.prod_plans_stripe_urls

        plans = []
        for plan in self.plan_descriptions:
            plans.append(
                {
                    **plan,
                    **selected_plans_stripe_urls[plan["id"]],
                }
            )
        return Response(plans)
