import uuid

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class TaskExecution(models.Model):
    """Model to track API task executions, extends django-celery-results."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_name = models.CharField(max_length=255, help_text="Name of the Celery task")
    celery_task_id = models.CharField(
        max_length=255, unique=True, help_text="Celery task ID"
    )

    # Request info - what the user requested
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, help_text="User who initiated the task"
    )
    args = models.JSONField(default=list, help_text="Task arguments")
    kwargs = models.JSONField(default=dict, help_text="Task keyword arguments")

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "task_api_execution"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["celery_task_id"]),
        ]

    def __str__(self):
        return f"{self.task_name} - {self.user.username} ({self.celery_task_id[:8]})"

    @property
    def celery_result(self):
        """Get the actual Celery result using django-celery-results."""
        from django_celery_results.models import TaskResult

        try:
            return TaskResult.objects.get(task_id=self.celery_task_id)
        except TaskResult.DoesNotExist:
            return None

    @property
    def status(self):
        """Get current status from Celery results."""
        result = self.celery_result
        return result.status if result else "PENDING"

    @property
    def result_data(self):
        """Get result data from Celery."""
        result = self.celery_result
        return result.result if result else None

    @property
    def traceback(self):
        """Get error traceback from Celery."""
        result = self.celery_result
        return result.traceback if result else None

    @property
    def is_complete(self):
        """Check if task has completed."""
        return self.status in ["SUCCESS", "FAILURE", "REVOKED"]

    @property
    def started_at(self):
        """Get when task was started from Celery results."""
        result = self.celery_result
        return result.date_created if result else None

    @property
    def completed_at(self):
        """Get when task was completed from Celery results."""
        result = self.celery_result
        return result.date_done if result else None

    @property
    def duration(self):
        """Calculate task duration if available."""
        started = self.started_at
        completed = self.completed_at
        if started and completed:
            return completed - started
        return None
