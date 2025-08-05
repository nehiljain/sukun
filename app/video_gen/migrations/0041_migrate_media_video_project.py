from django.db import migrations


def populate_videoprojectmedia_from_metadata(apps, schema_editor):
    VideoProject = apps.get_model("video_gen", "VideoProject")
    Media = apps.get_model("video_gen", "Media")
    VideoProjectMedia = apps.get_model("video_gen", "VideoProjectMedia")

    for project in VideoProject.objects.all():
        metadata = project.metadata or {}
        media_list = metadata.get("media_list", [])

        # Create VideoProjectMedia entries
        for order, media_entry in enumerate(media_list):
            # media_entry is expected to be a dict with a 'media_id' key
            media_id = (
                media_entry.get("media_id") if isinstance(media_entry, dict) else None
            )
            if not media_id:
                continue
            try:
                media = Media.objects.get(id=media_id)
                # Avoid duplicate entries
                VideoProjectMedia.objects.get_or_create(
                    video_project=project, media=media, defaults={"order": order}
                )
            except Media.DoesNotExist:
                # Optionally log or handle missing media
                continue


class Migration(migrations.Migration):
    dependencies = [
        ("video_gen", "0040_media_duration_in_seconds_media_format_and_more"),
    ]

    operations = [
        migrations.RunPython(
            populate_videoprojectmedia_from_metadata,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
