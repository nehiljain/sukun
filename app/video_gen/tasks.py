import json
import logging
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

from celery import chain, shared_task
from common.email import send_email
from common.storage.factory import CloudStorageFactory
from common.storage.utils import upload_file_to_cloud
from django.conf import settings
from django.utils import timezone
from pydantic import BaseModel
from video_gen.services.ffmpeg_service import FFMPEGService

logger = logging.getLogger(__name__)


# Define a Recording Type
class StudioRecordingInfo(BaseModel):
    company_identifier: str
    session_identifier: str
    device_identifier: str
    aspect_ratio: str
    resolution: str


def translate_aspect_ratio(aspect_ratio: str) -> str:
    """
    Translate the aspect ratio to a more human-readable format.
    916, 9:16
    169, 16:9
    11, 1:1
    """
    if aspect_ratio == "916":
        return "9:16"
    elif aspect_ratio == "169":
        return "16:9"
    elif aspect_ratio == "11":
        return "1:1"


def extract_info_from_studio_recording_filepath(filepath) -> StudioRecordingInfo:
    """
    Extract information from a filename. Examples:

    filename format:
    {company_name}/{project_name}/{device_name}_{aspect_ratio}_{resolution}/{folder_name}/
    example:
    cactus_ai/2025-05-22-ajith_fondo_studio/iphone-15pro_916_1080p/raw/
    cactus_ai/2025-05-22-ajith_fondo_studio/camzve10-main_169_2160p/raw/
    """
    # split the filename by /
    # remove the trailing /
    parts = filepath.rstrip("/").split("/")
    if len(parts) < 4:
        raise ValueError(
            f"Invalid filename: {filepath}. Expected format: company_name/project_name/device_name_aspect_ratio_resolution/folder_name/"
        )
    recording_info = StudioRecordingInfo(
        company_identifier=parts[0],
        session_identifier=parts[1],
        device_identifier=parts[2].split("_")[0],
        aspect_ratio=parts[2].split("_")[1],
        resolution=parts[2].split("_")[2],
    )
    return recording_info


@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=1200,
    reject_on_worker_lost=True,
    name="video_gen.execute_render",
)
def execute_render(self, render_video_id, render_token):
    """
    Execute the render process for a video in a Celery worker
    """
    logger.info(f"Starting render task for video {render_video_id}")
    try:
        # Move the import inside the function
        from video_gen.models import RenderVideo

        render_video = RenderVideo.objects.get(id=render_video_id)

        # Check if the render token matches
        if render_video.render_token != render_token:
            logger.error(f"Invalid render token for video {render_video_id}")
            return False

        # Create a temporary file for state data
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as tmp_file:
            json.dump(render_video.video_project.state, tmp_file)
            temp_file_path = tmp_file.name

        logger.info(f"Created temporary state file at {temp_file_path}")
        # Generate output path for reference (actual file will be created by the worker)
        output_filename = f"{render_video.id}.mp4"
        temp_output_dir = os.path.join(settings.BASE_DIR, "media", "temp_renders")
        os.makedirs(temp_output_dir, exist_ok=True)
        output_path = os.path.join(temp_output_dir, output_filename)

        # Make sure render status directory exists
        status_dir = os.path.join(settings.BASE_DIR, "media", "render_status")
        os.makedirs(status_dir, exist_ok=True)
        # Prepare render command
        base_dir = Path(settings.BASE_DIR)
        render_script_path = base_dir / "remotion_render" / "render.mjs"

        cmd = [
            "node",
            str(render_script_path),
            "--data",
            temp_file_path,
            "--output",
            output_path,
            "--videoAssetId",
            str(render_video.id),
            "--renderToken",
            render_token,
            "--resolution",
            render_video.resolution,
            "--renderSpeed",
            render_video.render_speed,
        ]

        logger.info(f"Executing render command: {' '.join(cmd)}")

        # Execute render process and capture output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=str(base_dir),
        )

        # Capture logs to file
        log_dir = Path(settings.BASE_DIR) / "media" / "render_logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file_path = (
            log_dir
            / f"render_{render_video_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )

        with open(log_file_path, "w") as log_file:
            # Write header information
            log_file.write(
                f"=== Render Process for RenderVideo {render_video_id} ===\n"
            )
            log_file.write(f"Started at: {datetime.now().isoformat()}\n\n")

            # Store the temp file content in the log
            log_file.write("=== Render Input Data ===\n")
            try:
                with open(temp_file_path, "r") as input_file:
                    temp_content = input_file.read()
                    log_file.write(temp_content)
            except Exception as e:
                log_file.write(f"Failed to read input data: {str(e)}\n")
            log_file.write("\n=== End of Input Data ===\n\n")

            # Read and store stdout and stderr
            stdout, stderr = process.communicate()
            for line in stdout.splitlines():
                logger.info(f"Render {render_video_id}: {line.strip()}")
                log_file.write(f"[OUT] {line}\n")

            for line in stderr.splitlines():
                logger.error(f"Render {render_video_id}: {line.strip()}")
                log_file.write(f"[ERR] {line}\n")

            # Log return code
            return_code = process.returncode
            log_file.write(
                f"\nProcess completed with code {return_code} at {datetime.now().isoformat()}\n"
            )

        # Clean up temp file
        try:
            os.unlink(temp_file_path)
        except Exception as e:
            logger.warning(f"Could not remove temp file {temp_file_path}: {e}")

        # If the process failed, mark the render as failed
        if return_code != 0:
            render_video.status = RenderVideo.Status.ERROR
            render_video.render_token = None
            render_video.save()
            return False

        # Process the completed render
        logger.info(f"Processing completed render for video {render_video_id}")
        try:
            render_video = RenderVideo.objects.get(id=render_video_id)

            # Validate render token
            if render_video.render_token != render_token:
                logger.warning(
                    f"Invalid render token for video asset {render_video_id}"
                )
                return False

            if not os.path.exists(output_path):
                logger.error(f"Rendered file not found at {output_path}")
                render_video.status = RenderVideo.Status.ERROR
                render_video.render_token = None
                render_video.save()
                return False

            gcs_file_path = f"renders/{render_video.id}/{os.path.basename(output_path)}"

            with open(output_path, "rb") as video_file:
                public_url = upload_file_to_cloud(
                    video_file, gcs_file_path, "video/mp4"
                )

            if not public_url:
                render_video.status = RenderVideo.Status.ERROR
                render_video.render_token = None
                render_video.save()
                return False

            try:
                os.remove(output_path)
            except Exception as e:
                logger.warning(f"Failed to remove local file {output_path}: {e}")

            render_video.video_url = public_url
            render_video.status = RenderVideo.Status.GENERATED
            render_video.render_token = None
            render_video.save()
            send_video_ready_email.delay(render_video_id)

            return True

        except Exception as e:
            logger.exception(f"Error processing completed render: {e}")
            return False

    except Exception as e:
        logger.exception(f"Error in render task: {e}")
        # Retry the task if it's a recoverable error
        self.retry(exc=e, countdown=60)
        return False


@shared_task(bind=True, max_retries=3, name="video_gen.send_video_ready_email")
def send_video_ready_email(self, render_video_id):
    """
    Send an email notification to the user when the render is complete
    """
    try:
        # Move the import inside the function
        from video_gen.models import RenderVideo

        render_video = RenderVideo.objects.select_related(
            "video_project", "video_project__org", "video_project__anonymous_session"
        ).get(id=render_video_id)

        # Get user info based on whether it's an anonymous session or registered user
        if not render_video.video_project.anonymous_session:
            user_email = render_video.video_project.org.created_by.user.email
            user_name = (
                render_video.video_project.org.created_by.user.first_name or "User"
            )
        else:
            user_email = render_video.video_project.anonymous_session.email
            user_name = "User"

        if not user_email:
            logger.error(f"No email found for render video {render_video_id}")
            return False

        if not render_video.email_sent_at:
            template_path = (
                Path(settings.BASE_DIR)
                / "video_gen"
                / "templates"
                / "email"
                / "video-generated.html"
            )
            template_context = {
                "to_username": user_name,
                "video_url": render_video.video_url,
                "video_name": render_video.video_project.name,
            }
            payload = {
                "from": "DemoDrive <noreply@demodrive.tech>",
                "to": [user_email],
                "subject": "Your Video is ready!",
            }
            email = send_email(template_context, template_path, payload)
            render_video.email_attempts.append(email)
            render_video.email_sent_at = timezone.now()
            render_video.save()
        return True
    except RenderVideo.DoesNotExist:
        logger.error(f"RenderVideo {render_video_id} not found")
        return False
    except Exception as e:
        logger.exception(f"Error sending email notification: {e}")
        # Retry the task for unexpected errors
        self.retry(exc=e, countdown=60)
        return False


@shared_task(bind=True, max_retries=3, name="video_gen.send_admin_email_for_project")
def send_admin_email_for_project(self, project_id, subject):
    try:
        # Move the import inside the function
        from video_gen.models import VideoProject

        print("Sending admin email for project", project_id)

        template_path = (
            Path(settings.BASE_DIR)
            / "video_gen"
            / "templates"
            / "email"
            / "admin-project-status-updated.html"
        )
        video_project = VideoProject.objects.get(id=project_id)
        template_context = {
            "project_name": video_project.name,
            "project_url": f"{settings.SITE_URL}/video-projects/{project_id}/",
            "status": video_project.status,
        }
        payload = {
            "from": "DemoDrive <noreply@demodrive.tech>",
            "to": settings.ADMIN_EMAILS.split(","),
            "subject": f"{settings.ENVIRONMENT} - {video_project.name} - {subject}",
        }
        send_email(template_context, template_path, payload)
        return True
    except Exception as e:
        logger.exception(f"Error sending admin email for project {project_id}: {e}")
        self.retry(exc=e, countdown=30)
        return False


@shared_task(bind=True, max_retries=3, name="video_gen.analyze_image")
def analyze_image_task(self, media_id):
    """
    Analyze an image and save the results to the database
    """
    try:
        from io import BytesIO

        import requests
        from video_gen.models import Media
        from video_gen.services.video_pipeline_service import VideoPipelineService

        logger.info(f"Analyzing image from path: {media_id}")

        # Get the Media object from storage_url_path
        media = Media.objects.filter(id=media_id).first()
        if not media:
            logger.error(f"Media not found for path: {media_id}")
            return False

        # Download the image for analysis
        response = requests.get(media.storage_url_path)
        if response.status_code != 200:
            logger.error(f"Failed to download image: {response.status_code}")
            return False

        image_file = BytesIO(response.content)
        file_name = media.storage_url_path.split("/")[-1]

        # Analyze the image
        analysis_response = VideoPipelineService.analyze_image(
            image_file, file_name=file_name
        )
        caption_metadata = analysis_response[1][1]

        # Update the media object with caption metadata
        media.caption_metadata = caption_metadata
        media.save()

        logger.info(f"Successfully analyzed and updated media {media.id}")
        return True

    except Exception as e:
        logger.exception(f"Error analyzing image: {e}")
        self.retry(exc=e, countdown=30)
        return False


def download_supported_videos_from_s3(
    s3_client, bucket_name, contents, supported_extensions, temp_dir_path
):
    """
    Download files from S3 that match supported video extensions.
    Returns a list of local file paths.
    """
    video_files = []
    for obj in contents:
        file_path = obj["Key"]
        if any(file_path.endswith(ext) for ext in supported_extensions):
            local_path = temp_dir_path / Path(file_path).name
            logger.info(f"Downloading {file_path} to {local_path}")
            s3_client.download_file(bucket_name, file_path, str(local_path))
            video_files.append(local_path)
    return video_files


def write_ffmpeg_file_list(video_files, file_list_path):
    """
    Write a file list for ffmpeg concat demuxer.
    """
    with open(file_list_path, "w") as f:
        for video_file in video_files:
            f.write(f"file '{video_file}'\n")
    return file_list_path


@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=3600,  # 1 hour timeout
    reject_on_worker_lost=True,
    name="video_gen.merge_videos_task",
)
def merge_videos_task(self, s3_folder_path, video_project_id):
    """
    Merge multiple 4K videos and create downscaled versions (1080p and 720p)
    Idempotent: checks for existing Media object for s3_folder_path/org, reuses if status is COMPLETE.
    """
    import boto3
    from django.conf import settings
    from video_gen.models import (
        Format,
        Media,
        VideoProject,
        VideoProjectMedia,
    )

    logger.info(f"Starting merge_videos_task for folder: {s3_folder_path}")
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            s3_client = boto3.client("s3")
            bucket_name = settings.AWS_STORAGE_PRIVATE_BUCKET_NAME
            response = s3_client.list_objects_v2(
                Bucket=bucket_name, Prefix=s3_folder_path
            )
            if "Contents" not in response:
                logger.error(f"No files found in S3 folder: {s3_folder_path}")
                return None
            # Use the new helper function
            video_files = download_supported_videos_from_s3(
                s3_client,
                bucket_name,
                response["Contents"],
                FFMPEGService.SUPPORTED_VIDEO_EXTENSIONS,
                temp_dir_path,
            )
            if not video_files:
                logger.error("No video files found")
                return None
            # hardcoded for now
            video_files.sort(key=lambda x: x.stem)
            file_list_path = temp_dir_path / "file_list.txt"
            write_ffmpeg_file_list(video_files, file_list_path)
            video_project = VideoProject.objects.get(id=video_project_id)
            org = video_project.org
            recording_info = extract_info_from_studio_recording_filepath(s3_folder_path)
            media = Media.objects.filter(
                org=org,
                type=Media.Type.STUDIO_RECORDING,
                metadata__s3_folder_path=s3_folder_path,
            ).first()
            if not media:
                media = Media.objects.create(
                    name=f"{recording_info.company_identifier} - {recording_info.session_identifier} {recording_info.device_identifier}",
                    status=Media.Status.PENDING,
                    storage_url_path="",
                    thumbnail_url=None,
                    resolution=recording_info.resolution,
                    format=Format.MP4,
                    org=org,
                    type=Media.Type.STUDIO_RECORDING,
                    metadata={
                        "s3_folder_path": s3_folder_path,
                        "video_project_id": str(video_project_id),
                        "aspect_ratio": recording_info.aspect_ratio,
                        "device_identifier": recording_info.device_identifier,
                    },
                )
                VideoProjectMedia.objects.create(
                    media=media,
                    video_project=video_project,
                )
                logger.info(f"Created new media: {media.id}")
            # Use media.id in all storage paths
            s3_prefix = f"video_uploads/{org.id}/{media.id}"
            filename_raw = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_raw.mp4"

            s3_path_raw = f"{s3_prefix}/{filename_raw}"
            output_raw = temp_dir_path / filename_raw
            # Use FFMPEGService for merging
            FFMPEGService.merge_videos_concat(file_list_path, output_raw)
            logger.info(f"output_raw {output_raw} generated!")
            # Upload raw video
            logger.info(f"uploading to s3_path_raw {s3_path_raw}")
            public_url_raw = CloudStorageFactory.get_storage_backend().upload_file(
                str(output_raw), s3_path_raw, "video/mp4"
            )
            logger.info(f"public_url_raw {public_url_raw} uploaded!")
            media.metadata["raw_url"] = public_url_raw
            media.save()
            return media.id
    except Exception as e:
        logger.exception(f"Error in merge_videos_task: {e}")
        self.retry(exc=e, countdown=300)
        return None


@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=10800,  # 3 hours timeout
    reject_on_worker_lost=True,
    name="video_gen.downscale_to_720p_task",
)
def downscale_to_720p_task(self, media_id):
    """
    Downscale the raw video to 720p, upload to S3, update Media, and generate thumbnail.
    Expects merge_result dict from merge_videos_task.
    """
    from video_gen.models import Media

    media = Media.objects.get(id=media_id)
    try:
        # Use deterministic temp dir
        temp_dir = f"/tmp/video_gen_{media_id}"
        os.makedirs(temp_dir, exist_ok=True)
        temp_dir_path = Path(temp_dir)

        # Download the source video (1080p if available, else raw) using S3 storage backend
        recording_info = extract_info_from_studio_recording_filepath(
            media.metadata["s3_folder_path"]
        )
        filename_720p = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_720p_downscaled.mp4"
        output_path = temp_dir_path / filename_720p
        from common.storage.factory import CloudStorageFactory

        source_url = media.metadata["raw_url"]
        source_filename = "input_raw.mp4"
        source_path = temp_dir_path / source_filename
        # Only download if not already present
        if not source_path.exists():
            storage_backend = CloudStorageFactory.get_storage_backend()
            storage_backend.download_file_to_path(source_url, source_path)
        else:
            logger.info(f"Reusing existing source video at {source_path}")
        # Use FFMPEGService for downscaling
        aspect_ratio = recording_info.aspect_ratio
        # delete output_720p if it exists
        if output_path.exists():
            os.remove(output_path)
        FFMPEGService.downscale_video(
            source_path, output_path, (1280, 720), translate_aspect_ratio(aspect_ratio)
        )
        s3_prefix = f"video_uploads/{media.org.id}/{media.id}"
        s3_path_720p = f"{s3_prefix}/{filename_720p}"
        logger.info(f"uploading to s3_path_720p {s3_path_720p}")
        public_url_720p = CloudStorageFactory.get_storage_backend().upload_file(
            str(output_path), s3_path_720p, "video/mp4"
        )
        logger.info(f"public_url_720p {public_url_720p} uploaded!")
        # Update Media object

        media.storage_url_path = public_url_720p
        media.metadata = {
            **(media.metadata or {}),
            "720p_url": public_url_720p,
        }
        media.status = Media.Status.COMPLETE
        media.save()
        logger.info(f"Media {media.id} processing complete and mapped to project.")
        return media_id
    except Exception as e:
        logger.exception(f"Error in downscale_to_720p_task: {e}")
        self.retry(exc=e, countdown=300)
        return None


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,  # 10 minutes timeout
    reject_on_worker_lost=True,
)
def create_thumbnail_task(self, media_id):
    """
    Create a thumbnail from a video.
    """
    try:
        from video_gen.services.media_service import Media, MediaService

        media = Media.objects.get(id=media_id)
        if media.thumbnail_url:
            logger.info(f"Thumbnail already exists for media {media_id}")
            return media_id
        if media.type == Media.Type.IMAGE:
            thumbnail_url = MediaService.generate_image_thumbnail(media)
        elif (
            media.type == Media.Type.VIDEO or media.type == Media.Type.STUDIO_RECORDING
        ):
            thumbnail_url = MediaService.generate_video_thumbnail(
                media.storage_url_path, media.id
            )
        else:
            logger.info(
                f"Unsupported media type for thumbnail generation: {media.type}"
            )
            return media_id
        media.thumbnail_url = thumbnail_url
        media.save()
        return media_id
    except Exception as e:
        logger.exception(f"Error in create_thumbnail_task: {e}")
        self.retry(exc=e, countdown=300)
        return None


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,  # 10 minutes timeout
    reject_on_worker_lost=True,
)
def extract_audio_from_video_task(self, media_id):
    """
    Generate an audio from a video.
    """
    from video_gen.models import Media
    from video_gen.services.ffmpeg_service import FFMPEGService

    media = Media.objects.get(id=media_id)
    if media.metadata.get("audio_url"):
        logger.info(f"Audio already exists for media {media_id}")
        return media_id
    temp_dir = f"/tmp/video_gen_{media_id}"
    os.makedirs(temp_dir, exist_ok=True)
    temp_dir_path = Path(temp_dir)
    recording_info = extract_info_from_studio_recording_filepath(
        media.metadata["s3_folder_path"]
    )
    filename_audio = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_audio.mp3"
    filename_video = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_720p_downscaled.mp4"
    video_path = temp_dir_path / filename_video
    if not video_path.exists():
        CloudStorageFactory.get_storage_backend().download_file_to_path(
            media.metadata["raw_url"], video_path
        )
    else:
        logger.info(f"Reusing existing video at {video_path}")
    audio_path = temp_dir_path / filename_audio

    # delete audio_path if it exists
    if not audio_path.exists():
        FFMPEGService.extract_audio_from_video(video_path, audio_path)
    else:
        logger.info(f"Reusing existing audio at {audio_path}")
    audio_s3_path = f"video_uploads/{media.org.id}/{media.id}/{filename_audio}"
    audio_url = CloudStorageFactory.get_storage_backend().upload_file(
        str(audio_path), audio_s3_path, "audio/mpeg"
    )
    media.metadata["audio_url"] = audio_url
    media.save()
    return media_id


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,  # 10 minutes timeout
    reject_on_worker_lost=True,
)
def generate_transcript_from_video_task(self, media_id):
    """
    Generate a transcript from a video.
    """
    from video_gen.services.media_service import Media
    from video_gen.services.transcription_service import TranscriptionService

    media = Media.objects.get(id=media_id)
    recording_info = extract_info_from_studio_recording_filepath(
        media.metadata["s3_folder_path"]
    )
    if media.metadata.get("transcript"):
        logger.info(f"Transcript already exists for media {media_id}")
        return media_id
    if not media.metadata.get("audio_url"):
        logger.info(f"No audio URL found for media {media_id}")
        return media_id
    transcript = TranscriptionService(speakers_expected=2).transcribe(
        media.metadata.get("audio_url")
    )
    vtt_transcript, utterances = transcript
    filename_transcript = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_transcript.vtt"
    filename_utterances = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_utterances.json"
    vtt_transcript_s3_path = (
        f"video_uploads/{media.org.id}/{media.id}/{filename_transcript}"
    )
    vtt_transcript_url = CloudStorageFactory.get_storage_backend().upload_file(
        vtt_transcript, vtt_transcript_s3_path, "text/vtt"
    )
    utterances_s3_path = (
        f"video_uploads/{media.org.id}/{media.id}/{filename_utterances}"
    )
    utterances_url = CloudStorageFactory.get_storage_backend().upload_file(
        json.dumps(utterances), utterances_s3_path, "application/json"
    )
    media.metadata["transcript_url"] = vtt_transcript_url
    media.metadata["utterances_url"] = utterances_url
    media.save()
    return media_id


def process_and_downscale_videos_chain(s3_folder_path, video_project_id):
    """
    Orchestrate the merging and downscaling process using Celery chains.
    """
    workflow = chain(
        merge_videos_task.s(s3_folder_path, video_project_id),
        downscale_to_720p_task.s(),
        create_thumbnail_task.s(),
        extract_audio_from_video_task.s(),
        generate_transcript_from_video_task.s(),
    )
    return workflow()


def process_and_downscale_videos_chain_with_tracking(
    s3_folder_path, video_project_id, pipeline_run_id=None
):
    """
    Orchestrate the merging and downscaling process using Celery chains with VideoPipeline tracking.
    """
    if pipeline_run_id:
        # Enhanced version with tracking
        workflow = chain(
            merge_videos_task_tracked.s(
                s3_folder_path, video_project_id, pipeline_run_id, 0
            ),
            downscale_to_720p_task_tracked.s(pipeline_run_id, 1),
            create_thumbnail_task_tracked.s(pipeline_run_id, 2),
            extract_audio_from_video_task_tracked.s(pipeline_run_id, 3),
            generate_transcript_from_video_task_tracked.s(pipeline_run_id, 4),
        )
    else:
        # Fallback to original chain
        workflow = chain(
            merge_videos_task.s(s3_folder_path, video_project_id),
            downscale_to_720p_task.s(),
            create_thumbnail_task.s(),
            extract_audio_from_video_task.s(),
            generate_transcript_from_video_task.s(),
        )
    return workflow()


@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=3600,
    reject_on_worker_lost=True,
    name="video_gen.merge_videos_task_tracked",
)
def merge_videos_task_tracked(
    self, s3_folder_path, video_project_id, pipeline_run_id, step_index
):
    """
    Merge multiple 4K videos with VideoPipeline step tracking
    """
    # Update step status to running
    if pipeline_run_id:
        try:
            from video_gen.models import VideoPipelineStep

            step = VideoPipelineStep.objects.filter(
                pipeline_run_id=pipeline_run_id, step_index=step_index
            ).first()
            if step:
                step.status = VideoPipelineStep.Status.RUNNING
                step.celery_task_id = self.request.id
                step.started_at = timezone.now()
                step.input_data = {
                    "s3_folder_path": s3_folder_path,
                    "video_project_id": video_project_id,
                }
                step.save()
        except Exception as e:
            logger.error(f"Failed to update step status: {e}")

    try:
        # Execute the same logic as merge_videos_task but inline
        import boto3
        from django.conf import settings
        from video_gen.models import (
            Format,
            Media,
            VideoProject,
            VideoProjectMedia,
        )

        logger.info(f"Starting merge_videos_task_tracked for folder: {s3_folder_path}")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            s3_client = boto3.client("s3")
            bucket_name = settings.AWS_STORAGE_PRIVATE_BUCKET_NAME
            response = s3_client.list_objects_v2(
                Bucket=bucket_name, Prefix=s3_folder_path
            )
            if "Contents" not in response:
                logger.error(f"No files found in S3 folder: {s3_folder_path}")
                return None

            # Use the new helper function
            video_files = download_supported_videos_from_s3(
                s3_client,
                bucket_name,
                response["Contents"],
                FFMPEGService.SUPPORTED_VIDEO_EXTENSIONS,
                temp_dir_path,
            )
            if not video_files:
                logger.error("No video files found")
                return None

            # hardcoded for now
            video_files.sort(key=lambda x: x.stem)
            file_list_path = temp_dir_path / "file_list.txt"
            write_ffmpeg_file_list(video_files, file_list_path)
            video_project = VideoProject.objects.get(id=video_project_id)
            org = video_project.org
            recording_info = extract_info_from_studio_recording_filepath(s3_folder_path)
            media = Media.objects.filter(
                org=org,
                type=Media.Type.STUDIO_RECORDING,
                metadata__s3_folder_path=s3_folder_path,
            ).first()
            if not media:
                media = Media.objects.create(
                    name=f"{recording_info.company_identifier} - {recording_info.session_identifier} {recording_info.device_identifier}",
                    status=Media.Status.PENDING,
                    storage_url_path="",
                    thumbnail_url=None,
                    resolution=recording_info.resolution,
                    format=Format.MP4,
                    org=org,
                    type=Media.Type.STUDIO_RECORDING,
                    metadata={
                        "s3_folder_path": s3_folder_path,
                        "video_project_id": str(video_project_id),
                        "aspect_ratio": recording_info.aspect_ratio,
                        "device_identifier": recording_info.device_identifier,
                    },
                )
                VideoProjectMedia.objects.create(
                    media=media,
                    video_project=video_project,
                )
                logger.info(f"Created new media: {media.id}")

            # Use media.id in all storage paths
            s3_prefix = f"video_uploads/{org.id}/{media.id}"
            filename_raw = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_raw.mp4"

            s3_path_raw = f"{s3_prefix}/{filename_raw}"
            output_raw = temp_dir_path / filename_raw
            # Use FFMPEGService for merging
            FFMPEGService.merge_videos_concat(file_list_path, output_raw)
            logger.info(f"output_raw {output_raw} generated!")
            # Upload raw video
            logger.info(f"uploading to s3_path_raw {s3_path_raw}")
            from common.storage.factory import CloudStorageFactory

            public_url_raw = CloudStorageFactory.get_storage_backend().upload_file(
                str(output_raw), s3_path_raw, "video/mp4"
            )
            logger.info(f"public_url_raw {public_url_raw} uploaded!")
            media.metadata["raw_url"] = public_url_raw
            media.save()
            result = media.id

        # Update step status to completed
        if pipeline_run_id and result:
            try:
                from video_gen.models import VideoPipelineStep

                step = VideoPipelineStep.objects.filter(
                    pipeline_run_id=pipeline_run_id, step_index=step_index
                ).first()
                if step:
                    step.status = VideoPipelineStep.Status.COMPLETED
                    step.completed_at = timezone.now()
                    step.duration_seconds = (
                        step.completed_at - step.started_at
                    ).total_seconds()
                    step.output_data = {"media_id": str(result)}
                    step.save()
            except Exception as e:
                logger.error(f"Failed to update step completion: {e}")

        return result

    except Exception as e:
        # Update step status to failed
        if pipeline_run_id:
            try:
                from video_gen.models import VideoPipelineStep

                step = VideoPipelineStep.objects.filter(
                    pipeline_run_id=pipeline_run_id, step_index=step_index
                ).first()
                if step:
                    step.status = VideoPipelineStep.Status.FAILED
                    step.error_message = str(e)
                    step.completed_at = timezone.now()
                    if step.started_at:
                        step.duration_seconds = (
                            step.completed_at - step.started_at
                        ).total_seconds()
                    step.save()
            except Exception as update_error:
                logger.error(f"Failed to update step failure: {update_error}")
        raise e


# Similar tracked versions for other tasks
@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=10800,
    reject_on_worker_lost=True,
    name="video_gen.downscale_to_720p_task_tracked",
)
def downscale_to_720p_task_tracked(self, media_id, pipeline_run_id, step_index):
    """Downscale video with pipeline tracking"""

    def task_wrapper():
        # Execute the same logic as downscale_to_720p_task inline
        from video_gen.models import Media

        media = Media.objects.get(id=media_id)

        # Use deterministic temp dir
        temp_dir = f"/tmp/video_gen_{media_id}"
        os.makedirs(temp_dir, exist_ok=True)
        temp_dir_path = Path(temp_dir)

        # Download the source video (1080p if available, else raw) using S3 storage backend
        recording_info = extract_info_from_studio_recording_filepath(
            media.metadata["s3_folder_path"]
        )
        filename_720p = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_720p_downscaled.mp4"
        output_path = temp_dir_path / filename_720p
        from common.storage.factory import CloudStorageFactory

        source_url = media.metadata["raw_url"]
        source_filename = "input_raw.mp4"
        source_path = temp_dir_path / source_filename
        # Only download if not already present
        if not source_path.exists():
            storage_backend = CloudStorageFactory.get_storage_backend()
            storage_backend.download_file_to_path(source_url, source_path)
        else:
            logger.info(f"Reusing existing source video at {source_path}")
        # Use FFMPEGService for downscaling
        aspect_ratio = recording_info.aspect_ratio
        # delete output_720p if it exists
        if output_path.exists():
            os.remove(output_path)
        FFMPEGService.downscale_video(
            source_path, output_path, (1280, 720), translate_aspect_ratio(aspect_ratio)
        )
        s3_prefix = f"video_uploads/{media.org.id}/{media.id}"
        s3_path_720p = f"{s3_prefix}/{filename_720p}"
        logger.info(f"uploading to s3_path_720p {s3_path_720p}")
        public_url_720p = CloudStorageFactory.get_storage_backend().upload_file(
            str(output_path), s3_path_720p, "video/mp4"
        )
        logger.info(f"public_url_720p {public_url_720p} uploaded!")
        # Update Media object

        media.storage_url_path = public_url_720p
        media.metadata = {
            **(media.metadata or {}),
            "720p_url": public_url_720p,
        }
        media.status = Media.Status.COMPLETE
        media.save()
        logger.info(f"Media {media.id} processing complete and mapped to project.")
        return media_id

    return _execute_tracked_task(
        self, media_id, pipeline_run_id, step_index, task_wrapper
    )


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,
    reject_on_worker_lost=True,
    name="video_gen.create_thumbnail_task_tracked",
)
def create_thumbnail_task_tracked(self, media_id, pipeline_run_id, step_index):
    """Create thumbnail with pipeline tracking"""

    def task_wrapper():
        # Execute create_thumbnail_task logic inline
        from video_gen.services.media_service import Media, MediaService

        media = Media.objects.get(id=media_id)
        if media.thumbnail_url:
            logger.info(f"Thumbnail already exists for media {media_id}")
            return media_id
        if media.type == Media.Type.IMAGE:
            thumbnail_url = MediaService.generate_image_thumbnail(media)
        elif (
            media.type == Media.Type.VIDEO or media.type == Media.Type.STUDIO_RECORDING
        ):
            thumbnail_url = MediaService.generate_video_thumbnail(
                media.storage_url_path, media.id
            )
        else:
            logger.info(
                f"Unsupported media type for thumbnail generation: {media.type}"
            )
            return media_id
        media.thumbnail_url = thumbnail_url
        media.save()
        return media_id

    return _execute_tracked_task(
        self, media_id, pipeline_run_id, step_index, task_wrapper
    )


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,
    reject_on_worker_lost=True,
    name="video_gen.extract_audio_from_video_task_tracked",
)
def extract_audio_from_video_task_tracked(self, media_id, pipeline_run_id, step_index):
    """Extract audio with pipeline tracking"""

    def task_wrapper():
        # Execute extract_audio_from_video_task logic inline
        from video_gen.models import Media
        from video_gen.services.ffmpeg_service import FFMPEGService

        media = Media.objects.get(id=media_id)
        if media.metadata.get("audio_url"):
            logger.info(f"Audio already exists for media {media_id}")
            return media_id
        temp_dir = f"/tmp/video_gen_{media_id}"
        os.makedirs(temp_dir, exist_ok=True)
        temp_dir_path = Path(temp_dir)
        recording_info = extract_info_from_studio_recording_filepath(
            media.metadata["s3_folder_path"]
        )
        filename_audio = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_audio.mp3"
        filename_video = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_720p_downscaled.mp4"
        video_path = temp_dir_path / filename_video
        if not video_path.exists():
            from common.storage.factory import CloudStorageFactory

            CloudStorageFactory.get_storage_backend().download_file_to_path(
                media.metadata["raw_url"], video_path
            )
        else:
            logger.info(f"Reusing existing video at {video_path}")
        audio_path = temp_dir_path / filename_audio

        # delete audio_path if it exists
        if not audio_path.exists():
            FFMPEGService.extract_audio_from_video(video_path, audio_path)
        else:
            logger.info(f"Reusing existing audio at {audio_path}")
        audio_s3_path = f"video_uploads/{media.org.id}/{media.id}/{filename_audio}"
        from common.storage.factory import CloudStorageFactory

        audio_url = CloudStorageFactory.get_storage_backend().upload_file(
            str(audio_path), audio_s3_path, "audio/mpeg"
        )
        media.metadata["audio_url"] = audio_url
        media.save()
        return media_id

    return _execute_tracked_task(
        self, media_id, pipeline_run_id, step_index, task_wrapper
    )


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=600,
    reject_on_worker_lost=True,
    name="video_gen.generate_transcript_from_video_task_tracked",
)
def generate_transcript_from_video_task_tracked(
    self, media_id, pipeline_run_id, step_index
):
    """Generate transcript with pipeline tracking"""

    def task_wrapper():
        # Execute generate_transcript_from_video_task logic inline
        from video_gen.services.media_service import Media
        from video_gen.services.transcription_service import TranscriptionService

        media = Media.objects.get(id=media_id)
        recording_info = extract_info_from_studio_recording_filepath(
            media.metadata["s3_folder_path"]
        )
        if media.metadata.get("transcript"):
            logger.info(f"Transcript already exists for media {media_id}")
            return media_id
        if not media.metadata.get("audio_url"):
            logger.info(f"No audio URL found for media {media_id}")
            return media_id
        transcript = TranscriptionService(speakers_expected=2).transcribe(
            media.metadata.get("audio_url")
        )
        vtt_transcript, utterances = transcript
        filename_transcript = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_transcript.vtt"
        filename_utterances = f"{recording_info.company_identifier}_{recording_info.session_identifier}_{recording_info.device_identifier}_{recording_info.aspect_ratio}_{recording_info.resolution}_utterances.json"
        vtt_transcript_s3_path = (
            f"video_uploads/{media.org.id}/{media.id}/{filename_transcript}"
        )
        from common.storage.factory import CloudStorageFactory

        vtt_transcript_url = CloudStorageFactory.get_storage_backend().upload_file(
            vtt_transcript, vtt_transcript_s3_path, "text/vtt"
        )
        utterances_s3_path = (
            f"video_uploads/{media.org.id}/{media.id}/{filename_utterances}"
        )
        import json

        utterances_url = CloudStorageFactory.get_storage_backend().upload_file(
            json.dumps(utterances), utterances_s3_path, "application/json"
        )
        media.metadata["transcript_url"] = vtt_transcript_url
        media.metadata["utterances_url"] = utterances_url
        media.save()
        return media_id

    return _execute_tracked_task(
        self, media_id, pipeline_run_id, step_index, task_wrapper
    )


def _execute_tracked_task(task_self, media_id, pipeline_run_id, step_index, task_func):
    """
    Helper function to execute a task with VideoPipeline tracking
    """
    # Update step status to running
    if pipeline_run_id:
        try:
            from video_gen.models import VideoPipelineStep

            step = VideoPipelineStep.objects.filter(
                pipeline_run_id=pipeline_run_id, step_index=step_index
            ).first()
            if step:
                step.status = VideoPipelineStep.Status.RUNNING
                step.celery_task_id = task_self.request.id
                step.started_at = timezone.now()
                step.input_data = {"media_id": str(media_id)}
                step.save()
        except Exception as e:
            logger.error(f"Failed to update step status: {e}")

    try:
        # Execute the actual task
        result = task_func()

        # Update step status to completed
        if pipeline_run_id:
            try:
                from video_gen.models import VideoPipelineStep

                step = VideoPipelineStep.objects.filter(
                    pipeline_run_id=pipeline_run_id, step_index=step_index
                ).first()
                if step:
                    step.status = VideoPipelineStep.Status.COMPLETED
                    step.completed_at = timezone.now()
                    step.duration_seconds = (
                        step.completed_at - step.started_at
                    ).total_seconds()
                    step.output_data = {"result": str(result)}
                    step.save()

                    # Update pipeline run progress
                    from video_gen.models import VideoPipelineRun

                    pipeline_run = VideoPipelineRun.objects.get(id=pipeline_run_id)
                    pipeline_run.current_step_index = step_index + 1
                    pipeline_run.progress_percentage = (
                        (step_index + 1) / pipeline_run.total_steps
                    ) * 100
                    if pipeline_run.progress_percentage >= 100:
                        pipeline_run.status = VideoPipelineRun.Status.COMPLETED
                        pipeline_run.completed_at = timezone.now()
                        if pipeline_run.started_at:
                            pipeline_run.duration_seconds = (
                                pipeline_run.completed_at - pipeline_run.started_at
                            ).total_seconds()
                    pipeline_run.save()
            except Exception as e:
                logger.error(f"Failed to update step completion: {e}")

        return result

    except Exception as e:
        # Update step status to failed
        if pipeline_run_id:
            try:
                from video_gen.models import VideoPipelineStep

                step = VideoPipelineStep.objects.filter(
                    pipeline_run_id=pipeline_run_id, step_index=step_index
                ).first()
                if step:
                    step.status = VideoPipelineStep.Status.FAILED
                    step.error_message = str(e)
                    step.completed_at = timezone.now()
                    if step.started_at:
                        step.duration_seconds = (
                            step.completed_at - step.started_at
                        ).total_seconds()
                    step.save()

                    # Update pipeline run to failed
                    from video_gen.models import VideoPipelineRun

                    pipeline_run = VideoPipelineRun.objects.get(id=pipeline_run_id)
                    pipeline_run.status = VideoPipelineRun.Status.FAILED
                    pipeline_run.error_logs = str(e)
                    pipeline_run.completed_at = timezone.now()
                    if pipeline_run.started_at:
                        pipeline_run.duration_seconds = (
                            pipeline_run.completed_at - pipeline_run.started_at
                        ).total_seconds()
                    pipeline_run.save()
            except Exception as update_error:
                logger.error(f"Failed to update step failure: {update_error}")
        raise e


@shared_task(
    bind=True,
    max_retries=3,
    acks_late=True,
    time_limit=300,  # 5 minutes timeout
    reject_on_worker_lost=True,
    name="video_gen.generate_embedding_task",
)
def generate_embedding_task(self, media_id):
    """
    Generate and store embedding for a single media item.
    """
    try:
        from video_gen.models import Media
        from video_gen.services.media_service import MediaService

        logger.info(f"Generating embedding for media {media_id}")

        media = Media.objects.get(id=media_id)
        success = MediaService.generate_and_store_embedding(media)

        if success:
            logger.info(f"Successfully generated embedding for media {media_id}")
            return {"media_id": str(media_id), "success": True}
        else:
            logger.warning(f"Failed to generate embedding for media {media_id}")
            return {"media_id": str(media_id), "success": False}

    except Media.DoesNotExist:
        logger.error(f"Media {media_id} not found")
        return {"media_id": str(media_id), "success": False, "error": "Media not found"}
    except Exception as e:
        logger.exception(f"Error generating embedding for media {media_id}: {e}")
        self.retry(exc=e, countdown=60)
        return {"media_id": str(media_id), "success": False, "error": str(e)}


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    time_limit=1800,  # 30 minutes timeout
    reject_on_worker_lost=True,
    name="video_gen.batch_generate_embeddings_task",
)
def batch_generate_embeddings_task(self, org_id, batch_size=10, offset=0):
    """
    Generate embeddings for a batch of media items for a specific organization.
    """
    try:
        from user_org.models import Organization
        from video_gen.models import Media
        from video_gen.services.media_service import MediaService

        logger.info(
            f"Processing embedding batch for org {org_id}, offset {offset}, batch_size {batch_size}"
        )

        org = Organization.objects.get(id=org_id)

        # Get media items without embeddings
        media_queryset = Media.objects.filter(org=org, embedding__isnull=True).order_by(
            "created_at"
        )[offset : offset + batch_size]

        media_items = list(media_queryset)

        if not media_items:
            logger.info(f"No more media items to process for org {org_id}")
            return {
                "org_id": str(org_id),
                "processed": 0,
                "success": 0,
                "failed": 0,
                "completed": True,
            }

        logger.info(f"Processing {len(media_items)} media items for org {org_id}")

        success_count = 0
        failed_count = 0

        for media in media_items:
            try:
                success = MediaService.generate_and_store_embedding(media)
                if success:
                    success_count += 1
                    logger.info(f"Generated embedding for media {media.id}")
                else:
                    failed_count += 1
                    logger.warning(f"Failed to generate embedding for media {media.id}")
            except Exception as e:
                failed_count += 1
                logger.exception(f"Error processing media {media.id}: {e}")

        # Check if there are more items to process
        remaining_count = Media.objects.filter(org=org, embedding__isnull=True).count()

        result = {
            "org_id": str(org_id),
            "processed": len(media_items),
            "success": success_count,
            "failed": failed_count,
            "remaining": remaining_count,
            "completed": remaining_count == 0,
        }

        logger.info(f"Batch processing completed: {result}")

        # Queue next batch if there are more items
        if remaining_count > 0:
            logger.info(
                f"Queueing next batch for org {org_id}, offset {offset + batch_size}"
            )
            batch_generate_embeddings_task.delay(
                org_id, batch_size, offset + batch_size
            )

        return result

    except Organization.DoesNotExist:
        logger.error(f"Organization {org_id} not found")
        return {"org_id": str(org_id), "error": "Organization not found"}
    except Exception as e:
        logger.exception(f"Error in batch embedding generation for org {org_id}: {e}")
        self.retry(exc=e, countdown=120)
        return {"org_id": str(org_id), "error": str(e)}


@shared_task(
    bind=True,
    max_retries=1,
    acks_late=True,
    time_limit=3600,  # 1 hour timeout
    reject_on_worker_lost=True,
    name="video_gen.backfill_all_embeddings_task",
)
def backfill_all_embeddings_task(self, batch_size=10):
    """
    Backfill embeddings for all media items across all organizations.
    This task queues batch jobs for each organization.
    """
    try:
        from user_org.models import Organization
        from video_gen.models import Media

        logger.info("Starting backfill embeddings for all organizations")

        # Get all organizations that have media without embeddings
        orgs_with_missing_embeddings = Organization.objects.filter(
            media__embedding__isnull=True
        ).distinct()

        total_orgs = orgs_with_missing_embeddings.count()
        logger.info(f"Found {total_orgs} organizations with media missing embeddings")

        if total_orgs == 0:
            logger.info("No organizations need embedding backfill")
            return {
                "total_orgs": 0,
                "queued_orgs": 0,
                "message": "No organizations need embedding backfill",
            }

        queued_count = 0

        for org in orgs_with_missing_embeddings:
            # Count media items without embeddings for this org
            missing_count = Media.objects.filter(
                org=org, embedding__isnull=True
            ).count()

            if missing_count > 0:
                logger.info(
                    f"Queueing batch embedding generation for org {org.id} ({missing_count} items)"
                )
                batch_generate_embeddings_task.delay(str(org.id), batch_size, 0)
                queued_count += 1

        result = {
            "total_orgs": total_orgs,
            "queued_orgs": queued_count,
            "batch_size": batch_size,
            "message": f"Queued embedding generation for {queued_count} organizations",
        }

        logger.info(f"Backfill task completed: {result}")
        return result

    except Exception as e:
        logger.exception(f"Error in backfill embeddings task: {e}")
        self.retry(exc=e, countdown=300)
        return {"error": str(e)}
