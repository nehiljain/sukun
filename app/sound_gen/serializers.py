from rest_framework import serializers

from .models import Genre, License, Mood, Track


class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = "__all__"


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "cover_art_url"]


class MoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mood
        fields = ["id", "name", "cover_art_url"]


class TrackSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    moods = MoodSerializer(many=True, read_only=True)

    class Meta:
        model = Track
        fields = "__all__"
