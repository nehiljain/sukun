from rest_framework import serializers
from user_org.models import Organization, Workspace


class ProjectsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = "__all__"


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"
