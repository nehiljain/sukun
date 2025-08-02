from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "video_gen",
            "0016_rename_storage_dir_capture_storage_url_path_and_more",
        ),  # Replace with the actual previous migration
    ]

    operations = [
        migrations.RenameModel(
            old_name="Capture",
            new_name="Media",
        ),
        migrations.RenameModel(
            old_name="VideoAsset",
            new_name="RenderVideo",
        ),
        migrations.AlterModelOptions(
            name="Media",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Media",
                "verbose_name_plural": "Media",
            },
        ),
        migrations.AlterModelOptions(
            name="RenderVideo",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Render Video",
                "verbose_name_plural": "Render Videos",
            },
        ),
        migrations.AlterField(
            model_name="media",
            name="org",
            field=models.ForeignKey(
                "user_org.Organization", on_delete=models.CASCADE, related_name="media"
            ),
        ),
        migrations.AlterField(
            model_name="rendervideo",
            name="video_project",
            field=models.ForeignKey(
                "VideoProject", on_delete=models.CASCADE, related_name="render_videos"
            ),
        ),
    ]
