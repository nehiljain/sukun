import logging
from datetime import datetime
from typing import Dict, List, Optional

from common.llm_utils import MODEL_4OMINI, call_openai_api_with_structure
from django.db import models
from pydantic import BaseModel
from user_org.models import AppUser
from user_org.models import Workspace
from video_gen.models import Media, RenderVideo, VideoProject, VideoProjectMedia
from video_gen.serializers import MediaSerializer

logger = logging.getLogger(__name__)


# Add this class for structured LLM output
class AIResponse(BaseModel):
    response: str
    type: str
    storyboard_data: Optional[dict] = None  # For nodes and edges in React Flow format


class ChatMessage(BaseModel):
    sender: str
    type: str = "text"
    message: str
    timestamp: str
    media: Optional[dict] = None


class VideoProjectService:
    @staticmethod
    def duplicate_project(
        source_project: VideoProject, target_org_id: str
    ) -> Optional[VideoProject]:
        """Duplicate a video project to a target organization"""
        try:
            new_project = VideoProject.objects.create(
                name=f"{source_project.name} (Copy)",
                description=source_project.description,
                format=source_project.format,
                state=source_project.state,
                brand_asset=source_project.brand_asset,
                org_id=target_org_id,
                workspace=Workspace.objects.get(organization=target_org_id),
                chat_messages=source_project.chat_messages,
                metadata=source_project.metadata,
            )

            RenderVideo.objects.create(
                name=f"{new_project.name} - Video",
                video_project=new_project,
                status=RenderVideo.Status.PENDING,
            )

            return new_project
        except Exception as e:
            logger.exception(f"Error duplicating project: {e}")
            return None

    @staticmethod
    def create_first_message(project: VideoProject, app_user: AppUser) -> ChatMessage:
        """Get the metadata for a video project"""
        # Handle anonymous users (when app_user is None)
        greeting = f"Hey {app_user.user.first_name}!" if app_user else "Hello there!"

        return ChatMessage(
            sender="system",
            message=f"""
        {greeting} I'm the video project assistant for {project.name}.
        My workflow is as follows:
        - Resize the images to the correct size.
        - Create a storyboard for the video.
        - Pick the best sound track.
        - Render the video.
        - Share it with you via email.
        Let me know if you have any questions!
        """,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def system_prompt(project: VideoProject, additional_context: str = "") -> str:
        """Create the first message for a video project"""
        return f"""
        Hello, I am the video project assistant.
        You are a helpful assistant that can help with video project named {project.name}.
        The project has the following metadata:
        {project.metadata}

        You can help with the following:
        - Taking a user's request and acknowledging it.
            For example, if the user says "I want to create a video project", you should say "I'm sorry, I can't do that just yet. Please try something else."
            For example, if the user says "When will the video be ready?", you should say "The video generation is done by AI models, with human supervision.This process can take upto 24 hours. Over time, we will remove human supervision."
            The video generation is done by AI models, with human supervision.This process can take upto 24 hours. Over time, we will remove human supervision.
            For example, if the user says "I want the video to be about 15 seconds long", you should say "Got it, I will keep that in mind."
            For example, if the user says "I want the video to be about a cat", you should say "Hmmm, The content of the video is set at the template level."
            For example, if the user says "Please use licensed music", you should say "Got it, I will keep that in mind."
            Basically, In most cases, just acknowledge the user's request and say that you will keep it in mind.
        Chat History:
        {additional_context}
        """

    @staticmethod
    def get_chat_context(chat_messages: List[ChatMessage]) -> str:
        """Get the chat context for a video project"""
        # Remove the pdb debugger
        # import pdb
        # pdb.set_trace()

        # Update to access dictionary keys instead of attributes
        return "\n".join(
            [f"{msg['sender']}: {msg['message']}" for msg in chat_messages[-5:]]
        )

    @staticmethod
    def generate_next_chat_message(
        project: VideoProject, chat_messages: List[ChatMessage]
    ) -> ChatMessage:
        """Get the next message for a video project"""
        chat_context = VideoProjectService.get_chat_context(chat_messages)

        # Get AI response using AIResponse model instead of dict
        ai_response = call_openai_api_with_structure(
            prompt=VideoProjectService.system_prompt(project, chat_context),
            structured_class=AIResponse,
            model=MODEL_4OMINI,
        )

        return ChatMessage(
            sender="system",
            message=ai_response.response,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def add_chat_message(
        project: VideoProject, chat_message: ChatMessage
    ) -> List[Dict]:
        """Add a chat message and generate AI response if needed"""
        try:
            chat_messages = project.chat_messages or []
            chat_messages.append(chat_message.model_dump())

            project.chat_messages = chat_messages
            project.save()
            return chat_messages  # Return the list of chat messages instead of the context string

        except Exception as e:
            logger.exception(f"Error adding chat message: {e}")
            return []

    @staticmethod
    def get_project_media(project_id: str) -> List[Dict]:
        """Get all media associated with a video project"""
        # Query media directly associated with project (legacy)
        media_items = Media.objects.filter(
            models.Q(metadata__project_id=project_id) & models.Q(type=Media.Type.IMAGE)
        ).order_by("-created_at")

        # Get the project to access its metadata
        try:
            project = VideoProject.objects.get(id=project_id)

            # Check if project has metadata__media field with media IDs
            media_objs = (
                project.metadata.get("media_list", []) if project.metadata else []
            )
            media_ids = [item["media_id"] for item in media_objs]
            if media_ids:
                # Query additional media from metadata__media IDs
                additional_media = Media.objects.filter(id__in=media_ids).order_by(
                    "-created_at"
                )
                # Combine querysets using union
                media_items = media_items.union(additional_media).order_by(
                    "-created_at"
                )

            # --- NEW: Add media from VideoProjectMedia ---
            vpm_qs = VideoProjectMedia.objects.filter(video_project=project).order_by(
                "order", "-created_at"
            )
            vpm_media_ids = list(vpm_qs.values_list("media_id", flat=True))
            vpm_media = Media.objects.filter(id__in=vpm_media_ids)
            # Maintain order as in vpm_media_ids
            vpm_media_dict = {str(m.id): m for m in vpm_media}
            ordered_vpm_media = [
                vpm_media_dict[str(mid)]
                for mid in vpm_media_ids
                if str(mid) in vpm_media_dict
            ]
            # Combine with previous, avoiding duplicates
            seen = set()
            all_media = []
            for m in ordered_vpm_media:
                if m.id not in seen:
                    all_media.append(m)
                    seen.add(m.id)
            for m in media_items:
                if m.id not in seen:
                    all_media.append(m)
                    seen.add(m.id)
            return MediaSerializer(all_media, many=True).data
        except VideoProject.DoesNotExist:
            pass

        return MediaSerializer(media_items, many=True).data

    @staticmethod
    def assign_anonymous_session_projects_to_users(session_key: str, org: models.Model):
        """Assign projects to users based on anonymous session key"""
        # Get all projects for the anonymous session
        projects = VideoProject.objects.filter(
            anonymous_session__session_key=session_key
        )

        for project in projects:
            project.org = org
            project.workspace = Workspace.objects.get(organization=org)
            project.anonymous_session = None
            project.save()
