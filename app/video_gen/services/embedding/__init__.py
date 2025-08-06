import os

from .base_embedding_service import BaseEmbeddingService
from .pinecone_openai_embedding_service import PineconeOpenAIEmbeddingService
from .postgres_local_embedding_service import PostgresLocalEmbeddingService
from .postgres_openai_embedding_service import PostgresOpenAIEmbeddingService


def create_embedding_service(service_type: str = None) -> BaseEmbeddingService:
    """
    Factory function to create the appropriate embedding service.

    Args:
        service_type: Type of service to create ('postgres', 'pinecone', 'local').
                     If None, uses EMBEDDING_SERVICE_TYPE environment variable,
                     defaulting to 'pinecone'.

    Returns:
        BaseEmbeddingService: Configured embedding service instance
    """
    if service_type is None:
        service_type = os.getenv("EMBEDDING_SERVICE_TYPE", "pinecone").lower()

    if service_type == "postgres":
        return PostgresOpenAIEmbeddingService()
    elif service_type == "pinecone":
        return PineconeOpenAIEmbeddingService()
    elif service_type == "local":
        return PostgresLocalEmbeddingService()
    else:
        raise ValueError(
            f"Unknown embedding service type: {service_type}. Supported types: postgres, pinecone, local"
        )


__all__ = [
    "BaseEmbeddingService",
    "PostgresOpenAIEmbeddingService",
    "PineconeOpenAIEmbeddingService",
    "PostgresLocalEmbeddingService",
    "create_embedding_service",
]
