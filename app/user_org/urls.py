from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizationViewSet,
    UpdateAnonymousSessionEmailView,
    WorkspaceViewSet,
)

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspaces")
router.register(r"organizations", OrganizationViewSet, basename="organizations")
urlpatterns = [
    path("api/", include(router.urls)),
    path(
        "api/anonymous-session/update-email/",
        UpdateAnonymousSessionEmailView.as_view(),
        name="update-anonymous-session-email",
    ),
]
