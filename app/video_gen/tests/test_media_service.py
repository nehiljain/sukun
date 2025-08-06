import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from freezegun import freeze_time
from user_org.models import AppUser, Organization
from video_gen.models import Media
from video_gen.services.media_service import MediaService


class MediaServiceUploadTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",  # pragma: allowlist secret
        )
        self.appuser = AppUser.objects.create(user=self.user)
        self.org = Organization.objects.create(name="Test Org", created_by=self.appuser)
        self.appuser.active_org = self.org
        self.appuser.save()
        self.prefix = str(uuid.uuid4())
        self.mock_file_content = b"dummy file content"
        self.mock_file = SimpleUploadedFile(
            "test_image.jpg", self.mock_file_content, content_type="image/jpeg"
        )
        self.mock_file_2 = SimpleUploadedFile(
            "test_image_2.png", b"other content", content_type="image/png"
        )

    @patch("video_gen.services.media_service.upload_file_to_cloud")
    @patch("video_gen.services.media_service.Media.objects.create")
    @patch(
        "video_gen.services.media_service.MediaService.get_duplicate_media_with_videos"
    )
    def test_upload_media_file_filename_generation(
        self, mock_get_duplicates, mock_create, mock_upload
    ):
        """Verify filename and GCS path contain microseconds."""
        mock_upload.return_value = "http://mock_gcs_url/path/to/file.jpg"
        mock_get_duplicates.return_value = []  # No duplicates found
        mock_create.return_value = MagicMock(spec=Media, id=uuid.uuid4())

        # Use freeze_time to control datetime.utcnow()
        frozen_time = datetime(2024, 1, 1, 12, 0, 0, 123456)
        with freeze_time(frozen_time):
            MediaService.upload_media_file(
                self.mock_file, self.prefix, Media.Type.IMAGE, self.org
            )

        expected_filename = (
            f"image_{frozen_time.strftime('%Y%m%d_%H%M%S_%f')}_{self.mock_file.name}"
        )
        expected_gcs_path = f"image_uploads/{self.prefix}/{expected_filename}"

        # Check GCS path passed to upload_file_to_cloud
        mock_upload.assert_called_once()
        call_args, _ = mock_upload.call_args
        self.assertEqual(call_args[1], expected_gcs_path)
        self.assertEqual(call_args[2], "image/jpeg")

        # Check metadata passed to Media.objects.create
        mock_create.assert_called_once()
        _, call_kwargs = mock_create.call_args
        metadata = call_kwargs.get("metadata", {})
        self.assertEqual(metadata.get("filename"), expected_filename)
        self.assertEqual(metadata.get("file_path"), expected_gcs_path)
        self.assertIsNotNone(metadata.get("md5_hash"))  # Check hash was added for image
        self.assertFalse(metadata.get("is_duplicate"))

    @patch("video_gen.services.media_service.upload_file_to_cloud")
    @patch("video_gen.services.media_service.Media.objects.create")
    @patch(
        "video_gen.services.media_service.MediaService.get_duplicate_media_with_videos"
    )
    @patch(
        "video_gen.services.media_service.datetime"
    )  # Mock datetime inside the service
    def test_upload_media_file_avoids_collision(
        self, mock_datetime, mock_get_duplicates, mock_create, mock_upload
    ):
        """Verify multiple uploads in the same second get unique names."""
        mock_upload.return_value = "http://mock_gcs_url/path/to/file.jpg"
        mock_get_duplicates.return_value = []  # No duplicates

        # Simulate calls very close together
        time1 = datetime(2024, 1, 1, 12, 0, 0, 100000)
        time2 = datetime(2024, 1, 1, 12, 0, 0, 200000)
        mock_datetime.utcnow.side_effect = [
            time1,
            time1,
            time2,
            time2,
        ]  # Each call gets datetime twice

        # Upload first file
        MediaService.upload_media_file(
            self.mock_file, self.prefix, Media.Type.IMAGE, self.org
        )
        # Upload second file immediately
        MediaService.upload_media_file(
            self.mock_file_2, self.prefix, Media.Type.IMAGE, self.org
        )

        self.assertEqual(mock_upload.call_count, 2)
        self.assertEqual(mock_create.call_count, 2)

        # Get GCS paths and metadata filenames from calls
        gcs_path1 = mock_upload.call_args_list[0][0][1]
        meta_filename1 = mock_create.call_args_list[0][1]["metadata"]["filename"]
        gcs_path2 = mock_upload.call_args_list[1][0][1]
        meta_filename2 = mock_create.call_args_list[1][1]["metadata"]["filename"]

        print(f"GCS Path 1: {gcs_path1}")
        print(f"GCS Path 2: {gcs_path2}")
        print(f"Meta Filename 1: {meta_filename1}")
        print(f"Meta Filename 2: {meta_filename2}")

        # Assert paths and filenames are different
        self.assertNotEqual(gcs_path1, gcs_path2)
        self.assertNotEqual(meta_filename1, meta_filename2)

        # Assert they contain the correct microsecond timestamps
        self.assertIn(time1.strftime("%Y%m%d_%H%M%S_%f"), gcs_path1)
        self.assertIn(time1.strftime("%Y%m%d_%H%M%S_%f"), meta_filename1)
        self.assertIn(time2.strftime("%Y%m%d_%H%M%S_%f"), gcs_path2)
        self.assertIn(time2.strftime("%Y%m%d_%H%M%S_%f"), meta_filename2)

    @patch("video_gen.services.media_service.upload_file_to_cloud")
    @patch("video_gen.services.media_service.Media.objects.create")
    @patch(
        "video_gen.services.media_service.MediaService.get_duplicate_media_with_videos"
    )
    @patch("video_gen.services.media_service.Media.objects.get")
    def test_upload_media_file_image_deduplication(
        self, mock_get, mock_get_duplicates, mock_create, mock_upload
    ):
        """Verify image deduplication logic."""
        # Simulate finding an existing image with the same hash
        existing_media_id = uuid.uuid4()
        existing_video_id = uuid.uuid4()
        existing_media = MagicMock(
            spec=Media, id=existing_media_id, storage_url_path="http://existing_url"
        )

        # Set up the mock for Media.objects.get
        existing_video = MagicMock(
            spec=Media,
            id=existing_video_id,
            storage_url_path="http://existing_video_url",
            caption_metadata={"pipeline_run_id": "old_run"},
            metadata={"filename": "video.mp4", "mime_type": "video/mp4", "size": 1000},
        )
        mock_get.return_value = existing_video

        # Return a list with a tuple of (image, video_id)
        mock_get_duplicates.return_value = [(existing_media, str(existing_video_id))]

        # Call the upload function
        MediaService.upload_media_file(
            self.mock_file, self.prefix, Media.Type.IMAGE, self.org
        )

        # Assert GCS upload was NOT called
        mock_upload.assert_not_called()

        # Assert Media.objects.create was called TWICE (once for image dup, once for video dup)
        self.assertEqual(mock_create.call_count, 2)

        # Check the first call (image duplication)
        image_call_args, image_call_kwargs = mock_create.call_args_list[0]
        self.assertEqual(image_call_kwargs["type"], Media.Type.IMAGE)
        self.assertTrue(image_call_kwargs["metadata"]["is_duplicate"])
        self.assertEqual(
            image_call_kwargs["metadata"]["original_media_id"], str(existing_media_id)
        )

        # Check the second call (video duplication)
        video_call_args, video_call_kwargs = mock_create.call_args_list[1]
        self.assertEqual(video_call_kwargs["type"], Media.Type.VIDEO)
        self.assertTrue(video_call_kwargs["metadata"]["is_duplicate"])
        self.assertTrue(video_call_kwargs["caption_metadata"]["is_duplicate"])
        self.assertEqual(
            video_call_kwargs["caption_metadata"]["original_video_id"],
            str(existing_video_id),
        )

    @patch("video_gen.services.media_service.convert_heic_to_png_file")
    @patch("video_gen.services.media_service.upload_file_to_cloud")
    @patch("video_gen.services.media_service.Media.objects.create")
    @patch(
        "video_gen.services.media_service.MediaService.get_duplicate_media_with_videos"
    )
    @patch("video_gen.services.media_service.MediaService.is_heic_file")
    def test_upload_heic_image_conversion(
        self, mock_is_heic, mock_get_duplicates, mock_create, mock_upload, mock_convert
    ):
        """Verify HEIC images are properly converted."""
        # Setup mocks
        mock_is_heic.return_value = True
        mock_get_duplicates.return_value = []  # No duplicates
        mock_upload.return_value = "http://mock_gcs_url/path/to/file.png"
        mock_create.return_value = MagicMock(spec=Media, id=uuid.uuid4())

        # Mock the conversion result
        converted_file = SimpleUploadedFile(
            "test_image.png", b"converted content", content_type="image/png"
        )
        mock_convert.return_value = converted_file

        # Create a mock HEIC file
        heic_file = SimpleUploadedFile(
            "test_image.heic", b"heic content", content_type="image/heic"
        )

        # Call the upload function
        MediaService.upload_media_file(
            heic_file, self.prefix, Media.Type.IMAGE, self.org
        )

        # Verify HEIC conversion was called
        mock_convert.assert_called_once_with(heic_file)

        # Verify the converted file was uploaded
        mock_upload.assert_called_once()
        file_uploaded, _, content_type = mock_upload.call_args[0]
        self.assertEqual(file_uploaded, converted_file)
        self.assertEqual(content_type, "image/png")

    @patch("video_gen.services.media_service.upload_file_to_cloud")
    @patch("video_gen.services.media_service.Media.objects.create")
    @patch(
        "video_gen.services.media_service.MediaService.get_duplicate_media_with_videos"
    )
    @patch("video_gen.services.media_service.MediaService.is_heic_file")
    def test_upload_media_file_with_property_metadata(
        self, mock_is_heic, mock_get_duplicates, mock_create, mock_upload
    ):
        """Verify property metadata is included in the media record."""
        mock_upload.return_value = "http://mock_gcs_url/path/to/file.jpg"
        mock_get_duplicates.return_value = []  # No duplicates
        mock_create.return_value = MagicMock(spec=Media, id=uuid.uuid4())
        mock_is_heic.return_value = False

        # Define property metadata
        property_metadata = {
            "property_id": "12345",
            "property_image_id": "image_67890",
            "listing_id": "listing_12345",
        }

        # Call the upload function with property metadata
        MediaService.upload_media_file(
            self.mock_file,
            self.prefix,
            Media.Type.IMAGE,
            self.org,
            property_metadata=property_metadata,
        )

        # Check media creation with property metadata
        mock_create.assert_called_once()
        _, call_kwargs = mock_create.call_args
        metadata = call_kwargs.get("metadata", {})

        # Verify property metadata was included
        self.assertEqual(metadata.get("property_id"), "12345")
        self.assertEqual(metadata.get("property_image_id"), "image_67890")
        self.assertEqual(metadata.get("listing_id"), "listing_12345")
