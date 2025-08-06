import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .decorators import TaskRegistry, get_user_accessible_tasks, has_task_permission
from .models import TaskExecution
from .serializers import (
    TaskExecuteSerializer,
    TaskExecutionSerializer,
    TaskListSerializer,
)

logger = logging.getLogger(__name__)


class TaskExecutionPagination(PageNumberPagination):
    """Custom pagination for task executions."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema(
    request=TaskExecuteSerializer,
    responses={
        202: {
            "type": "object",
            "properties": {
                "execution_id": {"type": "string", "format": "uuid"},
                "celery_task_id": {"type": "string"},
                "status": {"type": "string"},
                "message": {"type": "string"},
            },
        },
        400: {"description": "Bad request"},
        403: {"description": "Permission denied"},
        404: {"description": "Task not found"},
        500: {"description": "Internal server error"},
    },
    summary="Execute a Celery task",
    description="Execute a Celery task if user has required permissions.",
    tags=["Tasks"],
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def execute_task(request):
    """
    Execute a Celery task if user has required permissions.

    POST /api/tasks/execute/
    {
        "task_name": "video_gen.tasks.render_video",
        "args": [123],
        "kwargs": {"options": {"format": "mp4"}}
    }
    """
    serializer = TaskExecuteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    task_name = serializer.validated_data["task_name"]
    task_args = serializer.validated_data.get("args", [])
    task_kwargs = serializer.validated_data.get("kwargs", {})

    # Check permissions
    if not has_task_permission(request.user, task_name):
        return Response(
            {"error": "You do not have permission to execute this task"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get the registered task info
    task_info = TaskRegistry.get_task_info(task_name)
    logger.info(
        f"Executing task: {task_name} with args: {task_args} and kwargs: {task_kwargs}"
    )
    logger.info(f"Task info: {task_info}")
    if not task_info or not task_info.get("task_func"):
        return Response(
            {"error": "Task function not found"}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        # Execute the task
        celery_task = task_info["task_func"].delay(*task_args, **task_kwargs)

        # Create execution record
        execution = TaskExecution.objects.create(
            task_name=task_name,
            celery_task_id=celery_task.id,
            user=request.user,
            args=task_args,
            kwargs=task_kwargs,
        )

        logger.info(
            f"Task {task_name} executed by user {request.user.username} with ID {celery_task.id}"
        )

        return Response(
            {
                "execution_id": execution.id,
                "celery_task_id": celery_task.id,
                "status": "PENDING",
                "message": "Task submitted successfully",
            },
            status=status.HTTP_202_ACCEPTED,
        )

    except Exception as e:
        logger.error(f"Failed to execute task {task_name}: {str(e)}")
        return Response(
            {"error": f"Failed to execute task: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    responses=TaskExecutionSerializer,
    summary="Get task execution status",
    description="Get the status and details of a specific task execution.",
    tags=["Tasks"],
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_status(request, execution_id):
    """
    Get the status of a task execution.

    GET /api/tasks/status/{execution_id}/
    """
    try:
        execution = TaskExecution.objects.get(id=execution_id, user=request.user)
    except TaskExecution.DoesNotExist:
        return Response(
            {"error": "Task execution not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # Status is automatically retrieved from django-celery-results via model properties
    serializer = TaskExecutionSerializer(execution)
    return Response(serializer.data)


@extend_schema(
    responses=TaskExecutionSerializer(many=True),
    parameters=[
        {
            "name": "status",
            "in": "query",
            "description": "Filter by task status",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "task_name",
            "in": "query",
            "description": "Filter by task name",
            "required": False,
            "schema": {"type": "string"},
        },
    ],
    summary="Get task execution history",
    description="Get user's task execution history with optional filtering.",
    tags=["Tasks"],
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_history(request):
    """
    Get user's task execution history.

    GET /api/tasks/history/
    """
    executions = TaskExecution.objects.filter(user=request.user)

    # Filter by status if provided
    status_filter = request.query_params.get("status")
    if status_filter:
        executions = executions.filter(status=status_filter.upper())

    # Filter by task name if provided
    task_name = request.query_params.get("task_name")
    if task_name:
        executions = executions.filter(task_name=task_name)

    paginator = TaskExecutionPagination()
    page = paginator.paginate_queryset(executions, request)

    if page is not None:
        serializer = TaskExecutionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = TaskExecutionSerializer(executions, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=TaskListSerializer(many=True),
    summary="List available tasks",
    description="List all tasks that the authenticated user can execute.",
    tags=["Tasks"],
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_tasks(request):
    """
    List all tasks that the authenticated user can execute.

    GET /api/tasks/available/
    """
    accessible_tasks = get_user_accessible_tasks(request.user)

    tasks_data = []
    for task_name, task_info in accessible_tasks.items():
        tasks_data.append(
            {
                "task_name": task_name,
                "description": task_info["description"],
                "permissions": task_info["permissions"],
            }
        )

    serializer = TaskListSerializer(tasks_data, many=True)
    return Response(serializer.data)
