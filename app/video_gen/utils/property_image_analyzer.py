import sys
from pathlib import Path
from typing import List, Literal

from django.core.files.uploadedfile import InMemoryUploadedFile
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from .multimodal_utils import ImageAnalyzer

# Add the parent directory to the path to import properly
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))
# Define area types as literal types for enum-like behavior
AreaType = Literal[
    "Exterior front",
    "Exterior rear/backyard",
    "Interior - living spaces",
    "Interior - kitchen",
    "Interior - bedrooms",
    "Interior - bathrooms",
    "Community amenities",
    "Special features",
]

# Define room types as literal types
RoomType = Literal[
    "kitchen", "bathroom", "living room", "dining room", "bed room", "other"
]

# Define staging quality types
StagingQuality = Literal["Bad", "Good"]

# Define camera motion types for image-to-video conversion
ImageToCameraMotion = Literal[
    "Move Left",
    "Move Right",
    "Move Up",
    "Move Down",
    "Push In",
    "Pull Out",
    "Slow Zoom In",
    "Slow Zoom Out",
    "Pan Left",
    "Pan Right",
    "Orbit Left",
    "Orbit Right",
    "Crane Up",
    "Crane Down",
]


class PropertyImageInfo(BaseModel):
    """Information extracted from a real estate property image."""

    # Area and room classification
    area_type: AreaType = Field(description="The broader area category of the image")
    room_type: RoomType = Field(
        description="The specific type of room shown (if applicable)"
    )
    # Quality assessment
    staging_quality: StagingQuality = Field(
        description="Assessment of staging quality (Good or Bad)"
    )
    # Boolean flags
    is_exterior: bool = Field(
        description="Whether this is an exterior image of the property"
    )
    has_people: bool = Field(description="Whether there are people in the image")
    has_pets: bool = Field(description="Whether there are pets in the image")

    # Camera motion for image-to-video conversion
    image_to_video_camera_motion: ImageToCameraMotion = Field(
        description="Recommended camera motion if converting this static image to a video clip. "
        "Select the most appropriate camera movement considering the image composition and focal points."
    )

    # Description
    description: str = Field(
        description="A detailed description of what is shown in the image"
    )


class PropertyImageAnalyzer(ImageAnalyzer):
    """Specialized analyzer for real estate property images."""

    def __init__(self, model_name: str = "gpt-4o") -> None:
        """
        Initialize the property image analyzer.

        Args:
            model_name: The name of the OpenAI model to use
        """
        super().__init__(model_name)

        # Override the prompt to be specific to real estate property images
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a real estate photography expert. Analyze the provided property image "
                    "and extract the following information:\n"
                    "1. Determine the area_type from these options: Exterior front, Exterior rear/backyard, "
                    "Interior - living spaces, Interior - kitchen, Interior - bedrooms, Interior - bathrooms, "
                    "Community amenities, Special features\n"
                    "2. Determine the room_type from these options: kitchen, bathroom, living room, dining room, "
                    "bed room, other\n"
                    "3. Assess the staging quality as either 'Good' or 'Bad'\n"
                    "4. Determine if it's an exterior shot (is_exterior)\n"
                    "5. Check if there are people visible (has_people)\n"
                    "6. Check if there are pets visible (has_pets)\n"
                    "7. Recommend a camera motion to explore this room image from these options: Move Left, Move Right, Move Up, Move Down, Push In, Pull Out, Slow Zoom In, Slow Zoom Out, Pan Left, Pan Right, Orbit Left, Orbit Right, Crane Up, Crane Down. Imagine converting this static image to a short video clip - "
                    "which camera motion would be most effective and natural given the composition? Remember that no new content. Using various camera motions, make the overall movie interesting and engaging after combini9ng them. "
                    "outside the current frame can appear in the video, so choose a motion that works within the frame's constraints.\n"
                    "8. Provide a concise description of what is shown in the image\n"
                    "Be precise in your categorizations and make your best judgment if uncertain.",
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

    def analyze_property_image(
        self, image_source: InMemoryUploadedFile, is_url: bool = False
    ) -> PropertyImageInfo:
        """
        Analyze a property image and return structured information.

        Args:
            image_source: URL or local path to the image
            is_url: Whether the image_source is a URL (True) or local path (False)

        Returns:
            PropertyImageInfo object containing structured information about the property image
        """
        if is_url:
            image_data = self.load_image_from_url(image_source)
        else:
            image_data = self.load_image_from_file(image_source)

        # Create the chain with structured output
        chain = self.prompt | self.model.with_structured_output(PropertyImageInfo)

        # Invoke the chain with the image data
        return chain.invoke({"image_data": image_data})

    def batch_analyze_property_images(
        self, image_sources: List[str], are_urls: bool = True
    ) -> List[PropertyImageInfo]:
        """
        Analyze multiple property images and return structured information for each.

        Args:
            image_sources: List of URLs or local paths to the images
            are_urls: Whether the image_sources are URLs (True) or local paths (False)

        Returns:
            List of PropertyImageInfo objects
        """
        results = []

        for i, image_source in enumerate(image_sources):
            print(f"Analyzing image {i+1}/{len(image_sources)}: {image_source}")
            try:
                result = self.analyze_property_image(image_source, is_url=are_urls)
                results.append(result)
            except Exception as e:
                print(f"Error analyzing image {image_source}: {str(e)}")
                results.append(None)

        return results
