from django.contrib import admin

from .models import Genre, License, Mood, Track


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent")
    search_fields = ("name", "parent__name")


@admin.register(Mood)
class MoodAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "is_public", "length", "user", "created_at")
    search_fields = ("title", "user__name")


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
