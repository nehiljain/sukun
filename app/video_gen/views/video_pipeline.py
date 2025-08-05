import logging
import uuid

from asgiref.sync import async_to_sync
from common.middleware import AnonymousOrAuthenticated
from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from video_gen.models import Media, RenderVideo, VideoPipelineRun
from video_gen.serializers import (
    VideoPipelineRunCreateSerializer,
    VideoPipelineRunResponseSerializer,
    VideoPipelineRunSerializer,
)
from video_gen.services.media_service import MediaService
from video_gen.services.render_service import RenderService
from video_gen.services.video_pipeline_service import VideoPipelineService
from video_gen.utils.luma_sdk_pipeline import LumaSDKVideoGenerationPipeline
from video_gen.utils.media_track_sync import create_synced_overlays

logger = logging.getLogger(__name__)

FPS = 30


class VideoPipelineRunViewSet(viewsets.ModelViewSet):
    queryset = VideoPipelineRun.objects.all()
    serializer_class = VideoPipelineRunSerializer
    permission_classes = [AnonymousOrAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return VideoPipelineRunCreateSerializer
        elif self.action in ["list", "retrieve"]:
            return VideoPipelineRunSerializer
        return VideoPipelineRunSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return (
                VideoPipelineRun.objects.filter(
                    video_project__org=self.request.user.appuser.active_org
                )
                .select_related("video_project")
                .select_related("render_video")
            )
        else:
            session_key = self.request.headers.get("X-DD-Session-Key")
            if not session_key:
                logger.info("No session key provided")
                return VideoPipelineRun.objects.none()
            return (
                VideoPipelineRun.objects.filter(
                    video_project__anonymous_session__session_key=session_key
                )
                .select_related("video_project")
                .select_related("render_video")
            )

    def list(self, request, *args, **kwargs):
        # join video_project and media_files
        pipeline_runs = self.get_queryset().order_by("-created_at")
        # pipeline_runs = pipeline_runs.prefetch_related("media_files")
        serializer = self.get_serializer(pipeline_runs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                # Get and validate inputs
                media_files = input_serializer.validated_data.get("media_files", [])

                # Parse media_ids from input
                media_ids_str = input_serializer.validated_data.get("media_ids", "")
                media_ids = VideoPipelineService.parse_json_list(media_ids_str)

                # Parse property_image_ids from input
                property_image_ids_str = input_serializer.validated_data.get(
                    "property_image_ids", ""
                )
                property_image_ids = VideoPipelineService.parse_json_list(
                    property_image_ids_str
                )

                # Get track_id
                track_id = input_serializer.validated_data.get("track_id")
                try:
                    Track = apps.get_model("sound_gen", "Track")
                    input_track = Track.objects.get(id=track_id)
                except Track.DoesNotExist:
                    return Response(
                        {"error": "Invalid music track ID"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Log input data
                logger.info(f"media_files: {len(media_files)}")
                logger.info(f"media_ids: {media_ids}")
                logger.info(f"property_image_ids: {property_image_ids}")

                if self.request.user.is_authenticated:
                    if len(property_image_ids) > 12:
                        return Response(
                            {
                                "error": "Authenticated users can only use up to 12 property images"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if len(media_files) > 12:
                        return Response(
                            {
                                "error": "Authenticated users can only use up to 12 media files"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    if len(property_image_ids) > 5:
                        return Response(
                            {
                                "error": "Unauthenticated users can only use up to 5 property images"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if len(media_files) > 5:
                        return Response(
                            {
                                "error": "Unauthenticated users can only use up to 5 media files"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Create video project
                video_project = VideoPipelineService.create_video_project(
                    is_authenticated=self.request.user.is_authenticated,
                    user=self.request.user
                    if self.request.user.is_authenticated
                    else None,
                    session_key=input_serializer.validated_data.get("session_key"),
                    aspect_ratio=input_serializer.validated_data.get("aspect_ratio"),
                )

                # Process all media sources and collect media IDs
                all_media_ids = []

                # 1. Process existing media IDs
                if media_ids:
                    valid_media_ids = VideoPipelineService.verify_media_ids(media_ids)
                    all_media_ids.extend(valid_media_ids)

                # 2. Process property images
                if property_image_ids:
                    property_media_ids = VideoPipelineService.process_property_images(
                        property_image_ids, video_project
                    )
                    all_media_ids.extend(property_media_ids)

                # 3. Process uploaded media files
                if media_files:
                    file_media_ids = VideoPipelineService.process_media_files(
                        media_files, video_project
                    )
                    all_media_ids.extend(file_media_ids)

                # Create pipeline run with collected media IDs
                if not all_media_ids:
                    return Response(
                        {"error": "No valid media files found"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                pipeline_run = VideoPipelineService.create_pipeline_run(
                    all_media_ids, input_track.id, video_project
                )

                # Return response
                output_serializer = VideoPipelineRunResponseSerializer(
                    instance=pipeline_run
                )
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error creating video pipeline run: {e}")
            return Response(
                {"error": "Failed to create video pipeline run"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True, methods=["post"], url_path="run", permission_classes=[AllowAny]
    )
    def run_pipeline(self, request, pk=None):
        """
        Start the video pipeline processing for a specific pipeline run.
        Endpoint: POST /api/video_pipeline_run/{uuid}/run
        """
        if not request.data.get("session_key") and not request.user.is_authenticated:
            return Response(
                {"error": "No Authentication provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pipeline_run = self.get_object()

        # check if pipeline run has the same session key
        if not request.user.is_authenticated:
            if (
                pipeline_run.video_project.anonymous_session.session_key
                != request.data.get("session_key")
            ):
                return Response(
                    {"error": "Session key does not match"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if (
            request.user.is_authenticated
            and request.user.appuser.has_subscription_access
        ):
            render_resolution = RenderVideo.Resolution.FULL_HD
        else:
            render_resolution = RenderVideo.Resolution.HD

        # Check if pipeline can be started
        if pipeline_run.status != VideoPipelineRun.Status.CREATED:
            return Response(
                {"error": "Pipeline run can only be started from CREATED state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status to pending
        pipeline_run.status = VideoPipelineRun.Status.PENDING
        pipeline_run.save()

        # Start processing in background
        import threading

        thread = threading.Thread(
            target=self._process_pipeline_run_thread,
            args=(pipeline_run.id, render_resolution),
        )
        thread.daemon = True
        thread.start()

        # Return updated pipeline run
        serializer = VideoPipelineRunResponseSerializer(pipeline_run)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def _process_pipeline_run_thread(self, pipeline_run_id, render_resolution):
        """Actual processing logic running in a separate thread"""
        try:
            pipeline_run = VideoPipelineRun.objects.select_related(
                "video_project__org"
            ).get(id=pipeline_run_id)
            pipeline_run.status = VideoPipelineRun.Status.PROCESSING
            pipeline_run.save()

            # Cache the values we'll need in the async context
            project_id = pipeline_run.video_project.id
            org = pipeline_run.video_project.org

            # Get track from input payload
            track_id = pipeline_run.input_payload.get("track_id")
            from django.apps import apps

            Track = apps.get_model("sound_gen", "Track")
            track = Track.objects.get(id=track_id) if track_id else None

            # Get media objects from uploaded files
            media_ids = pipeline_run.input_payload.get("media_files", [])
            media_objects = {}

            # Initialize Luma pipeline
            luma_pipeline = LumaSDKVideoGenerationPipeline(
                output_dir="generated_videos",
                max_concurrent=3,
            )

            # Process each media file
            async def process_media():
                from asgiref.sync import sync_to_async

                jobs = []
                # Use OrderedDict to maintain insertion order of processed videos
                # Convert synchronous database operations to async
                get_media = sync_to_async(Media.objects.get)
                upload_media = sync_to_async(MediaService.upload_media_file)

                for media_id in media_ids:
                    media = await get_media(id=media_id)

                    # Check if this is a duplicate image with an existing video
                    if media.metadata.get("is_duplicate"):
                        logger.info(
                            f"Checking for existing video for duplicate image: {media.id}"
                        )
                        try:
                            existing_video = await get_media(
                                type=Media.Type.VIDEO,
                                caption_metadata__source_media_id=str(media.id),
                                caption_metadata__is_duplicate=True,
                            )
                        except Media.DoesNotExist:
                            logger.info(
                                f"No existing video found for duplicate image: {media.id}"
                            )
                            existing_video = None
                        if existing_video:
                            logger.info(
                                f"Using existing video for duplicate image: {media.id}"
                            )
                            media_objects[str(media_id)] = existing_video
                            continue

                    # Create job definition for Luma pipeline
                    job = {
                        "id": str(media.id),
                        "prompt": f"Generate a cinematic, ultra-smooth video of this {media.caption_metadata.get('room_type', 'room')}. The camera should {media.caption_metadata.get('camera_motion', 'slowly dolly in')} with fluid, seamless motion, as if mounted on a professional gimbal. Maintain steady, architectural framing to showcase the space. Strictly adhere to the keyframe, excluding any humans, animals, or objects not present in the original image.",
                        "image_urls": [media.storage_url_path],
                        "options": {
                            "model": "ray-2",
                            "resolution": render_resolution,
                            "duration": "5s",
                            "aspect_ratio": pipeline_run.video_project.aspect_ratio,
                        },
                    }
                    jobs.append(job)

                # Only process jobs for non-duplicate images or those without existing videos
                if jobs:
                    logger.info(
                        f"Processing {len(jobs)} jobs which do not have existing videos"
                    )
                    results = await luma_pipeline.process_batch(jobs)

                    # Store results
                    for result in results:
                        if result["status"] == "completed":
                            # Read the file and create a proper UploadedFile object
                            with open(result["output_path"], "rb") as f:
                                file_content = f.read()

                            video_file = SimpleUploadedFile(
                                name=f"generated_video_{result['job_id']}.mp4",
                                content=file_content,
                                content_type="video/mp4",
                            )

                            # Upload video file and create media record
                            video_media = await upload_media(
                                file=video_file,
                                prefix=str(project_id),
                                media_type=Media.Type.VIDEO,
                                org=org,
                                caption_metadata={
                                    "source_media_id": result["job_id"],
                                    "pipeline_run_id": str(pipeline_run_id),
                                    "generation_type": "luma_video",
                                },
                            )
                            if video_media:
                                media_objects[result["job_id"]] = video_media

            # Run async processing
            async_to_sync(process_media)()

            # Create overlays and update project state
            logger.info("creating overlays with music track")
            logger.info(f"media_objects: {media_objects}")
            final_media_objects = []
            for id in media_ids:
                if id in media_objects:
                    final_media_objects.append(media_objects[id])
                else:
                    logger.warn(f"Video not found for media_id: {id} !!!")
            if final_media_objects:
                state = pipeline_run.video_project.state or {}
                overlays = create_synced_overlays(
                    track,
                    final_media_objects,
                    aspect_ratio=pipeline_run.video_project.aspect_ratio,
                    fps=FPS,
                )
                state["overlays"] = overlays["overlays"]
                state["durationInFrames"] = overlays["durationInFrames"]
                state["fps"] = FPS
                state["aspectRatio"] = pipeline_run.video_project.aspect_ratio

                pipeline_run.video_project.state = state
                pipeline_run.video_project.save()

                # Create render job
                logger.info("Creating render video with new overlays ")
                render_video = RenderVideo.objects.create(
                    name=f"{pipeline_run.video_project.name} - Auto Render",
                    video_project=pipeline_run.video_project,
                    status=RenderVideo.Status.PENDING,
                    state=state,
                    resolution=RenderVideo.Resolution.HD,  # Default to 1080p
                    render_speed=RenderVideo.RenderSpeed.FAST,  # Default to medium speed
                )

                # Generate render token
                render_token = uuid.uuid4().hex
                render_video.render_token = render_token
                render_video.save()

                # Start render process
                success = RenderService.start_render_process(
                    render_video=render_video, render_token=render_token
                )

                if not success:
                    render_video.status = RenderVideo.Status.ERROR
                    render_video.render_token = None
                    render_video.save()
                    logger.error("Failed to start render process")
                    pipeline_run.status = VideoPipelineRun.Status.FAILED
                    pipeline_run.error_logs = "Failed to start render process"
                    pipeline_run.save()
                    return

                # Associate render video with pipeline run
                pipeline_run.render_video = render_video
                pipeline_run.save()

                # Wait for render to complete or timeout after 10 minutes
                import time

                max_wait_time = 600  # 10 minutes
                wait_interval = 5  # Check every 5 seconds
                total_wait_time = 0

                while total_wait_time < max_wait_time:
                    # Refresh render_video from database
                    render_video.refresh_from_db()

                    if render_video.status == RenderVideo.Status.GENERATED:
                        logger.info(
                            f"Render completed successfully for pipeline run {pipeline_run_id}"
                        )
                        pipeline_run.status = VideoPipelineRun.Status.COMPLETED
                        pipeline_run.save()
                        return
                    elif render_video.status == RenderVideo.Status.ERROR:
                        logger.error(
                            f"Render failed for pipeline run {pipeline_run_id}"
                        )
                        pipeline_run.status = VideoPipelineRun.Status.FAILED
                        pipeline_run.error_logs = "Render video generation failed"
                        pipeline_run.save()
                        return

                    time.sleep(wait_interval)
                    total_wait_time += wait_interval

                # If we get here, the render timed out
                logger.error(f"Render timed out for pipeline run {pipeline_run_id}")
                pipeline_run.status = VideoPipelineRun.Status.FAILED
                pipeline_run.error_logs = "Render video generation timed out"
                pipeline_run.save()
                return

            else:
                logger.warn("No media objects to process")
                pipeline_run.status = VideoPipelineRun.Status.FAILED
                pipeline_run.error_logs = "No media objects to process"
                pipeline_run.save()

        except Exception as e:
            logger.exception(f"Error processing pipeline run {pipeline_run_id}: {e}")
            pipeline_run.status = VideoPipelineRun.Status.FAILED
            pipeline_run.error_logs = str(type(e))
            pipeline_run.save()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = VideoPipelineRunResponseSerializer(instance)
        return Response(serializer.data)
        return Response(serializer.data)
