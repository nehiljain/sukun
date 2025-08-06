import base64
import io
import logging
import os
import tempfile
from typing import Any, Dict, Optional

import cv2
import openai
import requests
from common.storage.factory import CloudStorageFactory
from PIL import Image

logger = logging.getLogger(__name__)


class MultimodalSummarizationService:
    """Service for generating multimodal summaries of media files using OpenAI's vision models."""

    # Use O3 model as requested - optimized for RAG search
    VISION_MODEL = "gpt-4o"
    MAX_TOKENS = 150  # Reduced for more concise, focused summaries

    # Image processing settings
    MAX_IMAGE_SIZE = (1024, 1024)  # Resize large images for API efficiency
    SUPPORTED_IMAGE_FORMATS = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    }
    SUPPORTED_VIDEO_FORMATS = {
        "video/mp4",
        "video/mov",
        "video/avi",
        "video/webm",
        "video/mkv",
    }

    def __init__(self):
        """Initialize the service with OpenAI client."""
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            logger.error("OPENAI_API_KEY environment variable is not set")
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.client = openai.OpenAI(api_key=api_key)

    def encode_image(self, image_data: bytes) -> str:
        """Convert image bytes to base64 representation."""
        return base64.b64encode(image_data).decode("utf-8")

    def preprocess_image(self, image_data: bytes) -> bytes:
        """Preprocess image to optimize for API usage."""
        try:
            # Open image with PIL
            img = Image.open(io.BytesIO(image_data))

            # Convert to RGB if needed
            if img.mode in ("RGBA", "LA", "P"):
                # Create white background for transparency
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    background.paste(img, mask=img.split()[3])
                elif img.mode == "LA":
                    background.paste(img, mask=img.split()[1])
                else:
                    background.paste(img)
                img = background

            # Resize if too large
            if (
                img.size[0] > self.MAX_IMAGE_SIZE[0]
                or img.size[1] > self.MAX_IMAGE_SIZE[1]
            ):
                img.thumbnail(self.MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
                logger.info(f"Resized image to {img.size} for API efficiency")

            # Convert back to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format="JPEG", quality=85)
            return img_byte_arr.getvalue()

        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return image_data  # Return original if preprocessing fails

    def extract_video_frame(
        self, video_data: bytes, timestamp: float = 0.0
    ) -> Optional[bytes]:
        """Extract a frame from video data at specified timestamp."""
        try:
            # Save video data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_file:
                temp_file.write(video_data)
                temp_video_path = temp_file.name

            try:
                # Open video with OpenCV
                cap = cv2.VideoCapture(temp_video_path)

                if not cap.isOpened():
                    logger.error("Failed to open video file")
                    return None

                # Get video properties
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = total_frames / fps if fps > 0 else 0

                # Calculate frame number for timestamp
                if timestamp > duration:
                    timestamp = duration / 2  # Use middle frame if timestamp too large

                frame_number = int(timestamp * fps)

                # Seek to frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)

                # Read frame
                ret, frame = cap.read()
                if not ret:
                    logger.error("Failed to read video frame")
                    return None

                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Convert to PIL Image and then to bytes
                img = Image.fromarray(frame_rgb)
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format="JPEG", quality=85)

                return img_byte_arr.getvalue()

            finally:
                cap.release()
                os.unlink(temp_video_path)

        except Exception as e:
            logger.error(f"Error extracting video frame: {e}")
            return None

    def generate_image_summary(
        self, image_data: bytes, media_context: Dict[str, Any] = None
    ) -> Optional[str]:
        """Generate a detailed summary of an image using OpenAI's vision model."""
        try:
            # Preprocess the image
            processed_image = self.preprocess_image(image_data)
            img_base64 = self.encode_image(processed_image)

            # Create context-aware prompt
            prompt = self._create_image_prompt(media_context)

            response = self.client.chat.completions.create(
                model=self.VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_base64}",
                                    "detail": "high",  # Use high detail for better analysis
                                },
                            },
                        ],
                    }
                ],
                max_completion_tokens=self.MAX_TOKENS,
                # temperature=0.3,  # Lower temperature for more consistent descriptions
            )

            content = response.choices[0].message.content
            logger.info(f"Generated image summary: {len(content)} characters")
            return content

        except openai.AuthenticationError as e:
            logger.error(f"OpenAI authentication failed: {e}")
            return None
        except openai.RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            return None
        except Exception as e:
            logger.error(f"Error generating image summary: {e}")
            return None

    def generate_video_summary(
        self, video_data: bytes, media_context: Dict[str, Any] = None
    ) -> Optional[str]:
        """Generate a summary of a video by analyzing key frames."""
        try:
            # Extract multiple frames for better video understanding
            timestamps = [0.1, 0.3, 0.5, 0.7, 0.9]  # Sample at different points
            frame_summaries = []

            for i, timestamp_ratio in enumerate(timestamps):
                # Calculate actual timestamp (assuming context provides duration)
                duration = (
                    media_context.get("duration_seconds", 10) if media_context else 10
                )
                timestamp = timestamp_ratio * duration

                frame_data = self.extract_video_frame(video_data, timestamp)
                if frame_data:
                    frame_summary = self.generate_image_summary(
                        frame_data,
                        {
                            **media_context,
                            "frame_position": f"frame {i + 1}/{len(timestamps)} at {timestamp:.1f}s",
                        },
                    )
                    if frame_summary:
                        frame_summaries.append(
                            f"Frame at {timestamp:.1f}s: {frame_summary}"
                        )

            if not frame_summaries:
                logger.warning("No frames could be analyzed from video")
                return None

            # Combine frame summaries into overall video description
            combined_summary = " | ".join(frame_summaries)

            # Optionally summarize the combined description if too long
            if len(combined_summary) > 1000:
                combined_summary = self._summarize_text(combined_summary, media_context)

            logger.info(f"Generated video summary from {len(frame_summaries)} frames")
            return combined_summary

        except Exception as e:
            logger.error(f"Error generating video summary: {e}")
            return None

    def generate_media_summary(self, media, store_in_db: bool = True) -> Optional[str]:
        """Generate a comprehensive summary for any media type."""
        try:
            # Download media data
            media_data = self._download_media_data(media)
            if not media_data:
                logger.error(f"Failed to download media data for {media.id}")
                return None

            # Create context from media metadata
            context = self._create_media_context(media)

            # Generate summary based on media type
            summary = None
            if media.type == "image":
                summary = self.generate_image_summary(media_data, context)
            elif media.type == "video":
                summary = self.generate_video_summary(media_data, context)
            else:
                logger.warning(
                    f"Unsupported media type for summarization: {media.type}"
                )
                return None

            # Store the summary in the database if requested and successful
            if summary and store_in_db:
                self._store_ai_summary(media, summary)

            return summary

        except Exception as e:
            logger.error(f"Error generating media summary for {media.id}: {e}")
            return None

    def _store_ai_summary(self, media, summary: str) -> None:
        """Store the AI summary in the Media database record as JSON."""
        try:
            from django.utils import timezone

            # Create JSON structure for embedding_text
            ai_data = {
                "summary": summary,
                "model": self.VISION_MODEL,
                "generated_at": timezone.now().isoformat(),
            }

            media.embedding_text = ai_data

            # Save only the embedding_text field to avoid conflicts
            media.save(update_fields=["embedding_text"])

            logger.info(
                f"Stored AI summary for media {media.id} ({len(summary)} chars)"
            )

        except Exception as e:
            logger.error(f"Error storing AI summary for media {media.id}: {e}")

    def _download_media_data(self, media) -> Optional[bytes]:
        """Download media data from storage URL."""
        try:
            if not media.storage_url_path:
                logger.error(f"No storage URL for media {media.id}")
                return None

            # Try cloud storage first
            try:
                data = CloudStorageFactory.get_storage_backend().get_object(
                    media.storage_url_path
                )
                if data:
                    return data
            except Exception as e:
                logger.warning(f"Cloud storage failed, trying direct URL: {e}")

            # Fallback to direct URL download
            response = requests.get(media.storage_url_path, timeout=30)
            response.raise_for_status()
            return response.content

        except Exception as e:
            logger.error(f"Error downloading media data: {e}")
            return None

    def _create_media_context(self, media) -> Dict[str, Any]:
        """Create context dictionary from media object."""
        context = {
            "name": media.name,
            "type": media.type,
            "created_at": media.created_at.isoformat() if media.created_at else None,
        }

        # Add metadata if available
        if media.metadata:
            context.update(
                {
                    "filename": media.metadata.get("original_filename"),
                    "mime_type": media.metadata.get("mime_type"),
                    "size": media.metadata.get("size"),
                }
            )

        # Add video-specific context
        if hasattr(media, "duration_in_seconds") and media.duration_in_seconds:
            context["duration_seconds"] = media.duration_in_seconds

        if hasattr(media, "resolution") and media.resolution:
            context["resolution"] = media.resolution

        # Add tags if available
        if media.tags:
            context["tags"] = media.tags

        return context

    def _create_image_prompt(self, context: Dict[str, Any] = None) -> str:
        """Create a context-aware prompt optimized for RAG search."""
        base_prompt = """Create a concise, search-optimized description of this image. Focus on SEARCHABLE KEYWORDS and natural language that users would use to find this image.

PRIORITIZE in this order:
1. Main objects, items, products (clothing, furniture, electronics, etc.)
2. Colors, materials, patterns, textures
3. People, poses, actions, activities
4. Setting, location, environment type
5. Style, mood, lighting, composition
6. Text, logos, brands if visible

Write in natural, flowing sentences that emphasize the most important visual elements. Use specific, concrete terms that people would search for. Avoid overly structured lists or formal descriptions.

Example: "Blue cotton t-shirt on person with dark hair in studio lighting. Clean white background, casual wear, bright colors, fashion photography style."

Keep it under 150 words, prioritizing search relevance over comprehensive detail."""

        if context:
            # Add context-specific information to the prompt
            context_info = []
            if context.get("name"):
                context_info.append(f"Image name: {context['name']}")
            if context.get("tags"):
                context_info.append(f"Associated tags: {', '.join(context['tags'])}")
            if context.get("frame_position"):
                context_info.append(f"This is {context['frame_position']} of a video")

            if context_info:
                return (
                    f"{base_prompt}\n\nAdditional context: {' | '.join(context_info)}"
                )

        return base_prompt

    def _summarize_text(self, text: str, context: Dict[str, Any] = None) -> str:
        """Summarize long text using OpenAI."""
        try:
            # Build context-aware summarization prompt
            prompt = f"Summarize the following media analysis into a concise, comprehensive description suitable for search indexing:\n\n{text}"

            if context and context.get("name"):
                prompt += f"\n\nMedia name: {context['name']}"

            response = self.client.chat.completions.create(
                model="gpt-4o",  # Use a text model for summarization
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Error summarizing text: {e}")
            return text[:500]  # Fallback to truncation
