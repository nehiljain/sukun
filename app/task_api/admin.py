from django.contrib import admin

from .models import TaskExecution


@admin.register(TaskExecution)
class TaskExecutionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "task_name",
        "user",
        "created_at",
        "started_at",
        "completed_at",
    ]
    list_filter = ["task_name", "created_at"]
    search_fields = ["task_name", "user__username", "celery_task_id"]
    readonly_fields = [
        "id",
        "celery_task_id",
        "result_data",
        "traceback",
        "started_at",
        "completed_at",
        "duration",
    ]

    def get_queryset(self, request):
        # Optimize queries by selecting related user
        return super().get_queryset(request).select_related("user")

    def has_add_permission(self, request):
        # Don't allow manual creation through admin
        return False
