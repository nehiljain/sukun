"""
FFMPEG service.

Wrapper around ffmpeg to generate audio from video.
ffmpeg -i input.mp4 -vn -acodec copy output_audio.aac
"""

import subprocess


class FFMPEGService:
    SUPPORTED_VIDEO_EXTENSIONS = [".MP4", ".mp4", ".MOV", ".mov"]

    @staticmethod
    def extract_audio_from_video(video_path, audio_path):
        """
        Generate an audio from a video.
        """
        subprocess.run(
            [
                "ffmpeg",
                "-i",
                str(video_path),
                "-vn",  # no video
                "-acodec",
                "libmp3lame",
                "-ar",
                "44100",
                "-ac",
                "2",
                "-ab",
                "192k",
                "-f",
                "mp3",
                str(audio_path),
            ],
            check=True,
        )
        return audio_path

    @staticmethod
    def merge_videos_concat(file_list_path, output_path):
        """
        Merge videos using ffmpeg concat demuxer.
        """
        cmd = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(file_list_path),
            "-map",
            "0:v",
            "-map",
            "0:a",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            str(output_path),
        ]
        subprocess.run(cmd, check=True)
        return output_path

    @staticmethod
    def downscale_video(input_path, output_path, resolution, aspect_ratio):
        """
        Downscale video to the given resolution and aspect ratio.
        resolution: tuple (width, height)
        aspect_ratio: '16:9', '9:16', '1:1'
        """
        width, height = resolution
        # Determine scale and pad filter based on aspect_ratio
        if aspect_ratio == "16:9":
            vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
        elif aspect_ratio == "9:16":
            vf = f"scale={height}:{width}:force_original_aspect_ratio=decrease,pad={height}:{width}:(ow-iw)/2:(oh-ih)/2:color=black"
        elif aspect_ratio == "1:1":
            vf = f"scale={min(width, height)}:{min(width, height)}:force_original_aspect_ratio=decrease,pad={min(width, height)}:{min(width, height)}:(ow-iw)/2:(oh-ih)/2:color=black"
        else:
            # Default to 16:9
            vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
        cmd = [
            "ffmpeg",
            "-i",
            str(input_path),
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(output_path),
        ]
        subprocess.run(cmd, check=True)
        return output_path

    @staticmethod
    def clip_video(
        input_path,
        output_path,
        start_time,
        end_time,
        resolution=None,
        aspect_ratio=None,
    ):
        """
        Clip a video from start_time to end_time.
        Optionally downscale to resolution and aspect_ratio.
        start_time, end_time: in seconds or ffmpeg time format (e.g., '00:01:23.000')
        resolution: tuple (width, height) or None
        aspect_ratio: '16:9', '9:16', '1:1' or None
        """
        cmd = [
            "ffmpeg",
            "-i",
            str(input_path),
            "-ss",
            str(start_time),
            "-to",
            str(end_time),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-preset",
            "medium",
            "-crf",
            "23",
        ]
        vf = None
        if resolution and aspect_ratio:
            width, height = resolution
            if aspect_ratio == "16:9":
                vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
            elif aspect_ratio == "9:16":
                vf = f"scale={height}:{width}:force_original_aspect_ratio=decrease,pad={height}:{width}:(ow-iw)/2:(oh-ih)/2:color=black"
            elif aspect_ratio == "1:1":
                vf = f"scale={min(width, height)}:{min(width, height)}:force_original_aspect_ratio=decrease,pad={min(width, height)}:{min(width, height)}:(ow-iw)/2:(oh-ih)/2:color=black"
            else:
                vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
        elif resolution:
            width, height = resolution
            vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease"
        if vf:
            cmd += ["-vf", vf]
        cmd += [str(output_path)]
        subprocess.run(cmd, check=True)
        return output_path
