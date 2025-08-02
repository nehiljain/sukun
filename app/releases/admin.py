from django.contrib import admin
from django.db.models import JSONField
from jsoneditor.forms import JSONEditor

from .models import (
    AppUser,
    SourceCodeProvider,
    SourceCodeAccount,
    Repository,
    Release,
    SemanticRelease,
)


class AppUserAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "updated_at")
    search_fields = ["user__username"]
    raw_id_fields = ("user",)


class SourceCodeProviderAdmin(admin.ModelAdmin):
    list_display = ("alias", "name", "created_at", "updated_at")
    formfield_overrides = {
        JSONField: {"widget": JSONEditor},
    }


class SourceCodeAccountAdmin(admin.ModelAdmin):
    list_display = ("app_user", "service_provider", "created_at", "updated_at")
    formfield_overrides = {
        JSONField: {"widget": JSONEditor},
    }
    search_fields = ["app_user__username"]
    raw_id_fields = ("app_user",)


class RepositoryAdmin(admin.ModelAdmin):
    list_display = ("source_code_account", "user", "name", "created_at", "updated_at")
    search_fields = ["name"]
    list_filter = ("user",)
    raw_id_fields = ("source_code_account", "user")


class ReleaseAdmin(admin.ModelAdmin):
    list_display = ("user", "repository", "release_url", "created_at", "updated_at")
    search_fields = ["release_url", "user__username"]
    list_filter = ("user",)
    raw_id_fields = ("repository",)


class SemanticReleaseAdmin(admin.ModelAdmin):
    list_display = ("user", "release", "release_summary", "created_at", "updated_at")
    search_fields = ["release__release_url"]
    list_filter = ("user",)
    raw_id_fields = ("release",)


admin.site.register(Repository, RepositoryAdmin)
admin.site.register(Release, ReleaseAdmin)
admin.site.register(SemanticRelease, SemanticReleaseAdmin)
admin.site.register(AppUser, AppUserAdmin)
admin.site.register(SourceCodeProvider, SourceCodeProviderAdmin)
admin.site.register(SourceCodeAccount, SourceCodeAccountAdmin)
