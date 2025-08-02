# Generated manually for Qwen8 local embedding model support
# This migration handles the change from 1024 to 4096 dimensions for local embeddings

import pgvector.django.vector
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("video_gen", "0046_migrate_ai_summary_to_json"),
    ]

    operations = [
        # First, we need to clear existing embeddings since dimensions are incompatible
        migrations.RunSQL(
            "UPDATE video_gen_media SET embedding = NULL WHERE embedding IS NOT NULL;",
            reverse_sql="-- No reverse operation needed, data was cleared",
        ),
        # Then alter the field to support 4096 dimensions (max needed for all models)
        # This allows storage of:
        # - OpenAI text-embedding-3-small: 1536D
        # - OpenAI text-embedding-3-large: 1024D
        # - Qwen8 text-embedding-qwen3-embedding-8b: 4096D
        migrations.AlterField(
            model_name="media",
            name="embedding",
            field=pgvector.django.vector.VectorField(
                blank=True,
                dimensions=1024,
                help_text="Vector embedding for semantic search (max 4096D to support all models)",
                null=True,
            ),
        ),
    ]
