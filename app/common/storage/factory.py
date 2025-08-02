from django.conf import settings

from .base import CloudStorageBase
from .gcs_storage import GCSStorage
from .s3_storage import S3Storage


class CloudStorageFactory:
    _instance = None

    @classmethod
    def get_storage_backend(cls) -> CloudStorageBase:
        if not cls._instance:
            storage_backend = getattr(settings, "STORAGE_BACKEND", "gcs").lower()

            if storage_backend == "gcs":
                cls._instance = GCSStorage()
            elif storage_backend == "s3":
                cls._instance = S3Storage()
            else:
                raise ValueError(f"Unsupported storage backend: {storage_backend}")

        return cls._instance

    @classmethod
    def get_cdn_url(cls, file_path: str) -> str:
        """Get CDN URL for a file path"""
        storage = cls.get_storage_backend()
        return storage.get_cdn_url(file_path)
