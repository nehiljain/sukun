from rest_framework import serializers

from .models import GmailMessage


class GmailMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GmailMessage
        fields = [
            "id",
            "message_id",
            "thread_id",
            "subject",
            "sender",
            "snippet",
            "is_important",
            "is_archived",
            "labels",
            "received_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class GmailDraftSerializer(serializers.Serializer):
    to = serializers.EmailField()
    subject = serializers.CharField(max_length=1000)
    body = serializers.CharField()
    thread_id = serializers.CharField(required=False, allow_blank=True)
