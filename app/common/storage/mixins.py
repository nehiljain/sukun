from rest_framework.response import Response

from .factory import CloudStorageFactory


class CDNURLMixin:
    """Mixin to convert storage URLs to CDN URLs in responses"""

    def convert_urls_to_cdn(self, data):
        """Recursively convert storage URLs to CDN URLs in the response data"""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and (
                    "storage_url_path" in key
                    or "video_url" in key
                    or "audio_url" in key
                    or "image_url" in key
                ):
                    data[key] = CloudStorageFactory.get_cdn_url(value)
                elif isinstance(value, (dict, list)):
                    self.convert_urls_to_cdn(value)
        elif isinstance(data, list):
            for item in data:
                self.convert_urls_to_cdn(item)
        return data

    def finalize_response(self, request, response, *args, **kwargs):
        """Override finalize_response to convert URLs before sending"""
        if isinstance(response, Response):
            response.data = self.convert_urls_to_cdn(response.data)
        return super().finalize_response(request, response, *args, **kwargs)
