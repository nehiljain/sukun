import logging

from django.core.management.base import BaseCommand, CommandError
from user_org.models import Organization
from video_gen.models import Media
from video_gen.services.media_service import MediaService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Force regenerate embeddings for existing media with AI-powered multimodal analysis. This replaces existing embeddings."

    def add_arguments(self, parser):
        # Organization filter
        parser.add_argument(
            "--org-id",
            type=str,
            help="Organization ID to process (UUID format). If not provided, processes all organizations.",
        )

        # Media filter
        parser.add_argument(
            "--media-id",
            type=str,
            help="Single media ID to process (UUID format). Takes priority over org-id.",
        )

        # Media type filter
        parser.add_argument(
            "--media-type",
            type=str,
            choices=["image", "video", "audio"],
            help="Only process specific media type",
        )

        # AI-only mode
        parser.add_argument(
            "--ai-only",
            action="store_true",
            help="Only process images and videos that benefit from AI multimodal analysis",
        )

        # Batch size
        parser.add_argument(
            "--batch-size",
            type=int,
            default=10,
            help="Number of media items to process per batch (default: 10)",
        )

        # Dry run mode
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be processed without actually regenerating embeddings",
        )

        # Only existing embeddings
        parser.add_argument(
            "--existing-only",
            action="store_true",
            help="Only regenerate embeddings for media that already have embeddings",
        )

    def handle(self, *args, **options):
        """Main command handler"""
        try:
            org_id = options.get("org_id")
            media_id = options.get("media_id")
            media_type = options.get("media_type")
            ai_only = options.get("ai_only")
            batch_size = options.get("batch_size")
            dry_run = options.get("dry_run")
            existing_only = options.get("existing_only")

            # Validate batch size
            if batch_size < 1 or batch_size > 100:
                raise CommandError("Batch size must be between 1 and 100")

            # Priority: media_id > org_id > all organizations
            if media_id:
                return self._handle_single_media(media_id, dry_run, ai_only)
            elif org_id:
                return self._handle_organization(
                    org_id, batch_size, dry_run, ai_only, media_type, existing_only
                )
            else:
                return self._handle_all_organizations(
                    batch_size, dry_run, ai_only, media_type, existing_only
                )

        except Exception as e:
            logger.exception(f"Error in regenerate_embeddings command: {e}")
            raise CommandError(f"Command failed: {e}") from e

    def _handle_single_media(self, media_id: str, dry_run: bool, ai_only: bool):
        """Process a single media item"""
        try:
            media = Media.objects.get(id=media_id)
        except Media.DoesNotExist as e:
            raise CommandError(f"Media with ID {media_id} not found") from e

        # Check if AI-only mode and media type is not suitable
        if ai_only and media.type not in ["image", "video"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Skipping media {media_id} (type: {media.type}) - not suitable for AI analysis"
                )
            )
            return

        if media.embedding is None:
            self.stdout.write(
                self.style.WARNING(
                    f"Media {media_id} has no existing embedding to regenerate"
                )
            )
            return

        if dry_run:
            ai_msg = (
                " (AI multimodal analysis)" if media.type in ["image", "video"] else ""
            )
            self.stdout.write(
                f"[DRY RUN] Would regenerate embedding for: {media.id} ({media.name}){ai_msg}"
            )
            return

        ai_msg = (
            " with AI multimodal analysis" if media.type in ["image", "video"] else ""
        )
        self.stdout.write(
            f"Regenerating embedding for: {media.id} ({media.name}){ai_msg}"
        )

        # Process with force=True to regenerate
        success = MediaService.generate_and_store_embedding(media, force=True)
        if success:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully regenerated embedding for media {media_id}"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"Failed to regenerate embedding for media {media_id}")
            )

    def _handle_organization(
        self,
        org_id: str,
        batch_size: int,
        dry_run: bool,
        ai_only: bool,
        media_type: str,
        existing_only: bool,
    ):
        """Process all media for a specific organization"""
        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist as e:
            raise CommandError(f"Organization with ID {org_id} not found") from e

        # Build query
        media_query = Media.objects.filter(org=org)

        if existing_only:
            media_query = media_query.filter(embedding__isnull=False)

        if ai_only:
            media_query = media_query.filter(type__in=["image", "video"])
        elif media_type:
            media_query = media_query.filter(type=media_type)

        media_count = media_query.count()

        if media_count == 0:
            filter_parts = []
            if existing_only:
                filter_parts.append("with existing embeddings")
            if ai_only:
                filter_parts.append("(images/videos only)")
            elif media_type:
                filter_parts.append(f"({media_type} only)")

            filter_msg = " ".join(filter_parts) if filter_parts else ""
            self.stdout.write(
                f"No media items{filter_msg} found for organization {org.name}"
            )
            return

        # Build description message
        desc_parts = []
        if ai_only:
            desc_parts.append("AI-analyzable images/videos")
        elif media_type:
            desc_parts.append(f"{media_type} files")
        else:
            desc_parts.append("media items")

        if existing_only:
            desc_parts.append("with existing embeddings")

        desc_msg = " ".join(desc_parts)
        self.stdout.write(
            f"Found {media_count} {desc_msg} for organization: {org.name}"
        )

        if dry_run:
            self.stdout.write(
                f"[DRY RUN] Would regenerate embeddings for {media_count} items in batches of {batch_size}"
            )
            return

        # Process synchronously
        self._process_org_regeneration(org, media_query, batch_size, ai_only)

    def _handle_all_organizations(
        self,
        batch_size: int,
        dry_run: bool,
        ai_only: bool,
        media_type: str,
        existing_only: bool,
    ):
        """Process all media across all organizations"""
        # Build query for organizations
        org_query = Organization.objects.filter(media__isnull=False)

        if existing_only:
            org_query = org_query.filter(media__embedding__isnull=False)

        if ai_only:
            org_query = org_query.filter(media__type__in=["image", "video"])
        elif media_type:
            org_query = org_query.filter(media__type=media_type)

        orgs_with_media = org_query.distinct()
        org_count = orgs_with_media.count()

        if org_count == 0:
            filter_parts = []
            if existing_only:
                filter_parts.append("with media that has embeddings")
            else:
                filter_parts.append("with media")
            if ai_only:
                filter_parts.append("(images/videos only)")
            elif media_type:
                filter_parts.append(f"({media_type} only)")

            filter_msg = " ".join(filter_parts)
            self.stdout.write(f"No organizations {filter_msg} found")
            return

        # Count total media
        total_media = 0
        for org in orgs_with_media:
            media_query = Media.objects.filter(org=org)
            if existing_only:
                media_query = media_query.filter(embedding__isnull=False)
            if ai_only:
                media_query = media_query.filter(type__in=["image", "video"])
            elif media_type:
                media_query = media_query.filter(type=media_type)
            total_media += media_query.count()

        desc_parts = []
        if ai_only:
            desc_parts.append("AI-analyzable")
        elif media_type:
            desc_parts.append(media_type)

        if existing_only:
            desc_parts.append("with existing embeddings")

        desc_msg = " ".join(desc_parts) + " " if desc_parts else ""
        self.stdout.write(
            f"Found {org_count} organizations with {total_media} total {desc_msg}media items to regenerate"
        )

        if dry_run:
            self.stdout.write(
                f"[DRY RUN] Would regenerate embeddings for {total_media} items across {org_count} organizations "
                f"in batches of {batch_size}"
            )
            return

        # Process synchronously
        for org in orgs_with_media:
            media_query = Media.objects.filter(org=org)
            if existing_only:
                media_query = media_query.filter(embedding__isnull=False)
            if ai_only:
                media_query = media_query.filter(type__in=["image", "video"])
            elif media_type:
                media_query = media_query.filter(type=media_type)

            media_count = media_query.count()
            if media_count > 0:
                ai_msg = " (AI multimodal analysis)" if ai_only else ""
                self.stdout.write(
                    f"Regenerating embeddings for {media_count} items in {org.name}{ai_msg}"
                )
                self._process_org_regeneration(org, media_query, batch_size, ai_only)

    def _process_org_regeneration(
        self, org: Organization, media_query, batch_size: int, ai_only: bool = False
    ):
        """Process organization media regeneration synchronously"""
        media_items = list(media_query.order_by("created_at"))
        total_count = len(media_items)
        success_count = 0
        failed_count = 0
        regenerated_count = 0

        self.stdout.write(
            f"Regenerating embeddings for {total_count} media items in {org.name}"
        )

        # Process in batches to avoid memory issues
        for i in range(0, total_count, batch_size):
            batch = media_items[i : i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_count + batch_size - 1) // batch_size

            self.stdout.write(
                f"Processing batch {batch_num}/{total_batches} ({len(batch)} items)"
            )

            for media in batch:
                try:
                    # Check if media had embedding before processing
                    had_embedding = media.embedding is not None

                    # Always use force=True for regeneration
                    success = MediaService.generate_and_store_embedding(
                        media, force=True
                    )
                    if success:
                        success_count += 1
                        if had_embedding:
                            regenerated_count += 1

                        ai_indicator = " 🤖" if media.type in ["image", "video"] else ""
                        action_indicator = " ♻️" if had_embedding else " ✨"
                        self.stdout.write(
                            f"  ✓ {media.name}{ai_indicator}{action_indicator}"
                        )
                    else:
                        failed_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f"  ✗ {media.name} (regeneration failed)"
                            )
                        )
                except Exception as e:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ {media.name} (error: {e})")
                    )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed regeneration for {org.name}: {success_count} successful "
                f"({regenerated_count} regenerated, {success_count - regenerated_count} new), {failed_count} failed"
            )
        )
