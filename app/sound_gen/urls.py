from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GenreViewSet,
    MoodViewSet,
    TrackViewSet,
)

router = DefaultRouter()
router.register(r"genres", GenreViewSet, basename="genres")
router.register(r"moods", MoodViewSet, basename="moods")
router.register(r"tracks", TrackViewSet, basename="tracks")

urlpatterns = [
    path("api/", include(router.urls)),
]
