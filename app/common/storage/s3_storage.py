import io
import logging
import os
from typing import BinaryIO, List, Optional, Union
from urllib.parse import urljoin, urlparse

import boto3
from botocore.exceptions import ClientError
from django.conf import settings

from .base import CloudStorageBase

logger = logging.getLogger(__name__)


class S3Storage(CloudStorageBase):
    def __init__(self):
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.cdn_base_url = settings.CDN_BASE_URL
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )

    def get_object(self, file_path: str) -> Optional[bytes]:
        try:
            # Check if file_path is a URL and extract the path component if it is
            if file_path.startswith(("http://", "https://")):
                parsed_url = urlparse(file_path)
                path = parsed_url.path.lstrip("/")
                if self.cdn_base_url and file_path.startswith(self.cdn_base_url):
                    file_path = path
                elif f"{self.bucket_name}.s3.amazonaws.com" in parsed_url.netloc:
                    file_path = path
                elif "storage.googleapis.com" in parsed_url.netloc:
                    file_path = path.replace("demodrive-media/", "", 1)
                else:
                    logger.warning(f"Unable to extract S3 key from URL: {file_path}")
                    file_path = path
                logger.info(f"Extracted S3 key '{file_path}' from URL")

            # Use download_fileobj for large files
            obj = self.s3_client.head_object(Bucket=self.bucket_name, Key=file_path)
            size = obj.get("ContentLength", 0)
            LARGE_FILE_THRESHOLD = 8 * 1024 * 1024  # 8MB
            if size > LARGE_FILE_THRESHOLD:
                buf = io.BytesIO()
                self.s3_client.download_fileobj(self.bucket_name, file_path, buf)
                buf.seek(0)
                return buf.read()
            else:
                response = self.s3_client.get_object(
                    Bucket=self.bucket_name, Key=file_path
                )
                return response["Body"].read()
        except ClientError as e:
            logger.error(f"Error getting object from S3: {e} for path: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Error getting object from S3: {e} for path: {file_path}")
            return None

    def upload_file(
        self, file_content: Union[str, BinaryIO], file_path: str, content_type: str
    ) -> Optional[str]:
        try:
            # If file_content is a string and is a path to a file, use upload_file for efficient streaming
            if isinstance(file_content, str) and os.path.isfile(file_content):
                self.s3_client.upload_file(
                    Filename=file_content,
                    Bucket=self.bucket_name,
                    Key=file_path,
                    ExtraArgs={"ContentType": content_type},
                )
                return self.get_cdn_url(file_path)

            # Helper to get file size
            def get_size(f):
                if isinstance(f, str):
                    return len(f.encode())
                elif hasattr(f, "fileno"):
                    try:
                        fileno = f.fileno()
                        return os.fstat(fileno).st_size
                    except Exception:
                        pass
                elif hasattr(f, "seek") and hasattr(f, "tell"):
                    pos = f.tell()
                    f.seek(0, 2)
                    size = f.tell()
                    f.seek(pos)
                    return size
                return None

            # Convert str to BytesIO for uniform handling (if not a file path)
            if isinstance(file_content, str):
                file_content = io.BytesIO(file_content.encode())

            size = get_size(file_content)
            MULTIPART_THRESHOLD = 8 * 1024 * 1024  # 8MB
            MAX_CHUNK_SIZE = 100 * 1024 * 1024  # 100MB
            MIN_CHUNK_SIZE = 8 * 1024 * 1024  # 8MB

            if size is not None and size > MULTIPART_THRESHOLD:
                # Calculate chunk size
                # S3 allows max 10,000 parts, so chunk size = ceil(size / 10,000), but cap at 100MB
                chunk_size = max(
                    MIN_CHUNK_SIZE, min(MAX_CHUNK_SIZE, (size // 9999) + 1)
                )
                mpu = self.s3_client.create_multipart_upload(
                    Bucket=self.bucket_name, Key=file_path, ContentType=content_type
                )
                upload_id = mpu["UploadId"]
                parts = []
                part_number = 1
                file_content.seek(0)
                try:
                    while True:
                        data = file_content.read(chunk_size)
                        if not data:
                            break
                        part = self.s3_client.upload_part(
                            Bucket=self.bucket_name,
                            Key=file_path,
                            PartNumber=part_number,
                            UploadId=upload_id,
                            Body=data,
                        )
                        parts.append({"ETag": part["ETag"], "PartNumber": part_number})
                        part_number += 1
                    self.s3_client.complete_multipart_upload(
                        Bucket=self.bucket_name,
                        Key=file_path,
                        UploadId=upload_id,
                        MultipartUpload={"Parts": parts},
                    )
                except Exception as e:
                    self.s3_client.abort_multipart_upload(
                        Bucket=self.bucket_name,
                        Key=file_path,
                        UploadId=upload_id,
                    )
                    logger.exception(f"Failed multipart upload to S3: {e}")
                    return None
            else:
                file_content.seek(0)
                self.s3_client.upload_fileobj(
                    file_content,
                    self.bucket_name,
                    file_path,
                    ExtraArgs={"ContentType": content_type},
                )
            return self.get_cdn_url(file_path)
        except ClientError as e:
            logger.exception(f"Failed to upload to S3: {e}")
            return None
        except Exception as e:
            logger.exception(f"Failed to upload to S3: {e}")
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
        """Convert storage path or GCS URL to CDN URL"""
        # Handle GCS URLs by extracting the path
        gcs_prefix = "https://storage.googleapis.com/demodrive-media/"
        if file_path.startswith(gcs_prefix):
            file_path = file_path[len(gcs_prefix) :]

        normalized_path = self.normalize_path(file_path)

        if self.cdn_base_url:
            return urljoin(self.cdn_base_url, normalized_path)

        # Fallback to direct S3 URL if no CDN configured
        return f"https://{self.bucket_name}.s3.amazonaws.com/{normalized_path}"

    def download_file_to_path(self, file_path: str, local_path: str) -> bool:
        """
        Download a file from S3 directly to a local file path, streaming the content to disk.
        Returns True if successful, False otherwise.
        """
        try:
            # Handle S3 URLs as in get_object
            if file_path.startswith(("http://", "https://")):
                parsed_url = urlparse(file_path)
                path = parsed_url.path.lstrip("/")
                if self.cdn_base_url and file_path.startswith(self.cdn_base_url):
                    file_path = path
                elif f"{self.bucket_name}.s3.amazonaws.com" in parsed_url.netloc:
                    file_path = path
                elif "storage.googleapis.com" in parsed_url.netloc:
                    file_path = path.replace("demodrive-media/", "", 1)
                else:
                    logger.warning(f"Unable to extract S3 key from URL: {file_path}")
                    file_path = path
                logger.info(
                    f"Extracted S3 key '{file_path}' from URL for download_file_to_path"
                )
            self.s3_client.download_file(self.bucket_name, file_path, local_path)
            return True
        except ClientError as e:
            logger.error(f"Error downloading file from S3: {e} for path: {file_path}")
            return False
        except Exception as e:
            logger.error(f"Error downloading file from S3: {e} for path: {file_path}")
            return False
