from common.fields import PrefixedUUIDField
from django.db import models


# Genre model (aligned with /genres endpoint)
class Genre(models.Model):
    id = PrefixedUUIDField(
        prefix="genre", primary_key=True
    )  # e.g., "rock", "2010s-rock"
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="subgenres",
    )  # Hierarchical genres
    has_cover_art = models.BooleanField(
        default=False
    )  # Indicates if cover art is available
    cover_art_url = models.URLField(
        max_length=500, null=True, blank=True
    )  # URL of cover art
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# Mood model (aligned with /moods endpoint)
class Mood(models.Model):
    id = PrefixedUUIDField(prefix="mood", primary_key=True)  # e.g., "happy", "epic"
    name = models.CharField(max_length=100)
    has_cover_art = models.BooleanField(
        default=False
    )  # Indicates if cover art is available
    cover_art_url = models.URLField(
        max_length=500, null=True, blank=True
    )  # URL of cover art
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# License model (simplified, as API doesn't expose detailed licensing info)
class License(models.Model):
    id = PrefixedUUIDField(
        prefix="license", primary_key=True
    )  # e.g., "personal", "commercial"
    name = models.CharField(
        max_length=100, unique=True
    )  # e.g., "Personal", "Commercial"
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# Music Track model (aligned with /tracks and /collections endpoints)
class Track(models.Model):
    id = PrefixedUUIDField(
        prefix="track", primary_key=True
    )  # API's unique track ID, e.g., "Mj0MGDIRZm"
    title = models.CharField(max_length=255)
    user = models.ForeignKey(
        "releases.AppUser", on_delete=models.CASCADE, related_name="tracks"
    )  # User who generated/owns it
    main_artists = models.JSONField(default=list)  # e.g., ["Marc Torch"]
    featured_artists = models.JSONField(default=list)  # e.g., ["Artist Name"]
    genres = models.ManyToManyField(Genre, related_name="tracks")
    moods = models.ManyToManyField(Mood, related_name="tracks")
    license = models.ForeignKey(
        License, on_delete=models.SET_NULL, null=True, related_name="tracks"
    )
    audio_file = models.CharField(max_length=255, null=True, blank=True)
    preview_url = models.CharField(max_length=255, null=True, blank=True)
    waveform_url = models.CharField(max_length=255, null=True, blank=True)
    bpm = models.PositiveIntegerField(null=True, blank=True)
    markers = models.JSONField(default=list)
    length = models.PositiveIntegerField(
        help_text="Length in seconds"
    )  # API uses seconds
    images = models.JSONField(
        default=dict,
        null=True,
        blank=True,
    )  # e.g., {"default": "url", "XS": "url", ...}
    has_vocals = models.BooleanField(default=False)
    is_explicit = models.BooleanField(default=False)
    is_preview_only = models.BooleanField(
        default=False
    )  # Indicates if full track is unavailable
    added = models.DateField(null=True, blank=True)  # Date added to catalog
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)

    def __str__(self):
        return self.title

    class Meta:
        indexes = [
            models.Index(fields=["id"]),
            models.Index(fields=["created_at"]),
        ]
