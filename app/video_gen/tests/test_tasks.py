from unittest import mock

import app.video_gen.tasks as tasks


class TestTasks:
    def test_extract_info_from_studio_recording_filepath(self):
        # Example test for extract_info_from_filename
        filepath = "cactus_ai/2025-05-22-ajith_fondo_studio/iphone-15pro_916_1080p/raw/"  # pragma: allowlist secret
        recording_info = tasks.extract_info_from_studio_recording_filepath(filepath)
        assert recording_info.company_identifier == "cactus_ai"
        assert recording_info.session_identifier == "2025-05-22-ajith_fondo_studio"
        assert recording_info.device_identifier == "iphone-15pro"
        assert recording_info.aspect_ratio == "916"
        assert recording_info.resolution == "1080p"

    def test_download_supported_videos_from_s3(self, tmp_path):
        # Arrange
        s3_client = mock.Mock()
        bucket_name = "test-bucket"
        contents = [
            {"Key": "folder/video1.mp4"},
            {"Key": "folder/video2.MP4"},
            {"Key": "folder/image.jpg"},
            {"Key": "folder/video3.mov"},
        ]
        supported_extensions = [".mp4", ".MP4", ".mov"]
        temp_dir_path = tmp_path

        # Act
        result = tasks.download_supported_videos_from_s3(
            s3_client, bucket_name, contents, supported_extensions, temp_dir_path
        )

        # Assert
        expected_files = [
            temp_dir_path / "video1.mp4",
            temp_dir_path / "video2.MP4",
            temp_dir_path / "video3.mov",
        ]
        assert result == expected_files
        # Ensure download_file called only for supported files
        assert s3_client.download_file.call_count == 3
        s3_client.download_file.assert_any_call(
            bucket_name, "folder/video1.mp4", str(temp_dir_path / "video1.mp4")
        )
        s3_client.download_file.assert_any_call(
            bucket_name, "folder/video2.MP4", str(temp_dir_path / "video2.MP4")
        )
        s3_client.download_file.assert_any_call(
            bucket_name, "folder/video3.mov", str(temp_dir_path / "video3.mov")
        )

    def test_write_ffmpeg_file_list(self, tmp_path):
        # Arrange
        video_files = [tmp_path / "a.mp4", tmp_path / "b.mp4"]
        file_list_path = tmp_path / "file_list.txt"

        # Act
        result_path = tasks.write_ffmpeg_file_list(video_files, file_list_path)

        # Assert
        with open(result_path, "r") as f:
            lines = f.readlines()
        assert lines == [f"file '{video_files[0]}'\n", f"file '{video_files[1]}'\n"]
        assert result_path == file_list_path

    # More tests for Celery tasks and extracted functions will be added here
