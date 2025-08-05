import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# Import Luma AI SDK
from lumaai import AsyncLumaAI, LumaAI

# Load environment variables from .env file if present
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class LumaSDKVideoGenerationPipeline:
    """Pipeline for batch processing image-to-video generations using Luma AI SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        output_dir: str = "output",
        max_concurrent: int = 5,
    ):
        """Initialize the pipeline with API key and output configuration.

        Args:
            api_key: Optional Luma AI API key. If not provided, it will be read from LUMAAI_API_KEY env var.
            output_dir: Directory to save generated videos and metadata.
            max_concurrent: Maximum number of concurrent generation jobs.
        """
        self.api_key = api_key or os.environ.get("LUMAAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Luma AI API key is required. Set LUMAAI_API_KEY env variable or pass to constructor."
            )

        # Initialize both sync and async clients
        self.async_client = AsyncLumaAI(auth_token=self.api_key)
        self.sync_client = LumaAI(auth_token=self.api_key)

        # Setup output directory
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Concurrency control
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def process_job(
        self,
        job_id: str,
        prompt: str,
        image_urls: List[str],
        concepts: List[str] = None,
        on_video_downloaded=None,
        **kwargs,
    ) -> str:
        """Process a single image-to-video generation job with concurrency control.

        Args:
            job_id: Unique identifier for the job
            prompt: Text prompt for video generation
            camera_motion: Camera motion to use as keyframes (pan_right, pan_left, zoom_in, zoom_out, etc.)
            image_urls: List of image URLs to use as keyframes
            on_video_downloaded: Optional callback function that will be called with (job_id, output_path) when a video is downloaded
            **kwargs: Additional options for generation

        Returns:
            Path to the downloaded video file
        """
        async with self.semaphore:
            logger.info(f"Starting job {job_id}")

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{job_id}_{timestamp}.mp4"
            output_path = self.output_dir / output_filename

            try:
                # Prepare keyframes from image URLs
                keyframes = {}
                if len(image_urls) >= 1:
                    keyframes["frame0"] = {"type": "image", "url": image_urls[0]}
                if len(image_urls) >= 2:
                    keyframes["frame1"] = {"type": "image", "url": image_urls[1]}

                concepts_list = []
                for concept in concepts:
                    concepts_list.append({"key": concept})

                # Create generation
                logger.info(f"Creating generation for job {job_id}")
                generation = await self.async_client.generations.create(
                    prompt=prompt,
                    keyframes=keyframes,
                    concepts=concepts_list,
                    model=kwargs.get("model", "ray-2"),
                    resolution=kwargs.get("resolution", "1080"),
                    duration=kwargs.get("duration", "5s"),
                    aspect_ratio=kwargs.get("aspect_ratio", "9:16"),
                    loop=kwargs.get("loop", False),
                )

                generation_id = generation.id
                logger.info(
                    f"Generation created with ID: {generation_id} for job {job_id}"
                )

                # Poll for completion
                logger.info(f"Waiting for generation {generation_id} to complete...")
                completed = False
                while not completed:
                    generation = await self.async_client.generations.get(
                        id=generation_id
                    )

                    if generation.state == "completed":
                        completed = True
                        logger.info(f"Generation {generation_id} completed!")
                    elif generation.state == "failed":
                        raise RuntimeError(
                            f"Generation failed: {generation.failure_reason}"
                        )
                    else:
                        logger.info(
                            f"Generation {generation_id} in progress... Status: {generation.state}"
                        )
                        await asyncio.sleep(5)  # Poll every 5 seconds

                # Get video URL and download
                video_url = generation.assets.video
                logger.info(f"Video URL: {video_url}")

                # Download video
                logger.info(f"Downloading video for generation {generation_id}...")
                response = requests.get(video_url, stream=True)
                if response.status_code != 200:
                    raise RuntimeError(
                        f"Failed to download video: {response.status_code}"
                    )

                # Save video file
                os.makedirs(os.path.dirname(str(output_path)), exist_ok=True)
                with open(str(output_path), "wb") as f:
                    f.write(response.content)

                logger.info(f"Video downloaded to {output_path}")

                # Call the callback function if provided
                if on_video_downloaded:
                    try:
                        on_video_downloaded(job_id, str(output_path))
                    except Exception as e:
                        logger.error(f"Error in on_video_downloaded callback: {e}")

                # Save metadata
                try:
                    # Use model_dump() if available (Pydantic v2) otherwise fallback to dict()
                    if hasattr(generation, "model_dump"):
                        metadata = generation.model_dump()
                    else:
                        metadata = generation.dict()

                    # Save metadata with custom encoder for datetime objects
                    metadata_path = output_path.with_suffix(".json")
                    with open(metadata_path, "w") as f:
                        json.dump(metadata, f, indent=2, cls=DateTimeEncoder)
                except Exception as e:
                    logger.warning(f"Could not save metadata: {str(e)}")
                    # Continue execution even if metadata saving fails

                return str(output_path)

            except Exception as e:
                logger.error(f"Error processing job {job_id}: {str(e)}")
                raise

    async def process_batch(
        self, jobs: List[Dict[str, Any]], on_video_downloaded=None
    ) -> List[Dict[str, Any]]:
        """Process a batch of jobs concurrently.

        Args:
            jobs: List of job definitions, each containing prompt, image_urls, and optional parameters.
            on_video_downloaded: Optional callback that will be called when each video is downloaded

        Returns:
            List of results with job_id, status, and output_path or error.
        """
        tasks = []

        for i, job in enumerate(jobs):
            job_id = job.get("id", f"job_{i}")
            task = asyncio.create_task(
                self.process_job(
                    job_id=job_id,
                    prompt=job["prompt"],
                    image_urls=job["image_urls"],
                    on_video_downloaded=on_video_downloaded,
                    **job.get("options", {}),
                )
            )
            tasks.append((job_id, task))

        results = []
        for job_id, task in tasks:
            try:
                output_path = await task
                results.append(
                    {
                        "job_id": job_id,
                        "status": "completed",
                        "output_path": output_path,
                    }
                )
            except Exception as e:
                results.append({"job_id": job_id, "status": "failed", "error": str(e)})

        return results
