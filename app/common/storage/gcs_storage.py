import logging
from typing import BinaryIO, List, Optional, Union
from urllib.parse import urljoin

from django.conf import settings
from google.cloud import storage

from .base import CloudStorageBase

logger = logging.getLogger(__name__)


class GCSStorage(CloudStorageBase):
    def __init__(self):
        self.credentials_path = settings.GCS_CREDENTIALS_PATH
        self.bucket_name = settings.GCS_BUCKET_NAME
        self.cdn_base_url = settings.CDN_BASE_URL
        self.storage_client = storage.Client.from_service_account_json(
            self.credentials_path
        )
        self.bucket = self.storage_client.bucket(self.bucket_name)

    def get_object(self, file_path: str) -> Optional[bytes]:
        blob = self.bucket.blob(file_path)
        return blob.download_as_bytes()

    def upload_file(
        self, file_content: Union[str, BinaryIO], file_path: str, content_type: str
    ) -> Optional[str]:
        try:
            blob = self.bucket.blob(file_path)

            if isinstance(file_content, str):
                blob.upload_from_string(file_content, content_type=content_type)
            else:
                blob.upload_from_file(file_content, content_type=content_type)

            return f"https://storage.googleapis.com/{self.bucket_name}/{file_path}"
        except Exception as e:
            logger.exception(f"Failed to upload to GCS: {e}")
            return None

    def upload_files_batch(self, files: List[dict]) -> List[dict]:
        results = []
        for file in files:
            url = self.upload_file(
                file["file_content"], file["file_path"], file["content_type"]
            )
            results.append(
                {"file_path": file["file_path"], "success": url is not None, "url": url}
            )
        return results

    def get_cdn_url(self, file_path: str) -> str:
        """Convert storage path to CDN URL"""
        normalized_path = self.normalize_path(file_path)

        if self.cdn_base_url:
            return urljoin(self.cdn_base_url, normalized_path)

        # Fallback to direct GCS URL if no CDN configured
        return f"https://storage.googleapis.com/{self.bucket_name}/{normalized_path}"

    def download_file_to_path(self, file_path: str, local_path: str) -> bool:
        pass
