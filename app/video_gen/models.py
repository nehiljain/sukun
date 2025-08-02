import uuid
from datetime import datetime
from typing import Optional

from common.fields import PrefixedUUIDField
from django.conf import settings
from django.db import models
from pgvector.django import VectorField
from pydantic import BaseModel

from .signals import project_created, project_updated


class Resolution(models.TextChoices):
    SD = "720p"
    HD = "1080p"
    UHD = "2160p"


class Format(models.TextChoices):
    MP4 = "mp4", "MP4"
    MOV = "mov", "MOV"
    WEBM = "webm", "WEBM"
    M4V = "m4v", "M4V"
    MPEG = "mpeg", "MPEG"
    MPEG4 = "mpeg4", "MPEG4"
    GIF = "gif", "GIF"
    WEBP = "webp", "WEBP"
    PNG = "png", "PNG"
    JPG = "jpg", "JPG"
    JPEG = "jpeg", "JPEG"
    TIFF = "tiff", "TIFF"


class Media(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CANCELLED = "cancelled", "Cancelled"
        ERROR = "error", "Error"
        COMPLETE = "complete", "Complete"
        DELETED = "deleted", "Deleted"

    class Type(models.TextChoices):
        STUDIO_RECORDING = "studio_recording", "Studio Recording"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        SCREEN = "screen", "Screen"
        IMAGE = "image", "Image"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    storage_url_path = models.CharField(max_length=255)
    thumbnail_url = models.CharField(max_length=255, null=True, blank=True)
    duration_in_seconds = models.IntegerField(default=0, null=True, blank=True)
    resolution = models.CharField(
        max_length=20, choices=Resolution.choices, default=Resolution.HD
    )
    format = models.CharField(
        max_length=20, choices=Format.choices, default=None, null=True, blank=True
    )
    org = models.ForeignKey(
        "user_org.Organization", on_delete=models.CASCADE, related_name="media"
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.VIDEO)
    tags = models.JSONField(default=list, null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    caption_metadata = models.JSONField(null=True, blank=True)
    embedding = VectorField(
        dimensions=1024,
        null=True,
        blank=True,
        help_text="Vector embedding for semantic search (text-embedding-3-large)",
    )
    embedding_text = models.JSONField(
        blank=True,
        null=True,
        help_text="AI summary data including text, model, and timestamp",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.type})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Media"
        verbose_name_plural = "Media"

    @property
    def aspect_ratio(self):
        aspect_ratio = self.metadata.get("aspect_ratio")
        if aspect_ratio == "916":
            return "9:16"
        elif aspect_ratio == "169":
            return "16:9"
        elif aspect_ratio == "11":
            return "1:1"
        return aspect_ratio


class VideoProjectMedia(models.Model):
    """Mapping table to establish many-to-many relationship between VideoProject and Media."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video_project = models.ForeignKey(
        "VideoProject", on_delete=models.CASCADE, related_name="project_media"
    )
    media = models.ForeignKey(
        Media, on_delete=models.CASCADE, related_name="project_media"
    )
    order = models.IntegerField(default=0, help_text="Order of media in the project")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.video_project.name} - {self.media.name}"

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "Video Project Media"
        verbose_name_plural = "Video Project Media"
        unique_together = ("video_project", "media")


class BrandAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    colors = models.JSONField(default=list)  # Store colors as JSON array
    logo = models.JSONField(default=dict)  # Store logo object with url and darkVersion
    font = models.JSONField(default=dict)  # Store font object
    voiceover = models.JSONField(default=dict)  # Store voiceover settings
    cover = models.JSONField(default=dict)  # Store cover object
    intro_video = models.JSONField(default=dict)  # Store introVideo object
    outro_video = models.JSONField(default=dict)  # Store outroVideo object
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    org = models.ForeignKey(
        "user_org.Organization", on_delete=models.CASCADE, related_name="brand_assets"
    )

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Brand Asset"
        verbose_name_plural = "Brand Assets"

    @property
    def logo_url(self):
        return self.logo.get("url")

    @property
    def logo_dark_version(self):
        return self.logo.get("darkVersion")

    @property
    def cover_url(self):
        return self.cover.get("url")

    @property
    def cover_type(self):
        return self.cover.get("type")

    @property
    def intro_video_url(self):
        return self.intro_video.get("url")

    @property
    def outro_video_url(self):
        return self.outro_video.get("url")


class AspectRatio(models.TextChoices):
    LANDSCAPE = "16:9", "16:9 Landscape"
    PORTRAIT = "9:16", "9:16 Portrait"
    SQUARE = "1:1", "1:1 Square"


class VideoProject(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PROCESSING = "processing", "Processing"
        GENERATED = "generated", "Generated"
        ACCEPTED = "accepted", "Accepted"
        CHANGES_REQUESTED = "changes_requested", "Changes Requested"
        COMPLETE = "complete", "Complete"
        ERROR = "error", "Error"
        DELETED = "deleted", "Deleted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    aspect_ratio = models.CharField(
        max_length=10, choices=AspectRatio.choices, default=AspectRatio.LANDSCAPE
    )
    is_public = models.BooleanField(default=False)
    is_template = models.BooleanField(default=False)
    preview_url = models.CharField(max_length=255, blank=True, null=True)
    state = models.JSONField(null=True, blank=True)
    brand_asset = models.ForeignKey(
        BrandAsset,
        on_delete=models.CASCADE,
        related_name="video_projects",
        null=True,
        blank=True,
    )
    org = models.ForeignKey(
        "user_org.Organization", on_delete=models.CASCADE, related_name="video_projects"
    )
    workspace = models.ForeignKey(
        "user_org.Workspace",
        on_delete=models.CASCADE,
        related_name="video_projects",
        null=True,  # Allow null for anonymous users
        blank=True,
    )
    anonymous_session = models.ForeignKey(
        "user_org.AnonymousSession", on_delete=models.CASCADE, null=True, blank=True
    )
    chat_messages = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    tags = models.JSONField(default=list, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def thumbnail_video_url(self):
        render_video = self.render_videos.filter(
            status=RenderVideo.Status.GENERATED
        ).first()
        if render_video:
            return render_video.thumbnail_url
        return None

    @property
    def latest_render_preview_url(self):
        """Get the preview URL of the latest non-errored render video"""
        render_video = (
            self.render_videos.exclude(status=RenderVideo.Status.ERROR)
            .order_by("-created_at")
            .first()
        )
        if render_video:
            return render_video.video_url
        return None

    @property
    def get_media(self):
        # Get associated media by using the mapping table VideoProjectMedia
        video_project_media = VideoProjectMedia.objects.filter(
            video_project=self
        ).order_by("-created_at")
        if video_project_media:
            return [
                media.media.thumbnail_url or media.media.storage_url_path
                for media in video_project_media
            ]
        return None

    def save(self, *args, **kwargs):
        is_new = self._state.adding  # Check if this is a new instance

        # Get the current status from database if not a new instance
        if not is_new:
            old_status = VideoProject.objects.get(pk=self.pk).status

        super().save(*args, **kwargs)

        if is_new and settings.ENABLE_SIGNALING:
            project_created.send(sender=self.__class__, project_id=self.id)
        # Compare with old status if not a new instance
        elif not is_new and self.status != old_status and settings.ENABLE_SIGNALING:
            project_updated.send(sender=self.__class__, project_id=self.id)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Video Project"
        verbose_name_plural = "Video Projects"


class RenderVideo(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        GENERATED = "generated", "Generated"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        ERROR = "error", "Error"

    class Resolution(models.TextChoices):
        HD = "720p", "HD (720p)"
        FULL_HD = "1080p", "Full HD (1080p)"
        ULTRA_HD = "2160p", "Ultra HD (4K)"

    class RenderSpeed(models.TextChoices):
        FAST = "fast", "Fast (Lower Quality)"
        MEDIUM = "medium", "Medium (Balanced)"
        SLOW = "slow", "Slow (High Quality)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    video_project = models.ForeignKey(
        VideoProject, on_delete=models.CASCADE, related_name="render_videos"
    )
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    is_public = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    video_url = models.CharField(max_length=255, blank=True, null=True)
    render_token = models.CharField(max_length=64, blank=True, null=True)
    state = models.JSONField(blank=True, null=True)
    aspect_ratio = models.CharField(
        max_length=10, choices=AspectRatio.choices, default=AspectRatio.LANDSCAPE
    )
    resolution = models.CharField(
        max_length=10, choices=Resolution.choices, default=Resolution.HD
    )
    render_speed = models.CharField(
        max_length=10, choices=RenderSpeed.choices, default=RenderSpeed.MEDIUM
    )
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_attempts = models.JSONField(default=list, null=True, blank=True)
    tags = models.JSONField(default=list, null=True, blank=True)
    chat_messages = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Render Video"
        verbose_name_plural = "Render Videos"


class VideoPipelineRun(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = PrefixedUUIDField(prefix="vplr", primary_key=True, editable=False)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    input_payload = models.JSONField(default=dict, null=True, blank=True)
    input_config = models.JSONField(default=dict, null=True, blank=True)
    video_project = models.ForeignKey(
        "VideoProject", on_delete=models.CASCADE, related_name="video_pipeline_runs"
    )
    logs = models.JSONField(default=list, null=True, blank=True)
    error_logs = models.TextField(null=True, blank=True)
    render_video = models.ForeignKey(
        "RenderVideo",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pipeline_runs",
    )

    def __str__(self):
        return f"{self.id} - {self.status}"


class Room(models.Model):
    name = models.CharField(max_length=255)
    daily_room_name = models.CharField(max_length=255, unique=True)
    daily_room_url = models.URLField()
    created_by = models.ForeignKey("releases.AppUser", on_delete=models.CASCADE)
    org = models.ForeignKey("user_org.Organization", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("created_by", "org")  # Ensure one room per user per org


class Recording(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        ACTIVE = "active", "Active"
        RECORDING = "recording", "Recording"
        COMPLETED = "completed", "Completed"
        ERROR = "error", "Error"

    id = PrefixedUUIDField(prefix="rec", primary_key=True, editable=False)
    name = models.CharField(max_length=255, default="Recording Session")
    daily_room_token = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CREATED
    )
    s3_folder_path = models.CharField(max_length=255, null=True, blank=True)
    recording_started_at = models.DateTimeField(null=True, blank=True)
    recording_ended_at = models.DateTimeField(null=True, blank=True)
    daily_recording_id = models.CharField(max_length=255, null=True, blank=True)
    daily_session_data = models.JSONField(null=True, blank=True)
    tracks_downloaded = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "releases.AppUser", on_delete=models.CASCADE, related_name="recordings"
    )
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="recordings")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Recording"
        verbose_name_plural = "Recordings"


class MediaMetadata(BaseModel):
    schema_version: int = 1
    original_filename: str
    mime_type: str
    size: int
    uploaded_at: datetime
    prefix: Optional[str] = None
    is_duplicate: Optional[bool] = None
    original_media_id: Optional[str] = None
    md5_hash: Optional[str] = None


class VideoMetadata(MediaMetadata):
    pass


class ImageMetadata(MediaMetadata):
    md5_hash: str
