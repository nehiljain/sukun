import logging
import threading
from typing import Optional

from django.conf import settings
from video_gen.models import RenderVideo
from video_gen.tasks import execute_render

logger = logging.getLogger(__name__)


class RenderService:
    @staticmethod
    def start_render_process(
        render_video: RenderVideo, render_token: str
    ) -> tuple[bool, Optional[str]]:
        """Start the render process for a video using Celery"""
        try:
            logger.info(f"Starting render process for video {render_video.id}")
            if settings.LOCAL_PROCESSING:
                # Start the render process in a separate thread to avoid blocking
                thread = threading.Thread(
                    target=execute_render, args=(render_video.id, render_token)
                )
                thread.daemon = True
                thread.start()
            else:
                # Start the Celery task
                task = execute_render.delay(render_video.id, render_token)
                logger.info(f"Render task {task.id} queued for video {render_video.id}")

            logger.info(f"Render process queued for video {render_video.id}")
            return True

        except Exception as e:
            logger.exception(f"Error starting render process: {e}")
            return False, str(e)

    # @staticmethod
    # def process_completed_render(
    #     render_video: RenderVideo, output_path: str, render_token: str
    # ) -> bool:
    #     """
    #     Process a completed render by uploading to cloud storage and updating the video asset

    #     Note: This method is kept for backwards compatibility but the actual processing
    #     is now handled by the Celery task.
    #     """
    #     try:
    #         from video_gen.tasks import process_completed_render

    #         # Call the Celery task directly
    #         result = process_completed_render(
    #             render_video.id, output_path, render_token
    #         )
    #         return result

    #     except Exception as e:
    #         logger.exception(f"Error processing completed render: {e}")
    #         return False
