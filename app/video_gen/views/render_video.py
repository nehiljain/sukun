import logging
import os
import uuid
from datetime import datetime

from common.middleware import AnonymousGetNonListPermission
from common.storage.mixins import CDNURLMixin
from common.storage.utils import upload_file_to_cloud
from django.conf import settings
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from video_gen.models import RenderVideo
from video_gen.serializers import (
    FeaturedRenderSerializer,
    RenderVideoCreateSerializer,
    RenderVideoSerializer,
)
from video_gen.services.chat_service import ChatMessage
from video_gen.services.media_service import MediaService
from video_gen.services.render_service import RenderService
from video_gen.services.render_video_service import RenderVideoService

from .video_project import VideoProject

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class RenderVideoViewSet(viewsets.ModelViewSet, CDNURLMixin):
    serializer_class = RenderVideoSerializer
    queryset = RenderVideo.objects.all()
    permission_classes = [AnonymousGetNonListPermission]

    # Add MultiPartParser and FormParser for file uploads
    parser_classes = [
        MultiPartParser,
        FormParser,
        *viewsets.ModelViewSet.parser_classes,
    ]

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return self.queryset.filter(is_public=True)
        if self.request.user.is_staff:
            queryset = RenderVideo.objects.all()
        else:
            queryset = RenderVideo.objects.filter(
                Q(video_project__org=self.request.user.appuser.active_org)
                | Q(is_public=True)
            )

        # Filter by video project if video_project_id is provided in query params
        video_project_id = self.request.query_params.get("video_project_id")
        if video_project_id:
            queryset = queryset.filter(video_project_id=video_project_id)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return RenderVideoCreateSerializer
        return super().get_serializer_class()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.thumbnail_url is None and instance.video_url:
            instance.thumbnail_url = MediaService.generate_video_thumbnail(
                instance.video_url, f"render_{instance.id}"
            )
            instance.save()
        return super().retrieve(request, *args, **kwargs)

    # @extend_schema(
    #     parameters=[
    #         OpenApiParameter(
    #             name="resolution",
    #             description="The resolution of the video to render",
    #             required=True,
    #             type=OpenApiTypes.STR,
    #             enum=RenderVideo.Resolution,
    #         ),
    #         OpenApiParameter(
    #             name="render_speed",
    #             description="The speed of the render",
    #             required=False,
    #             type=OpenApiTypes.STR,
    #             enum=RenderVideo.RenderSpeed,
    #         ),
    #     ],
    # )
    def create(self, request):
        """
        Create a new RenderVideo entry and start the render process
        """
        try:
            # Validate request data
            video_project_id = request.data.get("video_project_id")
            if not video_project_id:
                return Response(
                    {"error": "video_project_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            resolution = request.data.get("resolution", "720p")
            render_speed = request.data.get("render_speed", "medium")

            # Get the video project
            try:
                if self.request.user.is_staff:
                    video_project = VideoProject.objects.get(pk=video_project_id)
                else:
                    video_project = VideoProject.objects.get(
                        pk=video_project_id,
                        org=request.user.appuser.active_org,
                    )
            except VideoProject.DoesNotExist:
                return Response(
                    {"error": "Video project not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create render video record
            render_video = RenderVideo.objects.create(
                name=f"{video_project.name} Render",
                video_project=video_project,
                status=RenderVideo.Status.PENDING,
                state=video_project.state,
                resolution=resolution,
                render_speed=render_speed,
            )

            # Generate render token
            render_token = uuid.uuid4().hex
            render_video.render_token = render_token
            render_video.save()

            # Start render process using service
            success = RenderService.start_render_process(
                render_video=render_video, render_token=render_token
            )

            if not success:
                render_video.status = RenderVideo.Status.ERROR
                render_video.render_token = None
                render_video.save()
                return Response(
                    {
                        "id": render_video.id,
                        "message": "Render job failed to start",
                        "status": "error",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(
                {
                    "id": render_video.id,
                    "message": "Render job started",
                    "status": "processing",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        except Exception as e:
            logger.exception(f"Error starting render job: {e}")
            return Response(
                {"error": f"Failed to start render: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["POST"],
        url_path="render_complete",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def render_complete(self, request, pk=None):
        """
        Handle render completion notification from Node.js process and upload to GCS
        This endpoint is kept for backward compatibility but is being replaced by the file-based approach
        """
        # Note: CSRF exemption is handled at the view level with the csrf_exempt decorator
        # in the class definition or at the dispatch method level

        try:
            # Since we're bypassing authentication, we need to get the object manually
            try:
                render_video = RenderVideo.objects.get(pk=pk)
            except RenderVideo.DoesNotExist:
                return Response(
                    {"error": "Render video not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            output_path = request.data.get("output_path")
            render_token = request.data.get("render_token")

            # Validate the render token
            if not render_token or render_video.render_token != render_token:
                return Response(
                    {"error": "Invalid render token"}, status=status.HTTP_403_FORBIDDEN
                )

            if not output_path:
                return Response(
                    {"error": "Output path is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if the rendered file exists
            local_output_path = os.path.join(settings.BASE_DIR, output_path.lstrip("/"))
            if not os.path.exists(local_output_path):
                return Response(
                    {"error": f"Rendered file not found at {local_output_path}"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create a GCS path for the rendered video
            cloud_file_path = f"renders/{render_video.video_project.id}/{os.path.basename(output_path)}"

            thumbnail_url = MediaService.generate_video_thumbnail(
                local_output_path, f"render_{render_video.id}"
            )
            # Upload the file to GCS
            with open(local_output_path, "rb") as video_file:
                public_url = upload_file_to_cloud(
                    video_file, cloud_file_path, "video/mp4"
                )

            if not public_url:
                return Response(
                    {"error": "Failed to upload rendered video to cloud storage"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Clean up the local file
            try:
                os.remove(local_output_path)
            except Exception as e:
                logger.warning(f"Failed to remove local file {local_output_path}: {e}")

            # Update the video asset with the GCS URL
            render_video.video_url = public_url

            # Clear the token after use
            render_video.render_token = None
            render_video.thumbnail_url = thumbnail_url
            render_video.save()

            # Send notification to user if needed

            return Response(
                {"message": "Render complete", "rendered_url": public_url},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error handling render completion: {e}")
            return Response(
                {"error": f"Failed to handle render completion: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=False,
        methods=["GET"],
        url_path="featured/public",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def get_featured_renders(self, request):
        """
        Get all featured renders
        """
        featured_renders = RenderVideo.objects.filter(
            is_featured=True, is_public=True
        ).select_related("video_project")
        serializer = FeaturedRenderSerializer(featured_renders, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["POST"],
        url_path="status_update",
    )
    def status_update(self, request, pk=None):
        """Update the status of a render video"""
        try:
            render_video = RenderVideo.objects.get(id=pk)

            # Check if user has permission to accept videos
            # if not request.user.has_perm("videogen.video_project_edit"):
            #     return Response(
            #         {"error": "You don't have permission to accept videos"},
            #         status=status.HTTP_403_FORBIDDEN,
            #     )

            # Check if video is in the correct status
            if render_video.status != RenderVideo.Status.GENERATED:
                return Response(
                    {"error": "Only generated videos can be accepted"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Accept the video
            if RenderVideoService.status_update(
                render_video, request.data.get("status")
            ):
                return Response({"status": "success"}, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": "Failed to update status"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except RenderVideo.DoesNotExist:
            return Response(
                {"error": "Render video not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=True,
        methods=["POST"],
    )
    def add_message(self, request, pk=None):
        """Add a chat message to a render video"""
        try:
            render_video = RenderVideo.objects.get(id=pk)
            message = request.data.get("message")

            if not message:
                return Response(
                    {"error": "Message is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create a ChatMessage object
            user_message = ChatMessage(
                sender="user",
                message=message,
                timestamp=datetime.utcnow().isoformat(),
                type="text",
            )

            # Add the message using the service
            chat_messages = RenderVideoService.add_chat_message(
                render_video, user_message
            )

            # Generate AI response
            ai_message = RenderVideoService.generate_next_chat_message(render_video)
            chat_messages = RenderVideoService.add_chat_message(
                render_video, ai_message
            )

            return Response({"chat_messages": chat_messages}, status=status.HTTP_200_OK)

        except RenderVideo.DoesNotExist:
            return Response(
                {"error": "Render video not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=True,
        methods=["POST"],
        url_path="agent_query",
        authentication_classes=[],
    )
    def agent_query(self, request, pk=None):
        """Handle direct agent queries for render videos"""
        try:
            render_video = RenderVideo.objects.get(id=pk)
            query = request.data.get("query")

            if not query:
                return Response(
                    {"error": "Query is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Add the user's query as a message
            user_message = ChatMessage(
                sender="user",
                message=query,
                timestamp=datetime.utcnow().isoformat(),
                type="text",
            )
            chat_messages = RenderVideoService.add_chat_message(
                render_video, user_message
            )

            # Generate AI response
            ai_message = RenderVideoService.generate_next_chat_message(render_video)
            chat_messages = RenderVideoService.add_chat_message(
                render_video, ai_message
            )

            return Response(
                {
                    "response": ai_message.message,
                    "metadata": ai_message.metadata,
                    "chat_messages": chat_messages,
                },
                status=status.HTTP_200_OK,
            )

        except RenderVideo.DoesNotExist:
            return Response(
                {"error": "Render video not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=True,
        methods=["get"],
    )
    def chat_history(self, request, pk=None):
        """Get chat history for a specific video project"""
        try:
            project = self.get_object()
            chat_messages = project.chat_messages or []
            if not chat_messages:
                # Handle both authenticated and anonymous users
                appuser = (
                    request.user.appuser if request.user.is_authenticated else None
                )
                chat_messages = [
                    RenderVideoService.create_first_message(
                        project,
                        appuser,
                    ).model_dump()
                ]
                project.chat_messages = chat_messages
                project.save()

            return Response(chat_messages, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error retrieving chat history: {e}")
            return Response(
                {"error": "Failed to retrieve chat history"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
