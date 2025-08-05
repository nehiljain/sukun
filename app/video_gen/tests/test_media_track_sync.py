from unittest.mock import MagicMock

from django.test import TestCase
from video_gen.models import Media
from video_gen.utils.media_track_sync import create_synced_overlays


class TestMediaTrackSync(TestCase):
    def setUp(self):
        # Create mock media objects
        self.media1 = Media(name="video1.mp4", storage_url_path="/path/to/video1.mp4")
        self.media2 = Media(name="video2.mp4", storage_url_path="/path/to/video2.mp4")
        self.media3 = Media(name="video3.mp4", storage_url_path="/path/to/video3.mp4")

        # Create a mock track
        self.track = MagicMock()
        self.track.title = "Test Track"
        self.track.preview_url = "http://example.com/audio.mp3"
        self.track.length = 10  # 10 seconds
        self.track.markers = [
            {"timestamp": "00:00:00:00", "label": "Start"},
            {"timestamp": "00:00:03:00", "label": "Marker 1"},
            {"timestamp": "00:00:06:00", "label": "Marker 2"},
            {"timestamp": "00:00:10:00", "label": "End"},
        ]

    def test_basic_overlay_creation(self):
        """Test basic overlay creation with default parameters"""
        media_list = [self.media1, self.media2, self.media3]
        result = create_synced_overlays(self.track, media_list)

        # Check if we got the correct structure
        self.assertIn("overlays", result)
        self.assertIn("durationInFrames", result)

        # Check total duration (10 seconds * 30 fps = 300 frames + 60 frames outro)
        self.assertEqual(result["durationInFrames"], 360)

        # Should have 7 overlays (1 sound + 3 video segments + 3 outro elements)
        self.assertEqual(len(result["overlays"]), 7)

        # First overlay should be sound
        self.assertEqual(result["overlays"][0]["type"], "sound")

        # Check all video overlays
        video_overlays = [o for o in result["overlays"] if o["type"] == "video"]
        self.assertEqual(len(video_overlays), 3)

        # Check outro overlays
        outro_overlays = [
            o for o in result["overlays"] if o["type"] in ["rectangle", "image", "text"]
        ]
        self.assertEqual(len(outro_overlays), 3)
        self.assertEqual(outro_overlays[0]["type"], "rectangle")  # Background
        self.assertEqual(outro_overlays[1]["type"], "image")  # Logo
        self.assertEqual(outro_overlays[2]["type"], "text")  # Text

    def test_media_list_ordering(self):
        """Test that media items are used in the correct order"""
        media_list = [self.media1, self.media2, self.media3]
        result = create_synced_overlays(self.track, media_list)

        video_overlays = [o for o in result["overlays"] if o["type"] == "video"]

        # Check if media items are used in the correct order
        self.assertEqual(video_overlays[0]["content"], self.media1.name)
        self.assertEqual(video_overlays[1]["content"], self.media2.name)
        self.assertEqual(video_overlays[2]["content"], self.media3.name)

    def test_media_list_cycling(self):
        """Test that media items are used in order up to the number of segments"""
        media_list = [self.media1, self.media2]  # Only 2 media items for 3 segments
        result = create_synced_overlays(self.track, media_list)

        video_overlays = [o for o in result["overlays"] if o["type"] == "video"]

        # Should only have 2 video segments, not 3
        self.assertEqual(len(video_overlays), 2)

        # Check if media items are used in order
        self.assertEqual(video_overlays[0]["content"], self.media1.name)
        self.assertEqual(video_overlays[1]["content"], self.media2.name)

    def test_aspect_ratio_dimensions(self):
        """Test that different aspect ratios result in correct dimensions"""
        media_list = [self.media1]

        # Test 16:9 aspect ratio
        result_16_9 = create_synced_overlays(
            self.track, media_list, aspect_ratio="16:9"
        )
        video_overlay_16_9 = next(
            o for o in result_16_9["overlays"] if o["type"] == "video"
        )
        self.assertEqual(video_overlay_16_9["width"], 1280)
        self.assertEqual(video_overlay_16_9["height"], 720)

        # Test 9:16 aspect ratio
        result_9_16 = create_synced_overlays(
            self.track, media_list, aspect_ratio="9:16"
        )
        video_overlay_9_16 = next(
            o for o in result_9_16["overlays"] if o["type"] == "video"
        )
        self.assertEqual(video_overlay_9_16["width"], 1080)
        self.assertEqual(video_overlay_9_16["height"], 1920)

    def test_invalid_track_markers(self):
        """Test that function raises ValueError with insufficient markers"""
        self.track.markers = [
            {"timestamp": "00:00:00:00", "label": "Start"}
        ]  # Only one marker
        media_list = [self.media1]

        with self.assertRaises(ValueError):
            create_synced_overlays(self.track, media_list)

    def test_frame_calculation(self):
        """Test that frame calculations are correct"""
        media_list = [self.media1]
        result = create_synced_overlays(self.track, media_list)

        video_overlays = [o for o in result["overlays"] if o["type"] == "video"]
        outro_overlays = [
            o for o in result["overlays"] if o["type"] in ["rectangle", "image", "text"]
        ]

        # Check frame calculations for first segment (0:00 to 3:00 = 90 frames at 30fps)
        self.assertEqual(video_overlays[0]["from"], 0)
        self.assertEqual(video_overlays[0]["durationInFrames"], 90)

        # Check outro overlay timing - should start after the last video segment
        for outro_overlay in outro_overlays:
            self.assertEqual(outro_overlay["from"], 90)  # Starts after first segment
            self.assertEqual(
                outro_overlay["durationInFrames"], 60
            )  # 2 seconds duration

    def test_outro_overlay_properties(self):
        """Test that outro overlays have correct properties"""
        media_list = [self.media1]
        result = create_synced_overlays(self.track, media_list, aspect_ratio="16:9")

        # Get outro overlays
        outro_overlays = {
            o["type"]: o
            for o in result["overlays"]
            if o["type"] in ["rectangle", "image", "text"]
        }

        # Test background rectangle
        background = outro_overlays["rectangle"]
        self.assertEqual(background["width"], 1280)
        self.assertEqual(background["height"], 720)
        self.assertEqual(background["styles"]["fill"], "#000000")

        # Test logo
        logo = outro_overlays["image"]
        self.assertEqual(logo["width"], 234)
        self.assertEqual(logo["height"], 213)
        self.assertEqual(
            logo["src"], "https://app-staging.demodrive.tech/static/logo_dark_no_bg.png"
        )

        # Test text
        text = outro_overlays["text"]
        self.assertEqual(text["content"], "DemoDrive")
        self.assertEqual(text["styles"]["color"], "#FFFFFF")
        self.assertEqual(text["styles"]["fontSize"], "3rem")

    def test_outro_overlay_positioning(self):
        """Test that outro overlays are correctly positioned for different aspect ratios"""
        media_list = [self.media1]

        # Test 16:9
        result_16_9 = create_synced_overlays(
            self.track, media_list, aspect_ratio="16:9"
        )
        outro_16_9 = {
            o["type"]: o
            for o in result_16_9["overlays"]
            if o["type"] in ["rectangle", "image", "text"]
        }

        # Logo should be centered
        self.assertEqual(outro_16_9["image"]["left"], (1280 - 234) // 2)
        self.assertEqual(outro_16_9["image"]["top"], (720 - 213) // 2 - 50)

        # Test 9:16
        result_9_16 = create_synced_overlays(
            self.track, media_list, aspect_ratio="9:16"
        )
        outro_9_16 = {
            o["type"]: o
            for o in result_9_16["overlays"]
            if o["type"] in ["rectangle", "image", "text"]
        }

        # Logo should be centered in portrait mode
        self.assertEqual(outro_9_16["image"]["left"], (1080 - 234) // 2)
        self.assertEqual(outro_9_16["image"]["top"], (1920 - 213) // 2 - 50)
