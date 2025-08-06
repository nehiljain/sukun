import logging
import os
from typing import List, Optional

import openai
from pinecone import Pinecone

from .base_embedding_service import BaseEmbeddingService

logger = logging.getLogger(__name__)


class PineconeOpenAIEmbeddingService(BaseEmbeddingService):
    """Service for generating embeddings using OpenAI and storing/searching in Pinecone."""

    def __init__(self):
        """Initialize the embedding service with OpenAI and Pinecone clients."""
        openai_api_key = os.getenv("OPENAI_API_KEY")
        pinecone_api_key = os.getenv("PINECONE_API_KEY")

        if not openai_api_key:
            logger.error("OPENAI_API_KEY environment variable is not set")
            raise ValueError("OPENAI_API_KEY environment variable is required")

        if not pinecone_api_key:
            logger.error("PINECONE_API_KEY environment variable is not set")
            raise ValueError("PINECONE_API_KEY environment variable is required")

        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        self.pinecone_client = Pinecone(api_key=pinecone_api_key)

        # Initialize index (you may want to make this configurable)
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "media-embeddings")

        try:
            self.index = self.pinecone_client.Index(self.index_name)
            logger.info(f"Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone index {self.index_name}: {e}")
            raise

    def generate_embedding(
        self, text: str, retry_count: int = 0
    ) -> Optional[List[float]]:
        """Generate embedding for a given text with retry logic."""
        max_retries = 2

        try:
            if not text or not text.strip():
                logger.warning("Empty or whitespace-only text provided for embedding")
                return None

            cleaned_text = self._clean_text(text)

            logger.info(f"Making embedding request with model: {self.EMBEDDING_MODEL}")
            logger.info(f"Text length: {len(cleaned_text)} characters")

            response = self.openai_client.embeddings.create(
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

                wait_time = (retry_count + 1) * 2
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

                wait_time = (retry_count + 1) * 1
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
        """Generate embeddings for multiple texts in a batch."""
        try:
            if not texts:
                return []

            cleaned_texts = []
            text_indices = []

            for i, text in enumerate(texts):
                cleaned = self._clean_text(text)
                if cleaned:
                    cleaned_texts.append(cleaned)
                    text_indices.append(i)

            if not cleaned_texts:
                return [None] * len(texts)

            response = self.openai_client.embeddings.create(
                model=self.EMBEDDING_MODEL, input=cleaned_texts, encoding_format="float"
            )

            results = [None] * len(texts)

            for i, embedding_data in enumerate(response.data):
                original_index = text_indices[i]
                results[original_index] = embedding_data.embedding

            return results

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [None] * len(texts)

    def store_embedding(
        self, media_id: str, embedding: List[float], metadata: dict = None
    ) -> bool:
        """Store embedding in Pinecone index."""
        try:
            vector_data = {
                "id": str(media_id),
                "values": embedding,
                "metadata": metadata or {},
            }

            self.index.upsert(vectors=[vector_data])
            logger.info(f"Stored embedding for media {media_id} in Pinecone")
            return True

        except Exception as e:
            logger.error(
                f"Failed to store embedding for media {media_id} in Pinecone: {e}"
            )
            return False

    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        metadata_filter: dict = None,
    ) -> List[dict]:
        """Search for similar embeddings in Pinecone."""
        try:
            search_kwargs = {
                "vector": query_embedding,
                "top_k": top_k,
                "include_metadata": True,
                "include_values": False,
            }

            if metadata_filter:
                search_kwargs["filter"] = metadata_filter

            results = self.index.query(**search_kwargs)

            return [
                {
                    "id": match["id"],
                    "score": match["score"],
                    "metadata": match.get("metadata", {}),
                }
                for match in results["matches"]
            ]

        except Exception as e:
            logger.error(f"Failed to search similar embeddings in Pinecone: {e}")
            return []
