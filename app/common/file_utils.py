import io
import logging
import os

import pillow_avif  # noqa: F401
import pillow_heif
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

logger = logging.getLogger(__name__)

pillow_heif.register_heif_opener()


def is_avif_file(file) -> bool:
    return getattr(
        file, "content_type", ""
    ).lower() == "image/avif" or file.name.lower().endswith(".avif")


def convert_avif_to_png(file_obj) -> io.BytesIO:
    """
    Converts an AVIF image file object to a PNG file object in memory.

    Args:
        file_obj: A file-like object containing the AVIF image data.

    Returns:
        An io.BytesIO object containing the PNG image data, or None if conversion fails.
    """
    try:
        # Ensure the file pointer is at the beginning
        file_obj.seek(0)

        # Open the AVIF image using pillow_heif registered opener
        image = Image.open(file_obj)

        # For non-RGB modes, convert to RGB
        if image.mode != "RGB" and image.mode != "RGBA":
            image = image.convert("RGB")

        # Save the image to a BytesIO object as PNG
        png_buffer = io.BytesIO()
        image.save(png_buffer, format="PNG")
        png_buffer.seek(0)  # Reset buffer pointer to the beginning

        logger.info("Successfully converted AVIF to PNG in memory.")
        return png_buffer

    except Exception as e:
        logger.error(f"Failed to convert AVIF to PNG: {e}", exc_info=True)
        return None


def get_new_filename(original_filename: str, new_extension: str) -> str:
    """
    Generates a new filename by replacing the extension.

    Args:
        original_filename: The original filename (e.g., 'image.heic').
        new_extension: The desired new extension without the dot (e.g., 'png').

    Returns:
        The new filename (e.g., 'image.png').
    """
    base, _ = os.path.splitext(original_filename)
    return f"{base}.{new_extension}"


def convert_avif_to_png_file(file: SimpleUploadedFile) -> SimpleUploadedFile:
    """Convert a AVIF file to a PNG file"""
    logger.info(f"Detected AVIF file: {file.name}")
    try:
        png_buffer = convert_avif_to_png(file)
        if not png_buffer:
            return None

        logger.info(f"Successfully converted AVIF file {file.name} to PNG.")
        new_filename = get_new_filename(file.name, "png")

        # Create a new SimpleUploadedFile with the PNG data
        converted_file = SimpleUploadedFile(
            name=new_filename, content=png_buffer.getvalue(), content_type="image/png"
        )

        return converted_file
    except Exception as e:
        logger.error(f"Failed to convert AVIF file: {file.name} {e}")
        return None


def convert_heic_to_png(file_obj) -> io.BytesIO:
    """
    Converts an HEIC image file object to a PNG file object in memory.

    Args:
        file_obj: A file-like object containing the HEIC image data.

    Returns:
        An io.BytesIO object containing the PNG image data, or None if conversion fails.
    """
    try:
        # Ensure the file pointer is at the beginning
        file_obj.seek(0)

        # Open the HEIC image using pillow_heif registered opener
        image = Image.open(file_obj)

        # For non-RGB modes, convert to RGB
        if image.mode != "RGB" and image.mode != "RGBA":
            image = image.convert("RGB")

        # Save the image to a BytesIO object as PNG
        png_buffer = io.BytesIO()
        image.save(png_buffer, format="PNG")
        png_buffer.seek(0)  # Reset buffer pointer to the beginning

        logger.info("Successfully converted HEIC to PNG in memory.")
        return png_buffer

    except Exception as e:
        logger.error(f"Failed to convert HEIC to PNG: {e}", exc_info=True)
        return None


def convert_heic_to_png_file(file: SimpleUploadedFile) -> SimpleUploadedFile:
    """Convert a HEIC file to a PNG file"""
    logger.info(f"Detected HEIC file: {file.name}")
    try:
        png_buffer = convert_heic_to_png(file)
        if not png_buffer:
            return None

        logger.info(f"Successfully converted HEIC file {file.name} to PNG.")
        new_filename = get_new_filename(file.name, "png")

        # Create a new SimpleUploadedFile with the PNG data
        converted_file = SimpleUploadedFile(
            name=new_filename, content=png_buffer.getvalue(), content_type="image/png"
        )

        return converted_file
    except Exception as e:
        logger.error(f"Failed to convert HEIC file: {file.name} {e}")
        return None
