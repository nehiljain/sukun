import logging

from .factory import CloudStorageFactory

logger = logging.getLogger(__name__)


def get_storage_factory():
    return CloudStorageFactory.get_storage_backend()


def upload_file_to_cloud(file_content, file_path, content_type):
    """Helper method to upload files to configured cloud storage and return public URL"""
    storage = CloudStorageFactory.get_storage_backend()
    return storage.upload_file(file_content, file_path, content_type)


def upload_files_batch_to_cloud(files):
    """Helper method to upload multiple files to configured cloud storage"""
    storage = CloudStorageFactory.get_storage_backend()
    return storage.upload_files_batch(files)
