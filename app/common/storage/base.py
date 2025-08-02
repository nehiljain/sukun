from abc import ABC, abstractmethod
from typing import BinaryIO, List, Optional, Union


class CloudStorageBase(ABC):
    """Abstract base class for cloud storage implementations"""

    @abstractmethod
    def get_object(self, file_path: str) -> Optional[bytes]:
        """Get an object from cloud storage"""
        pass

    @abstractmethod
    def upload_file(
        self, file_content: Union[str, BinaryIO], file_path: str, content_type: str
    ) -> Optional[str]:
        """Upload a single file to cloud storage"""
        pass

    @abstractmethod
    def upload_files_batch(self, files: List[dict]) -> List[dict]:
        """
        Upload multiple files in batch
        files: List of dicts with keys: file_content, file_path, content_type
        Returns: List of dicts with upload results
        """
        pass

    @abstractmethod
    def get_cdn_url(self, file_path: str) -> str:
        """Get CDN URL for a file path"""
        pass

    def normalize_path(self, file_path: str) -> str:
        """Normalize file path by removing leading slashes and bucket name if present"""
        # Remove leading slashes
        file_path = file_path.lstrip("/")

        # If path contains bucket name, remove it
        if self.bucket_name in file_path:
            file_path = file_path.replace(f"{self.bucket_name}/", "")

        return file_path

    @abstractmethod
    def download_file_to_path(self, file_path: str, local_path: str) -> bool:
        """Download a file from cloud storage to a local path"""
        pass
