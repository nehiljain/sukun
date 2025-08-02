import logging
from datetime import timezone

from django.utils.timezone import make_aware
from release_manager.github_pr_process import generate_tweet
from release_manager.github_utils import (
    extract_repo_and_tag,
    generate_release_notes,
    get_github_repositories,
    get_pull_requests_for_release,
)
from releases.models import Release, Repository, SemanticRelease, SourceCodeAccount

# from rest_framework_mongoengine import viewsets
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def get_github_token(request):
    return SourceCodeAccount.objects.get(
        app_user=request.user.appuser, service_provider__alias="github"
    ).info["access_token"]


class ReleaseSerializer(serializers.ModelSerializer):
    repo_name = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = "__all__"  # Ensure 'repo_name' is included

    def get_repo_name(self, obj):
        return obj.repository.name


class SemanticReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemanticRelease
        fields = "__all__"


class SemanticReleaseViewSet(viewsets.ModelViewSet):
    queryset = SemanticRelease.objects.all()
    serializer_class = SemanticReleaseSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if not hasattr(request.user, "appuser"):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        repo_name = request.query_params.get("repo_name")
        if repo_name:
            # Check if the repository belongs to the user
            try:
                repository = Repository.objects.get(
                    name=repo_name, user=request.user.appuser
                )
            except Repository.DoesNotExist:
                return Response(
                    {"error": "Repository not found or does not belong to the user"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get semantic releases for the specified repository
            semantic_releases = (
                SemanticRelease.objects.filter(
                    user=request.user.appuser, release__repository=repository
                )
                .select_related("release")
                .order_by("-release__release_date")
            )

            # Prepare the data for response
            semantic_releases_data = []
            for semantic_release in semantic_releases:
                release_data = self.get_serializer(semantic_release).data
                release_data["release"] = ReleaseSerializer(
                    semantic_release.release
                ).data
                semantic_releases_data.append(release_data)

            return Response(status=status.HTTP_200_OK, data=semantic_releases_data)
        else:
            return Response(
                {"error": "repo_name is required"}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["post"])
    def sync_all_repos(self, request):
        try:
            user = request.user.appuser
            github_token = SourceCodeAccount.objects.get(
                app_user=user, service_provider__alias="github"
            ).info["access_token"]

            repositories_data = get_github_repositories(github_token)
            synced_repos = 0

            for repo in repositories_data:
                try:
                    Repository.objects.get_or_create(
                        name=repo["name"],
                        defaults={
                            "user": user,
                            "source_code_account": SourceCodeAccount.objects.get(
                                app_user=user,
                                service_provider__alias="github",
                            ),
                        },
                    )
                    synced_repos += 1
                except Exception as e:
                    logger.error(f"Error syncing repository {repo['name']}: {str(e)}")

            return Response(
                {
                    "message": f"Successfully synced {synced_repos} repositories",
                    "total_repos": len(repositories_data),
                    "synced_repos": synced_repos,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"An error occurred while syncing repositories: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], url_path="add-footer-image")
    def add_footer_image(self, request, pk=None):
        try:
            semantic_release = self.get_object()
            footer_image_url = request.data.get("footer_image_url")

            if not footer_image_url:
                return Response(
                    {"error": "footer_image_url is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            semantic_release.footer_image_url = footer_image_url
            semantic_release.save()

            return Response(
                {"message": "Footer image URL added successfully"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"An error occurred while adding footer image URL: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReleaseViewSet(viewsets.ModelViewSet):
    queryset = Release.objects.all()
    serializer_class = ReleaseSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        user_releases = (
            Release.objects.filter(user=request.user.appuser)
            .select_related("repository")
            .order_by("-release_date")
        )
        serializer = self.get_serializer(user_releases, many=True)
        data = serializer.data
        return Response(status=status.HTTP_200_OK, data=data)

    def create(self, request, *args, **kwargs):
        try:
            github_token = get_github_token(request)
            release_url = request.data.get("release_url")
            logger.info("Processing new release creation: URL=%s", release_url)
            logger.debug("GitHub token retrieved for user %s", request.user.username)

            if not release_url:
                logger.error("Release creation failed: Missing release URL")
                return Response(
                    {"error": "Release URL is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            parts = release_url.split("/")
            if len(parts) < 5:
                logger.error("Invalid release URL format: %s", release_url)
                raise ValueError(
                    "Invalid release URL format. Expected format: 'https://github.com/<owner>/<repo>/releases/tag/<tag>'"
                )

            repo_name, release_tag_name = extract_repo_and_tag(release_url)

            logger.info(
                "Extracted repository info: Name=%s, Tag=%s",
                repo_name,
                release_tag_name,
            )

            pull_requests, github_release = get_pull_requests_for_release(
                repo_name, release_tag_name, github_token
            )
            logger.info(
                "Retrieved %d pull requests for release %s",
                len(pull_requests),
                release_tag_name,
            )

            markdown_output, _ = generate_release_notes(
                pull_requests.values(), repo_name, github_release.body
            )

            logger.debug(
                "Generated release notes for %d pull requests", len(pull_requests)
            )

            repository, created = Repository.objects.get_or_create(
                name=repo_name,
                defaults={"user": request.user.appuser},
                source_code_account=SourceCodeAccount.objects.get(
                    app_user=request.user.appuser, service_provider__alias="github"
                ),
            )
            logger.info(
                "%s repository: %s", "Created" if created else "Retrieved", repo_name
            )

            release_date = github_release.published_at or github_release.created_at
            if release_date.tzinfo is None:
                release_date = make_aware(release_date)
            else:
                release_date = release_date.astimezone(timezone.utc)

            release_data = Release(
                repository=repository,
                user=request.user.appuser,
                release_url=release_url,
                release_name=release_tag_name,
                release_body=github_release.body,
                release_date=release_date,
            )
            release_data.save(force_insert=True)
            logger.info(
                "Created new release: %s for repository %s", release_tag_name, repo_name
            )

            semantic_release = SemanticRelease(
                user=request.user.appuser,
                release_body=markdown_output,
                release_summary=generate_tweet(markdown_output),
                release=release_data,
            )
            semantic_release.save()
            logger.info("Created semantic release for %s", release_tag_name)

            return Response(
                ReleaseSerializer(release_data).data,
                status=status.HTTP_201_CREATED,
            )

        except ValueError as ve:
            logger.error("Value error while creating release: %s", str(ve))
            return Response(
                f"Value error while creating release: {str(ve)}",
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(
                "Unexpected error while creating release: %s", str(e), exc_info=True
            )

            return Response(
                f"An unexpected error occurred while creating the release: {str(e)}",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, *args, **kwargs):
        logger.debug(f"Getting release with ID: {kwargs}")
        try:
            release = self.get_object()
            semantic_release = SemanticRelease.objects.filter(release=release).first()

            release_data = ReleaseSerializer(release).data
            if semantic_release:
                release_data["semantic_release"] = SemanticReleaseSerializer(
                    semantic_release
                ).data

            return Response(release_data, status=status.HTTP_200_OK)
        except Release.DoesNotExist:
            return Response(
                {"error": "Release not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["post"], url_path="create-semantic-release")
    def create_semantic_release(self, request):
        try:
            repo_name = request.data.get("repo_name")
            release_name = request.data.get("release_name")
            logger.info(f"Creating semantic release for {repo_name}:{release_name}")
            if not repo_name or not release_name:
                return Response(
                    {"error": "Both repo_name and release_name are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Retrieve the existing release
            release = Release.objects.filter(
                repository__name=repo_name,
                release_name=release_name,
                user=request.user.appuser,
            ).first()

            if not release:
                return Response(
                    {"error": "Release not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Generate semantic release notes
            github_token = get_github_token(request)
            pull_requests, _ = get_pull_requests_for_release(
                repo_name, release_name, github_token
            )
            markdown_output, _ = generate_release_notes(
                pull_requests.values(), repo_name, release.release_body
            )

            release_summary = generate_tweet(markdown_output)
            logger.info(f"Release summary: {release_summary}")
            # Create the semantic release
            semantic_release = SemanticRelease(
                user=request.user.appuser,
                release_body=markdown_output,
                release_summary=release_summary,
                release=release,
            )
            semantic_release.save()

            return Response(
                SemanticReleaseSerializer(semantic_release).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(
                "Unexpected error while creating semantic release: %s",
                str(e),
                exc_info=True,
            )
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
