from django.urls import path
from releases.views_subscriptions import (
    SubscriptionPlansView,
    stripe_webhook_handler,
)
from releases.views_users import (
    ResendVerificationView,
    TokenView,
    UserInfoAPIView,
    UserOnboardingView,
    VerifyEmailView,
)

# router = DefaultRouter()
# router.register(r"products", ProductViewSet)
# router.register(
#     r"semantic-releases", SemanticReleaseViewSet, basename="semantic-release"
# )
# router.register(r"repositories", RepositoryViewSet, basename="repository")
# # router.register(r"releases", ReleaseViewSet)


urlpatterns = [
    #     path("api/", include(router.urls)),
    path("api/users", UserInfoAPIView.as_view(), name="user_info"),
    path("api/tokens/", TokenView.as_view(), name="token_view"),
    path("api/verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("api/users/onboarding/", UserOnboardingView.as_view(), name="user_onboarding"),
    path("api/webhook/stripe/", stripe_webhook_handler, name="stripe-webhook"),
    path(
        "api/users/resend-verification/",
        ResendVerificationView.as_view(),
        name="resend_verification",
    ),
    path(
        "api/subscription-plans/",
        SubscriptionPlansView.as_view(),
        name="subscription-plans",
    ),
]
