from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MediaViewSet,
    RenderVideoViewSet,
    VideoProjectViewSet,
)

router = DefaultRouter()
router.register(r"media", MediaViewSet, basename="media")
router.register(r"video-projects", VideoProjectViewSet, basename="videos-projects")
router.register(r"render-videos", RenderVideoViewSet, basename="render-videos")
urlpatterns = [
    path("api/", include(router.urls)),
]
