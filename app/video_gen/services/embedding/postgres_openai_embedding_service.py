import logging
import os
from typing import List, Optional

import openai

from .base_embedding_service import BaseEmbeddingService

logger = logging.getLogger(__name__)


class PostgresOpenAIEmbeddingService(BaseEmbeddingService):
    """Service for generating embeddings using OpenAI and storing in PostgreSQL with pgvector."""

    def __init__(self):
        """Initialize the embedding service with OpenAI client."""
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            logger.error("OPENAI_API_KEY environment variable is not set")
            raise ValueError("OPENAI_API_KEY environment variable is required")

        logger.info(api_key)
        self.client = openai.OpenAI(api_key=api_key)
        logger.info(self.client)

    def generate_embedding(
        self, text: str, retry_count: int = 0
    ) -> Optional[List[float]]:
        """
        Generate embedding for a given text with retry logic.

        Args:
            text (str): Text to generate embedding for
            retry_count (int): Current retry attempt

        Returns:
            Optional[List[float]]: Embedding vector or None if failed
        """
        max_retries = 2

        try:
            if not text or not text.strip():
                logger.warning("Empty or whitespace-only text provided for embedding")
                return None

            # Clean and truncate text if needed (OpenAI has token limits)
            cleaned_text = self._clean_text(text)

            # Log request details for debugging
            logger.info(f"Making embedding request with model: {self.EMBEDDING_MODEL}")
            logger.info(f"Text length: {len(cleaned_text)} characters")

            response = self.client.embeddings.create(
                model=self.EMBEDDING_MODEL, input=cleaned_text, encoding_format="float"
            )

            embedding = response.data[0].embedding

            if len(embedding) != self.EMBEDDING_DIMENSION:
                logger.warning(f"Unexpected embedding dimension: {len(embedding)}")

            return embedding

        except openai.AuthenticationError as e:
            logger.error(f"OpenAI authentication failed: {e}")
            logger.error("Please check your OPENAI_API_KEY environment variable")
            return None

        except openai.RateLimitError as e:
            if retry_count < max_retries:
                import time

                wait_time = (retry_count + 1) * 2  # Exponential backoff: 2, 4 seconds
                logger.warning(
                    f"Rate limit hit, retrying in {wait_time} seconds (attempt {retry_count + 1}/{max_retries})"
                )
                time.sleep(wait_time)
                return self.generate_embedding(text, retry_count + 1)
            else:
                logger.error(
                    f"OpenAI rate limit exceeded after {max_retries} retries: {e}"
                )
                return None
        except openai.APIError as e:
            if retry_count < max_retries and "server_error" in str(e).lower():
                import time

                wait_time = (retry_count + 1) * 1  # Shorter wait for server errors
                logger.warning(
                    f"API server error, retrying in {wait_time} seconds (attempt {retry_count + 1}/{max_retries})"
                )
                time.sleep(wait_time)
                return self.generate_embedding(text, retry_count + 1)
            else:
                logger.error(f"OpenAI API error: {e}")
                return None
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    def generate_embeddings_batch(
        self, texts: List[str]
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in a batch.

        Args:
            texts (List[str]): List of texts to generate embeddings for

        Returns:
            List[Optional[List[float]]]: List of embedding vectors
        """
        try:
            if not texts:
                return []

            # Clean texts and filter out empty ones
            cleaned_texts = []
            text_indices = []

            for i, text in enumerate(texts):
                cleaned = self._clean_text(text)
                if cleaned:
                    cleaned_texts.append(cleaned)
                    text_indices.append(i)

            if not cleaned_texts:
                return [None] * len(texts)

            response = self.client.embeddings.create(
                model=self.EMBEDDING_MODEL, input=cleaned_texts, encoding_format="float"
            )

            # Create result list with None for empty inputs
            results = [None] * len(texts)

            for i, embedding_data in enumerate(response.data):
                original_index = text_indices[i]
                results[original_index] = embedding_data.embedding

            return results

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [None] * len(texts)

    def _clean_text(self, text: str) -> str:
        """
        Clean and prepare text for embedding generation.

        Args:
            text (str): Raw text

        Returns:
            str: Cleaned text
        """
        if not text:
            return ""

        # Remove extra whitespace and normalize
        cleaned = " ".join(text.strip().split())

        # Truncate if too long (OpenAI has token limits)
        # Rough estimate: 1 token ≈ 4 characters for English text
        max_chars = 8000 * 4  # Conservative limit for ~8k tokens
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars]
            logger.warning(f"Text truncated to {max_chars} characters for embedding")

        return cleaned

    def generate_media_embedding_text(self, media) -> str:
        """
        Generate comprehensive text representation of media for embedding.
        Now uses AI-powered multimodal analysis for richer content understanding.

        Args:
            media: Media object

        Returns:
            str: Text representation for embedding
        """
        text_parts = []

        # Add media name and type
        if media.name:
            text_parts.append(f"Name: {media.name}")

        text_parts.append(f"Type: {media.type}")

        # Generate AI-powered content summary for images and videos
        ai_summary = self._generate_ai_content_summary(media)
        if ai_summary:
            text_parts.append(f"Visual content: {ai_summary}")

        # Add tags if available
        if media.tags and isinstance(media.tags, list):
            tags_text = ", ".join(str(tag) for tag in media.tags if tag)
            if tags_text:
                text_parts.append(f"Tags: {tags_text}")

        # Extract relevant metadata
        if media.metadata:
            # Add filename if different from name
            filename = media.metadata.get("original_filename")
            if filename and filename != media.name:
                text_parts.append(f"Filename: {filename}")

            # Add MIME type info
            mime_type = media.metadata.get("mime_type")
            if mime_type:
                text_parts.append(f"Format: {mime_type}")

            # Add any description or caption if available
            description = media.metadata.get("description") or media.metadata.get(
                "caption"
            )
            if description:
                text_parts.append(f"Description: {description}")

        # Add caption metadata if available
        if media.caption_metadata:
            generation_type = media.caption_metadata.get("generation_type")
            if generation_type:
                text_parts.append(f"Generation type: {generation_type}")

            # Add any other relevant caption metadata
            for key, value in media.caption_metadata.items():
                if (
                    key not in ["generation_type", "source_media_id", "pipeline_run_id"]
                    and value
                ):
                    text_parts.append(f"{key}: {value}")

        # Add resolution and format info
        if hasattr(media, "resolution") and media.resolution:
            text_parts.append(f"Resolution: {media.resolution}")

        if hasattr(media, "format") and media.format:
            text_parts.append(f"File format: {media.format}")

        # Add duration for videos
        if (
            media.type == "video"
            and hasattr(media, "duration_in_seconds")
            and media.duration_in_seconds
        ):
            duration_text = self._format_duration(media.duration_in_seconds)
            text_parts.append(f"Duration: {duration_text}")

        return " | ".join(text_parts)

    def _generate_ai_content_summary(self, media, force_regenerate: bool = True) -> str:
        """
        Generate AI-powered content summary using multimodal analysis.
        Uses cached summary if available, otherwise generates new one.

        Args:
            media: Media object
            force_regenerate: If True, generate new summary even if cached one exists

        Returns:
            str: AI-generated summary of the media content, or empty string if failed
        """
        try:
            # Only generate AI summaries for images and videos
            if media.type not in ["image", "video"]:
                return ""

            # Check if we already have a cached AI summary and aren't forcing regeneration
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

            # Generate new AI summary
            logger.info(f"Generating new AI summary for media {media.id}")

            # Import here to avoid circular imports
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

    # Note: Similarity calculations are now handled directly in the database using pgvector
    # This eliminates the need for Python-based similarity calculations