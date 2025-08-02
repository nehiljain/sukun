import base64
from typing import List, Optional

import httpx
from django.core.files.uploadedfile import InMemoryUploadedFile
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()


class ImageInfo(BaseModel):
    """Information extracted from an image."""

    main_subject: str = Field(description="The main subject of the image")
    description: str = Field(description="A detailed description of the image")
    colors: List[str] = Field(description="Dominant colors in the image")
    room_type: Optional[str] = Field(
        None, description="If the image shows a room, what type of room it is"
    )
    objects: List[str] = Field(
        description="List of important objects visible in the image"
    )
    image_quality: str = Field(
        description="Assessment of image quality (high, medium, low)"
    )
    lighting: str = Field(description="Description of lighting conditions")
    has_people: bool = Field(description="Whether there are people in the image")
    composition_style: str = Field(description="The composition style of the image")


class ImageAnalyzer:
    """Utility for analyzing images using multimodal LLM."""

    def __init__(self, model_name: str = "gpt-4o") -> None:
        """
        Initialize the image analyzer.

        Args:
            model_name: The name of the OpenAI model to use
        """
        self.model = ChatOpenAI(model=model_name)
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Analyze the provided image and extract detailed information about it. "
                    "Focus on identifying the main subject, describing the scene, noting key features, "
                    "and analyzing composition and style.",
                ),
                (
                    "user",
                    [
                        {
                            "type": "image_url",
                            "image_url": {"url": "{image_data}"},
                        }
                    ],
                ),
            ]
        )

    def load_image_from_url(self, image_url: str) -> str:
        """
        Load an image from a URL and convert it to base64.

        Args:
            image_url: The URL of the image to load

        Returns:
            base64-encoded image data with proper formatting
        """
        response = httpx.get(image_url)
        response.raise_for_status()
        image_data = base64.b64encode(response.content).decode("utf-8")
        return f"data:image/jpeg;base64,{image_data}"

    def load_image_from_path(self, image_path: str) -> str:
        """
        Load an image from a local file path and convert it to base64.

        Args:
            image_path: Path to the local image file

        Returns:
            base64-encoded image data with proper formatting
        """
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:image/jpeg;base64,{image_data}"

    def load_image_from_file(self, image_file: InMemoryUploadedFile) -> str:
        """
        Load an image from a file object and convert it to base64.

        Args:
            image_file: File object containing the image

        Returns:
            base64-encoded image data with proper formatting
        """
        image_data = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:image/jpeg;base64,{image_data}"

    def analyze_image(self, image_source: str, is_url: bool = True) -> ImageInfo:
        """
        Analyze an image and return structured information.

        Args:
            image_source: URL or local path to the image
            is_url: Whether the image_source is a URL (True) or local path (False)

        Returns:
            ImageInfo object containing structured information about the image
        """
        # Load image data
        if is_url:
            image_data = self.load_image_from_url(image_source)
        else:
            image_data = self.load_image_from_path(image_source)

        # Create the chain with structured output
        chain = self.prompt | self.model.with_structured_output(ImageInfo)

        # Invoke the chain with the image data
        return chain.invoke({"image_data": image_data})


# Example usage
def example():
    """Run a simple example of the image analyzer."""
    # Sample image URL
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"

    # Initialize the analyzer
    analyzer = ImageAnalyzer()

    # Analyze the image
    result = analyzer.analyze_image(image_url)

    # Print results
    print("Image Analysis Results:")
    print(f"Main Subject: {result.main_subject}")
    print(f"Description: {result.description}")
    print(f"Colors: {', '.join(result.colors)}")
    print(f"Objects: {', '.join(result.objects)}")
    print(f"Image Quality: {result.image_quality}")
    print(f"Lighting: {result.lighting}")
    print(f"Has People: {result.has_people}")
    print(f"Composition Style: {result.composition_style}")
    if result.room_type:
        print(f"Room Type: {result.room_type}")

    return result


if __name__ == "__main__":
    example()
