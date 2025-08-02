import logging

from django.core.management.base import BaseCommand, CommandError
from user_org.models import Organization
from video_gen.models import Media

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Inspect AI summaries stored in the Media table for debugging and analysis"

    def add_arguments(self, parser):
        parser.add_argument(
            "--media-id",
            type=str,
            help="Show summary for specific media ID",
        )
        parser.add_argument(
            "--org-id",
            type=str,
            help="Show summaries for specific organization",
        )
        parser.add_argument(
            "--media-type",
            type=str,
            choices=["image", "video"],
            help="Filter by media type",
        )
        parser.add_argument(
            "--model",
            type=str,
            help="Filter by AI model used",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Maximum number of summaries to show (default: 10)",
        )
        parser.add_argument(
            "--full",
            action="store_true",
            help="Show full summaries instead of truncated previews",
        )
        parser.add_argument(
            "--stats-only",
            action="store_true",
            help="Show only statistics, no individual summaries",
        )

    def handle(self, *args, **options):
        media_id = options.get("media_id")
        org_id = options.get("org_id")
        media_type = options.get("media_type")
        model = options.get("model")
        limit = options.get("limit")
        full = options.get("full")
        stats_only = options.get("stats_only")

        try:
            if media_id:
                self._show_single_media_summary(media_id, full)
            else:
                self._show_summary_statistics()

                if not stats_only:
                    self._show_multiple_summaries(
                        org_id, media_type, model, limit, full
                    )

        except Exception as e:
            logger.exception(f"Error in inspect_ai_summaries command: {e}")
            raise CommandError(f"Command failed: {e}")

    def _show_single_media_summary(self, media_id: str, full: bool):
        """Show detailed information for a single media item."""
        try:
            media = Media.objects.get(id=media_id)
        except Media.DoesNotExist:
            raise CommandError(f"Media with ID {media_id} not found")

        self.stdout.write(f"\n📄 Media Details: {media.name}")
        self.stdout.write("=" * 60)
        self.stdout.write(f"ID: {media.id}")
        self.stdout.write(f"Type: {media.type}")
        self.stdout.write(f"Organization: {media.org.name}")
        self.stdout.write(f"Created: {media.created_at}")

        if (
            media.embedding_text
            and isinstance(media.embedding_text, dict)
            and media.embedding_text.get("summary")
        ):
            ai_data = media.embedding_text
            self.stdout.write("\n🤖 AI Summary:")
            self.stdout.write(f"Model: {ai_data.get('model', 'Unknown')}")
            self.stdout.write(f"Generated: {ai_data.get('generated_at', 'Unknown')}")
            self.stdout.write(f"Length: {len(ai_data['summary'])} characters")
            self.stdout.write("\nContent:")
            self.stdout.write("-" * 40)

            if full:
                self.stdout.write(ai_data["summary"])
            else:
                preview = (
                    ai_data["summary"][:500] + "..."
                    if len(ai_data["summary"]) > 500
                    else ai_data["summary"]
                )
                self.stdout.write(preview)
        else:
            if media.type in ["image", "video"]:
                self.stdout.write(
                    "\n⚠️  No AI summary available (but could be generated)"
                )
            else:
                self.stdout.write(
                    f"\n❌ AI summary not applicable for {media.type} media"
                )

    def _show_summary_statistics(self):
        """Show overall statistics about AI summaries."""
        self.stdout.write("\n📊 AI Summary Statistics")
        self.stdout.write("=" * 60)

        # Overall stats
        total_media = Media.objects.count()
        ai_capable = Media.objects.filter(type__in=["image", "video"]).count()
        with_summaries = Media.objects.filter(
            embedding_text__isnull=False, embedding_text__has_key="summary"
        ).count()

        self.stdout.write(f"Total Media: {total_media}")
        self.stdout.write(f"AI-Capable (images/videos): {ai_capable}")
        self.stdout.write(f"With AI Summaries: {with_summaries}")

        if ai_capable > 0:
            coverage = (with_summaries / ai_capable) * 100
            self.stdout.write(f"AI Summary Coverage: {coverage:.1f}%")

        # By model
        models_used = (
            Media.objects.filter(
                embedding_text__isnull=False, embedding_text__has_key="model"
            )
            .values_list("embedding_text__model", flat=True)
            .distinct()
        )
        if models_used:
            self.stdout.write("\nModels Used:")
            for model in models_used:
                count = Media.objects.filter(embedding_text__model=model).count()
                self.stdout.write(f"  {model or 'Unknown'}: {count} summaries")

        # By type
        image_summaries = Media.objects.filter(
            type="image",
            embedding_text__isnull=False,
            embedding_text__has_key="summary",
        ).count()
        video_summaries = Media.objects.filter(
            type="video",
            embedding_text__isnull=False,
            embedding_text__has_key="summary",
        ).count()

        self.stdout.write("\nBy Media Type:")
        self.stdout.write(f"  Images with summaries: {image_summaries}")
        self.stdout.write(f"  Videos with summaries: {video_summaries}")

    def _show_multiple_summaries(
        self, org_id: str, media_type: str, model: str, limit: int, full: bool
    ):
        """Show multiple AI summaries based on filters."""
        self.stdout.write(f"\n📝 Recent AI Summaries (limit: {limit})")
        self.stdout.write("=" * 60)

        # Build query
        queryset = Media.objects.filter(
            embedding_text__isnull=False, embedding_text__has_key="summary"
        )

        if org_id:
            try:
                org = Organization.objects.get(id=org_id)
                queryset = queryset.filter(org=org)
                self.stdout.write(f"Organization: {org.name}")
            except Organization.DoesNotExist:
                raise CommandError(f"Organization with ID {org_id} not found")

        if media_type:
            queryset = queryset.filter(type=media_type)
            self.stdout.write(f"Media Type: {media_type}")

        if model:
            queryset = queryset.filter(embedding_text__model=model)
            self.stdout.write(f"AI Model: {model}")

        # Order by most recent and limit - use created_at since generated_at is now in JSON
        queryset = queryset.order_by("-created_at")[:limit]

        if not queryset.exists():
            self.stdout.write("No AI summaries found matching the criteria.")
            return

        for i, media in enumerate(queryset, 1):
            ai_data = media.embedding_text
            self.stdout.write(f"\n{i}. {media.name} ({media.type})")
            self.stdout.write(f"   Model: {ai_data.get('model', 'Unknown')}")
            self.stdout.write(f"   Generated: {ai_data.get('generated_at', 'Unknown')}")
            self.stdout.write(f"   Length: {len(ai_data['summary'])} chars")

            if full:
                self.stdout.write(f"   Summary: {ai_data['summary']}")
            else:
                preview = (
                    ai_data["summary"][:200] + "..."
                    if len(ai_data["summary"]) > 200
                    else ai_data["summary"]
                )
                self.stdout.write(f"   Preview: {preview}")
