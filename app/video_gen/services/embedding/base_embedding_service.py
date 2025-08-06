import logging
from abc import ABC, abstractmethod
from typing import List, Optional

logger = logging.getLogger(__name__)


class BaseEmbeddingService(ABC):
    """Base abstract class for embedding services."""

    EMBEDDING_MODEL = "text-embedding-3-large"
    EMBEDDING_DIMENSION = 1024  # Default, can be overridden by subclasses

    @abstractmethod
    def generate_embedding(
        self, text: str, retry_count: int = 0
    ) -> Optional[List[float]]:
        """Generate embedding for a given text."""
        pass

    @abstractmethod
    def generate_embeddings_batch(
        self, texts: List[str]
    ) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in a batch."""
        pass

    def _clean_text(self, text: str) -> str:
        """Clean and prepare text for embedding generation."""
        if not text:
            return ""

        cleaned = " ".join(text.strip().split())

        max_chars = 8000 * 4
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars]
            logger.warning(f"Text truncated to {max_chars} characters for embedding")

        return cleaned

    def generate_media_embedding_text(self, media) -> str:
        """Generate comprehensive text representation of media for embedding."""
        text_parts = []

        if media.name:
            text_parts.append(f"Name: {media.name}")

        text_parts.append(f"Type: {media.type}")

        ai_summary = self._generate_ai_content_summary(media)
        if ai_summary:
            text_parts.append(f"Visual content: {ai_summary}")

        if media.tags and isinstance(media.tags, list):
            tags_text = ", ".join(str(tag) for tag in media.tags if tag)
            if tags_text:
                text_parts.append(f"Tags: {tags_text}")

        if media.metadata:
            filename = media.metadata.get("original_filename")
            if filename and filename != media.name:
                text_parts.append(f"Filename: {filename}")

            mime_type = media.metadata.get("mime_type")
            if mime_type:
                text_parts.append(f"Format: {mime_type}")

            description = media.metadata.get("description") or media.metadata.get(
                "caption"
            )
            if description:
                text_parts.append(f"Description: {description}")

        if media.caption_metadata:
            generation_type = media.caption_metadata.get("generation_type")
            if generation_type:
                text_parts.append(f"Generation type: {generation_type}")

            for key, value in media.caption_metadata.items():
                if (
                    key not in ["generation_type", "source_media_id", "pipeline_run_id"]
                    and value
                ):
                    text_parts.append(f"{key}: {value}")

        if hasattr(media, "resolution") and media.resolution:
            text_parts.append(f"Resolution: {media.resolution}")

        if hasattr(media, "format") and media.format:
            text_parts.append(f"File format: {media.format}")

        if (
            media.type == "video"
            and hasattr(media, "duration_in_seconds")
            and media.duration_in_seconds
        ):
            duration_text = self._format_duration(media.duration_in_seconds)
            text_parts.append(f"Duration: {duration_text}")

        return " | ".join(text_parts)

    def _generate_ai_content_summary(self, media, force_regenerate: bool = True) -> str:
        """Generate AI-powered content summary using multimodal analysis."""
        try:
            if media.type not in ["image", "video"]:
                return ""

            if (
                media.embedding_text
                and isinstance(media.embedding_text, dict)
                and media.embedding_text.get("summary")
                and not force_regenerate
            ):
                logger.info(
                    f"Using cached AI summary for media {media.id} (generated with {media.embedding_text.get('model', 'unknown')})"
                )
                return media.embedding_text["summary"].strip()

            logger.info(f"Generating new AI summary for media {media.id}")

            from video_gen.services.multimodal_summarization_service import (
                MultimodalSummarizationService,
            )

            summarization_service = MultimodalSummarizationService()
            summary = summarization_service.generate_media_summary(
                media, store_in_db=True
            )

            if summary:
                logger.info(
                    f"Generated and stored AI summary for media {media.id}: {len(summary)} characters"
                )
                return summary.strip()
            else:
                logger.warning(f"Failed to generate AI summary for media {media.id}")
                return ""

        except Exception as e:
            logger.error(
                f"Error generating AI content summary for media {media.id}: {e}"
            )
            return ""

    def _format_duration(self, seconds: int) -> str:
        """Format duration in seconds to human-readable format."""
        if seconds < 60:
            return f"{seconds} seconds"
        elif seconds < 3600:
            minutes = seconds // 60
            remaining_seconds = seconds % 60
            return f"{minutes}m {remaining_seconds}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"

    def _normalize_embedding_for_storage(
        self, embedding: List[float], target_dim: int = 1024
    ) -> List[float]:
        """
        Normalize embedding vector for database storage.
        Pads with zeros if too short, truncates if too long.

        Args:
            embedding: The embedding vector
            target_dim: Target dimension for storage (database field size)

        Returns:
            List[float]: Normalized embedding vector
        """
        if len(embedding) == target_dim:
            return embedding
        elif len(embedding) < target_dim:
            # Pad with zeros
            padded = embedding + [0.0] * (target_dim - len(embedding))
            logger.info(
                f"Padded embedding from {len(embedding)} to {target_dim} dimensions"
            )
            return padded
        else:
            # Truncate (not ideal, but necessary for storage)
            truncated = embedding[:target_dim]
            logger.warning(
                f"Truncated embedding from {len(embedding)} to {target_dim} dimensions"
            )
            return truncated
