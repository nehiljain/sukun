from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.db import models
from django.shortcuts import redirect, render
from django.urls import path
from django.utils.html import format_html
from jsoneditor.forms import JSONEditor
from pgvector.django import VectorField

from .models import (
    AspectRatio,
    BrandAsset,
    Media,
    RenderVideo,
    VideoPipelineRun,
    VideoProject,
    VideoProjectMedia,
)
from .services.media_service import MediaService


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "status",
        "type",
        "embedding_status",
        "ai_summary_status",
        "storage_url_path",
        "created_at",
    )
    list_filter = ("status", "type")
    search_fields = ("name", "status", "type", "id")
    raw_id_fields = ("org",)
    actions = ["generate_embeddings", "generate_ai_summaries"]
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditor},
    }

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Custom formfield handling for VectorField to prevent ndarray rendering issues"""
        if isinstance(db_field, VectorField):
            # Use a simple text widget for VectorField to avoid ndarray rendering issues
            from django import forms

            kwargs["widget"] = forms.Textarea(
                attrs={"rows": 4, "cols": 50, "readonly": True}
            )
            return db_field.formfield(**kwargs)
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    def embedding_status(self, obj):
        """Display embedding status in a user-friendly way"""
        if obj.embedding is not None:
            # Vector exists, show dimension and a checkmark
            dimension = (
                len(obj.embedding) if hasattr(obj.embedding, "__len__") else "Unknown"
            )
            return format_html(
                '<span style="color: green;">✓ Vector ({}D)</span>', dimension
            )
        else:
            return format_html('<span style="color: red;">✗ No embedding</span>')

    embedding_status.short_description = "Embedding"
    embedding_status.admin_order_field = "embedding"

    def ai_summary_status(self, obj):
        """Display AI summary status from JSON field"""
        if (
            obj.embedding_text
            and isinstance(obj.embedding_text, dict)
            and obj.embedding_text.get("summary")
        ):
            model = obj.embedding_text.get("model", "Unknown")
            generated_at = obj.embedding_text.get("generated_at", "Unknown")
            return format_html(
                '<span style="color: green;">✓ Summary ({})</span><br><small>{}</small>',
                model,
                generated_at[:10] if generated_at != "Unknown" else generated_at,
            )
        else:
            return format_html('<span style="color: red;">✗ No AI summary</span>')

    ai_summary_status.short_description = "AI Summary"
    ai_summary_status.admin_order_field = "embedding_text"

    def generate_embeddings(self, request, queryset):
        """Admin action to generate embeddings for selected media items"""
        count = 0
        for media in queryset:
            try:
                success = MediaService.generate_and_store_embedding(media, force=False)
                if success:
                    count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error generating embedding for {media.name}: {str(e)}",
                    level=messages.ERROR,
                )

        if count > 0:
            self.message_user(
                request,
                f"Successfully generated embeddings for {count} media items.",
                level=messages.SUCCESS,
            )
        else:
            self.message_user(
                request, "No embeddings were generated.", level=messages.WARNING
            )

    generate_embeddings.short_description = "Generate embeddings for selected media"

    def generate_ai_summaries(self, request, queryset):
        """Admin action to generate AI summaries for selected media items"""
        count = 0
        skipped = 0

        for media in queryset:
            if media.type not in ["image", "video"]:
                skipped += 1
                continue
            try:
                from video_gen.services.multimodal_summarization_service import (
                    MultimodalSummarizationService,
                )

                summarization_service = MultimodalSummarizationService()
                summary = summarization_service.generate_media_summary(
                    media, store_in_db=True
                )

                if summary:
                    count += 1

            except Exception as e:
                self.message_user(
                    request,
                    f"Error generating AI summary for {media.name}: {str(e)}",
                    level=messages.ERROR,
                )

        if count > 0:
            self.message_user(
                request,
                f"Successfully generated AI summaries for {count} media items.",
                level=messages.SUCCESS,
            )

        if skipped > 0:
            self.message_user(
                request,
                f"Skipped {skipped} media items (only images and videos are supported).",
                level=messages.INFO,
            )

        if count == 0 and skipped == 0:
            self.message_user(
                request, "No AI summaries were generated.", level=messages.WARNING
            )

    generate_ai_summaries.short_description = (
        "Generate AI summaries for selected media (images/videos only)"
    )


@admin.register(BrandAsset)
class BrandAssetAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)
    raw_id_fields = ("org",)


@admin.register(VideoProject)
class VideoProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "org",
        "status",
        "render_videos_count",
        "created_at",
        "view_details",
    )
    list_filter = ("status", "org", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("render_videos_count",)
    ordering = ("-created_at",)
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditor},
    }

    def render_videos_count(self, obj):
        return obj.render_videos.count()

    render_videos_count.short_description = "Render Videos"

    def view_details(self, obj):
        url = f"/admin/video_gen/videoproject/project-details/{obj.id}/"
        return format_html('<a href="{}" class="button">View Details</a>', url)

    view_details.short_description = "Details"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "project-details/<uuid:project_id>/",
                self.admin_site.admin_view(self.project_details_view),
                name="project-details",
            ),
            path(
                "merge-and-downscale/",
                self.admin_site.admin_view(self.merge_and_downscale_view),
                name="merge-and-downscale",
            ),
        ]
        return custom_urls + urls

    def project_details_view(self, request, project_id):
        try:
            project = VideoProject.objects.get(id=project_id)
            render_videos = project.render_videos.all().order_by("-created_at")

            context = {
                "project": project,
                "render_videos": render_videos,
                "title": f"Project Details: {project.name}",
                "opts": self.model._meta,
                "is_popup": False,
                "is_nav_sidebar_enabled": True,
                "has_permission": True,
                "app_label": "video_gen",
                "hostname": settings.SITE_URL,
                "media": forms.Media(),
                "available_apps": self.admin_site.get_app_list(request),
                "show_merge_and_downscale": True,
                "merge_and_downscale_url": "/admin/video_gen/videoproject/merge-and-downscale/",
                "project_id": project.id,
            }
            return render(request, "admin/video_gen/project_details.html", context)
        except VideoProject.DoesNotExist:
            messages.error(request, "Video project not found.")
            return redirect("admin:video_gen_videoproject_changelist")

    def merge_and_downscale_view(self, request):
        if request.method == "POST":
            form = MergeAndDownscaleForm(request.POST)
            if form.is_valid():
                s3_folder_path = form.cleaned_data["s3_folder_path"]
                video_project = form.cleaned_data["video_project_id"]
                from video_gen.tasks import process_and_downscale_videos_chain

                process_and_downscale_videos_chain(
                    s3_folder_path, str(video_project.id)
                )
                messages.success(
                    request,
                    f"Task started for project {video_project.name} with S3 path {s3_folder_path}",
                )
                return redirect("admin:video_gen_videoproject_changelist")
        else:
            initial = {}
            if "project_id" in request.GET:
                initial["video_project_id"] = request.GET["project_id"]
            form = MergeAndDownscaleForm(initial=initial)
        context = {
            "form": form,
            "title": "Merge and Downscale Videos",
            "opts": self.model._meta,
            "is_popup": False,
            "is_nav_sidebar_enabled": True,
            "has_permission": True,
            "app_label": "video_gen",
        }
        return render(request, "admin/video_gen/merge_and_downscale.html", context)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["show_details_button"] = True
        return super().changelist_view(request, extra_context=extra_context)


# @admin.register(RenderVideo)
# class RenderVideoAdmin(admin.ModelAdmin):
#     list_display = ("name", "video_project", "status", "created_at")
#     list_filter = ("status", "video_project")
#     search_fields = ("name", "video_project__name")


@admin.register(VideoProjectMedia)
class VideoProjectMediaAdmin(admin.ModelAdmin):
    list_display = ("video_project", "media", "created_at")
    list_filter = ("video_project", "media")
    search_fields = ("video_project__name", "media__name")


@admin.register(VideoPipelineRun)
class VideoPipelineRunAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "created_at")
    search_fields = ("id", "status")
    raw_id_fields = ("video_project",)


class VideoUploadForm(forms.Form):
    video_file = forms.FileField(
        required=True,
        help_text="Upload an MP4 video file",
        widget=forms.FileInput(attrs={"accept": "video/mp4"}),
    )
    video_project = forms.ModelChoiceField(
        queryset=VideoProject.objects.filter(
            status__in=[VideoProject.Status.DRAFT, VideoProject.Status.GENERATED]
        ),
        help_text="Select a video project",
        widget=forms.Select(attrs={"class": "vSelectField"}),
    )
    name = forms.CharField(
        max_length=255,
        help_text="Name for the render video",
        widget=forms.TextInput(attrs={"class": "vTextField"}),
    )
    resolution = forms.ChoiceField(
        choices=RenderVideo.Resolution.choices,
        initial=RenderVideo.Resolution.HD,
        help_text="Select video resolution",
        widget=forms.Select(attrs={"class": "vSelectField"}),
    )
    render_speed = forms.ChoiceField(
        choices=RenderVideo.RenderSpeed.choices,
        initial=RenderVideo.RenderSpeed.MEDIUM,
        help_text="Select render speed",
        widget=forms.Select(attrs={"class": "vSelectField"}),
    )
    aspect_ratio = forms.ChoiceField(
        choices=AspectRatio.choices,
        initial=AspectRatio.PORTRAIT,
        help_text="Select aspect ratio",
        widget=forms.Select(attrs={"class": "vSelectField"}),
    )
    is_public = forms.BooleanField(
        required=False,
        initial=False,
        help_text="Make this video publicly accessible",
        widget=forms.CheckboxInput(attrs={"class": "vCheckboxField"}),
    )


class RenderVideoAdmin(admin.ModelAdmin):
    list_display = ("name", "video_project", "status", "created_at")
    list_filter = ("status", "video_project")
    search_fields = ("name", "video_project__name")
    formfield_overrides = {
        models.JSONField: {"widget": JSONEditor},
    }

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "upload-video/",
                self.admin_site.admin_view(self.upload_video_view),
                name="upload-video",
            ),
        ]
        return custom_urls + urls

    def upload_video_view(self, request):
        if request.method == "POST":
            form = VideoUploadForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    video_project = form.cleaned_data["video_project"]

                    # Create the render video object with state from video project
                    render_video = RenderVideo.objects.create(
                        name=form.cleaned_data["name"],
                        video_project=video_project,
                        resolution=form.cleaned_data["resolution"],
                        render_speed=form.cleaned_data["render_speed"],
                        aspect_ratio=form.cleaned_data["aspect_ratio"],
                        status=RenderVideo.Status.PENDING,
                        is_public=form.cleaned_data["is_public"],
                        state=video_project.state,  # Copy state from video project
                    )

                    # Construct the upload path
                    upload_path = (
                        f"renders/{render_video.video_project.id}/{render_video.id}.mp4"
                    )

                    # Upload the video file using MediaService
                    media = MediaService.upload_media_file(
                        file=form.cleaned_data["video_file"],
                        prefix=str(render_video.video_project.org.id),
                        media_type="video",
                        org=render_video.video_project.org,
                        caption_metadata={
                            "source_type": "admin_upload",
                            "video_project_id": str(render_video.video_project.id),
                        },
                        custom_path=upload_path,  # Add this parameter to MediaService
                    )

                    if media:
                        # Update the render video with the uploaded file info
                        render_video.video_url = media.storage_url_path
                        render_video.status = RenderVideo.Status.GENERATED
                        render_video.save()

                        # Construct the video player URL
                        video_player_url = (
                            f"{settings.SITE_URL}/video-player/{render_video.id}"
                        )

                        messages.success(
                            request,
                            f"Video uploaded successfully! View it at: {video_player_url}",
                        )
                    else:
                        render_video.status = RenderVideo.Status.ERROR
                        render_video.save()
                        messages.error(request, "Failed to upload video.")

                    return redirect("admin:video_gen_rendervideo_changelist")
                except Exception as e:
                    messages.error(request, f"Error: {str(e)}")
        else:
            form = VideoUploadForm()

        context = {
            "form": form,
            "title": "Upload Video",
            "opts": self.model._meta,
            "is_popup": False,
            "is_nav_sidebar_enabled": True,
            "has_permission": True,
            "app_label": "video_gen",
        }
        return render(request, "admin/video_gen/upload_video.html", context)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["show_upload_button"] = True
        return super().changelist_view(request, extra_context=extra_context)


# Register the admin class (only if it's not already registered)
if not admin.site.is_registered(RenderVideo):
    admin.site.register(RenderVideo, RenderVideoAdmin)


class MergeAndDownscaleForm(forms.Form):
    s3_folder_path = forms.CharField(
        max_length=255,
        help_text="Relative S3 path containing the videos (private bucket). For example: cactus_ai/2025-05-22-ajith_fondo_studio/iphone-15pro_916_1080p/raw/",
        widget=forms.TextInput(attrs={"class": "vTextField"}),
    )
    video_project_id = forms.ModelChoiceField(
        queryset=VideoProject.objects.all(),
        help_text="Select the video project",
        widget=forms.Select(attrs={"class": "vSelectField"}),
    )
