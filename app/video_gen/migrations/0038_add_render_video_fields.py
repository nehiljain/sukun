from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "video_gen",
            "0037_remove_recording_daily_room_name_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="rendervideo",
            name="description",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="rendervideo",
            name="chat_messages",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="rendervideo",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("generated", "Generated"),
                    ("accepted", "Accepted"),
                    ("error", "Error"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
