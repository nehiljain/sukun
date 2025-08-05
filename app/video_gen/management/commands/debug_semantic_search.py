import logging

from django.core.management.base import BaseCommand, CommandError
from user_org.models import Organization
from video_gen.services.media_service import MediaService

# Set up logging to see debug output
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Debug semantic search functionality with detailed logging"

    def add_arguments(self, parser):
        parser.add_argument("query", type=str, help="Search query to test")
        parser.add_argument(
            "--org-id",
            type=str,
            help="Organization ID (UUID). If not provided, uses first available org.",
        )
        parser.add_argument(
            "--similarity-threshold",
            type=float,
            default=0.3,
            help="Similarity threshold (0.0 to 1.0). Default: 0.3",
        )
        parser.add_argument(
            "--media-type",
            type=str,
            choices=["image", "video", "audio"],
            help="Filter by media type",
        )
        parser.add_argument(
            "--max-results",
            type=int,
            default=10,
            help="Maximum number of results to return. Default: 10",
        )
        parser.add_argument(
            "--show-embeddings-info",
            action="store_true",
            help="Show detailed information about embeddings in the database",
        )

    def handle(self, *args, **options):
        try:
            # Get organization
            if options["org_id"]:
                org = Organization.objects.get(id=options["org_id"])
            else:
                org = Organization.objects.first()
                if not org:
                    raise CommandError(
                        "No organizations found. Please create one first."
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"🔍 Testing semantic search for organization: {org.name} ({org.id})"
                )
            )

            # Show embeddings info if requested
            if options["show_embeddings_info"]:
                self.show_embeddings_info(org)

            # Test semantic search
            query = options["query"]
            similarity_threshold = options["similarity_threshold"]
            media_type = options["media_type"]
            max_results = options["max_results"]

            self.stdout.write("\n🚀 Running semantic search...")
            self.stdout.write(f"   Query: '{query}'")
            self.stdout.write(f"   Similarity threshold: {similarity_threshold}")
            self.stdout.write(f"   Media type filter: {media_type or 'None'}")
            self.stdout.write(f"   Max results: {max_results}")

            # Call semantic search with debug logging enabled
            results = MediaService.search_media(
                query=query,
                org=org,
                media_type=media_type,
                use_semantic_search=True,
                similarity_threshold=similarity_threshold,
                max_results=max_results,
            )

            self.stdout.write("\n📊 FINAL RESULTS:")
            if results:
                self.stdout.write(
                    self.style.SUCCESS(f"   Found {len(results)} results")
                )
                for i, media in enumerate(results, 1):
                    self.stdout.write(
                        f"   {i:2d}. {media.name} ({media.type}) - ID: {media.id}"
                    )
            else:
                self.stdout.write(self.style.WARNING("   No results found"))

            # Suggestions for debugging
            self.stdout.write("\n💡 DEBUGGING SUGGESTIONS:")
            self.stdout.write("   1. Check the debug output above for distance values")
            self.stdout.write(
                "   2. If distances are all high (>0.7), try lowering --similarity-threshold"
            )
            self.stdout.write(
                "   3. If no media has embeddings, run: python manage.py backfill_embeddings"
            )
            self.stdout.write(
                "   4. Check if your query matches the content of your media files"
            )
            self.stdout.write(
                "   5. Use --show-embeddings-info to see embedding statistics"
            )

        except Exception as e:
            raise CommandError(f"Error during semantic search test: {e}") from e

    def show_embeddings_info(self, org):
        """Show detailed information about embeddings in the database"""
        from video_gen.models import Media

        self.stdout.write("\n📊 EMBEDDINGS INFORMATION:")

        # Overall stats
        total_media = Media.objects.filter(org=org).count()
        with_embeddings = Media.objects.filter(org=org, embedding__isnull=False).count()
        without_embeddings = total_media - with_embeddings

        self.stdout.write(f"   Total media in org: {total_media}")
        self.stdout.write(f"   With embeddings: {with_embeddings}")
        self.stdout.write(f"   Without embeddings: {without_embeddings}")

        if total_media > 0:
            coverage = (with_embeddings / total_media) * 100
            self.stdout.write(f"   Coverage: {coverage:.1f}%")

        # By type
        for media_type in ["image", "video", "audio"]:
            type_total = Media.objects.filter(org=org, type=media_type).count()
            type_with_embeddings = Media.objects.filter(
                org=org, type=media_type, embedding__isnull=False
            ).count()
            if type_total > 0:
                type_coverage = (type_with_embeddings / type_total) * 100
                self.stdout.write(
                    f"   {media_type.title()}s: {type_with_embeddings}/{type_total} ({type_coverage:.1f}%)"
                )

        # Show some sample media with embeddings
        sample_media = Media.objects.filter(org=org, embedding__isnull=False)[:5]
        if sample_media:
            self.stdout.write("\n   📋 SAMPLE MEDIA WITH EMBEDDINGS:")
            for media in sample_media:
                embedding_dim = len(media.embedding) if media.embedding else 0
                self.stdout.write(
                    f"      • {media.name[:50]} ({media.type}) - Embedding dim: {embedding_dim}"
                )

        # Check for AI summaries too
        with_ai_summaries = Media.objects.filter(
            org=org, ai_summary__isnull=False
        ).count()
        if with_ai_summaries > 0:
            self.stdout.write(f"\n   🤖 Media with AI summaries: {with_ai_summaries}")
