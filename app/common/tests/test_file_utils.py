import io
from unittest.mock import MagicMock, patch

from common.file_utils import (
    convert_heic_to_png,
    convert_heic_to_png_file,
    get_new_filename,
)
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase


class FileUtilsTestCase(TestCase):
    def setUp(self):
        """Create mock test data"""
        # Create a small mock HEIC file for testing
        self.mock_heic_data = b"mock_heic_data"  # Simplified for testing
        self.mock_heic_file = io.BytesIO(self.mock_heic_data)
        self.mock_heic_filename = "test_image.heic"

    def test_get_new_filename(self):
        """Test filename extension replacement"""
        # Test basic extension replacement
        original = "image.heic"
        new = get_new_filename(original, "png")
        self.assertEqual(new, "image.png")

        # Test filename with multiple dots
        original = "image.test.heic"
        new = get_new_filename(original, "jpg")
        self.assertEqual(new, "image.test.jpg")

        # Test filename without extension
        original = "image"
        new = get_new_filename(original, "png")
        self.assertEqual(new, "image.png")

        # Test filename with path
        original = "/path/to/image.heic"
        new = get_new_filename(original, "png")
        self.assertEqual(new, "/path/to/image.png")

    @patch("common.file_utils.Image.open")
    def test_convert_heic_to_png(self, mock_image_open):
        """Test HEIC to PNG conversion functionality"""
        # Setup mock PIL Image for RGB mode
        mock_image_rgb = MagicMock()
        mock_image_rgb.mode = "RGB"
        mock_image_rgb.size = (100, 100)

        # Configure save method to work properly
        def mock_save(buffer, format):
            buffer.write(b"mock_png_data")
            return True

        mock_image_rgb.save.side_effect = mock_save
        mock_image_open.return_value = mock_image_rgb

        # Test normal RGB mode conversion
        result = convert_heic_to_png(self.mock_heic_file)
        self.assertIsNotNone(result)
        self.assertIsInstance(result, io.BytesIO)
        mock_image_rgb.save.assert_called_once()

        # Reset mock to test RGBA mode
        mock_image_open.reset_mock()
        mock_image_rgba = MagicMock()
        mock_image_rgba.mode = "RGBA"
        mock_image_rgba.size = (100, 100)
        mock_image_rgba.save.side_effect = mock_save
        mock_image_open.return_value = mock_image_rgba

        # Test with RGBA mode image
        result = convert_heic_to_png(self.mock_heic_file)
        self.assertIsNotNone(result)
        self.assertIsInstance(result, io.BytesIO)

        # Test exception handling
        mock_image_open.side_effect = Exception("Test error")
        result = convert_heic_to_png(self.mock_heic_file)
        self.assertIsNone(result)  # Should return None on exception

    @patch("common.file_utils.convert_heic_to_png")
    def test_convert_heic_to_png_file(self, mock_convert):
        """Test the HEIC to SimpleUploadedFile conversion"""
        # Create mock uploaded file and PNG buffer
        mock_file = SimpleUploadedFile(
            name=self.mock_heic_filename,
            content=self.mock_heic_data,
            content_type="image/heic",
        )
        mock_png_buffer = io.BytesIO(b"mock_png_data")
        mock_convert.return_value = mock_png_buffer

        # Test successful conversion
        result = convert_heic_to_png_file(mock_file)
        self.assertIsNotNone(result)

        # Ensure the returned object is a SimpleUploadedFile with the correct attributes
        self.assertIsInstance(result, SimpleUploadedFile)
        self.assertEqual(result.name, "test_image.png")
        self.assertEqual(result.content_type, "image/png")

        # Test exception handling
        mock_convert.return_value = None  # Simulate conversion failure
        result = convert_heic_to_png_file(mock_file)
        self.assertIsNone(result)  # Should return None on failure

    @patch("common.file_utils.Image.open")
    def test_integration_workflow(self, mock_image_open):
        """Test the complete workflow with mocked PIL"""
        # This is an integration test that checks the full workflow

        # Create a mock uploaded file
        mock_file = SimpleUploadedFile(
            name=self.mock_heic_filename,
            content=self.mock_heic_data,
            content_type="image/heic",
        )

        # Setup PIL mock
        mock_image = MagicMock()
        mock_image.mode = "RGB"
        mock_image.size = (100, 100)

        # Configure save method to work properly
        def mock_save(buffer, format):
            buffer.write(b"mock_png_data")
            return True

        mock_image.save.side_effect = mock_save
        mock_image_open.return_value = mock_image

        # Perform the conversion
        result = convert_heic_to_png_file(mock_file)

        # Verify the result
        self.assertIsNotNone(result)
        self.assertIsInstance(result, SimpleUploadedFile)
        self.assertEqual(result.name, "test_image.png")
        self.assertEqual(result.content_type, "image/png")
