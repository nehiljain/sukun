import hashlib
import io
import json
import logging
import os
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import cv2
import requests
from common.file_utils import (
    convert_avif_to_png_file,
    convert_heic_to_png_file,
    is_avif_file,
)
from common.storage.factory import CloudStorageFactory
from common.utils import json_serial
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import models
from PIL import Image
from user_org.models import Organization
from video_gen.models import ImageMetadata, Media, MediaMetadata, VideoMetadata
from video_gen.tasks import create_thumbnail_task

logger = logging.getLogger(__name__)

# Buffer constants
BUFFER_SIZE = 1000  # Number of records to buffer before writing to GCS


class MediaService:
    @staticmethod
    def create_media_record(
        name: str, org: Organization, media_type: str = None
    ) -> Media:
        """Create a new media record"""
        return Media.objects.create(name=name, org=org, type=media_type)

    @staticmethod
    def save_backup(data: dict, prefix: str) -> None:
        """Save backup files to local storage"""
        timestamp = datetime.utcnow()
        filename = f"{prefix}_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        with open(os.path.join(settings.BACKUP_DIR, filename), "w") as f:
            if isinstance(data, str):
                f.write(data)
            else:
                json.dump(data, f)

    @staticmethod
    def process_capture_data(
        local_buffer: List[Dict], data: Dict, org_id: str
    ) -> Tuple[Media, bool]:
        """Process capture data and create media record"""
        try:
            # Validate org ID is a valid UUID
            UUID(str(org_id))

            org = Organization.objects.get(id=org_id)

            # Create Capture record
            capture = Media.objects.create(name=data["name"], org=org)

            # Add timestamp
            timestamp = datetime.utcnow()
            data["timestamp"] = timestamp.isoformat()

            # Handle buffer upload if needed
            upload_success = True
            if len(local_buffer) >= BUFFER_SIZE:
                buffer_data = local_buffer.copy()
                local_buffer.clear()

                upload_success = CloudStorageFactory.get_storage_backend().upload_file(
                    json.dumps(buffer_data),
                    f"mouse_captures/{capture.id}/capture_{timestamp.strftime('%H-%M-%S')}.json",
                    "application/json",
                )

            return capture, upload_success
        except Organization.DoesNotExist as e:
            raise ValueError(f"Organization with ID {org_id} not found") from e
        except Exception as e:
            logger.exception(f"Error processing capture data: {e}")
            raise

    @staticmethod
    def process_streaming_events(
        capture: Media,
        events: List[Dict],
        batch_index: int,
        timestamp: float,
        capture_buffers: Dict[str, Dict[str, Any]],
    ) -> Dict:
        """Process streaming events for a capture"""
        try:
            if capture.id not in capture_buffers:
                storage_dir = f"mouse_captures/{capture.id}"
                capture.storage_dir = storage_dir
                capture.save()
                capture_buffers[capture.id] = {"buffer": [], "batch_count": 0}

            buffer_data = capture_buffers[capture.id]
            buffer_data["buffer"].extend(events)
            buffer_data["batch_count"] += 1

            # Log event types distribution
            event_types = {}
            for event in events:
                event_type = event.get("type", "unknown")
                event_types[event_type] = event_types.get(event_type, 0) + 1

            # Handle buffer upload if needed
            if len(buffer_data["buffer"]) >= BUFFER_SIZE:
                current_time = datetime.utcnow()
                upload_success = MediaService.upload_buffer_to_gcs(
                    buffer_data["buffer"], current_time, capture.id
                )
                if not upload_success:
                    capture.status = Media.Status.ERROR
                    capture.save()
                    MediaService.save_backup(
                        buffer_data["buffer"], f"streaming_events_backup_{capture.id}"
                    )
                buffer_data["buffer"].clear()

            return {
                "status": "success",
                "message": f"Received batch {batch_index} with {len(events)} events",
                "totalEventsReceived": len(buffer_data["buffer"]),
                "totalBatches": buffer_data["batch_count"],
                "eventTypes": event_types,
            }
        except Exception as e:
            logger.exception(f"Error processing streaming events: {e}")
            raise

    @staticmethod
    def finalize_capture(
        capture: Media, capture_buffers: Dict[str, Dict[str, Any]]
    ) -> Tuple[bool, str]:
        """Finalize a capture and upload remaining events"""
        try:
            if capture.id not in capture_buffers:
                return False, "No events found for this capture"

            buffer_data = capture_buffers[capture.id]

            if buffer_data["buffer"]:
                current_time = datetime.utcnow()
                upload_success = MediaService.upload_buffer_to_gcs(
                    buffer_data["buffer"], current_time, capture.id, is_final=True
                )

                if not upload_success:
                    MediaService.save_backup(
                        buffer_data["buffer"],
                        f"final_streaming_events_backup_{capture.id}",
                    )
                    capture.status = Media.Status.ERROR
                else:
                    capture.status = Media.Status.COMPLETE

            capture.save()
            del capture_buffers[capture.id]
            return True, capture.status

        except Exception as e:
            logger.exception(f"Error finalizing capture: {e}")
            raise

    @staticmethod
    def get_capture_stats(
        capture_id: str, capture_buffers: Dict[str, Dict[str, Any]]
    ) -> Optional[Dict]:
        """Get statistics about captured events"""
        try:
            if capture_id not in capture_buffers:
                return None

            buffer_data = capture_buffers[capture_id]
            event_types = {}
            for event in buffer_data["buffer"]:
                event_type = event.get("type", "unknown")
                event_types[event_type] = event_types.get(event_type, 0) + 1

            return {
                "totalEvents": len(buffer_data["buffer"]),
                "totalBatches": buffer_data["batch_count"],
                "eventTypes": event_types,
            }
        except Exception as e:
            logger.exception(f"Error getting capture stats: {e}")
            return None

    @staticmethod
    def search_media(
        query: str,
        org: Organization,
        media_type: str = None,
        date_from: str = None,
        date_to: str = None,
        tags: List[str] = None,
        use_semantic_search: bool = True,
        similarity_threshold: float = 0.3,
        max_results: int = 50,
    ) -> List[Media]:
        """Search media items using semantic search with fallback to basic search"""
        try:
            if not query:
                return []

            # Try semantic search first if enabled and query is substantial
            if use_semantic_search and len(query.strip()) > 3:
                semantic_results = MediaService._semantic_search(
                    query,
                    org,
                    media_type,
                    date_from,
                    date_to,
                    tags,
                    similarity_threshold,
                    max_results,
                )
                if semantic_results:
                    logger.info(
                        f"Semantic search returned {len(semantic_results)} results"
                    )
                    return semantic_results
                else:
                    logger.info(
                        "Semantic search returned no results, falling back to basic search"
                    )

            # Fallback to basic search
            return MediaService._basic_search(
                query, org, media_type, date_from, date_to, tags
            )

        except Exception as e:
            logger.exception(f"Error searching media: {e}")
            return []

    @staticmethod
    def _semantic_search(
        query: str,
        org: Organization,
        media_type: str = None,
        date_from: str = None,
        date_to: str = None,
        tags: List[str] = None,
        similarity_threshold: float = 0.7,
        max_results: int = 50,
    ) -> List[Media]:
        """Perform semantic search using pgvector similarity search in database"""
        try:
            from pgvector.django import CosineDistance

            from app.video_gen.services.embedding import create_embedding_service

            # Generate embedding for the search query (keeping it generic)
            embedding_service = create_embedding_service()
            query_embedding = embedding_service.generate_embedding(query)

            if not query_embedding:
                logger.warning("Failed to generate embedding for search query")
                return []

            # Start with base queryset filtering by organization and non-null embeddings
            queryset = Media.objects.filter(org=org, embedding__isnull=False)

            # Debug: Log initial counts
            total_media_count = Media.objects.filter(org=org).count()
            media_with_embeddings_count = queryset.count()
            logger.info("🔍 SEMANTIC SEARCH DEBUG:")
            logger.info(f"  Query: '{query}'")
            logger.info(f"  Organization: {org.id} ({org.name})")
            logger.info(f"  Total media in org: {total_media_count}")
            logger.info(f"  Media with embeddings: {media_with_embeddings_count}")

            # Apply additional filters
            if media_type:
                queryset = queryset.filter(type=media_type)
                logger.info(
                    f"  Filtered by media_type '{media_type}': {queryset.count()}"
                )
            if date_from:
                queryset = queryset.filter(created_at__gte=date_from)
                logger.info(
                    f"  Filtered by date_from '{date_from}': {queryset.count()}"
                )
            if date_to:
                queryset = queryset.filter(created_at__lte=date_to)
                logger.info(f"  Filtered by date_to '{date_to}': {queryset.count()}")
            if tags:
                for tag in tags:
                    queryset = queryset.filter(tags__contains=[tag])
                logger.info(f"  Filtered by tags {tags}: {queryset.count()}")

            # Use pgvector's cosine distance for similarity search
            # cosine distance = 1 - cosine similarity, so threshold needs to be inverted
            distance_threshold = 1 - similarity_threshold
            logger.info(
                f"  Similarity threshold: {similarity_threshold} (distance_threshold: {distance_threshold:.3f})"
            )

            # First, let's see ALL distances without threshold filtering for debugging
            all_results_with_distances = list(
                queryset.annotate(distance=CosineDistance("embedding", query_embedding))
                .annotate(similarity=models.Value(1.0) - models.F("distance"))
                .order_by("distance")[:20]  # Get top 20 for debugging
            )

            logger.info("  🎯 TOP DISTANCES (without threshold):")
            for i, media in enumerate(all_results_with_distances[:10]):  # Show top 10
                try:
                    distance = float(media.distance)
                    similarity = 1.0 - distance
                    logger.info(
                        f"    {i + 1:2d}. {media.name[:50]:<50} | Distance: {distance:.4f} | Similarity: {similarity:.4f}"
                    )
                except AttributeError as e:
                    logger.error(f"    {i + 1:2d}. {media.name[:50]:<50} | ERROR: {e}")
                except Exception as e:
                    logger.error(
                        f"    {i + 1:2d}. {media.name[:50]:<50} | UNEXPECTED ERROR: {e}"
                    )

            if len(all_results_with_distances) == 0:
                logger.warning("  ❌ No media found with embeddings after filtering!")
                return []

                # Now apply the threshold filter
            results = []
            for media in all_results_with_distances:
                try:
                    if float(media.distance) <= distance_threshold:
                        results.append(media)
                except (AttributeError, TypeError, ValueError) as e:
                    logger.warning(
                        f"  ⚠️  Skipping media {media.name} due to distance error: {e}"
                    )
                    continue

            logger.info("  📊 THRESHOLD RESULTS:")
            logger.info(f"    Distance threshold: {distance_threshold:.4f}")
            logger.info(f"    Results above threshold: {len(results)}")

            if len(results) > 0:
                try:
                    best_distance = float(results[0].distance)
                    best_similarity = 1.0 - best_distance
                    logger.info(
                        f"    Best match: {results[0].name} (distance: {best_distance:.4f}, similarity: {best_similarity:.4f})"
                    )
                except (AttributeError, TypeError, ValueError) as e:
                    logger.info(
                        f"    Best match: {results[0].name} (distance calculation error: {e})"
                    )
            else:
                try:
                    best_distance = (
                        float(all_results_with_distances[0].distance)
                        if all_results_with_distances
                        else "N/A"
                    )
                except (AttributeError, TypeError, ValueError):
                    best_distance = "Error accessing distance"
                logger.warning(
                    f"    ❌ No results meet threshold! Best distance was: {best_distance}"
                )
                logger.warning(
                    f"    💡 Try lowering similarity_threshold (currently {similarity_threshold}) or check embedding quality"
                )

            # Return only the requested number of results
            final_results = results[:max_results]
            logger.info(f"  ✅ Returning {len(final_results)} results")

            return final_results

        except Exception as e:
            logger.exception(f"Error in semantic search: {e}")
            return []

    @staticmethod
    def _basic_search(
        query: str,
        org: Organization,
        media_type: str = None,
        date_from: str = None,
        date_to: str = None,
        tags: List[str] = None,
    ) -> List[Media]:
        """Perform basic text-based search"""
        try:
            search_query = (
                models.Q(name__icontains=query)
                | models.Q(type__icontains=query)
                | models.Q(metadata__contains=query)
            )

            if media_type:
                search_query &= models.Q(type=media_type)
            if date_from:
                search_query &= models.Q(created_at__gte=date_from)
            if date_to:
                search_query &= models.Q(created_at__lte=date_to)
            if tags:
                search_query &= models.Q(tags__overlap=tags)

            logger.info(f"Basic search query: {search_query}")
            return list(Media.objects.filter(org=org).filter(search_query)[:50])

        except Exception as e:
            logger.exception(f"Error in basic search: {e}")
            return []

    @staticmethod
    def generate_and_store_embedding(media: Media, force: bool = False) -> bool:
        """
        Generate and store embedding for a media item

        Args:
            media: Media object to process
            force: If True, regenerate embedding even if it already exists
        """
        try:
            from app.video_gen.services.embedding import create_embedding_service

            # Check if embedding already exists and force is not enabled
            if media.embedding is not None and not force:
                logger.info(
                    f"Media {media.id} already has embedding, skipping (use force=True to regenerate)"
                )
                return True

            embedding_service = create_embedding_service()

            # Generate text representation of the media (includes AI analysis for images/videos)
            text_content = embedding_service.generate_media_embedding_text(media)

            if not text_content:
                logger.warning(f"No text content generated for media {media.id}")
                return False

            # Generate embedding
            embedding = embedding_service.generate_embedding(text_content)

            if embedding:
                logger.info(f"Embedding for media {media.id}: {len(embedding)}")
                # Store previous embedding for logging
                had_previous = media.embedding is not None

                media.embedding = embedding
                media.save(update_fields=["embedding"])

                action = "Regenerated" if had_previous else "Generated"
                logger.info(f"{action} and stored embedding for media {media.id}")
                return True
            else:
                logger.warning(f"Failed to generate embedding for media {media.id}")
                return False

        except Exception as e:
            logger.exception(f"Error generating embedding for media {media.id}: {e}")
            return False

    @staticmethod
    def generate_image_thumbnail(media: Media) -> Optional[str]:
        """Generate thumbnail for image media"""
        try:
            response = requests.get(media.storage_url_path)
            img = Image.open(io.BytesIO(response.content))

            if img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            ):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    background.paste(img, mask=img.split()[3])
                else:
                    background.paste(img)
                img = background

            max_size = (300, 300)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            thumb_io = io.BytesIO()
            img.save(thumb_io, format="JPEG", quality=85)
            thumb_io.seek(0)

            thumbnail_path = f"thumbnails/images/{media.id}.jpg"
            return CloudStorageFactory.get_storage_backend().upload_file(
                thumb_io, thumbnail_path, "image/jpeg"
            )
        except Exception as e:
            logger.error(f"Error generating image thumbnail for media {media.id}: {e}")
            return None

    @staticmethod
    def generate_video_thumbnail(
        input_video_path: str, output_video_path_prefix: str
    ) -> Optional[str]:
        """Generate thumbnail for video media"""

        video_path = f"/tmp/{output_video_path_prefix}.mp4"
        try:
            response = requests.get(input_video_path)
            with open(video_path, "wb") as f:
                f.write(response.content)

            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            if ret:
                height, width = frame.shape[:2]
                max_size = 300
                if height > width:
                    new_height = max_size
                    new_width = int(width * (max_size / height))
                else:
                    new_width = max_size
                    new_height = int(height * (max_size / width))

                frame = cv2.resize(frame, (new_width, new_height))
                _, buffer = cv2.imencode(".jpg", frame)
                thumb_io = io.BytesIO(buffer)

                thumbnail_path = f"thumbnails/videos/{output_video_path_prefix}.jpg"
                return CloudStorageFactory.get_storage_backend().upload_file(
                    thumb_io, thumbnail_path, "image/jpeg"
                )
            return None
        except Exception as e:
            logger.error(f"Error generating video thumbnail: {e}")
            return None
        finally:
            if "cap" in locals():
                cap.release()
            if os.path.exists(video_path):
                os.remove(video_path)

    @staticmethod
    def get_image_md5(file) -> str:
        """Calculate MD5 hash of an image file (handles UploadedFile and BytesIO)"""
        md5_hash = hashlib.md5()
        file.seek(0)  # Ensure we are at the start of the file

        if hasattr(file, "chunks"):
            # Handle Django UploadedFile
            for chunk in file.chunks():
                md5_hash.update(chunk)
        else:
            # Handle file-like objects like io.BytesIO
            md5_hash.update(file.read())

        file.seek(0)  # Reset pointer again for potential further use
        return md5_hash.hexdigest()

    @staticmethod
    def get_associated_video(image_media: Media) -> Optional[Media]:
        """Find the associated video for an image media record"""
        try:
            # If this is a duplicate image, get the original image's ID
            original_image_id = image_media.metadata.get("original_media_id")
            source_image_id = (
                original_image_id if original_image_id else str(image_media.id)
            )

            # Find video that was generated from this image
            video = Media.objects.filter(
                type="video",
                org=image_media.org,
                caption_metadata__source_media_id=source_image_id,
                caption_metadata__generation_type="luma_video",
            ).first()

            return video
        except Exception as e:
            logger.exception(f"Error finding associated video: {e}")
            return None

    @staticmethod
    def get_duplicate_media_with_videos(
        file_hash: str, org: Organization
    ) -> List[Tuple[Media, str]]:
        """
        Find all (image, video_id) pairs where the image has the given file hash
        and there's at least one video generated from that image

        Returns:
            List of tuples containing (image_media, video_id)
        """
        # Find all images with the given hash
        images = Media.objects.filter(
            org=org, type="image", metadata__contains={"md5_hash": file_hash}
        )

        if not images.exists():
            return []

        # Get all image IDs and convert them to strings
        image_ids = [str(id) for id in images.values_list("id", flat=True)]

        # Find all videos that have any of these images as source
        videos = Media.objects.filter(
            org=org,
            type="video",
            caption_metadata__source_media_id__in=image_ids,
        )

        # Create a mapping of source_media_id to video_id
        source_to_video_map = {}
        for video in videos:
            source_id = video.caption_metadata.get("source_media_id")
            if source_id:
                source_to_video_map[source_id] = str(video.id)

        # Create the result list of (image, video_id) pairs
        result = []
        for image in images:
            image_id = str(image.id)
            if image_id in source_to_video_map:
                result.append((image, source_to_video_map[image_id]))

        return result

    @staticmethod
    def is_heic_file(file) -> bool:
        """Check if a file is a HEIC file"""
        return file.content_type == "image/heic" or file.name.lower().endswith(".heic")

    @staticmethod
    def upload_media_file(
        file: SimpleUploadedFile,
        prefix: str,
        media_type: str,
        org: Organization,
        caption_metadata: Dict = None,
        property_metadata: Dict = None,
        custom_path: str = None,
    ) -> Optional[Media]:
        """Upload media file (video/audio/image) and create Media record"""
        try:
            # Include microseconds for higher precision and collision avoidance
            # Use the potentially updated original_filename
            safe_original_filename = file.name.replace("%20", "_")
            filename = f"{media_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}_{safe_original_filename}"
            # Use custom path if provided, otherwise use the default path construction
            gcs_file_path = (
                custom_path
                if custom_path
                else f"{media_type}_uploads/{prefix}/{filename}"
            )

            # --- HEIC/AVIF Conversion Start ---
            if media_type == Media.Type.IMAGE:
                if MediaService.is_heic_file(file):
                    file = convert_heic_to_png_file(file)
                elif is_avif_file(file):
                    file = convert_avif_to_png_file(file)
            # --- HEIC/AVIF Conversion End ---

            if not file:
                return None

            # Handle image deduplication
            file_hash = None
            if media_type == "image":
                # Calculate MD5 hash of the image (original or converted)
                # Ensure file pointer is at the beginning before hashing
                file.seek(0)
                file_hash = MediaService.get_image_md5(file)
                file.seek(0)  # Reset pointer again for upload

                # Check if an image with this hash already exists for this organization
                duplicate_media = MediaService.get_duplicate_media_with_videos(
                    file_hash, org
                )
                if duplicate_media:
                    logger.info(
                        f"Found duplicate image for {file_hash}: {duplicate_media[0][0].id} with video:{duplicate_media[0][1]}"
                    )
                    existing_media = duplicate_media[0][0]
                    existing_video_id = duplicate_media[0][1]

                    logger.info(
                        f"Found duplicate image with video for {file_hash}: {existing_media.id}"
                    )
                    # Create a new Media record that points to the existing file
                    image_metadata = ImageMetadata(
                        md5_hash=file_hash,
                        original_filename=safe_original_filename,
                        mime_type=file.content_type,
                        size=file.size,
                        uploaded_at=datetime.utcnow().isoformat(),
                        prefix=str(prefix) if isinstance(prefix, UUID) else prefix,
                        is_duplicate=True,
                        original_media_id=str(existing_media.id),
                    )
                    # Ensure property_metadata UUIDs are converted to strings
                    if property_metadata:
                        serialized_metadata = {}
                        for key, value in property_metadata.items():
                            if isinstance(value, UUID):
                                serialized_metadata[key] = str(value)
                            else:
                                serialized_metadata[key] = value
                        image_metadata.update(serialized_metadata)

                    new_media = Media.objects.create(
                        name=safe_original_filename,
                        type=media_type,
                        storage_url_path=existing_media.storage_url_path,
                        org=org,
                        caption_metadata=caption_metadata,
                        metadata=json_serial(image_metadata.model_dump()),
                    )
                    create_thumbnail_task.delay(new_media.id)
                    # Check if there's an associated video we can reuse
                    existing_video = Media.objects.get(id=existing_video_id)
                    # logger.info(
                    #     f"Found existing video for duplicate image {existing_media.id} : {existing_video.id}"
                    # )
                    # Create a new video record pointing to the existing video file
                    # Convert the pipeline_run_id to string if it's a UUID
                    pipeline_run_id = existing_video.caption_metadata.get(
                        "pipeline_run_id"
                    )
                    if isinstance(pipeline_run_id, UUID):
                        pipeline_run_id = str(pipeline_run_id)

                    video_metadata = VideoMetadata(
                        original_filename=existing_video.metadata.get("filename"),
                        mime_type=existing_video.metadata.get("mime_type"),
                        size=existing_video.metadata.get("size"),
                        uploaded_at=datetime.utcnow().isoformat(),
                        prefix=str(prefix) if isinstance(prefix, UUID) else prefix,
                        is_duplicate=True,
                        original_media_id=str(existing_media.id),
                    )
                    new_video = Media.objects.create(
                        name=f"Motion Magic - {safe_original_filename}",
                        type=Media.Type.VIDEO,
                        storage_url_path=existing_video.storage_url_path,
                        org=org,
                        caption_metadata={
                            "source_media_id": str(new_media.id),
                            "original_video_id": str(existing_video.id),
                            "pipeline_run_id": pipeline_run_id,
                            "generation_type": "luma_video",
                            "is_duplicate": True,
                        },
                        metadata=json_serial(video_metadata.model_dump()),
                    )
                    create_thumbnail_task.delay(new_video.id)
                    logger.info(f"Created duplicate video media_id: {new_video.id}")

                    return new_media

                # Reset file pointer after MD5 calculation
                file.seek(0)

            # Upload file to GCS (original or converted)
            # Use the potentially updated original_content_type
            public_url = CloudStorageFactory.get_storage_backend().upload_file(
                file, gcs_file_path, file.content_type
            )
            logger.info(f"Uploaded media file: {public_url}")
            if not public_url:
                return None

            media_metadata = MediaMetadata(
                original_filename=filename,
                mime_type=file.content_type,
                size=file.size,
                uploaded_at=datetime.utcnow().isoformat(),
            )

            # Add MD5 hash to metadata for images
            if media_type == "image":
                media_metadata.md5_hash = file_hash
                media_metadata.is_duplicate = False

            # Add property metadata if available
            if property_metadata:
                media_metadata.update(property_metadata)

            # Generate a thumbnail URL if it's from a property image
            thumbnail_url = None
            if property_metadata and "property_image_id" in property_metadata:
                original_url = getattr(file, "original_url", None)
                if original_url and original_url.endswith("rd-w1920_h1080.webp"):
                    thumbnail_url = original_url.replace(
                        "rd-w1920_h1080.webp", "rd-w960_h720.webp"
                    )

            new_media = Media.objects.create(
                name=safe_original_filename,
                type=media_type,
                storage_url_path=public_url,
                thumbnail_url=thumbnail_url,
                org=org,
                caption_metadata=caption_metadata,
                metadata=json_serial(media_metadata.model_dump()),
            )
            create_thumbnail_task.delay(new_media.id)
            return new_media
        except Exception as e:
            logger.exception(f"Error uploading {media_type} file: {e}")
            return None

    @staticmethod
    def upload_buffer_to_gcs(
        buffer_data: List[Dict],
        timestamp: datetime,
        capture_id: str,
        is_final: bool = False,
    ) -> bool:
        """Upload buffer data to GCS"""
        try:
            file_suffix = "final" if is_final else timestamp.strftime("%H-%M-%S")
            gcs_path = f"mouse_captures/{capture_id}/capture_{file_suffix}.json"

            return CloudStorageFactory.get_storage_backend().upload_file(
                json.dumps(buffer_data), gcs_path, "application/json"
            )
        except Exception as e:
            logger.exception(f"Error uploading buffer to GCS: {e}")
            return False

    @staticmethod
    def download_file_from_url(url: str, filename: str = None) -> Optional[io.BytesIO]:
        """
        Download a file from a URL and return it as a BytesIO object

        Args:
            url: The URL to download the file from
            filename: Optional filename to assign to the BytesIO object

        Returns:
            BytesIO object containing the file data, or None if download failed
        """
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()

            # Create BytesIO object
            file_obj = io.BytesIO(response.content)

            # Set attributes to mimic Django UploadedFile
            file_obj.name = filename or os.path.basename(url)
            file_obj.size = len(response.content)
            file_obj.content_type = response.headers.get(
                "Content-Type", "application/octet-stream"
            )
            file_obj.original_url = url  # Store the original URL for reference

            logger.info(f"Successfully downloaded file from URL: {url}")
            return file_obj
        except Exception as e:
            logger.error(f"Error downloading file from URL {url}: {e}")
            return None

    @staticmethod
    def split_image_preview(media: Media) -> Tuple[List[str], bool]:
        """
        Create preview of splitting a landscape image into multiple 9:16 portrait images
        Returns temporary URLs for the preview images without saving them

        Args:
            media: The Media object for the original image

        Returns:
            Tuple of (List of URLs for the split images, boolean indicating if it's a wide image)
        """
        try:
            # Download the original image
            file_obj = MediaService.download_file_from_url(
                media.storage_url_path, f"{media.id}_original.jpg"
            )

            if not file_obj:
                logger.error(f"Failed to download image {media.id}")
                return [], False

            # Open the image with PIL
            img = Image.open(file_obj)

            # Calculate dimensions
            width, height = img.size

            # For 9:16 portrait, the aspect ratio is 9/16 = 0.5625
            target_aspect = 9 / 16

            # Determine if it's a wide image requiring multiple splits
            is_wide_image = width / height > 1.8  # Wider than 16:9

            # Calculate how many portrait images we need
            # A single 9:16 image has width = height * 9/16
            # So we need width / (height * 9/16) images to cover the whole width
            portrait_width = int(height * target_aspect)

            # We want 25% overlap between adjacent images
            overlap_percent = 0.01
            effective_width = portrait_width * (1 - overlap_percent)

            # Calculate number of images needed (rounded up)
            num_images_needed = max(2, int(width / effective_width + 0.99))

            # Generate preview URLs
            preview_urls = []
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

            # For single centered crop
            if num_images_needed >= 1:
                # Calculate center crop
                center_x = width // 2
                center_crop_width = min(width, portrait_width)
                left = max(0, center_x - center_crop_width // 2)
                right = min(width, left + center_crop_width)

                # Crop image
                center_crop = img.crop((left, 0, right, height))

                # Resize to maintain 9:16 aspect ratio if needed
                target_height = int(center_crop_width / target_aspect)
                if height != target_height:
                    center_crop = center_crop.resize(
                        (center_crop_width, target_height), Image.Resampling.LANCZOS
                    )

                # Save and upload
                center_io = io.BytesIO()
                center_crop.save(center_io, format="JPEG", quality=90)
                center_io.seek(0)

                # Upload to temporary storage
                center_path = f"temp/previews/{media.id}_center_{timestamp}.jpg"
                center_url = CloudStorageFactory.get_storage_backend().upload_file(
                    center_io, center_path, "image/jpeg"
                )

                # Add to the beginning of the list
                preview_urls.append(center_url)

            # For multiple crops
            if num_images_needed >= 2:
                # Calculate step size with overlap
                step_size = int(effective_width)

                for i in range(num_images_needed):
                    # Calculate crop bounds
                    left = max(0, i * step_size)
                    # Ensure the last crop captures the rightmost part of image
                    if i == num_images_needed - 1:
                        left = max(0, width - portrait_width)

                    right = min(width, left + portrait_width)

                    # Final adjustment - if we're at the edge and don't have a full width
                    if right - left < portrait_width and i > 0:
                        left = right - portrait_width

                    # Crop the image
                    cropped = img.crop((left, 0, right, height))

                    # Resize to maintain 9:16 aspect ratio if needed
                    crop_width = right - left
                    target_height = int(crop_width / target_aspect)
                    if height != target_height:
                        cropped = cropped.resize(
                            (crop_width, target_height), Image.Resampling.LANCZOS
                        )

                    # Save to BytesIO
                    crop_io = io.BytesIO()
                    cropped.save(crop_io, format="JPEG", quality=90)
                    crop_io.seek(0)

                    # Upload to temporary storage
                    crop_path = f"temp/previews/{media.id}_crop_{i}_{timestamp}.jpg"
                    crop_url = CloudStorageFactory.get_storage_backend().upload_file(
                        crop_io, crop_path, "image/jpeg"
                    )

                    # For standard two-image split, put these at the beginning
                    if num_images_needed == 2:
                        preview_urls.insert(i + 1, crop_url)
                    else:
                        # For multi-image split (>2), append after the center crop
                        preview_urls.append(crop_url)

            return preview_urls, is_wide_image

        except Exception as e:
            logger.exception(f"Error creating split image preview: {e}")
            return [], False

    @classmethod
    def split_image_to_portrait(
        cls, media, org, single_mode=False, excluded_indices=None
    ):
        """Split a landscape image into multiple portrait images

        Args:
            media (Media): The image to split
            org (Organization): The organization that owns the image
            single_mode (bool, optional): If True, create only a center crop. Defaults to False.
            excluded_indices (list, optional): List of indices to exclude from the result. Defaults to None.

        Returns:
            list: List of Media objects for the split images
        """
        try:
            # Validate media
            if not media or not media.storage_url_path:
                logger.error(f"Invalid media provided for split: {media}")
                return None

            # Check if the file exists in storage
            img_data = CloudStorageFactory.get_storage_backend().get_object(
                media.storage_url_path
            )
            if not img_data:
                logger.error(
                    f"Could not retrieve file from storage: {media.storage_url_path}"
                )
                # Try downloading from URL directly as a fallback
                try:
                    file_obj = MediaService.download_file_from_url(
                        media.storage_url_path, f"{media.id}_original.jpg"
                    )
                    if file_obj:
                        img = Image.open(file_obj)
                    else:
                        logger.error(
                            f"Could not download image from URL: {media.storage_url_path}"
                        )
                        return None
                except Exception as e:
                    logger.error(f"Error downloading image from URL: {e}")
                    return None
            else:
                # Process the image
                img = Image.open(BytesIO(img_data))

            # Convert excluded_indices to a list if it's None
            excluded_indices = excluded_indices or []

            # Generate split images
            split_imgs = []
            img_width, img_height = img.size

            # In single mode, just create a center crop
            if single_mode:
                center_img = cls._create_center_portrait_crop(img)
                split_imgs.append(
                    {"image": center_img, "position": "center", "index": 0}
                )
            else:
                # Add the center image first
                center_img = cls._create_center_portrait_crop(img)
                split_imgs.append(
                    {"image": center_img, "position": "center", "index": 0}
                )

                # Calculate how many 9:16 portraits we can fit in the image
                portrait_width = int(img_height * 9 / 16)
                num_images = max(2, img_width // portrait_width)

                # Space out the crops evenly
                step = (img_width - portrait_width) / (num_images - 1)

                for i in range(num_images):
                    # Skip this index if it's in the excluded list
                    if i in excluded_indices:
                        continue

                    left = int(i * step)
                    right = left + portrait_width

                    # Ensure we don't go over the image width
                    if right > img_width:
                        right = img_width
                        left = right - portrait_width

                    crop = img.crop((left, 0, right, img_height))
                    split_imgs.append(
                        {"image": crop, "position": "segment", "index": i}
                    )
            # Create Media objects for each split image
            result_medias = []
            for split_img_data in split_imgs:
                split_img = split_img_data["image"]
                position = split_img_data["position"]
                index = split_img_data["index"]

                # Convert to bytes
                img_byte_arr = BytesIO()
                split_img.save(img_byte_arr, format=split_img.format or "PNG")
                img_byte_arr.seek(0)

                # Generate a unique filename
                original_name = media.name
                name_parts = os.path.splitext(original_name)
                new_name = f"{name_parts[0]}_{position}_{index}{name_parts[1]}"

                # Upload the image and thumbnail
                img_url = CloudStorageFactory.get_storage_backend().upload_file(
                    img_byte_arr,
                    f"media/{org.id}/images/{new_name}",
                    content_type=f"image/{split_img.format.lower() if split_img.format else 'png'}",
                )

                # dont create new media entry, update the input media with metadata.
                result_medias.append(
                    {
                        "url": img_url,
                        "width": split_img.width,
                        "height": split_img.height,
                        "split_position": position,
                        "split_index": index,
                    }
                )
            media.metadata = {
                "image_splits": result_medias,
            }
            media.save()
            return result_medias

        except Exception as e:
            logger.exception(f"Error splitting image: {e}")
            return None

    @staticmethod
    def _create_center_portrait_crop(img):
        """Create a portrait crop from the center of an image with 9:16 aspect ratio"""
        width, height = img.size

        # For 9:16 portrait, the aspect ratio is 9/16 = 0.5625
        target_aspect = 9 / 16

        # Calculate portrait width based on height
        portrait_width = int(height * target_aspect)

        # Calculate center position
        center_x = width // 2
        crop_width = min(width, portrait_width)
        left = max(0, center_x - crop_width // 2)
        right = min(width, left + crop_width)

        # Crop image
        center_crop = img.crop((left, 0, right, height))

        # Resize to maintain 9:16 aspect ratio if needed
        target_height = int(crop_width / target_aspect)
        if height != target_height:
            center_crop = center_crop.resize(
                (crop_width, target_height), Image.Resampling.LANCZOS
            )

        return center_crop

    @staticmethod
    def _calculate_portrait_dimensions(img_width, img_height):
        """Calculate dimensions for portrait crops with 9:16 aspect ratio"""
        # For 9:16 portrait, the aspect ratio is 9/16 = 0.5625
        target_aspect = 9 / 16

        # Calculate portrait width based on height
        portrait_width = int(img_height * target_aspect)

        # Calculate overlap parameters
        overlap_percent = 0.25
        effective_width = portrait_width * (1 - overlap_percent)

        # Calculate number of images needed (rounded up)
        num_images_needed = max(2, int(img_width / effective_width + 0.99))

        # Determine if it's a wide image requiring multiple splits
        is_wide_image = img_width / img_height > 1.8  # Wider than 16:9

        return {
            "portrait_width": portrait_width,
            "target_aspect": target_aspect,
            "effective_width": effective_width,
            "num_images_needed": num_images_needed,
            "is_wide_image": is_wide_image,
        }

    @staticmethod
    def clip_video_segments(
        media_id, resolution, segments, aspect_ratio=None, org=None
    ):
        """
        Clip a video into multiple segments.
        Args:
            media_id: ID of the source Media
            resolution: (width, height) tuple
            segments: list of dicts with 'start_time' and 'end_time'
            aspect_ratio: optional, e.g. '16:9'
            org: Organization (optional, for Media creation)
        Returns:
            List of new Media objects (clips)
        """
        import tempfile
        import uuid

        from video_gen.models import Media
        from video_gen.services.ffmpeg_service import FFMPEGService

        media = Media.objects.get(id=media_id)
        if not org:
            org = media.org
        # Download video file
        video_url = media.storage_url_path
        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, f"{media_id}_input.mp4")
        CloudStorageFactory.get_storage_backend().download_file_to_path(
            video_url, input_path
        )
        clips = []
        for idx, seg in enumerate(segments):
            start = seg["start_time"]
            end = seg["end_time"]
            clip_id = uuid.uuid4()
            output_path = os.path.join(temp_dir, f"{media_id}_clip_{idx}.mp4")
            FFMPEGService.clip_video(
                input_path, output_path, start, end, resolution, aspect_ratio
            )
            # Upload to cloud
            gcs_path = f"video_clips/{org.id}/{clip_id}.mp4"
            public_url = CloudStorageFactory.get_storage_backend().upload_file(
                output_path, gcs_path, "video/mp4"
            )
            # Create Media object
            clip_media = Media.objects.create(
                name=f"{media.name}_clip_{idx}",
                org=org,
                type=Media.Type.VIDEO,
                storage_url_path=public_url,
                resolution=f"{resolution[1]}p" if resolution else media.resolution,
                format=media.format,
                status=Media.Status.COMPLETE,
                metadata={
                    "source_media_id": str(media.id),
                    "clip_index": idx,
                    "start_time": start,
                    "end_time": end,
                    "aspect_ratio": aspect_ratio or media.aspect_ratio,
                },
            )
            clips.append(clip_media)
        return clips

    @staticmethod
    def clip_video_segments_with_transcript(
        media_id, resolution, segments, aspect_ratio=None, org=None
    ):
        """
        Like clip_video_segments, but also clips transcript and attaches to each new Media.
        """
        import copy

        from video_gen.models import Media

        clips = MediaService.clip_video_segments(
            media_id, resolution, segments, aspect_ratio, org
        )
        # Get transcript from source media
        source_media = Media.objects.get(id=media_id)
        utterances = None
        if source_media.metadata and source_media.metadata.get("utterances_url"):
            # Download utterances JSON
            utterances_url = source_media.metadata["utterances_url"]
            import requests

            resp = requests.get(utterances_url)
            if resp.status_code == 200:
                utterances = resp.json()
        if utterances:
            for idx, clip_media in enumerate(clips):
                seg = segments[idx]
                start = seg["start_time"]
                end = seg["end_time"]
                # Filter utterances for this segment
                segment_utterances = [
                    u for u in utterances if u["start"] >= start and u["end"] <= end
                ]
                # Upload clipped utterances JSON
                import json
                from io import BytesIO

                utterances_bytes = BytesIO(
                    json.dumps(segment_utterances).encode("utf-8")
                )
                gcs_path = (
                    f"video_clips/{clip_media.org.id}/{clip_media.id}_utterances.json"
                )
                utterances_url = CloudStorageFactory.get_storage_backend().upload_file(
                    utterances_bytes, gcs_path, "application/json"
                )
                # Update metadata
                meta = copy.deepcopy(clip_media.metadata or {})
                meta["utterances_url"] = utterances_url
                clip_media.metadata = meta
                clip_media.save(update_fields=["metadata"])
        return clips
