# Generated migration to convert ai_summary fields to JSON format in embedding_text

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("video_gen", "0045_alter_media_resolution"),
    ]

    operations = [
        migrations.AlterField(
            model_name="media",
            name="embedding_text",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="AI summary data including text, model, and timestamp",
            ),
        ),
    ]
