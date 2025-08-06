import logging

from django.core.management.base import BaseCommand, CommandError
from user_org.models import Organization
from video_gen.models import Media
from video_gen.services.media_service import MediaService

from app.video_gen.services.embedding import create_embedding_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Test and debug RAG search performance with different queries and settings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--query",
            type=str,
            required=True,
            help="Search query to test",
        )
        parser.add_argument(
            "--org-id",
            type=str,
            help="Organization ID to search within",
        )
        parser.add_argument(
            "--threshold",
            type=float,
            default=0.1,
            help="Similarity threshold (default: 0.1, lower = more permissive)",
        )
        parser.add_argument(
            "--max-results",
            type=int,
            default=10,
            help="Maximum results to return (default: 10)",
        )
        parser.add_argument(
            "--show-summaries",
            action="store_true",
            help="Show AI summaries for returned results",
        )
        parser.add_argument(
            "--compare-queries",
            action="store_true",
            help="Compare original vs enhanced query performance",
        )

    def handle(self, *args, **options):
        query = options["query"]
        org_id = options.get("org_id")
        threshold = options["threshold"]
        max_results = options["max_results"]
        show_summaries = options["show_summaries"]
        compare_queries = options["compare_queries"]

        try:
            # Get organization
            if org_id:
                try:
                    org = Organization.objects.get(id=org_id)
                except Organization.DoesNotExist as e:
                    raise CommandError(
                        f"Organization with ID {org_id} not found"
                    ) from e
            else:
                org = Organization.objects.first()
                if not org:
                    raise CommandError("No organizations found")

            self.stdout.write("\n🔍 RAG Search Test")
            self.stdout.write("=" * 50)
            self.stdout.write(f"Query: '{query}'")
            self.stdout.write(f"Organization: {org.name} ({org.id})")
            self.stdout.write(f"Similarity Threshold: {threshold}")
            self.stdout.write(f"Max Results: {max_results}")

            if compare_queries:
                self._compare_query_performance(
                    query, org, threshold, max_results, show_summaries
                )
            else:
                self._test_single_query(
                    query, org, threshold, max_results, show_summaries
                )

        except Exception as e:
            logger.exception(f"Error in test_rag_search command: {e}")
            raise CommandError(f"Command failed: {e}") from e

    def _test_single_query(
        self, query: str, org, threshold: float, max_results: int, show_summaries: bool
    ):
        """Test a single search query."""

        # Show media with AI summaries for context
        self._show_available_media(org)

        # Perform the search
        self.stdout.write("\n🎯 Search Results:")
        self.stdout.write("-" * 30)

        results = MediaService.search_media(
            query=query,
            org=org,
            use_semantic_search=True,
            similarity_threshold=threshold,
            max_results=max_results,
        )

        if results:
            for i, media in enumerate(results, 1):
                self.stdout.write(f"\n{i}. {media.name} ({media.type})")
                self.stdout.write(f"   Created: {media.created_at}")

                if show_summaries and media.ai_summary:
                    summary_preview = (
                        media.ai_summary[:200] + "..."
                        if len(media.ai_summary) > 200
                        else media.ai_summary
                    )
                    self.stdout.write(f"   AI Summary: {summary_preview}")
        else:
            self.stdout.write("❌ No results found!")
            self.stdout.write("\n💡 Try:")
            self.stdout.write(f"   - Lowering the threshold (current: {threshold})")
            self.stdout.write("   - Using broader search terms")
            self.stdout.write("   - Checking if media has AI summaries")

    def _compare_query_performance(
        self, query: str, org, threshold: float, max_results: int, show_summaries: bool
    ):
        """Compare original query vs enhanced query performance."""

        embedding_service = create_embedding_service()

        # Test original query
        self.stdout.write("\n🔍 Original Query Test:")
        self.stdout.write(f"Query: '{query}'")

        original_embedding = embedding_service.generate_embedding(query)
        if original_embedding:
            self.stdout.write(
                f"✅ Original embedding generated (dim: {len(original_embedding)})"
            )
        else:
            self.stdout.write("❌ Failed to generate original embedding")
            return

        # Query enhancement has been disabled - using original query
        enhanced_query = query  # No enhancement applied
        self.stdout.write("\n🚀 Enhanced Query Test (disabled):")
        self.stdout.write(f"Enhanced: '{enhanced_query}' (same as original)")

        enhanced_embedding = embedding_service.generate_embedding(enhanced_query)
        if enhanced_embedding:
            self.stdout.write(
                f"✅ Enhanced embedding generated (dim: {len(enhanced_embedding)})"
            )
        else:
            self.stdout.write("❌ Failed to generate enhanced embedding")
            return

        # Compare search results
        self.stdout.write("\n📊 Comparison Results:")

        # Original results
        self.stdout.write("\n1️⃣  ORIGINAL QUERY RESULTS:")
        original_results = MediaService.search_media(
            query=query,
            org=org,
            use_semantic_search=True,
            similarity_threshold=threshold,
            max_results=max_results,
        )

        if original_results:
            for i, media in enumerate(original_results[:3], 1):
                self.stdout.write(f"   {i}. {media.name}")
        else:
            self.stdout.write("   ❌ No results")

        # Enhanced results
        self.stdout.write("\n2️⃣  ENHANCED QUERY RESULTS:")
        # We need to directly test the enhanced query
        results = MediaService.search_media(
            query=enhanced_query,  # Use enhanced query directly
            org=org,
            use_semantic_search=True,
            similarity_threshold=threshold,
            max_results=max_results,
        )

        if results:
            for i, media in enumerate(results[:3], 1):
                self.stdout.write(f"   {i}. {media.name}")
                if show_summaries and media.ai_summary:
                    summary_preview = (
                        media.ai_summary[:150] + "..."
                        if len(media.ai_summary) > 150
                        else media.ai_summary
                    )
                    self.stdout.write(f"      Summary: {summary_preview}")
        else:
            self.stdout.write("   ❌ No results")

        # Summary
        self.stdout.write("\n📈 Summary:")
        self.stdout.write(f"   Original results: {len(original_results)}")
        self.stdout.write(f"   Enhanced results: {len(results)}")

        if len(results) > len(original_results):
            self.stdout.write("   ✅ Enhanced query performed better!")
        elif len(results) == len(original_results):
            self.stdout.write("   ➡️  Same performance")
        else:
            self.stdout.write("   ⚠️  Original query performed better")

    def _show_available_media(self, org):
        """Show available media with AI summaries for context."""
        self.stdout.write("\n📋 Available Media with AI Summaries:")
        self.stdout.write("-" * 40)

        media_with_summaries = Media.objects.filter(
            org=org, ai_summary__isnull=False
        ).order_by("-created_at")[:5]

        if media_with_summaries:
            for i, media in enumerate(media_with_summaries, 1):
                summary_preview = (
                    media.ai_summary[:100] + "..."
                    if len(media.ai_summary) > 100
                    else media.ai_summary
                )
                self.stdout.write(f"{i}. {media.name} ({media.type})")
                self.stdout.write(f"   Summary: {summary_preview}")
        else:
            self.stdout.write("❌ No media with AI summaries found!")
            self.stdout.write("💡 Run: python manage.py generate_ai_summaries first")
