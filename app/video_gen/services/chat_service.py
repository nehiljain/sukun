import logging
from datetime import datetime
from typing import Dict, List, Optional

from blogchecker_service.llm_utils import MODEL_4OMINI, call_openai_api_with_structure
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AIResponse(BaseModel):
    response: str
    type: str
    storyboard_data: Optional[dict] = None


class ChatMessage(BaseModel):
    sender: str
    type: str = "text"
    message: str
    timestamp: str
    media: Optional[dict] = None


class ChatService:
    @staticmethod
    def create_first_message(
        name: str, app_user_name: Optional[str] = None
    ) -> ChatMessage:
        """Create the first message for a chat"""
        greeting = f"Hey {app_user_name}!" if app_user_name else "Hello there!"

        return ChatMessage(
            sender="system",
            message=f"""
            {greeting} I'm your assistant for {name}.
            I can help you with any questions or tasks you have.
            """,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def system_prompt(
        name: str, metadata: Optional[dict] = None, additional_context: str = ""
    ) -> str:
        """Create the system prompt for chat"""
        metadata_str = (
            f"\nThe item has the following metadata:\n{metadata}" if metadata else ""
        )

        return f"""
        Hello, I am your assistant.
        You are a helpful assistant that can help with {name}.{metadata_str}

        You can help with the following:
        - Taking a user's request and acknowledging it.
        - Answering questions about the item.
        - Providing guidance and support.

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
        name: str,
        metadata: Optional[dict] = None,
        chat_messages: Optional[List[ChatMessage]] = None,
    ) -> ChatMessage:
        """Generate the next chat message"""
        chat_context = ChatService.get_chat_context(chat_messages)

        ai_response = call_openai_api_with_structure(
            prompt=ChatService.system_prompt(name, metadata, chat_context),
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
        chat_messages: List[Dict], chat_message: ChatMessage
    ) -> List[Dict]:
        """Add a chat message and return updated messages list"""
        try:
            chat_messages = chat_messages or []
            chat_messages.append(chat_message.model_dump())
            return chat_messages
        except Exception as e:
            logger.exception(f"Error adding chat message: {e}")
            return []
