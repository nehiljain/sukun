from typing import Any, Dict, List

from django.db.models import Model
from video_gen.models import Media


def create_synced_overlays(
    track: Model, media_list: List[Media], fps: int = 30, aspect_ratio: str = "16:9"
) -> List[Dict[str, Any]]:
    """
    Create overlays synchronized with track markers and media items.

    Args:
        track: Track object containing markers and audio data
        media_list: List of Media objects to create video overlays from
        fps: Frames per second (default: 30)

    Returns:
        List of overlay dictionaries ready to be saved in project state
    """
    if not track.markers or len(track.markers) < 2:
        raise ValueError("Track must have at least 2 markers for scene transitions")

    # Convert markers timestamps to frames
    frame_markers = []
    for marker in track.markers:
        timestamp = marker.get("timestamp", "")
        # Parse timestamp format (could be "00:00:03:01" or "00.00.06:00")
        parts = timestamp.replace(".", ":").split(":")
        if len(parts) == 4:
            hours, minutes, seconds, frames = map(int, parts)
            total_frames = (hours * 3600 + minutes * 60 + seconds) * fps + frames
            frame_markers.append(
                {"frame": total_frames, "label": marker.get("label", "")}
            )

    # Sort markers by frame
    frame_markers.sort(key=lambda m: m["frame"])

    # Create overlays array
    overlays = []

    # Process media for each segment between markers, but only up to available media
    overlay_id = 2  # Start from 2 for first overlay
    max_segments = min(len(frame_markers) - 1, len(media_list))

    # Calculate video dimensions based on aspect ratio
    if aspect_ratio == "16:9":
        width = 1280
        height = 720
    elif aspect_ratio == "9:16":
        width = 1080
        height = 1920
    elif aspect_ratio == "1:1":
        width = 1080
        height = 1080

    # Add media overlays and calculate total duration
    total_duration_in_frames = 0

    # Add media overlays
    for i in range(max_segments):
        start_frame = frame_markers[i]["frame"]
        end_frame = frame_markers[i + 1]["frame"]
        duration = end_frame - start_frame
        total_duration_in_frames = end_frame  # Keep track of the last frame

        media = media_list[i]
        video_overlay = {
            "id": overlay_id,
            "type": media.type,
            "content": media.name,
            "src": media.storage_url_path,
            "durationInFrames": duration,
            "from": start_frame,
            "height": height,
            "width": width,
            "row": 1,
            "left": 0,
            "top": 0,
            "isDragging": False,
            "rotation": 0,
            "videoStartTime": 0,
            "styles": {"opacity": 1, "objectFit": "cover", "zIndex": 1},
        }
        overlays.append(video_overlay)
        overlay_id += 1

    # Add DemoDrive outro scene
    outro_start_frame = frame_markers[max_segments]["frame"]
    outro_duration = 60  # Fixed 2 seconds at 30fps
    total_duration_in_frames = outro_start_frame + outro_duration

    # Add black background
    background_overlay = {
        "id": overlay_id,
        "from": outro_start_frame,
        "row": 1,
        "left": 0,
        "top": 0,
        "width": width,
        "height": height,
        "durationInFrames": outro_duration,
        "rotation": 0,
        "isDragging": False,
        "type": "rectangle",
        "styles": {
            "fill": "#000000",
            "fillOpacity": 1,
            "stroke": "#000000",
            "strokeWidth": 2,
            "strokeOpacity": 1,
            "borderRadius": 0,
            "opacity": 1,
            "zIndex": 1,
            "transform": "none",
            "animation": {
                "enter": "fadeIn",
                "exit": "fadeOut",
                "draw": {"enabled": True, "duration": 30, "direction": "clockwise"},
            },
        },
    }
    overlays.append(background_overlay)
    overlay_id += 1

    # Add DemoDrive logo
    logo_overlay = {
        "left": (width - 234) // 2,  # Center horizontally
        "top": (height - 213) // 2 - 50,  # Center vertically with offset for text
        "width": 234,
        "height": 213,
        "durationInFrames": outro_duration,
        "from": outro_start_frame,
        "id": overlay_id,
        "rotation": 0,
        "row": 0,
        "isDragging": False,
        "type": "image",
        "src": "https://app-staging.demodrive.tech/static/logo_dark_no_bg.png",
        "styles": {
            "objectFit": "cover",
            "animation": {"enter": "fade", "exit": "fadeOut", "enterDuration": 22},
        },
    }
    overlays.append(logo_overlay)
    overlay_id += 1

    # Add DemoDrive text
    text_overlay = {
        "left": (width - 300) // 2,  # Center horizontally
        "top": (height - 213) // 2 + 203,  # Position below logo
        "width": 300,
        "height": 50,
        "durationInFrames": outro_duration,
        "from": outro_start_frame,
        "id": overlay_id,
        "row": 0,
        "rotation": 0,
        "isDragging": False,
        "type": "text",
        "content": "DemoDrive",
        "styles": {
            "fontSize": "3rem",
            "fontWeight": "700",
            "color": "#FFFFFF",
            "backgroundColor": "transparent",
            "fontFamily": "font-sans",
            "fontStyle": "normal",
            "textDecoration": "none",
            "lineHeight": "1.1",
            "textAlign": "center",
            "letterSpacing": "-0.03em",
            "opacity": 1,
            "zIndex": 1,
            "transform": "none",
            "animation": {"enter": "fade", "enterDuration": 22},
        },
    }
    overlays.append(text_overlay)
    overlay_id += 1

    # Add sound overlay for the track with the total duration
    sound_overlay = {
        "id": 1,  # Sound overlay gets ID 1
        "type": "sound",
        "content": track.title,
        "src": track.preview_url or track.audio_file,
        "durationInFrames": total_duration_in_frames,
        "from": 0,
        "height": 50,
        "row": 0,
        "left": 0,
        "top": 0,
        "width": 50,
        "isDragging": False,
        "rotation": 0,
        "styles": {"opacity": 1, "volume": 1},
    }
    overlays.insert(0, sound_overlay)  # Insert sound overlay at the beginning

    return {
        "overlays": overlays,
        "durationInFrames": total_duration_in_frames,
    }
