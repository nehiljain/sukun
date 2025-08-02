import logging

from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from video_gen.models import BrandAsset
from video_gen.serializers import BrandAssetSerializer

logger = logging.getLogger(__name__)


class BrandAssetViewSet(viewsets.ModelViewSet):
    serializer_class = BrandAssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter assets by user's organization
        return BrandAsset.objects.filter(org=self.request.user.appuser.active_org)

    def perform_create(self, serializer):
        # Automatically set the organization when creating
        serializer.save(org=self.request.user.appuser.active_org)

    def perform_update(self, serializer):
        # Ensure users can only update assets from their organization
        instance = self.get_object()
        if instance.org != self.request.user.appuser.active_org:
            raise PermissionDenied("You don't have permission to modify this asset")
        serializer.save()
