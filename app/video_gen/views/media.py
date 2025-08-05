import logging
import os
from datetime import datetime

import requests
from common.file_utils import convert_heic_to_png_file
from common.storage.factory import CloudStorageFactory
from common.storage.mixins import CDNURLMixin
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from video_gen.models import Media, VideoProjectMedia
from video_gen.serializers import MediaSerializer
from video_gen.services.media_service import MediaService
from video_gen.tasks import analyze_image_task, create_thumbnail_task
from video_gen.utils.luma_sdk_pipeline import LumaSDKVideoGenerationPipeline

logger = logging.getLogger(__name__)

# Buffer for temporary storage
BUFFER_SIZE = 1000  # Number of records to buffer before writing to GCS
local_buffer = []

# Buffer and batch tracking per capture
capture_buffers = {}  # Format: {capture_id: {"buffer": [], "batch_count": 0}}


class MediaPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 24


class MediaViewSet(CDNURLMixin, viewsets.ModelViewSet):
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MediaPagination

    def get_queryset(self):
        if self.request.user.is_staff:
            queryset = Media.objects.all().order_by("-created_at")
        else:
            queryset = Media.objects.filter(
                org=self.request.user.appuser.active_org
            ).order_by("-created_at")
        return queryset

    # def list(self, request, *args, **kwargs):
    #     """Get all captures"""
    #     try:
    #         captures = self.get_queryset()
    #         serializer = self.get_serializer(captures, many=True)
    #         return Response(serializer.data, status=status.HTTP_200_OK)
    #     except Exception as e:
    #         logger.exception(f"Failed to retrieve captures: {e}")
    #         return Response(
    #             {"error": "Failed to retrieve captures"},
    #             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         )

    # def create(self, request, *args, **kwargs):
    #     """Handle streaming capture data"""
    #     try:
    #         data = request.data.copy()
    #         if not all(key in data for key in ["name", "org"]):
    #             return Response(
    #                 {"error": "Missing required fields: name and org"},
    #                 status=status.HTTP_400_BAD_REQUEST,
    #             )

    #         try:
    #             capture, upload_success = MediaService.process_capture_data(
    #                 local_buffer, data, data["org"]
    #             )
    #             if not upload_success:
    #                 MediaService.save_backup(local_buffer, "buffer_backup")

    #             return Response(
    #                 {"status": "success", "capture_id": capture.id},
    #                 status=status.HTTP_200_OK,
    #             )
    #         except ValueError as e:
    #             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    #     except Exception as e:
    #         logger.exception(f"Failed to process capture: {e}")
    #         return Response(
    #             {"error": "Internal server error"},
    #             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         )

    # def update(self, request, *args, **kwargs):
    #     """Handle streaming events in batches for a specific capture"""
    #     capture = self.get_object()
    #     try:
    #         # Get or initialize capture buffer
    #         if capture.id not in capture_buffers:
    #             try:
    #                 # Set the storage directory when initializing the buffer
    #                 storage_dir = f"mouse_captures/{capture.id}"
    #                 capture.storage_dir = storage_dir
    #                 capture.save()

    #                 capture_buffers[capture.id] = {"buffer": [], "batch_count": 0}
    #             except Media.DoesNotExist:
    #                 return Response(
    #                     {"error": "Capture not found"}, status=status.HTTP_404_NOT_FOUND
    #                 )

    #         buffer_data = capture_buffers[capture.id]

    #         data = request.data
    #         batch_index = data.get("batchIndex", -1)
    #         events = data.get("events", [])
    #         timestamp = data.get("timestamp")

    #         # Add events to capture's buffer
    #         buffer_data["buffer"].extend(events)
    #         buffer_data["batch_count"] += 1

    #         # Log batch information
    #         logger.info(
    #             f"\n=== Capture {capture.id} - Received Batch {batch_index} ==="
    #         )
    #         logger.info(
    #             f"Timestamp: {datetime.fromtimestamp(timestamp/1000).isoformat()}"
    #         )
    #         logger.info(f"Events in batch: {len(events)}")
    #         logger.info(f"Total events for capture: {len(buffer_data['buffer'])}")
    #         logger.info(f"Total batches for capture: {buffer_data['batch_count']}")

    #         # Log event types distribution
    #         event_types = {}
    #         for event in events:
    #             event_type = event.get("type", "unknown")
    #             event_types[event_type] = event_types.get(event_type, 0) + 1

    #         logger.info("\nEvent types in this batch:")
    #         for event_type, count in event_types.items():
    #             logger.info(f"- {event_type}: {count}")

    #         # If buffer reaches threshold, upload to GCS
    #         if len(buffer_data["buffer"]) >= BUFFER_SIZE:
    #             current_time = datetime.utcnow()
    #             upload_success = self._upload_to_gcs(
    #                 buffer_data["buffer"], current_time, capture.id
    #             )
    #             if not upload_success:
    #                 # Update capture status on upload failure
    #                 capture.status = Media.Status.ERROR
    #                 capture.save()

    #                 self._save_backup(
    #                     buffer_data["buffer"], f"streaming_events_backup_{capture.id}"
    #                 )
    #             buffer_data["buffer"].clear()

    #         return Response(
    #             {
    #                 "status": "success",
    #                 "message": f"Received batch {batch_index} with {len(events)} events",
    #                 "totalEventsReceived": len(buffer_data["buffer"]),
    #                 "totalBatches": buffer_data["batch_count"],
    #             },
    #             status=status.HTTP_200_OK,
    #         )

    #     except Exception as e:
    #         logger.exception(f"Error processing streaming events: {e}")
    #         self._save_backup(
    #             request.body.decode(), f"failed_streaming_events_{capture.id}"
    #         )
    #         return Response(
    #             {"status": "error", "message": str(e)},
    #             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         )

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        """Finalize a capture by uploading remaining events and updating status"""
        try:
            capture = self.get_object()

            if capture.id not in capture_buffers:
                return Response(
                    {"error": "No events found for this capture"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            buffer_data = capture_buffers[capture.id]

            # Upload remaining events to GCS
            if buffer_data["buffer"]:
                current_time = datetime.utcnow()
                upload_success = self._upload_to_gcs(
                    buffer_data["buffer"],
                    current_time,
                    capture.id,
                    is_final=True,
                )
                if not upload_success:
                    self._save_backup(
                        buffer_data["buffer"],
                        f"final_streaming_events_backup_{capture.id}",
                    )
                    capture.status = Media.Status.ERROR
                else:
                    capture.status = Media.Status.COMPLETE

            # Update capture metadata
            capture.save()

            # Clean up the buffer
            del capture_buffers[capture.id]

            return Response(
                {
                    "status": "success",
                    "message": "Capture finalized successfully",
                    "capture_status": capture.status,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error finalizing capture: {e}")
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get statistics about received events for a specific capture"""
        try:
            stats = MediaService.get_capture_stats(pk, capture_buffers)
            if not stats:
                return Response(
                    {"error": "No events found for this capture"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(stats, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error getting stats: {e}")
            return Response(
                {"error": "Failed to retrieve stats"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        try:
            media_type = request.data.get("media_type", Media.Type.VIDEO)
            video_project_id = request.data.get("video_project_id", None)
            # Handle single file upload
            if "file" in request.FILES:
                file = request.FILES["file"]
                if file.content_type == "image/heic":
                    logger.info(f"Converting HEIC file to PNG: {file.name}")
                    file = convert_heic_to_png_file(file)

                logger.info(f"Processing image file: {file.name}")

                try:
                    media = MediaService.upload_media_file(
                        file=file,
                        prefix=request.user.appuser.active_org.id,
                        media_type=media_type,
                        org=request.user.appuser.active_org,
                    )
                    if video_project_id:
                        VideoProjectMedia.objects.create(
                            video_project_id=video_project_id,
                            media=media,
                        )
                    if media_type == Media.Type.IMAGE:
                        analyze_image_task.delay(media.id)
                except Exception as e:
                    logger.exception(f"Error uploading media: {e}")
                    return Response(
                        {"error": f"Failed to upload media: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                if not media:
                    return Response(
                        {"error": "Failed to upload file"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                return Response(
                    {
                        "success": True,
                        "url": media.storage_url_path,
                        "media_id": str(media.id),
                    },
                    status=status.HTTP_201_CREATED,
                )

            # Handle multiple file upload
            elif "files[]" in request.FILES:
                uploaded_files = request.FILES.getlist("files[]")
                if not uploaded_files:
                    return Response(
                        {"error": "No files provided"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                results = []
                for file in uploaded_files:
                    media = MediaService.upload_media_file(
                        file=file,
                        prefix=request.user.appuser.active_org.id,
                        media_type=media_type,
                        org=request.user.appuser.active_org,
                    )
                    if video_project_id:
                        VideoProjectMedia.objects.create(
                            video_project_id=video_project_id,
                            media=media,
                        )

                    if media:
                        results.append(
                            {
                                "success": True,
                                "url": media.storage_url_path,
                                "media_id": str(media.id),
                            }
                        )
                    else:
                        results.append(
                            {
                                "success": False,
                                "filename": file.name,
                                "error": "Failed to upload file",
                            }
                        )

                return Response(
                    {"files": results},
                    status=status.HTTP_201_CREATED,
                )

            else:
                return Response(
                    {"error": "No files provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.exception(f"Error uploading media: {e}")
            return Response(
                {"error": f"Failed to upload media: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["GET"])
    def library(self, request):
        """Get media items with filtering options"""
        try:
            # Parse filters from query parameters
            media_type = request.query_params.get("type")
            date_from = request.query_params.get("date_from")
            date_to = request.query_params.get("date_to")
            tags = request.query_params.get("tags")
            video_project_id = request.query_params.get("video_project_id")

            if video_project_id:
                # Filter by VideoProjectMedia
                vpm_qs = VideoProjectMedia.objects.filter(
                    video_project_id=video_project_id
                ).order_by("order", "-created_at")
                media_ids = list(vpm_qs.values_list("media_id", flat=True))
                logger.info(f"Media IDs: {media_ids}")
                media_qs = Media.objects.filter(id__in=media_ids)
                # Maintain order as in media_ids
                media_dict = {str(m.id): m for m in media_qs}
                ordered_media = [
                    media_dict[str(mid)] for mid in media_ids if str(mid) in media_dict
                ]
                logger.info(f"Ordered Media: {ordered_media}")
                # Paginate the ordered_media list
                page = self.paginate_queryset(ordered_media)
                if page is not None:
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                serializer = self.get_serializer(ordered_media, many=True)
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Start with base queryset
            queryset = self.get_queryset().order_by("-created_at")

            # Apply type filter
            if media_type and media_type in [Media.Type.IMAGE, Media.Type.VIDEO]:
                queryset = queryset.filter(type=media_type)

            # Apply date range filters
            if date_from:
                queryset = queryset.filter(created_at__gte=date_from)
            if date_to:
                queryset = queryset.filter(created_at__lte=date_to)

            # Apply tags filter
            if tags:
                tag_list = tags.split(",")
                for tag in tag_list:
                    queryset = queryset.filter(tags__contains=[tag])

            # Apply pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                # Generate thumbnails for paginated items
                for media in page:
                    if not media.thumbnail_url and media.storage_url_path:
                        try:
                            response = requests.head(media.storage_url_path)
                            if response.status_code != 200:
                                continue
                            logger.info(
                                f"Queueing thumbnail generation for media {media.id}"
                            )
                            create_thumbnail_task.delay(media.id)

                        except Exception as e:
                            logger.error(
                                f"Error generating thumbnail for media {media.id}: {e}"
                            )

                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error fetching media library: {e}")
            return Response(
                {"error": "Failed to fetch media library"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["GET"])
    def search(self, request):
        """Search media items using semantic search with fallback to basic search"""
        try:
            query = request.query_params.get("q", "").strip()

            # Get filter parameters
            media_type = request.query_params.get("type")
            date_from = request.query_params.get("date_from")
            date_to = request.query_params.get("date_to")
            tags = request.query_params.get("tags")

            # Get semantic search parameters
            use_semantic_search = (
                request.query_params.get("semantic", "true").lower() == "true"
            )
            similarity_threshold = float(request.query_params.get("threshold", "0.5"))
            max_results = min(
                int(request.query_params.get("max_results", "50")), 100
            )  # Cap at 100

            # Get search results with filters
            media_items = MediaService.search_media(
                query,
                self.request.user.appuser.active_org,
                media_type=media_type,
                date_from=date_from,
                date_to=date_to,
                tags=tags.split(",") if tags else None,
                use_semantic_search=use_semantic_search,
                similarity_threshold=similarity_threshold,
                max_results=max_results,
            )

            # Apply pagination to search results
            page = self.paginate_queryset(media_items)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response_data = self.get_paginated_response(serializer.data)

                # Add search metadata to response
                if hasattr(response_data, "data") and "results" in response_data.data:
                    response_data.data["search_metadata"] = {
                        "semantic_search_used": use_semantic_search,
                        "similarity_threshold": similarity_threshold
                        if use_semantic_search
                        else None,
                        "query": query,
                    }
                return response_data

            serializer = self.get_serializer(media_items, many=True)
            response_data = serializer.data

            # Add search metadata for non-paginated results
            return Response(
                {
                    "results": response_data,
                    "search_metadata": {
                        "semantic_search_used": use_semantic_search,
                        "similarity_threshold": similarity_threshold
                        if use_semantic_search
                        else None,
                        "query": query,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception(f"Error searching media: {e}")
            return Response(
                {"error": "Failed to search media"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["POST"])
    def generate_embedding(self, request, pk=None):
        """Generate and store embedding for a specific media item"""
        try:
            media = self.get_object()

            # Generate and store the embedding
            force = request.data.get("force", False)
            success = MediaService.generate_and_store_embedding(media, force=force)

            if success:
                return Response(
                    {
                        "success": True,
                        "message": f"Embedding generated for media {media.id}",
                        "media_id": str(media.id),
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"success": False, "error": "Failed to generate embedding"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            logger.exception(f"Error generating embedding: {e}")
            return Response(
                {"error": f"Failed to generate embedding: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["POST"])
    def split_to_portrait(self, request, pk=None):
        """Split a landscape image into one or more 9:16 portrait images"""
        try:
            media = self.get_object()

            # Check if the media is an image
            if media.type != Media.Type.IMAGE:
                return Response(
                    {"error": "Only images can be split"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Preview mode returns the image data without creating new entries
            preview_only = request.data.get("preview_only", False)

            # Single mode creates only one centered crop
            single_mode = request.data.get("single_mode", False)

            # Indices to exclude from the result
            excluded_indices = request.data.get("excluded_indices", [])

            # Call the service to split the image
            if preview_only:
                # Just get the preview URLs for client-side display
                preview_urls, is_wide = MediaService.split_image_preview(media)

                if not preview_urls:
                    return Response(
                        {"error": "Failed to create preview"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Return differently based on number of previews
                if len(preview_urls) <= 1:
                    return Response(
                        {
                            "success": True,
                            "preview": {
                                "center_url": preview_urls[0] if preview_urls else None,
                            },
                            "is_wide": is_wide,
                        },
                        status=status.HTTP_200_OK,
                    )
                elif len(preview_urls) == 2 and not is_wide:
                    # For standard two-image split
                    return Response(
                        {
                            "success": True,
                            "preview": {
                                "center_url": preview_urls[0],
                                "left_url": preview_urls[1],
                                "right_url": preview_urls[2]
                                if len(preview_urls) > 2
                                else None,
                            },
                            "is_wide": is_wide,
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    # For wide images with multiple splits
                    return Response(
                        {
                            "success": True,
                            "preview": {
                                "center_url": preview_urls[0],
                                "urls": preview_urls[1:]
                                if len(preview_urls) > 1
                                else [],
                            },
                            "is_wide": is_wide,
                        },
                        status=status.HTTP_200_OK,
                    )
            else:
                # Create new media entries for the split images
                split_medias = MediaService.split_image_to_portrait(
                    media,
                    request.user.appuser.active_org,
                    single_mode=single_mode,
                    excluded_indices=excluded_indices,
                )

                if not split_medias:
                    return Response(
                        {"error": "Failed to split image"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                # Multiple image split
                response_data = {"success": True, "split_medias": split_medias}
                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Error splitting image: {e}")
            return Response(
                {"error": f"Failed to split image: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def motion_magic(self, request, pk=None):
        """Generate a video from 1 or 2 images using LumaSDKVideoGenerationPipeline and store the video URL."""
        media = self.get_object()
        prompt = request.data.get("prompt")
        image_urls = request.data.get("image_urls", [])
        aspect_ratio = request.data.get("aspect_ratio", "16:9")
        duration = request.data.get("duration", "5s")
        camera_motion = request.data.get("camera_motion", "push_in")
        if (
            not prompt
            or not image_urls
            or not isinstance(image_urls, list)
            or len(image_urls) == 0
        ):
            return Response(
                {"error": "prompt and image_urls (list) are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Optionally validate aspect_ratio and duration
        pipeline = LumaSDKVideoGenerationPipeline()
        import asyncio

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        try:
            logger.info(f"Camera motion: {camera_motion}")
            video_path = loop.run_until_complete(
                pipeline.process_job(
                    job_id=str(media.id),
                    prompt=prompt,
                    image_urls=image_urls,
                    aspect_ratio=aspect_ratio,
                    duration=duration,
                    resolution="1080p",
                    concepts=[camera_motion],
                )
            )
            logger.info(f"Video path: {video_path}")
        except Exception as e:
            import logging

            logging.exception("LumaSDKVideoGenerationPipeline failed")
            return Response(
                {"error": f"Luma video generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        # Assume video_path is a file path or URL; if file path, convert to URL as needed
        # For now, just store the path
        file_name = os.path.basename(video_path)
        storage_url = CloudStorageFactory.get_storage_backend().upload_file(
            video_path,
            f"motion_magic/{media.org.id}/{media.id}/video/{file_name}",
            "video/mp4",
        )

        if "motion_magic_video_urls" not in media.metadata:
            media.metadata["motion_magic_video_urls"] = []
        media.metadata["motion_magic_video_urls"].append(storage_url)
        media.save(update_fields=["metadata"])
        serializer = self.get_serializer(media)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def clip_video_segments(self, request, pk=None):
        """
        Clip a video into multiple segments.
        Input: resolution (width, height), segments=[{"start_time": float, "end_time": float}], aspect_ratio (optional)
        Output: list of new media_ids
        """
        try:
            media_id = pk
            resolution = request.data.get("resolution")  # [width, height]
            segments = request.data.get("segments")  # list of dicts
            aspect_ratio = request.data.get("aspect_ratio")
            if not (media_id and resolution and segments):
                return Response(
                    {"error": "media_id, resolution, and segments are required"},
                    status=400,
                )
            org = self.get_object().org
            clips = MediaService.clip_video_segments(
                media_id, tuple(resolution), segments, aspect_ratio, org
            )
            return Response({"media_ids": [str(m.id) for m in clips]}, status=201)
        except Exception as e:
            logger.exception(f"Error in clip_video_segments: {e}")
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["post"])
    def clip_video_segments_with_transcript(self, request, pk=None):
        """
        Clip a video into multiple segments and attach clipped transcript to each.
        Input: resolution (width, height), segments=[{"start_time": float, "end_time": float}], aspect_ratio (optional)
        Output: list of new media_ids
        """
        try:
            media_id = pk
            resolution = request.data.get("resolution")  # [width, height]
            segments = request.data.get("segments")  # list of dicts
            aspect_ratio = request.data.get("aspect_ratio")
            if not (media_id and resolution and segments):
                return Response(
                    {"error": "media_id, resolution, and segments are required"},
                    status=400,
                )
            org = self.get_object().org
            clips = MediaService.clip_video_segments_with_transcript(
                media_id, tuple(resolution), segments, aspect_ratio, org
            )
            return Response({"media_ids": [str(m.id) for m in clips]}, status=201)
        except Exception as e:
            logger.exception(f"Error in clip_video_segments_with_transcript: {e}")
            return Response({"error": str(e)}, status=500)
