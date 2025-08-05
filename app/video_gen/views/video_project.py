import logging
from datetime import datetime

from common.middleware import (
    AnonymousOrAuthenticated,
    IsAuthenticatedOrPublicReadOnly,
)
from django.db import models
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from user_org.models import Organization, Workspace
from video_gen.models import RenderVideo, VideoProject
from video_gen.serializers import (
    AssignProjectsRequestSerializer,
    VideoProjectSerializer,
)
from video_gen.services.agent_service import OpenAIAgentService
from video_gen.services.video_project_service import (
    ChatMessage,
    VideoProjectService,
)

logger = logging.getLogger(__name__)


class VideoProjectPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 24


class VideoProjectViewSet(viewsets.ModelViewSet):
    serializer_class = VideoProjectSerializer
    permission_classes = [AnonymousOrAuthenticated]
    pagination_class = VideoProjectPagination

    def get_queryset(self):
        # Allow public projects for unauthenticated users
        queryset = VideoProject.objects.all().order_by("-created_at")

        if not self.request.user.is_authenticated:
            return queryset.filter(is_public=True, is_template=False)

        if self.request.user.is_staff:
            return queryset

        # For authenticated users, return their org's projects and public projects
        return queryset.filter(
            models.Q(org=self.request.user.appuser.active_org),
            is_template=False,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            # Existing logic for authenticated users
            serializer.save(org=self.request.user.appuser.active_org, is_public=False)
        elif self.request.data.get("session_key"):
            # Create anonymous session
            from django.apps import apps

            AnonymousSession = apps.get_model("user_org", "AnonymousSession")
            from datetime import datetime, timedelta, timezone

            session = AnonymousSession.objects.create(
                session_key=self.request.data.get("session_key"),
                expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            )

            # Use anonymous org/workspace
            anonymous_org = Organization.objects.get(name="Anonymous")
            anonymous_workspace = Workspace.objects.get(name="Anonymous")

            serializer.save(
                is_public=True,
                org=anonymous_org,
                workspace=anonymous_workspace,
                anonymous_session=session,
            )
        else:
            # Can't return Response directly in perform_create
            # Raise a ValidationError instead which will be converted to a 400 response
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"error": "Session key is required for anonymous users"}
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def save_state(self, request, pk=None):
        """
        Save the current editor state for a video asset
        """

        try:
            video_project = self.get_object()
            # Validate the request data has the required fields
            # Check if state exists and has all required fields
            if not request.data.get("state") or not all(
                key in request.data["state"]
                for key in ["fps", "overlays", "durationInFrames"]
            ):
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Save the state to the remotion_state field
            video_project.state = request.data["state"]
            video_project.save()

            return Response(
                {"message": "Editor state saved successfully"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error saving editor state: {e}")
            return Response(
                {"error": f"Failed to save editor state: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """Update the status of a video asset"""
        try:
            video_project = self.get_object()

            new_status = request.data.get("status")

            if new_status not in [choice[0] for choice in RenderVideo.Status.choices]:
                return Response(
                    {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
                )

            video_project.status = new_status
            # Update the video project status if all assets are accepted
            if new_status == RenderVideo.Status.ACCEPTED:
                video_project.status = VideoProject.Status.COMPLETE
            video_project.save()

            return Response(
                self.get_serializer(video_project).data, status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception(f"Error updating video asset status: {e}")
            return Response(
                {"error": "Failed to update status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsAuthenticatedOrPublicReadOnly],
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
                    VideoProjectService.create_first_message(
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

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def add_message(self, request, pk=None):
        """Add a new message to the chat history and get AI response"""
        try:
            project = self.get_object()

            message_data = request.data
            if not message_data.get("message"):
                return Response(
                    {"error": "Message content is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Add user message to chat history
            user_message = ChatMessage(
                sender=message_data.get("sender", "user"),
                message=message_data.get("message"),
                timestamp=datetime.utcnow().isoformat(),
            )
            messages = VideoProjectService.add_chat_message(
                project=project,
                chat_message=user_message,
            )

            # Process with agent if it's a user message
            if message_data.get("sender", "user") == "user":
                # Use the agent service to process the message
                agent_response = OpenAIAgentService().process_message(
                    project=project, user_message=message_data.get("message")
                )

                # Add agent response to chat history
                messages = VideoProjectService.add_chat_message(
                    project=project,
                    chat_message=agent_response,
                )

            # The thumbnail message is now handled by agent_service if user asks for it

            return Response({"messages": messages}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error adding message: {e}")
            return Response(
                {"error": "Failed to add message"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def duplicate(self, request, pk=None):
        """Duplicate a video project to a target organization"""
        try:
            source_project = self.get_object()
            target_org_id = request.data.get("organization_id")

            if not target_org_id:
                return Response(
                    {"error": "Target organization ID is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            new_project = VideoProjectService.duplicate_project(
                source_project=source_project, target_org_id=target_org_id
            )

            if not new_project:
                return Response(
                    {"error": "Failed to duplicate project"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(
                self.get_serializer(new_project).data, status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.exception(f"Error duplicating project: {e}")
            return Response(
                {"error": "Failed to duplicate project"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["GET"])
    def media(self, request, pk=None):
        """Get all media associated with this video project"""
        try:
            project = self.get_object()
            media_items = VideoProjectService.get_project_media(str(project.id))
            return Response({"media": media_items}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error fetching project media: {e}")
            return Response(
                {"error": "Failed to fetch project media"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=False,
        methods=["POST"],
        url_path="assign_projects",
        serializer_class=AssignProjectsRequestSerializer,
    )
    def assign_projects_to_user(self, request):
        """Assign anonymous session projects to the authenticated user"""
        try:
            VideoProjectService.assign_anonymous_session_projects_to_users(
                session_key=request.headers.get("X-DD-Session-Key"),
                org=request.user.appuser.active_org,
            )

            return Response(
                {"message": "Projects assigned to user successfully"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception(f"Error assigning projects to user: {e}")
            return Response(
                {"error": "Failed to assign projects to user"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def agent_query(self, request, pk=None):
        """Direct query to the agent with custom tools for this endpoint"""
        try:
            project = self.get_object()

            if not request.data.get("query"):
                return Response(
                    {"error": "Query is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Example of registering a custom tool just for this request
            # This tool will be available alongside the default tools
            agent_service.register_tool(
                name="update_project_name",
                description="Update the name of the video project",
                parameters={
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "string",
                            "description": "The ID of the video project",
                        },
                        "name": {
                            "type": "string",
                            "description": "New name for the project",
                        },
                    },
                    "required": ["project_id", "name"],
                },
                func=lambda project_id, name: self._update_project_name(
                    project_id, name
                ),
            )

            # Process the query with the agent
            response = agent_service.process_message(
                project=project, user_message=request.data.get("query")
            )

            return Response(
                {
                    "response": response.message,
                    "metadata": response.metadata
                    if hasattr(response, "metadata")
                    else None,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error processing agent query: {e}")
            return Response(
                {"error": "Failed to process agent query"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _update_project_name(self, project_id: str, name: str) -> dict:
        """Helper method for the update_project_name tool"""
        try:
            project = VideoProject.objects.get(id=project_id)
            project.name = name
            project.save()
            return {"status": "success", "message": f"Project name updated to '{name}'"}
        except VideoProject.DoesNotExist:
            return {"status": "error", "message": "Project not found"}
        except Exception as e:
            logger.exception(f"Error updating project name: {e}")
            return {"status": "error", "message": str(e)}

    @action(detail=False, methods=["get"], url_path="simple-list")
    def list_simple(self, request):
        """Return all video projects (id, name) for dropdowns"""

        class SimpleVideoProjectSerializer(serializers.ModelSerializer):
            class Meta:
                model = VideoProject
                fields = ["id", "name"]

        queryset = self.get_queryset()
        serializer = SimpleVideoProjectSerializer(queryset, many=True)
        return Response(serializer.data)
