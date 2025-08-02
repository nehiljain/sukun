from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from .models import (
    Repository,
    Release,
    SourceCodeAccount,
)
from release_manager.github_utils import (
    get_github_repositories,
)

from rest_framework import serializers
import logging

logger = logging.getLogger(__name__)


class RepositorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = "__all__"


class RepositoryViewSet(viewsets.ModelViewSet):
    queryset = Repository.objects.all()
    serializer_class = RepositorySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    @method_decorator(login_required)
    def sync(self, request):
        if not hasattr(request.user, "appuser"):
            return Response(
                {"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            github_token = SourceCodeAccount.objects.get(
                app_user=request.user.appuser, service_provider__alias="github"
            ).info["access_token"]
            repositories_data = get_github_repositories(github_token)
            synced_repos = 0

            for repo in repositories_data:
                try:
                    Repository.objects.get_or_create(
                        name=repo["full_name"],
                        defaults={
                            "user": request.user.appuser,
                            "source_code_account": SourceCodeAccount.objects.get(
                                app_user=request.user.appuser,
                                service_provider__alias="github",
                            ),
                        },
                    )
                    if repo["latest_release"]:
                        Release.objects.get_or_create(
                            repository=Repository.objects.get(name=repo["full_name"]),
                            defaults={
                                "user": request.user.appuser,
                                "release_url": repo["latest_release"]["html_url"],
                                "release_name": repo["latest_release"]["tag_name"],
                                "release_body": repo["latest_release"]["body"],
                                "release_date": repo["latest_release"]["published_at"],
                            },
                        )
                    synced_repos += 1
                    logger.debug(f"Synced repository {repo['name']}")
                except Exception as e:
                    logger.error(f"Error syncing repository {repo['name']}: {str(e)}")

            user_repositories = Repository.objects.filter(user=request.user.appuser)
            serializer = self.get_serializer(user_repositories, many=True)
            repositories_data = serializer.data

            return Response(
                {
                    "message": f"Successfully synced {synced_repos} repositories",
                    "total_repos": len(repositories_data),
                    "synced_repos": synced_repos,
                    "repositories": repositories_data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"An error occurred while syncing repositories: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request, *args, **kwargs):
        if not hasattr(request.user, "appuser"):
            return Response(
                {"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED
            )

        user_repositories = Repository.objects.filter(user=request.user.appuser)
        serializer = self.get_serializer(user_repositories, many=True)
        repositories_data = serializer.data

        return Response(status=status.HTTP_200_OK, data=repositories_data)
