from django.core.management.base import BaseCommand
from releases.models import AppUser
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
        "Sentimental",
        "Running",
        "Hopeful",
        "Dreamy",
        "Laid Back",
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
        "Soul",
        "Neo Soul",
        "Funk Rock",
        "Disco",
        "Ambient",
        "Hip Hop",
        "Electro",
        "Future Bass",
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

        # Truncate the Track table to prevent duplicates
        self.stdout.write(self.style.WARNING("Truncating Track table..."))
        Track.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Track table truncated successfully"))

        # Check if a staff user exists
        demodrive_user = AppUser.objects.get(user__username="DemoDrive")

        # List of tracks to create
        tracks = [
            {
                "title": "My Galaxy",
                "main_artists": ["Gloria Tells"],
                "featured_artists": [],
                "length": 32,
                "bpm": 80,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:03:01"},
                    {"label": "Scene 1", "timestamp": "00:00:06:00"},
                    {"label": "Scene 2", "timestamp": "00:00:09:03"},
                    {"label": "Scene 3", "timestamp": "00:00:12:17"},
                    {"label": "Scene 4", "timestamp": "00:00:14:26"},
                    {"label": "Scene 5", "timestamp": "00:00:17:17"},
                    {"label": "Scene 6", "timestamp": "00:00:20:27"},
                    {"label": "Scene 7", "timestamp": "00:00:24:01"},
                    {"label": "Outro", "timestamp": "00:00:27:00"},
                    {"label": "End", "timestamp": "00:00:32:00"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_My_Galaxy_Gloria_Tells_fullmix_high_quality.mp3",
                "genres": ["Soul", "Neo Soul"],
                "moods": ["Sad", "Sentimental"],
                "is_public": False,
            },
            {
                "title": "Too Fat for Funk",
                "main_artists": ["Andreas Dahlbäck"],
                "featured_artists": [],
                "length": 29,
                "bpm": 112,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:02:19"},
                    {"label": "Scene 1", "timestamp": "00:00:04:25"},
                    {"label": "Scene 2", "timestamp": "00:00:07:02"},
                    {"label": "Scene 3", "timestamp": "00:00:09:04"},
                    {"label": "Scene 4", "timestamp": "00:00:11:10"},
                    {"label": "Scene 5", "timestamp": "00:00:13:17"},
                    {"label": "Scene 6", "timestamp": "00:00:15:19"},
                    {"label": "Scene 7", "timestamp": "00:00:17:23"},
                    {"label": "Scene 8", "timestamp": "00:00:19:27"},
                    {"label": "Scene 9", "timestamp": "00:00:24:04"},
                    {"label": "Scene 10", "timestamp": "00:00:26:20"},
                    {"label": "Outro", "timestamp": "00:00:28:20"},
                    {"label": "End", "timestamp": "00:00:29:18"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_Too%20Fat%20for%20Funk%20-%20Andreas%20Dahlba%CC%88ck%20(Version%203345e188)%20-%20fullmix_high_quality.mp3",
                "genres": ["Funk Rock"],
                "moods": ["Happy", "Running"],
                "is_public": False,
            },
            {
                "title": "I'm on the Move (Instrumental Version)",
                "main_artists": ["John Runefelt"],
                "featured_artists": [],
                "length": 14,
                "bpm": 129,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:03:01"},
                    {"label": "Scene 1", "timestamp": "00:00:06:22"},
                    {"label": "Scene 2", "timestamp": "00:00:09:16"},
                    {"label": "Outro", "timestamp": "00:00:11:28"},
                    {"label": "End", "timestamp": "00:00:14:01"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_I'm%20on%20the%20Move%20(Instrumental%20Version)%20-%20John%20Runefelt%20(Version%20a984dd69)%20-%20fullmix_high_quality.mp3",
                "genres": ["Disco"],
                "moods": ["Happy", "Hopeful"],
                "is_public": True,
            },
            {
                "title": "I'm on the Move (Instrumental Version)",
                "main_artists": ["John Runefelt"],
                "featured_artists": [],
                "length": 29,
                "bpm": 129,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:01:02"},
                    {"label": "Scene 1", "timestamp": "00:00:04:15"},
                    {"label": "Scene 2", "timestamp": "00:00:08:05"},
                    {"label": "Scene 3", "timestamp": "00:00:11:28"},
                    {"label": "Scene 3", "timestamp": "00:00:15:18"},
                    {"label": "Scene 3", "timestamp": "00:00:23:02"},
                    {"label": "Scene 3", "timestamp": "00:00:25:13"},
                    {"label": "Outro", "timestamp": "00:00:27:27"},
                    {"label": "End", "timestamp": "00:00:29:12"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_My_Galaxy_Gloria_Tells_fullmix_high_quality.mp3",
                "genres": ["Disco"],
                "moods": ["Happy", "Hopeful"],
                "is_public": False,
            },
            {
                "title": "Aim For The Stars",
                "main_artists": ["Rand Aldo"],
                "featured_artists": [],
                "length": 31,
                "bpm": 116,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:04:11"},
                    {"label": "Scene 1", "timestamp": "00:00:08:17"},
                    {"label": "Scene 2", "timestamp": "00:00:10:20"},
                    {"label": "Scene 3", "timestamp": "00:00:12:33"},
                    {"label": "Scene 4", "timestamp": "00:00:14:24"},
                    {"label": "Scene 5", "timestamp": "00:00:16:26"},
                    {"label": "Scene 6", "timestamp": "00:00:19:01"},
                    {"label": "Scene 7", "timestamp": "00:00:21:01"},
                    {"label": "Scene 8", "timestamp": "00:00:23:03"},
                    {"label": "Scene 8", "timestamp": "00:00:25:05"},
                    {"label": "Scene 8", "timestamp": "00:00:27:06"},
                    {"label": "Outro", "timestamp": "00:00:29:10"},
                    {"label": "End", "timestamp": "00:00:31:28"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_Aim%20For%20The%20Stars%20-%20Rand%20Aldo%20(Version%20de9ed794)%20-%20fullmix_high_quality.mp3",
                "genres": ["Ambient"],
                "moods": ["Hopeful", "Dreamy"],
                "is_public": False,
            },
            {
                "title": "Heaters",
                "main_artists": ["Homebody"],
                "featured_artists": [],
                "length": 15,
                "bpm": 138,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:04:03"},
                    {"label": "Scene 1", "timestamp": "00:00:07:21"},
                    {"label": "Scene 2", "timestamp": "00:00:10:25"},
                    {"label": "Outro", "timestamp": "00:00:14:14"},
                    {"label": "End", "timestamp": "00:00:15:18"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_Heaters%20-%20Homebody%20(Version%2003a44938)%20-%20fullmix_high_quality.mp3",
                "genres": ["Hip Hop"],
                "moods": ["Dreamy", "Laid Back"],
                "is_public": True,
            },
            {
                "title": "Heaters",
                "main_artists": ["Homebody"],
                "featured_artists": [],
                "length": 29,
                "bpm": 138,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Intro ends", "timestamp": "00:00:04:03"},
                    {"label": "Scene 1", "timestamp": "00:00:07:20"},
                    {"label": "Scene 2", "timestamp": "00:00:11:03"},
                    {"label": "Scene 3", "timestamp": "00:00:14:19"},
                    {"label": "Scene 4", "timestamp": "00:00:18:03"},
                    {"label": "Scene 5", "timestamp": "00:00:21:17"},
                    {"label": "Scene 6", "timestamp": "00:00:25:02"},
                    {"label": "Scene 8", "timestamp": "00:00:28:09"},
                    {"label": "End", "timestamp": "00:00:29:15"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_Heaters%20-%20Homebody%20(Version%208c9e6305)%20-%20fullmix_high_quality.mp3",
                "genres": ["Hip Hop"],
                "moods": ["Dreamy", "Laid Back"],
                "is_public": False,
            },
            {
                "title": "Remote Presence",
                "main_artists": ["Baron Grand"],
                "featured_artists": [],
                "length": 13,
                "bpm": 121,
                "markers": [
                    {"label": "Start", "timestamp": "00:00:00:00"},
                    {"label": "Scene 1", "timestamp": "00:00:04:08"},
                    {"label": "Scene 2", "timestamp": "00:00:08:08"},
                    {"label": "Outro", "timestamp": "00:00:11:06"},
                    {"label": "End", "timestamp": "00:00:13:04"},
                ],
                "audio_file": "https://stage-assets.demodrive.tech/sound_tracks/ES_Remote%20Presence%20-%20Baron%20Grand%20(Version%203dca897e)%20-%20fullmix_high_quality.mp3",
                "genres": ["Electro", "Future Bass"],
                "moods": ["Epic", "Hopeful"],
                "is_public": True,
            },
            # Add more tracks here as needed
        ]

        # Create each track
        for track_data in tracks:
            try:
                # Extract M2M fields
                genre_names = track_data.pop("genres", [])
                mood_names = track_data.pop("moods", [])

                # Create track without M2M fields first
                track, created = Track.objects.get_or_create(
                    title=track_data["title"],
                    user=demodrive_user,
                    defaults={
                        "main_artists": track_data.get("main_artists", []),
                        "featured_artists": track_data.get("featured_artists", []),
                        "length": track_data.get("length", 0),
                        "bpm": track_data.get("bpm", 0),
                        "markers": track_data.get("markers", []),
                        "audio_file": track_data.get("audio_file", ""),
                        "license": license_obj,
                        "is_public": track_data.get("is_public", False),
                    },
                )

                # Add M2M relationships after creation
                if created:
                    # Add genres
                    for genre_name in genre_names:
                        try:
                            genre = Genre.objects.get(name=genre_name)
                            track.genres.add(genre)
                        except Genre.DoesNotExist:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Genre '{genre_name}' does not exist"
                                )
                            )

                    # Add moods
                    for mood_name in mood_names:
                        try:
                            mood = Mood.objects.get(name=mood_name)
                            track.moods.add(mood)
                        except Mood.DoesNotExist:
                            self.stdout.write(
                                self.style.WARNING(f"Mood '{mood_name}' does not exist")
                            )

                    self.stdout.write(
                        self.style.SUCCESS(f"Created Track: {track.title}")
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f"Track already exists: {track.title}")
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error creating track '{track_data.get('title', 'Unknown')}': {str(e)}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS("Successfully seeded the database with tracks")
        )
