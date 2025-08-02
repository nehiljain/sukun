import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from django.apps import apps
from django.core.files.uploadedfile import InMemoryUploadedFile
from video_gen.models import Media, VideoPipelineRun, VideoProject
from video_gen.utils.property_image_analyzer import PropertyImageAnalyzer

logger = logging.getLogger(__name__)


class VideoPipelineService:
    @staticmethod
    def parse_json_list(json_string: str) -> List[str]:
        """Parse JSON string to list, or return empty list if invalid"""
        if not isinstance(json_string, str):
            return []

        try:
            return json.loads(json_string)
        except json.JSONDecodeError:
            return []

    @staticmethod
    def get_or_create_session(session_key: str):
        """Get or create an anonymous session"""
        AnonymousSession = apps.get_model("user_org", "AnonymousSession")

        try:
            session = AnonymousSession.objects.get(session_key=session_key)
            session.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
            session.save()
        except AnonymousSession.DoesNotExist:
            session = AnonymousSession.objects.create(
                session_key=session_key,
                expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            )

        return session

    @staticmethod
    def create_video_project(
        is_authenticated: bool, user=None, session_key=None, aspect_ratio="16:9"
    ):
        """Create a video project for authenticated or anonymous users"""
        if not is_authenticated:
            session = VideoPipelineService.get_or_create_session(session_key)
            anonymous_org = apps.get_model("user_org", "Organization").objects.get(
                name="Anonymous"
            )
            anonymous_workspace = apps.get_model("user_org", "Workspace").objects.get(
                name="Anonymous"
            )

            return VideoProject.objects.create(
                name=f"Video Pipeline Run {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                is_public=True,
                aspect_ratio=aspect_ratio,
                org=anonymous_org,
                workspace=anonymous_workspace,
                anonymous_session=session,
            )
        else:
            return VideoProject.objects.create(
                name=f"Video Pipeline Run {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                org=user.appuser.active_org,
                aspect_ratio=aspect_ratio,
            )

    @staticmethod
    def analyze_image(
        media_source: Union[InMemoryUploadedFile, str],
        file_name: Optional[str] = None,
        is_url: bool = False,
    ) -> Tuple[str, Optional[Tuple[Union[InMemoryUploadedFile, str], Dict[str, Any]]]]:
        """
        Analyze an image file or URL and return file name with analysis results

        Args:
            media_source: Either InMemoryUploadedFile or URL string
            file_name: Name of the file (optional for URLs)
            is_url: Whether the media_source is a URL

        Returns:
            Tuple of (identifier, (media_source, analysis_data)) or (identifier, None) if analysis fails
        """
        try:
            identifier = file_name or str(uuid.uuid4())
            property_analyzer = PropertyImageAnalyzer()

            if not is_url and hasattr(media_source, "seek"):
                media_source.seek(0)

            image_info = property_analyzer.analyze_property_image(
                media_source, is_url=is_url
            )
            image_info_obj = image_info.model_dump()
            image_info_obj["analysis_timestamp"] = datetime.now().isoformat()
            return (identifier, (media_source, image_info_obj))
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return (identifier, None)

    @staticmethod
    def process_property_images(
        property_image_ids: List[str], video_project: VideoProject
    ) -> List[str]:
        """Process property image IDs, download images and pass to process_media_files"""
        if not property_image_ids:
            return []

        try:
            # Import PropertyImage model
            PropertyImage = apps.get_model("listings", "PropertyImage")
        except LookupError:
            logger.error("Property models not available")
            return []

        # Fetch all property images to avoid multiple DB queries
        try:
            property_images = list(
                PropertyImage.objects.filter(id__in=property_image_ids)
            )
            if not property_images:
                logger.error(f"No property images found for IDs: {property_image_ids}")
                return []
        except Exception as e:
            logger.error(f"Error fetching property images: {e}")
            return []

        # Download images and prepare them for processing
        from video_gen.services.media_service import MediaService

        downloaded_files = []

        for property_image in property_images:
            try:
                # Get the high-res image URL
                image_url = property_image.image_url.replace(
                    "s.jpg", "rd-w1920_h1080.webp"
                )

                # Create a filename for the downloaded image
                filename = f"property_image_{property_image.id}.webp"

                # Download the image file
                downloaded_file = MediaService.download_file_from_url(
                    image_url, filename
                )

                if not downloaded_file:
                    logger.error(
                        f"Failed to download property image: {property_image.id}"
                    )
                    continue

                # Add property image metadata to the downloaded file
                downloaded_file.property_metadata = {
                    "source": "property_image",
                    "property_image_id": str(property_image.id),
                    "property_id": str(property_image.property.id)
                    if hasattr(property_image, "property")
                    else None,
                    "is_primary": property_image.is_primary,
                    "alt_text": property_image.alt_text,
                    "propertyType": "property",
                    "roomType": "exterior" if property_image.is_primary else "interior",
                }

                downloaded_files.append(downloaded_file)

            except Exception as e:
                logger.error(
                    f"Error downloading property image {property_image.id}: {e}"
                )

        # Use process_media_files to handle the downloaded files
        if downloaded_files:
            return VideoPipelineService.process_media_files(
                downloaded_files, video_project
            )
        else:
            logger.warning("No property images could be downloaded successfully")
            return []

    @staticmethod
    def verify_media_ids(media_ids: List[str]) -> List[str]:
        """Verify that media IDs exist and return valid ones"""
        valid_media_ids = []

        for media_id in media_ids:
            try:
                # Verify the media exists
                media = Media.objects.get(id=media_id)
                # Add to list of media files for the pipeline
                valid_media_ids.append(str(media.id))
            except Media.DoesNotExist:
                logger.error(f"Media ID {media_id} not found")

        return valid_media_ids

    @staticmethod
    def process_media_files(
        media_files: List[InMemoryUploadedFile], video_project: VideoProject
    ) -> List[str]:
        """Process uploaded media files, analyze them and create media objects"""
        if not media_files:
            return []

        # Convert media_files into an ordered dictionary
        from collections import OrderedDict

        from video_gen.services.media_service import MediaService

        media_files_dict = OrderedDict(
            (media_file.name, media_file) for media_file in media_files
        )

        if not media_files_dict:
            return []

        # Initialize ordered dictionary for analyzed files
        analyzed_media_files = OrderedDict(
            (name, None) for name in media_files_dict.keys()
        )

        # Process images in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Submit all files for analysis
            future_to_filename = {}

            for file_name, media_file in media_files_dict.items():
                # For property images, we check if they have an original_url to analyze
                is_url = False
                source = media_file

                # If this is from a property image, use the original URL
                if hasattr(media_file, "original_url"):
                    is_url = True
                    source = media_file.original_url

                # Submit for analysis
                future = executor.submit(
                    VideoPipelineService.analyze_image,
                    source,
                    file_name,
                    is_url,  # true for URLs, false for uploaded files
                )
                future_to_filename[future] = file_name

            # Process results as they complete
            for future in as_completed(future_to_filename, timeout=60):
                try:
                    result = future.result()
                    file_name = future_to_filename[future]

                    if result and result[1]:  # identifier, result_tuple
                        _, analysis_data = result
                        logger.info(f"Analyzed image: {file_name}")
                        analyzed_media_files[file_name] = analysis_data
                    else:
                        logger.warning(f"Failed to analyze image: {file_name}")
                except TimeoutError:
                    logger.error(
                        f"Analysis timed out for file: {future_to_filename[future]}"
                    )
                except Exception as e:
                    logger.error(
                        f"Error analyzing file {future_to_filename[future]}: {e}"
                    )

        # Create media objects for analyzed files
        media_ids = []
        for file_name, media_file in media_files_dict.items():
            try:
                # Use analysis data from the analysis step
                analysis_result = analyzed_media_files.get(file_name)
                if not analysis_result:
                    logger.warning(f"No analysis data for file: {file_name}, skipping")
                    continue

                _, image_info = analysis_result

                # Get property_metadata if it exists
                property_metadata = getattr(media_file, "property_metadata", None)

                # Upload the media file
                media = MediaService.upload_media_file(
                    file=media_file,
                    prefix=video_project.id,
                    media_type=Media.Type.IMAGE,
                    org=video_project.org,
                    caption_metadata=image_info,
                    property_metadata=property_metadata,  # Pass property metadata if available
                )

                if media:
                    media_ids.append(str(media.id))
                else:
                    logger.error(f"Failed to upload media file: {file_name}")
            except Exception as e:
                logger.error(f"Error processing media file {file_name}: {e}")

        return media_ids

    @staticmethod
    def create_pipeline_run(
        media_ids: List[str], track_id: str, video_project: VideoProject
    ) -> VideoPipelineRun:
        """Create a pipeline run with the given media IDs and track ID"""
        return VideoPipelineRun.objects.create(
            status=VideoPipelineRun.Status.CREATED,
            input_payload={
                "media_files": media_ids,
                "track_id": track_id,
            },
            video_project=video_project,
        )
