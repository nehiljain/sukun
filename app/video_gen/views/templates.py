import logging

from django.apps import apps
from django.db import models
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from video_gen.models import Media, VideoProject, VideoProjectMedia
from video_gen.serializers import VideoProjectSerializer

logger = logging.getLogger(__name__)


class IsAuthenticatedOrPublicReadOnly(permissions.BasePermission):
    """
    Custom permission to allow public access to templates.
    """

    def has_permission(self, request, view):
        # Allow any read-only request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed for authenticated users
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Allow read-only access to public templates
        if request.method in permissions.SAFE_METHODS and obj.is_public:
            return True
        # Write permissions and read for private objects are only for authenticated users
        return (
            request.user
            and request.user.is_authenticated
            and obj.org == request.user.appuser.active_org
        )


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = VideoProjectSerializer
    permission_classes = [IsAuthenticatedOrPublicReadOnly]

    def get_queryset(self):
        # Get templates (is_template=True)yo
        queryset = VideoProject.objects.filter(is_template=True)

        # Allow public templates for unauthenticated users
        if not self.request.user.is_authenticated:
            return queryset.filter(is_public=True)

        # For authenticated users, show all templates (public and their org's private ones)
        return queryset.filter(
            models.Q(is_public=True)
            | models.Q(org=self.request.user.appuser.active_org)
        )

    def perform_create(self, serializer):
        video_project_id = self.request.data.get("video_project_id")
        name = self.request.data.get("name")
        description = self.request.data.get("description")

        # Validate required fields
        if not video_project_id or not name or not description:
            raise serializers.ValidationError(
                {"error": "Need to pass video_project_id, name, and description"}
            )

        try:
            video_proj_obj = VideoProject.objects.get(id=video_project_id)
        except VideoProject.DoesNotExist as err:
            raise serializers.ValidationError(
                {"error": "Need to pass a valid video_project_id"}
            ) from err

        # Get workspace
        workspace_id = self.request.data.get("workspace")
        active_org = self.request.user.appuser.active_org

        if not workspace_id:
            first_workspace = (
                apps.get_model("user_org", "Workspace")
                .objects.filter(organization=active_org)
                .first()
            )
            if not first_workspace:
                raise serializers.ValidationError(
                    {"error": "No workspace found in the active organization"}
                )
            workspace = first_workspace
        else:
            try:
                workspace = apps.get_model("user_org", "Workspace").objects.get(
                    id=workspace_id
                )
            except apps.get_model("user_org", "Workspace").DoesNotExist as err:
                raise serializers.ValidationError(
                    {"error": "Invalid workspace ID"}
                ) from err

        # Create new template
        new_template = VideoProject.objects.create(
            org=active_org,
            state=video_proj_obj.state,
            aspect_ratio=video_proj_obj.aspect_ratio,
            brand_asset=video_proj_obj.brand_asset,
            metadata=video_proj_obj.metadata,
            name=name,
            description=description,
            workspace=workspace,
            is_template=True,
            is_public=False,
        )

        # Update the serializer with the new template
        serializer.instance = new_template
        return new_template

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
    )
    def use_template(self, request, pk=None):
        """Create a new project based on this template"""
        try:
            template = self.get_object()
            active_org = self.request.user.appuser.active_org
            first_workspace = (
                apps.get_model("user_org", "Workspace")
                .objects.filter(organization=active_org)
                .first()
            )
            # Create new project with copied data from template
            new_project = VideoProject.objects.create(
                name=f"{template.name} - Project",
                description=f"Created from {template.name}",
                aspect_ratio=template.aspect_ratio,
                state=template.state,
                brand_asset=template.brand_asset,
                org=active_org,
                workspace=first_workspace,
                is_template=False,  # This is a regular project, not a template
                is_public=False,  # Default to private for new projects
                metadata=template.metadata,
            )

            return Response(
                self.get_serializer(new_project).data, status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.exception(f"Error using template: {e}")
            return Response(
                {"error": "Failed to create project from template"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
    )
    def use_template_ai(self, request, pk=None):
        """Create a new project based on this template using AI"""
        try:
            template = self.get_object()

            # Extract request data
            genre = request.data.get("genre")
            mood = request.data.get("mood")
            media_list = request.data.get("media", [])
            address = request.data.get("address")

            # Validate input
            if not mood:
                return Response(
                    {"error": "Mood is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not media_list:
                return Response(
                    {"error": "At least one media item is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not address:
                return Response(
                    {"error": "Address is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Find a track with matching genre and mood

            try:
                # genre_obj = apps.get_model("sound_gen", "Genre").objects.get(
                #     name__iexact=genre
                # )
                mood_obj = apps.get_model("sound_gen", "Mood").objects.get(
                    name__iexact=mood
                )

                track = (
                    apps.get_model("sound_gen", "Track")
                    .objects.filter(moods=mood_obj)
                    .first()
                )

                if not track:
                    track = (
                        apps.get_model("sound_gen", "Track").objects.filter().first()
                    )
                    # if not track:
                    #     return Response(
                    #         {
                    #             "error": f"No tracks found with genre '{genre}' and mood '{mood}'"
                    #         },
                    #         status=status.HTTP_404_NOT_FOUND,
                    #     )
            except apps.get_model("sound_gen", "Mood").DoesNotExist:
                return Response(
                    {"error": f"Genre '{genre}' or mood '{mood}' not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get media objects
            media_objects = []
            for media_item in media_list:
                try:
                    media = Media.objects.get(id=media_item.get("media_id"))
                    media_objects.append(media)
                except Media.DoesNotExist:
                    continue

            if not media_objects:
                return Response(
                    {"error": "No valid media items found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create the project state with overlays
            active_org = request.user.appuser.active_org
            first_workspace = (
                apps.get_model("user_org", "Workspace")
                .objects.filter(organization=active_org)
                .first()
            )

            try:
                from video_gen.utils.media_track_sync import create_synced_overlays

                state = template.state or {}
                synced_data = create_synced_overlays(
                    track, media_objects, fps=30, aspect_ratio=template.aspect_ratio
                )
                state["overlays"] = synced_data["overlays"]
                state["durationInFrames"] = synced_data["durationInFrames"]

                # Create new project with updated state
                new_project = VideoProject.objects.create(
                    name=f"{address}",
                    description=f"Created from {template.name} with {mood} mood and {len(media_list)} scenes",
                    aspect_ratio=template.aspect_ratio,
                    state=state,
                    brand_asset=template.brand_asset,
                    org=active_org,
                    workspace=first_workspace,
                    is_template=False,
                    is_public=False,
                    metadata={
                        "generated_by": "ai",
                        "track_id": str(track.id),
                        "genre": genre if genre else None,
                        "mood": mood,
                        "original_template": str(template.id),
                        "address": address,
                    },
                )
                # add media to VideoProjectMedia
                for media in media_list:
                    VideoProjectMedia.objects.create(
                        video_project=new_project,
                        media=media,
                    )

                return Response(
                    self.get_serializer(new_project).data,
                    status=status.HTTP_201_CREATED,
                )

            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.exception(f"Error creating project from template using AI: {e}")
            return Response(
                {"error": "Failed to create project from template using AI"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
