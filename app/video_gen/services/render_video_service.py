import logging
from datetime import datetime
from typing import Dict, List, Optional

from common.llm_utils import MODEL_4OMINI, call_openai_api_with_structure
from pydantic import BaseModel
from user_org.models import AppUser
from video_gen.models import RenderVideo
from video_gen.services.chat_service import ChatMessage, ChatService

logger = logging.getLogger(__name__)


# Add this class for structured LLM output
class AIResponse(BaseModel):
    response: str
    type: str
    storyboard_data: Optional[dict] = None  # For nodes and edges in React Flow format


class RenderVideoService:
    @staticmethod
    def create_first_message(
        render_video: RenderVideo, app_user: AppUser
    ) -> ChatMessage:
        """Create the first message for a render video"""
        return ChatService.create_first_message(
            name=render_video.name,
            app_user_name=app_user.user.first_name if app_user else None,
        )

    @staticmethod
    def add_chat_message(
        render_video: RenderVideo, chat_message: ChatMessage
    ) -> List[Dict]:
        """Add a chat message to a render video"""
        try:
            chat_messages = render_video.chat_messages or []
            chat_messages = ChatService.add_chat_message(chat_messages, chat_message)

            render_video.chat_messages = chat_messages
            render_video.save()
            return chat_messages
        except Exception as e:
            logger.exception(f"Error adding chat message to render video: {e}")
            return []

    @staticmethod
    def system_prompt(render_video: RenderVideo, additional_context: str = "") -> str:
        """Create the first message for a video project"""
        return f"""
        Hello, I am the video project assistant.
        You are a helpful assistant that can help with render video named {render_video.name}.

        You can help with the following:
        - Taking a user's request and acknowledging it.
            For example, if the user says "I want to create a video project", you should say "I'm sorry, I can't do that just yet. Please try something else."
            For example, if the user says "When will the video be ready?", you should say "The video generation is done by AI models, with human supervision.This process can take upto 24 hours. Over time, we will remove human supervision."
            The video generation is done by AI models, with human supervision.This process can take upto 24 hours. Over time, we will remove human supervision.
            For example, if the user says "I want the video to be about 15 seconds long", you should say "Got it, I will keep that in mind."
            For example, if the user says "I want the video to be about a cat", you should say "Hmmm, The content of the video is set at the template level."
            For example, if the user says "Please use licensed music", you should say "Got it, I will keep that in mind."
            Basically, In most cases, just acknowledge the user's request and say that you will keep it in mind. Dont end the conversation with a question.
        Chat History:
        {additional_context}
        """

    @staticmethod
    def get_chat_context(chat_messages: List[ChatMessage]) -> str:
        """Get the chat context from messages"""
        return "\n".join(
            [f"{msg['sender']}: {msg['message']}" for msg in chat_messages[-5:]]
        )

    @staticmethod
    def generate_next_chat_message(
        render_video: RenderVideo,
    ) -> ChatMessage:
        """Generate the next chat message"""
        chat_context = RenderVideoService.get_chat_context(render_video.chat_messages)

        ai_response = call_openai_api_with_structure(
            prompt=RenderVideoService.system_prompt(render_video, chat_context),
            structured_class=AIResponse,
            model=MODEL_4OMINI,
        )

        return ChatMessage(
            sender="system",
            message=ai_response.response,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def status_update(render_video: RenderVideo, status: str) -> bool:
        """Update the status of a render video"""
        try:
            render_video.status = status
            render_video.save()
            return True
        except Exception as e:
            logger.exception(f"Error updating status of render video: {e}")
            return False

    @staticmethod
    def get_render_video_details(render_video_id: str) -> Optional[Dict]:
        """Get render video details including chat messages"""
        try:
            render_video = RenderVideo.objects.get(id=render_video_id)
            return {
                "id": str(render_video.id),
                "name": render_video.name,
                "description": render_video.description,
                "status": render_video.status,
                "video_url": render_video.video_url,
                "thumbnail_url": render_video.thumbnail_url,
                "chat_messages": render_video.chat_messages,
                "created_at": render_video.created_at.isoformat(),
                "updated_at": render_video.updated_at.isoformat(),
            }
        except RenderVideo.DoesNotExist:
            return None
        except Exception as e:
            logger.exception(f"Error getting render video details: {e}")
            return None
