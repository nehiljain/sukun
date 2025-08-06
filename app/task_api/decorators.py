import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class TaskRegistry:
    """Registry for API-accessible Celery tasks with permissions."""

    _tasks: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register(
        cls,
        task_name: str,
        permissions: List[str],
        description: str = "",
        task_func: Optional[Callable] = None,
    ):
        """Register a task with required permissions and optional task function."""
        cls._tasks[task_name] = {
            "permissions": permissions,
            "description": description,
            "task_func": task_func,
        }
        logger.info(
            f"TaskRegistry.register called for {task_name}, task_func: {task_func}"
        )

    @classmethod
    def get_task_info(cls, task_name: str) -> Optional[Dict[str, Any]]:
        """Get task information by name."""
        return cls._tasks.get(task_name)

    @classmethod
    def get_all_tasks(cls) -> Dict[str, Dict[str, Any]]:
        """Get all registered tasks."""
        return cls._tasks.copy()

    @classmethod
    def set_task_function(cls, task_name: str, task_func: Callable):
        """Set the actual task function reference."""
        if task_name in cls._tasks:
            cls._tasks[task_name]["task_func"] = task_func
            logger.info(
                f"TaskRegistry.set_task_function called for {task_name}, task_func: {task_func}"
            )
        else:
            logger.warning(
                f"TaskRegistry.set_task_function called for unregistered task: {task_name}"
            )


def api_task(permissions: List[str], description: str = ""):
    """
    Decorator to register a Celery task for API access with required permissions.

    Args:
        permissions: List of permission codenames required to execute this task
        description: Optional description of what the task does

    Example:
        @api_task(['video_gen.can_render_video'], 'Render video from project')
        @shared_task
        def render_video(project_id, options=None):
            # task implementation
            pass
    """

    def decorator(func: Callable) -> Callable:
        task_name = f"{func.__module__}.{func.__name__}"

        logger.info(f"@api_task decorator applied to {task_name}")
        logger.info(f"Function type: {type(func)}")
        logger.info(f"Has delay method: {hasattr(func, 'delay')}")

        # If this is already a Celery task (decorated with @shared_task first),
        # register it immediately with the task function
        if hasattr(func, "delay"):
            logger.info(f"Registering Celery task immediately: {task_name}")
            TaskRegistry.register(task_name, permissions, description, task_func=func)
        else:
            # This is a regular function, register without task_func for now
            logger.info(f"Registering regular function: {task_name}")
            TaskRegistry.register(task_name, permissions, description, task_func=None)

            # Store metadata on the function for potential later discovery
            func._api_task_permissions = permissions
            func._api_task_description = description

        return func

    return decorator


def has_task_permission(user, task_name: str) -> bool:
    """
    Check if a user has permission to execute a specific task.

    Args:
        user: Django User instance
        task_name: Name of the task to check permissions for

    Returns:
        bool: True if user has required permissions, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    if user.is_staff or user.is_superuser:
        return True

    task_info = TaskRegistry.get_task_info(task_name)
    if not task_info:
        return False

    required_permissions = task_info["permissions"]
    if not required_permissions:
        return True

    # Check if user has all required permissions
    for perm_codename in required_permissions:
        if not user.has_perm(perm_codename):
            return False

    return True


def get_user_accessible_tasks(user) -> Dict[str, Dict[str, Any]]:
    """
    Get all tasks that a user has permission to execute.

    Args:
        user: Django User instance

    Returns:
        Dict: Dictionary of task_name -> task_info for accessible tasks
    """
    if not user or not user.is_authenticated:
        return {}

    accessible_tasks = {}
    all_tasks = TaskRegistry.get_all_tasks()
    for task_name, task_info in all_tasks.items():
        if has_task_permission(user, task_name):
            accessible_tasks[task_name] = {
                "description": task_info["description"],
                "permissions": task_info["permissions"],
            }

    return accessible_tasks
