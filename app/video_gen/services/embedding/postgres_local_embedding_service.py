import logging
import os
from typing import List, Optional

import requests

from .base_embedding_service import BaseEmbeddingService

logger = logging.getLogger(__name__)


class PostgresLocalEmbeddingService(BaseEmbeddingService):
    """Service for generating embeddings using local Qwen8 model and storing in PostgreSQL with pgvector."""

    EMBEDDING_MODEL = "text-embedding-qwen3-embedding-0.6b"
    EMBEDDING_DIMENSION = 1024  # Qwen8 embedding model output dimension

    def __init__(self):
        """Initialize the embedding service with local model endpoint."""
        self.local_endpoint = os.getenv(
            "LOCAL_EMBEDDING_ENDPOINT", "http://127.0.0.1:1234"
        )
        self.embeddings_url = f"{self.local_endpoint}/v1/embeddings"

        # Test connection to local model
        try:
            self._test_connection()
            logger.info(f"Connected to local embedding model at {self.local_endpoint}")
        except Exception as e:
            logger.error(
                f"Failed to connect to local embedding model at {self.local_endpoint}: {e}"
            )
            raise

    def _test_connection(self) -> bool:
        """Test connection to local embedding model."""
        try:
            response = requests.post(
                self.embeddings_url,
                json={"model": self.EMBEDDING_MODEL, "input": "test connection"},
                timeout=10,
            )
            response.raise_for_status()
            return True
        except Exception as e:
            raise ConnectionError(
                f"Cannot connect to local embedding model: {e}"
            ) from e

    def generate_embedding(
        self, text: str, retry_count: int = 0
    ) -> Optional[List[float]]:
        """Generate embedding for a given text using local model with retry logic."""
        max_retries = 2

        try:
            if not text or not text.strip():
                logger.warning("Empty or whitespace-only text provided for embedding")
                return None

            cleaned_text = self._clean_text(text)

            logger.info(
                f"Making embedding request with local model: {self.EMBEDDING_MODEL}"
            )
            logger.info(f"Text length: {len(cleaned_text)} characters")

            response = requests.post(
                self.embeddings_url,
                json={
                    "model": self.EMBEDDING_MODEL,
                    "input": cleaned_text,
                    "dimensions": "1024",
                },
                timeout=30,
            )

            response.raise_for_status()
            result = response.json()

            if "data" not in result or not result["data"]:
                logger.error("Invalid response from local embedding model")
                return None

            embedding = result["data"][0]["embedding"]

            if len(embedding) != self.EMBEDDING_DIMENSION:
                logger.info(
                    f"Detected embedding dimension: {len(embedding)} (expected: {self.EMBEDDING_DIMENSION})"
                )
                # Update our class attribute to match actual model output
                self.__class__.EMBEDDING_DIMENSION = len(embedding)

            return embedding

        except requests.exceptions.Timeout as e:
            if retry_count < max_retries:
                import time

                wait_time = (retry_count + 1) * 2
                logger.warning(
                    f"Request timeout, retrying in {wait_time} seconds (attempt {retry_count + 1}/{max_retries})"
                )
                time.sleep(wait_time)
                return self.generate_embedding(text, retry_count + 1)
            else:
                logger.error(
                    f"Local embedding model timeout after {max_retries} retries: {e}"
                )
                return None

        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error to local embedding model: {e}")
            return None

        except requests.exceptions.HTTPError as e:
            if retry_count < max_retries and e.response.status_code >= 500:
                import time

                wait_time = (retry_count + 1) * 1
                logger.warning(
                    f"Server error {e.response.status_code}, retrying in {wait_time} seconds (attempt {retry_count + 1}/{max_retries})"
                )
                time.sleep(wait_time)
                return self.generate_embedding(text, retry_count + 1)
            else:
                logger.error(f"HTTP error from local embedding model: {e}")
                return None

        except Exception as e:
            logger.error(f"Failed to generate embedding with local model: {e}")
            return None

    def generate_embeddings_batch(
        self, texts: List[str]
    ) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in a batch using local model."""
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

            # Check if local model supports batch requests
            try:
                response = requests.post(
                    self.embeddings_url,
                    json={"model": self.EMBEDDING_MODEL, "input": cleaned_texts},
                    timeout=60,
                )

                response.raise_for_status()
                result = response.json()

                results = [None] * len(texts)

                for i, embedding_data in enumerate(result["data"]):
                    original_index = text_indices[i]
                    results[original_index] = embedding_data["embedding"]

                return results

            except Exception as batch_error:
                logger.warning(
                    f"Batch request failed, falling back to individual requests: {batch_error}"
                )
                # Fall back to individual requests
                results = []
                for text in texts:
                    embedding = self.generate_embedding(text)
                    results.append(embedding)
                return results

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings with local model: {e}")
            return [None] * len(texts)
