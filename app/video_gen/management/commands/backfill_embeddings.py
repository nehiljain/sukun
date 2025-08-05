import logging
from typing import Optional

from django.core.management.base import BaseCommand, CommandError
from user_org.models import Organization
from video_gen.models import Media
from video_gen.tasks import (
    backfill_all_embeddings_task,
    batch_generate_embeddings_task,
    generate_embedding_task,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill embeddings for media items with AI-powered multimodal analysis. Supports organization-specific, single media, or all-organizations mode."

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
            help="Show what would be processed without actually queuing tasks",
        )

        # Force mode
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate embeddings even for media that already have them",
        )

        # Sync mode
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Process embeddings synchronously (not recommended for large datasets)",
        )

        # AI analysis mode
        parser.add_argument(
            "--ai-only",
            action="store_true",
            help="Only process images and videos that can benefit from AI multimodal analysis",
        )

    def handle(self, *args, **options):
        """Main command handler"""
        try:
            org_id = options.get("org_id")
            media_id = options.get("media_id")
            batch_size = options.get("batch_size")
            dry_run = options.get("dry_run")
            force = options.get("force")
            sync = options.get("sync")
            ai_only = options.get("ai_only")

            # Validate batch size
            if batch_size < 1 or batch_size > 100:
                raise CommandError("Batch size must be between 1 and 100")

            # Priority: media_id > org_id > all organizations
            if media_id:
                return self._handle_single_media(
                    media_id, dry_run, force, sync, ai_only
                )
            elif org_id:
                return self._handle_organization(
                    org_id, batch_size, dry_run, force, sync, ai_only
                )
            else:
                return self._handle_all_organizations(
                    batch_size, dry_run, force, sync, ai_only
                )

        except Exception as e:
            logger.exception(f"Error in backfill_embeddings command: {e}")
            raise CommandError(f"Command failed: {e}") from e

    def _handle_single_media(
        self, media_id: str, dry_run: bool, force: bool, sync: bool, ai_only: bool
    ):
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

        if media.embedding is not None and not force:
            self.stdout.write(
                self.style.WARNING(
                    f"Media {media_id} already has an embedding. Use --force to regenerate."
                )
            )
            return

        if dry_run:
            ai_msg = (
                " (AI multimodal analysis)" if media.type in ["image", "video"] else ""
            )
            self.stdout.write(
                f"[DRY RUN] Would process media: {media.id} ({media.name}){ai_msg}"
            )
            return

        ai_msg = (
            " with AI multimodal analysis" if media.type in ["image", "video"] else ""
        )
        self.stdout.write(f"Processing media: {media.id} ({media.name}){ai_msg}")

        if sync:
            # Process synchronously
            from video_gen.services.media_service import MediaService

            had_embedding_before = media.embedding is not None
            success = MediaService.generate_and_store_embedding(media, force=force)
            if success:
                action = "Regenerated" if had_embedding_before else "Generated"
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully {action.lower()} embedding for media {media_id}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to generate embedding for media {media_id}"
                    )
                )
        else:
            # Queue async task
            task = generate_embedding_task.delay(str(media_id))
            self.stdout.write(
                self.style.SUCCESS(
                    f"Queued embedding generation task {task.id} for media {media_id}"
                )
            )

    def _handle_organization(
        self,
        org_id: str,
        batch_size: int,
        dry_run: bool,
        force: bool,
        sync: bool,
        ai_only: bool,
    ):
        """Process all media for a specific organization"""
        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist as e:
            raise CommandError(f"Organization with ID {org_id} not found") from e

        # Build query based on force flag and AI-only mode
        media_query = Media.objects.filter(org=org)
        if not force:
            media_query = media_query.filter(embedding__isnull=True)
        if ai_only:
            media_query = media_query.filter(type__in=["image", "video"])

        media_count = media_query.count()

        if media_count == 0:
            filter_msg = "without embeddings" if not force else "total"
            ai_msg = " (images/videos only)" if ai_only else ""
            self.stdout.write(
                f"No media items {filter_msg}{ai_msg} found for organization {org.name}"
            )
            return

        ai_msg = " (AI-analyzable images/videos)" if ai_only else ""
        self.stdout.write(
            f"Found {media_count} media items{ai_msg} for organization: {org.name}"
        )

        if dry_run:
            self.stdout.write(
                f"[DRY RUN] Would process {media_count} media items in batches of {batch_size}"
            )
            return

        if sync:
            # Process synchronously
            self._process_org_sync(org, media_query, batch_size, ai_only)
        else:
            # Queue async task
            task = batch_generate_embeddings_task.delay(str(org_id), batch_size, 0)
            ai_msg = " with AI multimodal analysis" if ai_only else ""
            self.stdout.write(
                self.style.SUCCESS(
                    f"Queued batch embedding generation task {task.id} for organization {org.name} "
                    f"({media_count} items, batch size: {batch_size}){ai_msg}"
                )
            )

    def _handle_all_organizations(
        self, batch_size: int, dry_run: bool, force: bool, sync: bool, ai_only: bool
    ):
        """Process all media across all organizations"""
        # Build query based on force flag and AI-only mode
        if force:
            if ai_only:
                orgs_with_media = Organization.objects.filter(
                    media__type__in=["image", "video"]
                ).distinct()
            else:
                orgs_with_media = Organization.objects.filter(
                    media__isnull=False
                ).distinct()
        else:
            if ai_only:
                orgs_with_media = Organization.objects.filter(
                    media__embedding__isnull=True, media__type__in=["image", "video"]
                ).distinct()
            else:
                orgs_with_media = Organization.objects.filter(
                    media__embedding__isnull=True
                ).distinct()

        org_count = orgs_with_media.count()

        if org_count == 0:
            filter_msg = "with media" if force else "with media missing embeddings"
            self.stdout.write(f"No organizations {filter_msg} found")
            return

        total_media = 0
        for org in orgs_with_media:
            media_query = Media.objects.filter(org=org)
            if not force:
                media_query = media_query.filter(embedding__isnull=True)
            if ai_only:
                media_query = media_query.filter(type__in=["image", "video"])
            total_media += media_query.count()

        self.stdout.write(
            f"Found {org_count} organizations with {total_media} total media items to process"
        )

        if dry_run:
            self.stdout.write(
                f"[DRY RUN] Would process {total_media} media items across {org_count} organizations "
                f"in batches of {batch_size}"
            )
            return

        if sync:
            # Process synchronously
            for org in orgs_with_media:
                media_query = Media.objects.filter(org=org)
                if not force:
                    media_query = media_query.filter(embedding__isnull=True)
                if ai_only:
                    media_query = media_query.filter(type__in=["image", "video"])

                media_count = media_query.count()
                if media_count > 0:
                    ai_msg = " (AI multimodal analysis)" if ai_only else ""
                    self.stdout.write(
                        f"Processing {media_count} items for {org.name}{ai_msg}"
                    )
                    self._process_org_sync(org, media_query, batch_size, ai_only)
        else:
            # Queue async task
            task = backfill_all_embeddings_task.delay(batch_size)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Queued backfill task {task.id} for all organizations "
                    f"({org_count} orgs, {total_media} items, batch size: {batch_size})"
                )
            )

    def _process_org_sync(
        self, org: Organization, media_query, batch_size: int, ai_only: bool = False
    ):
        """Process organization media synchronously"""
        from video_gen.services.media_service import MediaService

        media_items = list(media_query.order_by("created_at"))
        total_count = len(media_items)
        success_count = 0
        failed_count = 0

        self.stdout.write(f"Processing {total_count} media items for {org.name}")

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
                    # Store whether media had embedding before processing
                    had_embedding = media.embedding is not None

                    success = MediaService.generate_and_store_embedding(
                        media, force=True
                    )
                    if success:
                        success_count += 1
                        ai_indicator = " 🤖" if media.type in ["image", "video"] else ""
                        action_indicator = " ♻️" if had_embedding else ""
                        self.stdout.write(
                            f"  ✓ {media.name}{ai_indicator}{action_indicator}"
                        )
                    else:
                        failed_count += 1
                        self.stdout.write(
                            self.style.WARNING(f"  ✗ {media.name} (generation failed)")
                        )
                except Exception as e:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ {media.name} (error: {e})")
                    )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed processing {org.name}: {success_count} successful, {failed_count} failed"
            )
        )

    def _get_stats(self, org: Optional[Organization] = None) -> dict:
        """Get statistics about media embeddings"""
        if org:
            total_media = Media.objects.filter(org=org).count()
            with_embeddings = Media.objects.filter(
                org=org, embedding__isnull=False
            ).count()
        else:
            total_media = Media.objects.count()
            with_embeddings = Media.objects.filter(embedding__isnull=False).count()

        without_embeddings = total_media - with_embeddings
        coverage_percent = (
            (with_embeddings / total_media * 100) if total_media > 0 else 0
        )

        return {
            "total": total_media,
            "with_embeddings": with_embeddings,
            "without_embeddings": without_embeddings,
            "coverage_percent": coverage_percent,
        }
