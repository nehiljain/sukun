from common.middleware import AnonymousReadOnlyOrAuthenticated
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from sound_gen.models import Genre, Mood, Track
from sound_gen.serializers import GenreSerializer, MoodSerializer, TrackSerializer


class GenreViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GenreSerializer

    def get_queryset(self):
        return Genre.objects.all()


class MoodViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MoodSerializer

    def get_queryset(self):
        return Mood.objects.all()


class TrackViewSet(viewsets.ModelViewSet):
    permission_classes = [AnonymousReadOnlyOrAuthenticated]
    serializer_class = TrackSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            tracks = Track.objects.filter(is_public=True)
        else:
            tracks = Track.objects.all()
        return tracks

    def create(self, request, *args, **kwargs):
        track = Track.objects.create(
            name=request.data.get("name"),
            created_by=request.user.appuser,
        )
        return Response(TrackSerializer(track).data, status=HTTP_201_CREATED)
