from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizationViewSet,
    UpdateAnonymousSessionEmailView,
    WorkspaceViewSet,
)
from .views_users import (
    ResendVerificationView,
    TokenView,
    UserInfoAPIView,
    UserOnboardingView,
    VerifyEmailView,
)

from .views_subscriptions import SubscriptionPlansView, stripe_webhook_handler

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspaces")
router.register(r"organizations", OrganizationViewSet, basename="organizations")
urlpatterns = [
    path("api/", include(router.urls)),
        path("api/webhook/stripe/", stripe_webhook_handler, name="stripe-webhook"),
    path(
        "api/subscription-plans/",
        SubscriptionPlansView.as_view(),
        name="subscription-plans",
    ),
    path(
        "api/anonymous-session/update-email/",
        UpdateAnonymousSessionEmailView.as_view(),
        name="update-anonymous-session-email",
    ),
    # User management URLs
    path("api/users", UserInfoAPIView.as_view(), name="user_info"),
    path("api/tokens/", TokenView.as_view(), name="token_view"),
    path("api/verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("api/users/onboarding/", UserOnboardingView.as_view(), name="user_onboarding"),
    path(
        "api/users/resend-verification/",
        ResendVerificationView.as_view(),
        name="resend_verification",
    ),
]
