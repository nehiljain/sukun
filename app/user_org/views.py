from datetime import datetime, timedelta, timezone

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
)
from rest_framework.views import APIView
from user_org.models import AnonymousSession, Organization, Workspace
from user_org.serializers import OrganizationSerializer, ProjectsSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectsSerializer

    def get_queryset(self):
        return Workspace.objects.filter(
            user=self.request.user.appuser,
            organization=self.request.user.appuser.active_org,
        )

    def create(self, request, *args, **kwargs):
        project = Workspace.objects.create(
            user=request.user.appuser,
            organization=request.user.active_org,
            inputs=request.data.get("inputs"),
        )

        project.save()

        return Response(ProjectsSerializer(project).data, status=HTTP_201_CREATED)


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        return Organization.objects.filter(members=self.request.user.appuser)

    def create(self, request, *args, **kwargs):
        organization = Organization.objects.create(
            name=request.data.get("name"),
            created_by=request.user.appuser,
        )
        return Response(
            OrganizationSerializer(organization).data, status=HTTP_201_CREATED
        )


class UpdateAnonymousSessionEmailView(APIView):
    def patch(self, request):
        session_key = request.headers.get("X-DD-Session-Key")
        email = request.data.get("email")

        if not session_key:
            return Response(
                {"error": "X-DD-Session-Key header is required"},
                status=HTTP_400_BAD_REQUEST,
            )

        if not email:
            return Response({"error": "email is required"}, status=HTTP_400_BAD_REQUEST)

        try:
            # First try to get the existing session
            session, created = AnonymousSession.objects.get_or_create(
                session_key=session_key,
                defaults={
                    "email": email,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
                },
            )

            if not created:
                # If session exists, update both email and expires_at
                session.email = email
                session.full_clean()
                session.save()

            return Response(
                {
                    "id": session.id,
                    "session_key": session.session_key,
                    "email": session.email,
                },
                status=HTTP_200_OK,
            )
        except ValidationError as e:
            return Response({"error": str(e)}, status=HTTP_400_BAD_REQUEST)
