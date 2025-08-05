from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from sound_gen.models import Genre, License, Mood, Track


class Command(BaseCommand):
    help = "Seed database with source code providers"
    moods = [
        "Happy",
        "Sad",
        "Calm",
        "Energetic",
        "Epic",
        "Tense",
        "Romantic",
        "Chill",
        "Aggressive",
        "Nostalgic",
    ]
    genres = [
        "Pop",
        "Rock",
        "Hip-Hop/Rap",
        "Electronic",
        "Classical",
        "Jazz",
        "Country",
        "R&B",
        "Reggae",
        "Folk",
    ]

    def handle(self, *args, **options):
        # Create moods and genres
        for mood in self.moods:
            mood_obj, created = Mood.objects.get_or_create(
                name=mood,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Mood: {mood_obj.name}"))

        for genre in self.genres:
            genre_obj, created = Genre.objects.get_or_create(
                name=genre,
                parent=None,
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created Genre: {genre_obj.name}")
                )

        license_obj, created = License.objects.get_or_create(
            name="Creative Commons",
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created License: {license_obj.name}")
            )

        # Check if a staff user exists
        staff_user = User.objects.filter(is_staff=True).first()
        # Shorten the audio URL if needed
        audio_file = "https://storage.googleapis.com/demodrive-media/video_assets/lumalabs-hackathon/ES_My_Galaxy_Gloria_Tells_fullmix_high_quality.mp3"

        # Create track without M2M fields first
        try:
            demotrack, created = Track.objects.get_or_create(
                title="My Galaxy",
                user=staff_user,
                defaults={
                    "main_artists": ["John Doe"],
                    "featured_artists": [],
                    "length": 32,
                    "bpm": 120,
                    "markers": [],
                    "audio_file": audio_file,
                    "license": license_obj,
                },
            )

            # Add M2M relationships after creation
            if created:
                # Add rock genre and happy mood
                rock_genre = Genre.objects.get(name="Rock")
                happy_mood = Mood.objects.get(name="Happy")

                demotrack.genres.add(rock_genre)
                demotrack.moods.add(happy_mood)

                self.stdout.write(
                    self.style.SUCCESS(f"Created Track: {demotrack.title}")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"Track already exists: {demotrack.title}")
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating track: {str(e)}"))

        self.stdout.write(
            self.style.SUCCESS("Successfully created Genre, Mood, License, and Track")
        )
