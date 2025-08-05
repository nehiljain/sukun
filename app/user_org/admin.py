from django.contrib import admin
from django.contrib.admin import ModelAdmin
from django.db.models import JSONField
from django.urls import reverse
from django.utils.html import format_html
from jsoneditor.forms import JSONEditor

from .models import (
    AnonymousSession,
    AppUser,
    Membership,
    Organization,
    Workspace,
)


@admin.register(AppUser)
class AppUserAdmin(ModelAdmin):
    list_display = ("user", "name", "is_email_verified", "created_at", "updated_at")
    search_fields = ["user__username", "name", "user__email"]
    list_filter = ("is_email_verified", "company_role", "usage_reason", "has_subscription_access")
    raw_id_fields = ("user", "active_org")


@admin.register(Organization)
class OrganizationAdmin(ModelAdmin):
    list_display = ("name", "created_by")
    search_fields = ("name", "created_by__email")
    raw_id_fields = ("created_by",)


@admin.register(Membership)
class MembershipAdmin(ModelAdmin):
    list_display = ("user", "organization", "role")
    list_filter = ("role",)
    search_fields = ("user__email", "organization__name")
    raw_id_fields = ("user", "organization")


@admin.register(Workspace)
class ProjectAdmin(ModelAdmin):
    list_display = ("name", "organization")
    search_fields = ("name", "organization__name")
    raw_id_fields = ("organization",)


@admin.register(AnonymousSession)
class AnonymousSessionAdmin(ModelAdmin):
    list_display = ("session_key", "email", "created_at", "expires_at", "view_projects")
    search_fields = ("session_key", "email")
    list_filter = ("created_at", "expires_at")

    def get_queryset(self, request):
        # Only show sessions with emails
        return (
            super().get_queryset(request).exclude(email__isnull=True).exclude(email="")
        )

    def view_projects(self, obj):
        if hasattr(obj, "videoproject_set") and obj.videoproject_set.exists():
            projects_count = obj.videoproject_set.count()
            url = reverse("admin:user_org_anonymoussession_change", args=[obj.pk])
            return format_html(
                '<a href="{}">View {} project(s)</a>', url, projects_count
            )
        return "No projects"

    view_projects.short_description = "Video Projects"

    def change_view(self, request, object_id, form_url="", extra_context=None):
        # Add video projects to the context
        extra_context = extra_context or {}
        session = self.get_object(request, object_id)
        if session:
            from video_gen.models import VideoProject

            extra_context["video_projects"] = VideoProject.objects.filter(
                anonymous_session=session
            )
        return super().change_view(
            request, object_id, form_url, extra_context=extra_context
        )
