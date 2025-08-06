from rest_framework import serializers

from .models import TaskExecution


class TaskExecutionSerializer(serializers.ModelSerializer):
    """Serializer for TaskExecution model."""

    # Properties from Celery results
    status = serializers.ReadOnlyField()
    result = serializers.ReadOnlyField(source="result_data")
    traceback = serializers.ReadOnlyField()
    started_at = serializers.ReadOnlyField()
    completed_at = serializers.ReadOnlyField()
    duration = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()

    class Meta:
        model = TaskExecution
        fields = [
            "id",
            "task_name",
            "celery_task_id",
            "status",
            "result",
            "args",
            "kwargs",
            "created_at",
            "started_at",
            "completed_at",
            "traceback",
            "duration",
            "is_complete",
        ]
        read_only_fields = [
            "id",
            "celery_task_id",
            "status",
            "result",
            "created_at",
            "started_at",
            "completed_at",
            "traceback",
        ]


class TaskExecuteSerializer(serializers.Serializer):
    """Serializer for task execution requests."""

    task_name = serializers.CharField(max_length=255)
    args = serializers.ListField(default=list, required=False)
    kwargs = serializers.DictField(default=dict, required=False)

    def validate_task_name(self, value):
        """Validate that the task name is registered."""
        from .decorators import TaskRegistry

        if not TaskRegistry.get_task_info(value):
            raise serializers.ValidationError(
                f"Task '{value}' is not registered for API access"
            )

        return value


class TaskListSerializer(serializers.Serializer):
    """Serializer for listing available tasks."""

    task_name = serializers.CharField()
    description = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())
