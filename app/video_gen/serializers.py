from rest_framework import serializers

from .models import (
    BrandAsset,
    Media,
    Recording,
    RenderVideo,
    Room,
    VideoPipelineRun,
    VideoProject,
)


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = [
            "id",
            "name",
            "status",
            "type",
            "tags",
            "storage_url_path",
            "thumbnail_url",
            "org",
            "created_at",
            "updated_at",
            "caption_metadata",
            "metadata",
            "aspect_ratio",
            "resolution",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BrandAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandAsset
        fields = [
            "id",
            "name",
            "colors",
            "logo",
            "font",
            "voiceover",
            "cover",
            "intro_video",
            "outro_video",
            "created_at",
            "updated_at",
            "org",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "org"]


class VideoProjectSerializer(serializers.ModelSerializer):
    latest_render_preview_url = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    def get_media(self, obj):
        return obj.get_media

    class Meta:
        model = VideoProject
        fields = [
            "id",
            "name",
            "description",
            "status",
            "state",
            "preview_url",
            "latest_render_preview_url",
            "brand_asset",
            "aspect_ratio",
            "created_at",
            "updated_at",
            "org",
            "is_public",
            "is_template",
            "metadata",
            "media",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "org"]

    def get_latest_render_preview_url(self, obj):
        return obj.latest_render_preview_url


class VideoProjectPaginatedSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = VideoProjectSerializer(many=True)


class RenderVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenderVideo
        fields = [
            "id",
            "name",
            "video_project",
            "video_url",
            "render_speed",
            "resolution",
            "thumbnail_url",
            "aspect_ratio",
            "status",
            "state",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class RenderVideoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenderVideo
        fields = ["video_project", "name", "resolution", "render_speed"]


class VideoPipelineRunSerializer(serializers.ModelSerializer):
    video_project = VideoProjectSerializer(read_only=True)
    render_video = RenderVideoSerializer(read_only=True)

    class Meta:
        model = VideoPipelineRun
        fields = [
            "id",
            "status",
            "input_payload",
            "video_project",
            "render_video",
            "created_at",
            "error_logs",
            "logs",
        ]


class VideoPipelineRunCreateSerializer(serializers.Serializer):
    session_key = serializers.CharField()
    media_files = serializers.ListField(
        child=serializers.FileField(), required=False, default=list
    )
    media_ids = serializers.CharField(required=False)
    property_image_ids = serializers.CharField(required=False)
    track_id = serializers.CharField(required=False)
    aspect_ratio = serializers.ChoiceField(choices=["16:9", "9:16", "1:1"])


class MediaDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = [
            "id",
            "storage_url_path",
            "type",
            "metadata",
            "caption_metadata",
        ]


class VideoPipelineRunResponseSerializer(serializers.ModelSerializer):
    render_video = RenderVideoSerializer(read_only=True)
    media_files = serializers.SerializerMethodField()

    class Meta:
        model = VideoPipelineRun
        fields = [
            "id",
            "status",
            "video_project_id",
            "render_video",
            "input_payload",
            "media_files",
        ]

    def get_media_files(self, obj):
        media_ids = obj.input_payload.get("media_files", [])
        media_objects = Media.objects.filter(id__in=media_ids)
        return MediaDetailSerializer(media_objects, many=True).data


class AssignProjectsRequestSerializer(serializers.Serializer):
    session_key = serializers.CharField()


class AssignProjectsResponseSerializer(serializers.Serializer):
    """Response serializer for assign_projects endpoint"""

    message = serializers.CharField(read_only=True)


class FeaturedRenderSerializer(serializers.ModelSerializer):
    aspect_ratio = serializers.SerializerMethodField()

    class Meta:
        model = RenderVideo
        fields = ["id", "name", "video_url", "thumbnail_url", "aspect_ratio"]

    def get_aspect_ratio(self, obj):
        return obj.video_project.aspect_ratio


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "org",
            "daily_room_name",
            "daily_room_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RecordingSerializer(serializers.ModelSerializer):
    daily_room_name = serializers.SerializerMethodField()
    daily_room_url = serializers.SerializerMethodField()
    room = RoomSerializer(read_only=True)

    def get_daily_room_name(self, obj):
        return obj.room.daily_room_name if obj.room else None

    def get_daily_room_url(self, obj):
        return obj.room.daily_room_url if obj.room else None

    class Meta:
        model = Recording
        fields = [
            "id",
            "name",
            "daily_room_name",
            "daily_room_url",
            "status",
            "s3_folder_path",
            "recording_started_at",
            "recording_ended_at",
            "daily_recording_id",
            "tracks_downloaded",
            "created_by",
            "room",
            # "org",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "daily_room_name",
            "daily_room_url",
            "s3_folder_path",
            "created_at",
            "updated_at",
        ]
