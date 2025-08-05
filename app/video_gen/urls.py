from django.urls import include, path
from rest_framework.routers import DefaultRouter
from video_gen.views.templates import TemplateViewSet

from .views import (
    BrandAssetViewSet,
    MediaViewSet,
    RecordingViewSet,
    RenderVideoViewSet,
    RoomViewSet,
    VideoPipelineRunViewSet,
    VideoProjectViewSet,
)

router = DefaultRouter()
router.register(r"brand-assets", BrandAssetViewSet, basename="brandasset")
router.register(r"media", MediaViewSet, basename="media")
router.register(r"video-projects", VideoProjectViewSet, basename="videos-projects")
router.register(r"render-videos", RenderVideoViewSet, basename="render-videos")
router.register(r"templates", TemplateViewSet, basename="template")
router.register(
    r"video-pipeline-runs", VideoPipelineRunViewSet, basename="video-pipeline-runs"
)
router.register(r"recordings", RecordingViewSet, basename="recordings")
router.register(r"rooms", RoomViewSet, basename="rooms")
urlpatterns = [
    path("api/", include(router.urls)),
]
